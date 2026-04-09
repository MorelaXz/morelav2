// @ts-nocheck


import fs   from 'fs'
import path from 'path'
import os   from 'os'
import { fileURLToPath }  from 'url'
import { createWorker }   from 'tesseract.js'
import { bi, botName, imagePath, CHANNEL_URL, OWNER_WA, botVersion } from '../../Library/utils.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url as string))

function buildContextInfo() {
  const thumb = fs.existsSync(imagePath) ? fs.readFileSync(imagePath) : undefined
  return {
    forwardingScore: 999,
    isForwarded: true,
    externalAdReply: {
      title: botName, body: botVersion,
      thumbnail: thumb, mediaType: 1,
      renderLargerThumbnail: false,
      showAdAttribution: false,
      sourceUrl: CHANNEL_URL
    },
    forwardedNewsletterMessageInfo: {
      newsletterJid:  '120363420704282055@newsletter',
      newsletterName: bi('Morela Multidevice')
    }
  }
}


function getImageMsg(m: any): any {
  const msg = m.message
  
  if (msg?.imageMessage) return msg.imageMessage
  
  const q = m.quoted?.message || msg?.extendedTextMessage?.contextInfo?.quotedMessage
  if (q?.imageMessage) return q.imageMessage
  return null
}


function parseLang(args: string[]): string {
  const map: Record<string, string> = {
    'id':  'ind',
    'ind': 'ind',
    'en':  'eng',
    'eng': 'eng',
    'ar':  'ara',
    'ara': 'ara',
    'zh':  'chi_sim',
    'cn':  'chi_sim',
    'ja':  'jpn',
    'jp':  'jpn',
    'ko':  'kor',
    'kr':  'kor',
  }
  const lang = (args[0] || '').toLowerCase()
  return map[lang] || 'ind+eng' 
}

function langLabel(lang: string): string {
  const labels: Record<string, string> = {
    'ind':     '🇮🇩 Indonesia',
    'eng':     '🇬🇧 Inggris',
    'ind+eng': '🇮🇩+🇬🇧 ID/EN',
    'ara':     '🇸🇦 Arab',
    'chi_sim': '🇨🇳 Mandarin',
    'jpn':     '🇯🇵 Jepang',
    'kor':     '🇰🇷 Korea',
  }
  return labels[lang] || lang
}

const handler = async (m: any, { Morela, reply, args, usedPrefix, command, fkontak, downloadContentFromMessage }: any) => {
  
  const imgMsg = getImageMsg(m)
  if (!imgMsg) {
    return reply(
      `╭──「 🔍 *OCR — Baca Teks Gambar* 」\n` +
      `│\n` +
      `│  Reply gambar + ${usedPrefix}${command}\n` +
      `│  untuk membaca teks di dalamnya.\n` +
      `│\n` +
      `│  📌 *Format:*\n` +
      `│  Reply foto + \`${usedPrefix}${command}\`\n` +
      `│\n` +
      `│  🌐 *Bahasa (opsional):*\n` +
      `│  \`${usedPrefix}${command} id\`  → Indonesia\n` +
      `│  \`${usedPrefix}${command} en\`  → Inggris\n` +
      `│  \`${usedPrefix}${command} ar\`  → Arab\n` +
      `│  \`${usedPrefix}${command} zh\`  → Mandarin\n` +
      `│  \`${usedPrefix}${command} ja\`  → Jepang\n` +
      `│  \`${usedPrefix}${command} ko\`  → Korea\n` +
      `│  _(default: Indonesia + Inggris)_\n` +
      `│\n` +
      `╰─────────────────────`
    )
  }

  const lang = parseLang(args)

  
  await Morela.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

  let tmpFile: string | null = null
  let worker: any = null

  try {
    
    const stream = await downloadContentFromMessage(imgMsg, 'image')
    const chunks: Buffer[] = []
    for await (const c of stream) chunks.push(c)
    const imgBuf = Buffer.concat(chunks)

    if (!imgBuf.length) throw new Error('Gagal download gambar — buffer kosong')

    
    tmpFile = path.join(os.tmpdir(), `ocr_${Date.now()}.jpg`)
    fs.writeFileSync(tmpFile, imgBuf)

    
    worker = await createWorker(lang, 1, {
      
      logger: () => {}
    })

    const { data } = await worker.recognize(tmpFile)
    const text     = (data.text || '').trim()
    const conf     = Math.round(data.confidence || 0)

    await worker.terminate()
    worker = null

    
    if (fs.existsSync(tmpFile)) { fs.unlinkSync(tmpFile); tmpFile = null }

    
    if (!text || text.length < 2) {
      await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      return reply(
        `╭──「 🔍 *OCR Gagal* 」\n` +
        `│\n` +
        `│  ❌ Tidak ada teks yang terdeteksi\n` +
        `│  di gambar ini.\n` +
        `│\n` +
        `│  💡 *Tips:*\n` +
        `│  • Pastikan gambar jelas & tidak blur\n` +
        `│  • Coba ganti bahasa: \`${usedPrefix}${command} en\`\n` +
        `│  • Gunakan gambar dengan kontras tinggi\n` +
        `│\n` +
        `╰─────────────────────`
      )
    }

    
    await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

    
    const maxLen  = 3000
    const trimmed = text.length > maxLen
      ? text.slice(0, maxLen) + `\n\n_... (terpotong, total ${text.length} karakter)_`
      : text

    const confBar = '█'.repeat(Math.round(conf / 10)) + '░'.repeat(10 - Math.round(conf / 10))
    const confEmoji = conf >= 80 ? '🟢' : conf >= 50 ? '🟡' : '🔴'

    const result =
      `*╔══〔 🔍 ᴏᴄʀ ʀᴇꜱᴜʟᴛ 〕══╗*\n\n` +
      `*📊 Info:*\n` +
      `◦❒ ${bi('Bahasa')} : ${langLabel(lang)}\n` +
      `◦❒ ${bi('Akurasi')}: ${confEmoji} ${conf}% ${confBar}\n` +
      `◦❒ ${bi('Karakter')}: ${text.length}\n\n` +
      `*📝 Hasil Teks:*\n` +
      `▬▬▬▬▬▬▬▬▬▬▬▬▬\n` +
      trimmed + '\n' +
      `▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n` +
      `_© ${botName}_`

    await Morela.sendMessage(m.chat, {
      text: result,
      contextInfo: buildContextInfo()
    }, { quoted: fkontak || m })

  } catch (e: any) {
    
    try { if (worker) await worker.terminate() } catch {}
    try { if (tmpFile && fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile) } catch {}

    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })

    const errMsg = e?.message || 'Unknown error'
    
    if (errMsg.includes('Failed to load') || errMsg.includes('404')) {
      return reply(
        `❌ *Bahasa "${lang}" tidak tersedia!*\n\n` +
        `Coba gunakan: \`${usedPrefix}${command} en\` atau \`${usedPrefix}${command} id\``
      )
    }

    reply(`❌ *OCR Error:*\n${errMsg}`)
  }
}

handler.help    = ['ocr', 'ocr en', 'ocr id']
handler.tags    = ['tools']
handler.command = ['ocr', 'baca', 'readtext', 'scantext']
handler.noLimit = false

export default handler