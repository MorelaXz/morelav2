import path from 'path'
import fs from 'fs'

const SESSION_FILE = path.join(process.cwd(), 'data/family100.json')
const SOAL_FILE    = path.join(process.cwd(), 'data/soal_family100.json')

let _soalCache: { soal: string; jawaban: string[] }[] | null = null

function loadSoal() {
  if (_soalCache) return _soalCache
  try {
    if (fs.existsSync(SOAL_FILE)) {
      _soalCache = JSON.parse(fs.readFileSync(SOAL_FILE, 'utf-8'))
      return _soalCache!
    }
  } catch (e) {
    console.error('[FAMILY100] Gagal load soal:', (e as Error).message)
  }
  return []
}

function getRandomSoal() {
  const list = loadSoal()
  if (!list.length) return null
  return list[Math.floor(Math.random() * list.length)]
}

export function loadSessions(): Record<string, any> {
  try {
    if (!fs.existsSync(SESSION_FILE)) return {}
    return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'))
  } catch { return {} }
}

export function saveSessions(data: unknown) {
  try {
    fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true })
    const _tmp = SESSION_FILE + '.tmp'
    fs.writeFileSync(_tmp, JSON.stringify(data, null, 2), 'utf-8')
    fs.renameSync(_tmp, SESSION_FILE)
  } catch (e) {
    console.error('[FAMILY100] Gagal simpan session:', (e as Error).message)
  }
}

export function buildBoard(jawabanAsli: string[], found: string[]): string {
  return jawabanAsli
    .map((j, i) =>
      found.includes(j.toLowerCase())
        ? `${i + 1}. ✅ ${j}`
        : `${i + 1}. ❓ ???`
    )
    .join('\n')
}

const handler = async (m: any, { Morela, reply, fkontak }: any) => {
  await Morela.sendMessage(m.chat, { react: { text: '💯', key: m.key } })

  try {
    const sessions = loadSessions()

    if (sessions[m.chat]) {
      return reply(
`⚠️ *Game Sedang Berlangsung!*

Masih ada game Family 100 di sini.
Selesaikan dulu atau ketik *nyerah* untuk menyerah.`
      )
    }

    const item = getRandomSoal()
    if (!item) throw new Error('Bank soal kosong. Pastikan data/soal_family100.json ada.')

    const { soal, jawaban } = item
    const total = jawaban.length

    sessions[m.chat] = {
      soal,
      jawaban:     jawaban.map((j: string) => j.toLowerCase()),
      jawabanAsli: jawaban,
      found:       [] as string[],
      foundBy:     {} as Record<string, string>,
      chat:        m.chat,
      timestamp:   Date.now(),
      timedOut:    false,
      lastWrong:   {} as Record<string, number>
    }
    saveSessions(sessions)

    const board = buildBoard(jawaban, [])

    await Morela.sendMessage(m.chat, {
      text:
`📊 *FAMILY 100*

📋 *${soal}*

Jawaban (0/${total})
${board}

⏱️ Waktu: *120 detik*
🎁 Hadiah per jawaban: *EXP + Koin (random)*

_Ketik jawabanmu langsung atau reply "nyerah"_`
    }, { quoted: fkontak || m })

    await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

  } catch (e) {
    console.error('[FAMILY100 ERROR]', (e as Error).message)
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    return reply(`❌ *Gagal Ambil Soal*\n\n${(e as Error).message}`)
  }
}

handler.help    = ['family100 - tebak semua jawaban bersama dalam grup']
handler.tags    = ['game']
handler.command = ['family100', 'f100']

export default handler
