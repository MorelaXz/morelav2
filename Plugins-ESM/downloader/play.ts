// @ts-nocheck
import path from 'path'
import axios from 'axios'
import fs from 'fs'

const FAA_BASE = 'https://api-faa.my.id/faa'
const imagePath = path.join(process.cwd(), 'media/menu.jpg')
const BOT_JID   = "13135550002@s.whatsapp.net"
const botName   = global.botName || 'Morela'

async function buildFkontak(Morela: Record<string, unknown>) {
  const BOT_NUMBER = BOT_JID.split("@")[0]
  let Mekik
  try {
    const pp  = await Morela.profilePictureUrl(BOT_JID, "image")
    const res = await axios.get(pp, { responseType: 'arraybuffer' })
    Mekik     = Buffer.from(res.data)
  } catch {
    Mekik = fs.existsSync(imagePath) ? fs.readFileSync(imagePath) : Buffer.alloc(0)
  }
  return {
    key: { participant: '0@s.whatsapp.net', fromMe: false, id: "StatusBiz", remoteJid: "status@broadcast" },
    message: {
      contactMessage: {
        displayName: botName,
        vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${botName}\nFN:${botName}\nORG:${botName};\nTEL;type=CELL;type=VOICE;waid=${BOT_NUMBER}:${BOT_NUMBER}\nEND:VCARD`,
        jpegThumbnail: Mekik
      }
    }
  }
}

const handler = async (m: any, { Morela, text, usedPrefix, command, reply }: any) => {
  if (!text) return reply(`📝 Contoh: ${usedPrefix}${command} mangu fourtwnty`)

  await Morela.sendMessage(m.chat, { react: { text: '🔍', key: m.key } })

  try {
    
    const res = await axios.get(`${FAA_BASE}/ytplay`, { 
        params: { query: text }, 
        timeout: 60000 
    })
    
    const result = res.data.result
    if (!res.data.status || !result) throw new Error('Lagu tidak ditemukan')

    await Morela.sendMessage(m.chat, { react: { text: '📥', key: m.key } })

    
    const tempDir = path.join(process.cwd(), 'media', 'temp')
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })

    const stamp    = Date.now()
    const audioOut = path.join(tempDir, `${stamp}.mp3`)

    const [audioRes, thumbRes] = await Promise.all([
      axios.get(result.mp3, { responseType: 'arraybuffer', timeout: 120000 }),
      axios.get(result.thumbnail, { responseType: 'arraybuffer', timeout: 20000 }).catch(() => null)
    ])

    fs.writeFileSync(audioOut, Buffer.from(audioRes.data))
    const thumbBuffer = thumbRes ? Buffer.from(thumbRes.data) : (fs.existsSync(imagePath) ? fs.readFileSync(imagePath) : null)

    const sizeMB = fs.statSync(audioOut).size / 1024 / 1024
    if (sizeMB > 100) {
      if (fs.existsSync(audioOut)) fs.unlinkSync(audioOut)
      return reply(`❌ File terlalu besar (${sizeMB.toFixed(2)} MB)`)
    }

    await Morela.sendMessage(m.chat, { react: { text: '📤', key: m.key } })

    
    await Morela.sendMessage(m.chat, {
      audio:    fs.readFileSync(audioOut),
      mimetype: 'audio/mpeg',
      fileName: `${result.title}.mp3`,
      contextInfo: {
        forwardingScore: 999,
        isForwarded:     true,
        
        forwardedNewsletterMessageInfo: {
          newsletterJid:   '120363420704282055@newsletter',
          newsletterName:  `🎵 ${result.title}`,
          serverMessageId: 143
        },
        externalAdReply: {
          title:                 result.title,
          body:                  `👤 ${result.author} • ⏳ ${result.duration_timestamp} • 📊 ${sizeMB.toFixed(2)} MB`,
          thumbnail:             thumbBuffer,
          sourceUrl:             result.url,
          mediaType:             1, 
          renderLargerThumbnail: true,
          showAdAttribution:     false 
        }
      }
    }, { quoted: await buildFkontak(Morela) })

    await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

    
    if (fs.existsSync(audioOut)) fs.unlinkSync(audioOut)

  } catch (e) {
    console.error('[PLAY ERROR]', e)
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    reply('❌ Terjadi kesalahan: ' + (e as Error).message)
  }
}

handler.help    = ['play <judul lagu>']
handler.tags    = ['downloader']
handler.command = ['play']

export default handler