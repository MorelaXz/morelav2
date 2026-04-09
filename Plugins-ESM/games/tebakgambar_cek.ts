// @ts-nocheck
import path from 'path'
import fs from 'fs'

const SESSION_FILE = path.join(process.cwd(), 'data/tebakgambar.json')
const TIMEOUT_MS   = 90_000

function loadSessions() {
  try {
    if (!fs.existsSync(SESSION_FILE)) return {}
    return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'))
  } catch { return {} }
}

function saveSessions(data: unknown) {
  try {
    fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true })
    const _tmp = SESSION_FILE + '.tmp'
    fs.writeFileSync(_tmp, JSON.stringify(data, null, 2), 'utf-8')
    fs.renameSync(_tmp, SESSION_FILE)
  } catch (e) {
    console.error('[TEBAKGAMBAR_CEK] Gagal simpan:', (e as Error).message)
  }
}

const debounce = new Map()
function isDebounced(sender: unknown) {
  const last = debounce.get(sender)
  if (last && Date.now() - last < 3000) return true
  debounce.set(sender, Date.now())
  return false
}

export default {
  tags: ['game'],
  handler: async (m, { Morela, fkontak }) => {
    if (!m.text) return
    if (m.key?.fromMe) return

    const sessions = loadSessions()
    const session  = sessions[m.sender]
    if (!session) return
    if (session.chat !== m.chat) return

    const expired = Date.now() - session.timestamp > TIMEOUT_MS

    if (expired && !session.timedOut) {
      if (isDebounced(m.sender)) return
      session.timedOut = true
      sessions[m.sender] = session
      saveSessions(sessions)

      setTimeout(() => {
        const s = loadSessions()
        delete s[m.sender]
        saveSessions(s)
      }, 100)

      await Morela.sendMessage(m.chat, {
        text:
`╭──「 ⏰ *Waktu Habis!* 」
│
│  Sayang sekali, waktu sudah habis~
│
│  🔑 *Jawaban*   » ${session.jawaban}
│
│  Ketik *.tebakgambar* untuk soal baru!
╰─────────────────────`
      }, { quoted: fkontak || m })
      return
    }

    if (expired) return

    const raw     = m.text.trim()
    const tebakan = raw.replace(/^[.!,🐤🗿]/u, '').trim().toUpperCase()

    if (tebakan === 'NYERAH') {
      if (isDebounced(m.sender)) return
      delete sessions[m.sender]
      saveSessions(sessions)

      await Morela.sendMessage(m.chat, { react: { text: '🏳️', key: m.key } })
      await Morela.sendMessage(m.chat, {
        text:
`╭──「 🏳️ *Menyerah!* 」
│
│  Tidak apa-apa, tetap semangat!
│
│  🔑 *Jawaban*   » ${session.jawaban}
│
│  Ketik *.tebakgambar* untuk soal baru!
╰─────────────────────
_© Morela Bot_`
      }, { quoted: fkontak || m })
      return
    }

    if (raw.startsWith('.') || raw.startsWith('!')) return

    if (tebakan === session.jawaban) {
      if (isDebounced(m.sender)) return
      delete sessions[m.sender]
      saveSessions(sessions)

      await Morela.sendMessage(m.chat, { react: { text: '🎉', key: m.key } })
      await Morela.sendMessage(m.chat, {
        text:
`╭──「 🎉 *Jawaban Benar!* 」
│
│  ✦ Mata kamu jeli sekali!
│
│  🔑 *Jawaban*   » ${session.jawaban}
│
│  Ketik *.tebakgambar* untuk soal baru!
╰─────────────────────
_© Morela Bot_`
      }, { quoted: fkontak || m })
      return
    }

    const lastWrong = session.lastWrong || 0
    if (Date.now() - lastWrong < 5000) return

    sessions[m.sender].lastWrong = Date.now()
    saveSessions(sessions)

    const sisaDetik = Math.max(0, Math.ceil((TIMEOUT_MS - (Date.now() - session.timestamp)) / 1000))

    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    await Morela.sendMessage(m.chat, {
      text:
`╭──「 ❌ *Jawaban Salah!* 」
│
│  *${tebakan}* bukan jawabannya~
│
│  ⏰ *Sisa*  » ${sisaDetik} detik
│
│  Coba lagi atau ketik *nyerah* 💪
╰─────────────────────`
    }, { quoted: fkontak || m })
  }
}
