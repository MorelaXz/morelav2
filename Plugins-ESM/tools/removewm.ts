// @ts-nocheck


import axios from 'axios'
import { downloadContentFromMessage } from '@itsukichan/baileys'
import { buildFkontak, botName } from '../../Library/utils.js'

const DYY_API_URL = 'https://api.dyysilence.biz.id/api'

function unwrapMsg(msg: string) {
  let m = msg || {}
  for (let i = 0; i < 8; i++) {
    if (m?.ephemeralMessage?.message)            { m = m.ephemeralMessage.message;            continue }
    if (m?.viewOnceMessage?.message)             { m = m.viewOnceMessage.message;             continue }
    if (m?.viewOnceMessageV2?.message)           { m = m.viewOnceMessageV2.message;           continue }
    if (m?.viewOnceMessageV2Extension?.message)  { m = m.viewOnceMessageV2Extension.message;  continue }
    if (m?.documentWithCaptionMessage?.message)  { m = m.documentWithCaptionMessage.message;  continue }
    break
  }
  return m
}

function pickImageNode(m: Record<string, unknown>) {
  
  if (m.quoted?.mtype === 'imageMessage') return m.quoted

  if (m.quoted?.message) {
    const uq = unwrapMsg(m.quoted.message)
    if (uq?.imageMessage) return uq.imageMessage
  }

  if (m.message) {
    const ur = unwrapMsg(m.message)
    if (ur?.imageMessage) return ur.imageMessage
  }

  return null
}

const handler = async (m: any, { Morela, reply, usedPrefix, command, fkontak }: any) => {
  
  const imageNode = pickImageNode(m)
  if (!imageNode) {
    return reply(
      `╭──「 🧹 *Remove Watermark* 」\n` +
      `│\n` +
      `│  Kirim atau reply foto lalu ketik:\n` +
      `│  *${usedPrefix}${command}*\n` +
      `│\n` +
      `│  📌 *Catatan:*\n` +
      `│  • Maks ukuran gambar: 20 MB\n` +
      `│  • Proses ±15–30 detik\n` +
      `│\n` +
      `╰─────────────────────`
    )
  }

  if ((imageNode.fileLength || 0) > 20 * 1024 * 1024) {
    return reply('❌ Gambar terlalu besar, maksimal *20 MB*')
  }

  await Morela.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

  let buffer
  try {
    const stream = await downloadContentFromMessage(imageNode, 'image')
    const chunks = []
    for await (const chunk of stream) chunks.push(chunk)
    buffer = Buffer.concat(chunks)
    if (!buffer.length) throw new Error('Buffer kosong setelah download')
  } catch (e) {
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    return reply(`❌ Gagal download gambar\n\n${(e as Error).message}`)
  }

  await Morela.sendMessage(m.chat, { react: { text: '⚙️', key: m.key } })

  let resultBuffer
  try {
    const response = await axios.post(
      `${DYY_API_URL}/ai-image/removewm`,
      { image: buffer.toString('base64') },
      { timeout: 120000 }
    )

    if (!response.data?.status || !response.data?.image) {
      throw new Error(response.data?.error || 'Gagal mendapatkan hasil dari API')
    }

    resultBuffer = Buffer.from(response.data.image, 'base64')
    if (!resultBuffer.length) throw new Error('Hasil gambar kosong')
  } catch (e) {
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    return reply(`❌ Proses remove watermark gagal\n\n${(e as Error).message}`)
  }

  await Morela.sendMessage(
    m.chat,
    {
      image:   resultBuffer,
      caption:
        `╭┈┈⬡「 🧹 *ʀᴇᴍᴏᴠᴇ ᴡᴀᴛᴇʀᴍᴀʀᴋ* 」\n` +
        `┃ 🤖 ᴍᴏᴅᴇʟ : \`DyySilence AI\`\n` +
        `┃ 🎭 ᴍᴏᴅᴇ  : \`Remove Watermark\`\n` +
        `┃ 🖼️ ꜰᴏʀᴍᴀᴛ : \`JPEG\`\n` +
        `╰┈┈⬡\n` +
        `© ${botName}`
    },
    { quoted: fkontak || m }
  )

  await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
}

handler.help     = ['removewm <reply foto>']
handler.tags     = ['tools', 'ai']
handler.command  = ['removewm', 'nowm', 'hapuswm']
handler.noLimit  = false
handler.owner    = false
handler.premium  = false
handler.group    = false
handler.private  = false
handler.admin    = false
handler.botAdmin = false

export default handler