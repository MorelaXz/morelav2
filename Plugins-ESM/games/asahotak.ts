import path from 'path'
import fs from 'fs'

const SESSION_FILE = path.join(process.cwd(), 'data/asahotak.json')
const SOAL_FILE    = path.join(process.cwd(), 'data/soal_asahotak.json')

let _soalCache: { index?: number; soal: string; jawaban: string }[] | null = null

function loadSoal() {
  if (_soalCache) return _soalCache
  try {
    if (fs.existsSync(SOAL_FILE)) {
      _soalCache = JSON.parse(fs.readFileSync(SOAL_FILE, 'utf-8'))
      return _soalCache!
    }
  } catch (e) {
    console.error('[ASAHOTAK] Gagal load soal:', (e as Error).message)
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
    console.error('[ASAHOTAK] Gagal simpan session:', (e as Error).message)
  }
}

const handler = async (m: any, { Morela, reply, fkontak }: any) => {
  await Morela.sendMessage(m.chat, { react: { text: '🧠', key: m.key } })

  try {
    const item = getRandomSoal()
    if (!item) throw new Error('Bank soal kosong. Pastikan data/soal_asahotak.json ada.')

    const { soal, jawaban } = item

    const sessions = loadSessions()
    sessions[m.sender] = {
      soal,
      jawaban,
      chat:      m.chat,
      timestamp: Date.now(),
      lastWrong: 0,
      timedOut:  false
    }
    saveSessions(sessions)

    await Morela.sendMessage(m.chat, {
      text:
`╭──「 🧠 *Asah Otak* 」
│
│  ⏰ *Waktu*  » 60 detik
│
├──「 ❓ *Pertanyaan* 」
│
│  ${soal}
│
│  Ketik jawabanmu di chat!
│  Atau ketik *nyerah* untuk menyerah
│
╰─────────────────────
_© Morela Bot_`
    }, { quoted: fkontak || m })

    await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

  } catch (e) {
    console.error('[ASAHOTAK ERROR]', (e as Error).message)
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    return reply(
`╭──「 ❌ *Gagal Ambil Soal* 」
│
│  ${(e as Error).message}
╰─────────────────────`
    )
  }
}

handler.help    = ['asahotak - tebak jawaban dari pertanyaan seru']
handler.tags    = ['game']
handler.command = ['asahotak', 'ah']

export default handler
