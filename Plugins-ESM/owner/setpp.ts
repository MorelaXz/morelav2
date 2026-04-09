// @ts-nocheck


import fs    from 'fs'
import path  from 'path'
import axios from 'axios'
import Jimp  from 'jimp'
import { downloadContentFromMessage as _dlContent } from '@itsukichan/baileys'
import { botName, imagePath } from '../../Library/utils.js'
import { invalidateFkontakCache } from '../../Morela.js'

const FKONTAK_PATH   = path.join(process.cwd(), 'media', 'fkontak.jpg')
const MENUIMG_CONFIG = path.join(process.cwd(), 'data', 'menuimg.json')

function saveMenuImgUrl(url: string) {
  try { fs.writeFileSync(MENUIMG_CONFIG, JSON.stringify({ url }, null, 2)) } catch {}
}

async function downloadFromUrl(url: string) {
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 20000 })
  const buf = Buffer.from(res.data)
  if (!buf.length) throw new Error('Buffer kosong dari URL')
  return buf
}

async function downloadFromMsg(imgMsg: unknown, downloadContentFromMessage: unknown) {
  const fn     = downloadContentFromMessage || _dlContent
  const stream = await fn(imgMsg, 'image')
  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  const buf = Buffer.concat(chunks)
  if (!buf.length) throw new Error('Buffer gambar kosong')
  return buf
}

async function resizeKeepRatio(buffer: Buffer, maxSize: unknown = 512) {
  const img   = await Jimp.read(buffer)
  const w     = img.bitmap.width
  const h     = img.bitmap.height
  const scale = Math.min(maxSize / w, maxSize / h)
  img.resize(Math.round(w * scale), Math.round(h * scale))
  return img.getBufferAsync(Jimp.MIME_JPEG)
}

const handler = async (m: any, { Morela, reply, text, usedPrefix, command, downloadContentFromMessage, fkontak }: any) => {

  const msg       = m.message
  const directImg = msg?.imageMessage
  const quotedImg = msg?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage
  const imgMsg    = directImg || quotedImg

  const urlMatch = text && text.trim().match(/https?:\/\/\S+/i)
  const isUrl    = !!urlMatch

  if (!imgMsg && !isUrl) {
    return reply(
      `╭──「 🖼️ *Set Gambar Bot* 」\n` +
      `│\n` +
      `│  *Mode 1* — Ganti Thumbnail:\n` +
      `│  \`${usedPrefix}${command} <url>\`\n` +
      `│\n` +
      `│  *Mode 2* — Ganti externalAdReply:\n` +
      `│  Kirim/reply foto + \`${usedPrefix}${command}\`\n` +
      `│\n` +
      `╰─────────────────────`
    )
  }

  await Morela.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

  
  
  
  if (isUrl) {
    const url = urlMatch[0]
    let imgBuffer
    try {
      imgBuffer = await downloadFromUrl(url)
    } catch (e) {
      await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      return reply(`❌ Gagal download dari URL\n\n_${(e as Error).message}_`)
    }

    saveMenuImgUrl(url)

    try {
      const resized = await resizeKeepRatio(imgBuffer, 800)
      const dir     = path.dirname(imagePath)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(imagePath, resized)
    } catch (e) {
      await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      return reply(`❌ Gagal simpan gambar\n\n_${(e as Error).message}_`)
    }

    try { invalidateFkontakCache() } catch {}
    await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
    return Morela.sendMessage(m.chat, {
      text: `✅ *Thumbnail berhasil diperbarui!*\n\n© ${botName}`
    }, { quoted: fkontak || m })
  }

  
  
  
  let imgBuffer
  try {
    imgBuffer = await downloadFromMsg(imgMsg, downloadContentFromMessage)
  } catch (e) {
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    return reply(`❌ Gagal download gambar\n\n_${(e as Error).message}_`)
  }

  try {
    const resized = await resizeKeepRatio(imgBuffer, 512)
    const dir     = path.dirname(FKONTAK_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(FKONTAK_PATH, resized)
  } catch (e) {
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    return reply(`❌ Gagal simpan file\n\n_${(e as Error).message}_`)
  }

  try { invalidateFkontakCache() } catch {}
  await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
  return Morela.sendMessage(m.chat, {
    text: `✅ *externalAdReply berhasil diperbarui!*\n\n© ${botName}`
  }, { quoted: fkontak || m })
}

handler.help        = ['setpp <url>', 'setpp <foto>']
handler.tags        = ['owner']
handler.command     = ['setpp']
handler.owner       = true
handler.noLimit     = true

export default handler