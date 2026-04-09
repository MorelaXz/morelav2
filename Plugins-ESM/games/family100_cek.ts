// @ts-nocheck
import path from 'path'
import fs from 'fs'

const SESSION_FILE = path.join(process.cwd(), 'data/family100.json')
const TIMEOUT_MS   = 120_000

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
    console.error('[FAMILY100_CEK] Gagal simpan:', (e as Error).message)
  }
}

function buildBoard(jawabanAsli: string[], found: string[]): string {
  return jawabanAsli
    .map((j, i) =>
      found.includes(j.toLowerCase())
        ? `${i + 1}. ✅ ${j}`
        : `${i + 1}. ❓ ???`
    )
    .join('\n')
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}


function findMatch(input: string, jawabanList: string[], found: string[]): string | null {
  
  if (jawabanList.includes(input) && !found.includes(input)) return input
  
  if (input.length >= 4) {
    const fuzzy = jawabanList.find(j => j.includes(input) && !found.includes(j))
    if (fuzzy) return fuzzy
  }
  return null
}

export default {
  tags: ['game'],
  handler: async (m, { Morela, fkontak }) => {
    if (!m.text) return
    if (m.key?.fromMe) return

    const sessions = loadSessions()
    const session  = sessions[m.chat]
    if (!session) return

    const now     = Date.now()
    const expired = now - session.timestamp > TIMEOUT_MS

    
    if (expired && !session.timedOut) {
      
      delete sessions[m.chat]
      saveSessions(sessions)

      const sisa   = session.jawaban.filter((j: string) => !session.found.includes(j))
      const reveal = sisa.map((j: string) => `• ${j}`).join('\n')

      await Morela.sendMessage(m.chat, {
        text:
`⏰ *Waktu Habis!*

Tertebak: *${session.found.length}/${session.jawaban.length}*${
  sisa.length > 0
    ? `\n\nJawaban tersisa:\n${reveal}`
    : '\n\n🎊 Semua jawaban berhasil ditemukan!'
}

Ketik *.family100* untuk soal baru!`
      }, { quoted: fkontak || m })
      return
    }

    if (expired) return

    const raw     = m.text.trim()
    const input   = raw.replace(/^[.!,🐤🗿]/u, '').trim().toLowerCase()

    
    if (input === 'nyerah') {
      delete sessions[m.chat]
      saveSessions(sessions)

      const sisa   = session.jawaban.filter((j: string) => !session.found.includes(j))
      const reveal = sisa.map((j: string) => `• ${j}`).join('\n')

      await Morela.sendMessage(m.chat, {
        text:
`🏳️ *Yahhh nyerah deh...*

Tertebak: *${session.found.length}/${session.jawaban.length}*${
  sisa.length > 0 ? `\n\nJawaban tersisa:\n${reveal}` : ''
}

Ketik *.family100* untuk soal baru!`
      }, { quoted: fkontak || m })
      return
    }

    
    if (raw.startsWith('.') || raw.startsWith('!')) return

    
    if (session.found.includes(input)) {
      await Morela.sendMessage(m.chat, {
        text: `⚠️ Jawaban "${input}" sudah ditebak!`
      }, { quoted: m })
      return
    }

    
    const matched = findMatch(input, session.jawaban, session.found)

    if (matched) {
      
      const exp    = randInt(500, 2500)
      const koin   = randInt(500, 2000)
      const sender = m.sender
      const senderNum = sender.split('@')[0].split(':')[0]

      session.found.push(matched)
      if (!session.foundBy) session.foundBy = {}
      session.foundBy[matched] = sender
      if (!session.lastWrong)  session.lastWrong = {}

      const progress = session.found.length
      const total    = session.jawaban.length
      const selesai  = progress >= total

      if (selesai) {
        
        delete sessions[m.chat]
        saveSessions(sessions)

        const board = buildBoard(session.jawabanAsli || session.jawaban, session.found)

        await Morela.sendMessage(m.chat, {
          text:
`✅ @${senderNum} (+${exp} EXP, +${koin} Koin)

📋 *${session.soal}*

${board}

🎊 *Semua jawaban berhasil ditemukan!*
Ketik *.family100* untuk soal baru!`,
          mentions: [sender]
        }, { quoted: m })
      } else {
        sessions[m.chat] = session
        saveSessions(sessions)

        const board = buildBoard(session.jawabanAsli || session.jawaban, session.found)
        const sisa  = total - progress

        await Morela.sendMessage(m.chat, {
          text:
`✅ @${senderNum} (+${exp} EXP, +${koin} Koin)

📋 *${session.soal}*

${board}

Sisa ${sisa} jawaban lagi!`,
          mentions: [sender]
        }, { quoted: m })
      }

    } else {
      
      if (!session.lastWrong) session.lastWrong = {}
      const lastWrong = session.lastWrong[m.sender] || 0
      if (now - lastWrong < 3000) return

      session.lastWrong[m.sender] = now
      sessions[m.chat] = session
      saveSessions(sessions)

      await Morela.sendMessage(m.chat, {
        text: `❌ Salah! Coba lagi...`
      }, { quoted: m })
    }
  }
}
