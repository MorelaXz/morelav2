// @ts-nocheck
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import ffmpeg from 'fluent-ffmpeg'
import { downloadContentFromMessage } from '@itsukichan/baileys'
import { bi, buildFkontak, sendCard, uploadImage, createSend, menuBuf, CHANNEL_URL, OWNER_WA, BOT_JID, imagePath, botName, botVersion } from '../../Library/utils.js'

const __filename = fileURLToPath(import.meta.url as string)
const __dirname  = path.dirname(__filename)

const TEMP_DIR = path.join(process.cwd(), 'media', 'temp')
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true })

const toWebp = buffer =>
  new Promise((resolve, reject) => {
    const stamp  = Date.now()
    const input  = path.join(TEMP_DIR, `in_${stamp}.jpg`)
    const output = path.join(TEMP_DIR, `out_${stamp}.webp`)

    fs.writeFileSync(input, buffer)

    ffmpeg(input)
      .on('error', (e: Error) => {
        try { fs.unlinkSync(input)  } catch {}
        try { fs.unlinkSync(output) } catch {}
        reject(e)
      })
      .on('end', () => {
        try { fs.unlinkSync(input) } catch {}
        const webp = fs.readFileSync(output)
        try { fs.unlinkSync(output) } catch {}
        resolve(webp)
      })
      .outputOptions([
        '-vcodec', 'libwebp',
        '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,fps=15',
        '-loop', '0',
        '-preset', 'default',
        '-an',
        '-vsync', '0'
      ])
      .save(output)
  })

const handler = async (m: any, { Morela, reply, fkontak }: any) => {
  const msg = m.message

  const imageMsg =
    msg?.imageMessage ||
    msg?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage ||
    msg?.viewOnceMessage?.message?.imageMessage ||
    null

  if (!imageMsg) return reply(
`╭──「 🎴 *Stiker* 」
│
│  Mau bikin stiker tapi ga kirim foto?
│  Otak dipake dikit lah.
│
│  📌 *Cara pakai:*
│  • Upload foto + caption *.s*
│  • Reply foto lalu ketik *.s*
│
╰─────────────────────`
  )

  await Morela.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

  let buffer
  try {
    const stream = await downloadContentFromMessage(imageMsg, 'image')
    const chunks = []
    for await (const c of stream) chunks.push(c)
    buffer = Buffer.concat(chunks)
    if (!buffer.length) throw new Error('Buffer kosong')
  } catch (e) {
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    return reply('❌ Gagal download foto. file lu aja bermasalah kayaknya.')
  }

  let webp
  try {
    webp = await toWebp(buffer)
  } catch (e) {
    console.error('[STIKER]', e)
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    return reply('❌ Gagal convert. ffmpeg aja sampe nyerah liat input lu.')
  }

  await Morela.sendMessage(m.chat, { sticker: webp }, { quoted: fkontak || m })
  await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
}

handler.help    = ['s']
handler.tags    = ['sticker']
handler.command = ['s', 'stiker', 'sticker']

export default handler