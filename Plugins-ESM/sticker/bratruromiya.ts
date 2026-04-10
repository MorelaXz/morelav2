// @ts-nocheck
import fs from 'fs'
import path from 'path'
import axios from 'axios'
import ffmpeg from 'fluent-ffmpeg'
import { bi, buildFkontak, sendCard, uploadImage, createSend, menuBuf, CHANNEL_URL, OWNER_WA, BOT_JID, imagePath, botName, botVersion } from '../../Library/utils.js'

const API_URL = 'https://api-evelyne.vercel.app'
const API_KEY = 'FreeLimit'

const TMP = path.join(process.cwd(), 'media', 'brat')
if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true })

const ppBase64 = fs.existsSync(imagePath) ? fs.readFileSync(imagePath).toString('base64') : ''

const imageToWebp = (input, output) =>
  new Promise((resolve, reject) => {
    ffmpeg(input)
      .outputOptions([
        '-vcodec', 'libwebp',
        '-vf', 'scale=1024:1024:force_original_aspect_ratio=decrease,pad=1024:1024:(ow-iw)/2:(oh-ih)/2:white,scale=512:512',
        '-loop', '0',
        '-an',
        '-vsync', '0',
        '-frames:v', '1',
        '-quality', '100',
        '-compression_level', '0',
        '-preset', 'photo'
      ])
      .on('end', resolve)
      .on('error', (err: Error) => {
        console.error('[FFMPEG ERROR]', err.message)
        reject(err)
      })
      .save(output)
  })

const handler = async (m: any, { Morela, text, usedPrefix, command, reply, fkontak }: any) => {
  if (!text) return reply(
`╭──「 🌸 *Brat RuroMiya* 」
│
│  Masukkan teks!
│
│  📌 *Contoh:*
│  ${usedPrefix}${command} halo dunia
│
╰─────────────────────`
  )

  await Morela.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

  const id   = Date.now()
  const img  = path.join(TMP, `${id}.png`)
  const webp = path.join(TMP, `${id}.webp`)

  try {
    const res = await axios.get(
      `${API_URL}/api/maker/bratruromiya?text=${encodeURIComponent(text)}&apikey=${API_KEY}`,
      { responseType: 'arraybuffer', timeout: 20000 }
    )

    const contentType = res.headers['content-type'] || ''
    if (!contentType.includes('image')) throw new Error(`Bukan gambar (${contentType})`)

    fs.writeFileSync(img, res.data)
    await imageToWebp(img, webp)

    await Morela.sendMessage(m.chat, {
      sticker: fs.readFileSync(webp)
    }, { quoted: fkontak || m })

    await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

  } catch (e) {
    console.error('[BRATRUROMIYA]', e?.message || e)
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    reply('❌ Gagal membuat stiker: ' + (e?.message || 'unknown error'))
  } finally {
    try { fs.unlinkSync(img) } catch {}
    try { fs.unlinkSync(webp) } catch {}
  }
}

handler.help    = ['bratruromiya <teks>']
handler.tags    = ['sticker']
handler.command = ['bratruromiya', 'bruromiya']

export default handler
