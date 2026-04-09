// @ts-nocheck


import axios from 'axios'
import fs from 'fs'
import path from 'path'
import os from 'os'
import FormData from 'form-data'
import { downloadContentFromMessage } from '@itsukichan/baileys'
import { bi, buildFkontak, sendCard, uploadImage, createSend, menuBuf, CHANNEL_URL, OWNER_WA, BOT_JID, imagePath, botName, botVersion } from '../../Library/utils.js'

const waContext = () => ({
  externalAdReply: {
    body:                  botName,
    thumbnail:             fs.existsSync(imagePath) ? fs.readFileSync(imagePath) : undefined,
    sourceUrl:             'https://www.whatsapp.com',
    mediaType:             2,
    renderLargerThumbnail: false,
    showAdAttribution:     false
  }
})

async function removeBg(imgBuffer: unknown) {
  const tmpFile = path.join(os.tmpdir(), `removebg_${Date.now()}.jpg`)
  fs.writeFileSync(tmpFile, imgBuffer)

  try {
    const form = new FormData()
    form.append('image', fs.createReadStream(tmpFile), path.basename(tmpFile))
    form.append('format', 'png')
    form.append('model', 'v1')

    const res = await axios.post('https://api2.pixelcut.app/image/matte/v1', form, {
      headers: {
        'User-Agent':        'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
        'Accept':            'application/json, text/plain, */*',
        'sec-ch-ua':         '"Chromium";v="139", "Not;A=Brand";v="99"',
        'x-locale':          'en',
        'x-client-version':  'web:pixa.com:4a5b0af2',
        'sec-ch-ua-mobile':  '?1',
        'sec-ch-ua-platform':'"Android"',
        'origin':            'https://www.pixa.com',
        'sec-fetch-site':    'cross-site',
        'sec-fetch-mode':    'cors',
        'sec-fetch-dest':    'empty',
        'referer':           'https://www.pixa.com/',
        'accept-language':   'id-ID,id;q=0.9,en-AU;q=0.8,en;q=0.7,en-US;q=0.6',
        ...form.getHeaders()
      },
      responseType: 'arraybuffer',
      timeout:      30000
    })

    const result = Buffer.from(res.data)
    if (!result.length) throw new Error('Buffer hasil kosong')
    return result
  } finally {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile)
  }
}

const handler = async (m: any, { Morela, reply, usedPrefix, command, downloadContentFromMessage, fkontak }: any) => {
  const msg = m.message
  const img =
    msg?.imageMessage ||
    msg?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage

  if (!img) return reply(
    `╭──「 🖼️ *Remove Background* 」\n│\n│  Reply gambar untuk menghapus\n│  latar belakangnya secara otomatis.\n│\n│  📌 *Format:*\n│  Reply foto + ${usedPrefix}${command}\n│\n╰─────────────────────`
  )

  await Morela.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

  let imgBuffer
  try {
    const stream = await downloadContentFromMessage(img, 'image')
    const chunks = []
    for await (const c of stream) chunks.push(c)
    imgBuffer = Buffer.concat(chunks)
    if (!imgBuffer.length) throw new Error('Buffer kosong')
    console.log('[REMOVEBG] Download gambar sukses, size:', imgBuffer.length, 'bytes')
  } catch (e) {
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    return reply('❌ Gagal download gambar: ' + (e as Error).message)
  }

  let resultBuffer
  try {
    resultBuffer = await removeBg(imgBuffer)
  } catch (e) {
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    return reply(`❌ Gagal proses gambar\n\n${(e as Error).message}`)
  }

  await Morela.sendMessage(m.chat, {
    image:   resultBuffer,
    caption: ' ',
    footer:
      `╭┈┈⬡「 📋 *ᴅᴇᴛᴀɪʟ* 」\n` +
      `┃ 🖼️ ꜰᴏʀᴍᴀᴛ: \`PNG\`\n` +
      `┃ 🤖 ᴍᴏᴅᴇʟ: \`pixelcut-v1\`\n` +
      `┃ 🎭 ᴍᴏᴅᴇ: \`Remove Background\`\n` +
      `╰┈┈⬡\n` +
      `© ${botName}`,
    contextInfo: waContext()
  }, { quoted: fkontak || m })

  await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
}

handler.help    = ['removebg <reply foto>']
handler.tags    = ['tools']
handler.command = ['removebg', 'pixa', 'nobg', 'nobackground']

export default handler