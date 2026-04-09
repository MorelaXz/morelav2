import path from 'path'
import axios from 'axios'
import fs from 'fs'
import { downloadContentFromMessage } from '@itsukichan/baileys'
import { bi, buildFkontak, sendCard, uploadImage, createSend, menuBuf, CHANNEL_URL, OWNER_WA, BOT_JID, imagePath, botName, botVersion } from '../../Library/utils.js'

const IMGBB_KEY = 'a0fa1c4b6c7b1570879c6d71b590f4bf'
const API_URL   = 'https://kazztzyy.my.id'
const API_KEY   = 'YOUR_TOKEN_HERE'

const waContext = () => ({
  externalAdReply: {
    body: botName,
    thumbnail: fs.existsSync(imagePath) ? fs.readFileSync(imagePath) : undefined,
    sourceUrl: 'https://www.whatsapp.com',
    mediaType: 2,
    renderLargerThumbnail: false,
    showAdAttribution: false
  }
})

const handler = async (m: any, { Morela, text, usedPrefix, command, reply, fkontak }: any) => {
  const msg = m.message
  const img =
    msg?.imageMessage ||
    msg?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage

  if (!img || !text) return reply(
`╭──「 🎵 *Music Card* 」
│
│  Reply gambar cover lagu dengan:
│
│  📌 *Format:*
│  ${usedPrefix}${command} judul | nama artis
│
│  📌 *Contoh:*
│  ${usedPrefix}${command} Resah Jadi Luka | Daun Jatuh
│
╰─────────────────────`
  )

  const parts = text.split('|')
  if (parts.length < 2) return reply(
`❌ Format salah!\n\nGunakan: ${usedPrefix}${command} judul | nama artis`
  )

  const judul = parts[0].trim()
  const nama  = parts[1].trim()

  await Morela.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

  let buffer
  try {
    const stream = await downloadContentFromMessage(img, 'image')
    const chunks = []
    for await (const c of stream) chunks.push(c)
    buffer = Buffer.concat(chunks)
    if (!buffer.length) throw new Error('Buffer kosong')
  } catch {
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    return reply('❌ Gagal download gambar')
  }

  let imageUrl
  try {
    const base64 = buffer.toString('base64')
    const upload = await axios.post(
      `https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`,
      new URLSearchParams({ image: base64 }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 30000 }
    )
    imageUrl = upload.data?.data?.url
    if (!imageUrl) throw new Error('URL kosong')
  } catch {
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    return reply('❌ Upload gambar gagal')
  }

  let result
  try {
    const res = await axios.get(
      `${API_URL}/api/maker/musiccard`,
      {
        params: { image: imageUrl, judul, nama, apikey: API_KEY },
        responseType: 'arraybuffer',
        timeout: 60000
      }
    )
    result = Buffer.from(res.data)
    if (!result.length) throw new Error('Hasil kosong')
  } catch {
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    return reply('❌ Proses Music Card gagal')
  }

  await Morela.sendMessage(m.chat, {
    image: result,
    caption: `🎵 *${judul}*\n👤 ${nama}`,
    contextInfo: waContext()
  }, { quoted: fkontak || m })

  await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
}

handler.help    = ['musiccard judul | nama artis']
handler.tags    = ['maker']
handler.command = ['musiccard']

export default handler