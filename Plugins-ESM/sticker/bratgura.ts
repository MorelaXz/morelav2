// @ts-nocheck
import axios   from 'axios'
import fs      from 'fs'
import path    from 'path'
import ffmpeg  from 'fluent-ffmpeg'
import { buildFkontak, botName } from '../../Library/utils.js'

const API = 'https://api-evelyne.vercel.app/api/maker/bratgura'
const TMP = path.join(process.cwd(), 'media', 'bratgura')
if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true })

const imageToWebp = (input, output) =>
  new Promise((resolve, reject) => {
    ffmpeg(input)
      .outputOptions([
        '-vcodec', 'libwebp',
        '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:white',
        '-loop', '0', '-an', '-vsync', '0',
        '-frames:v', '1', '-quality', '100',
        '-compression_level', '0', '-preset', 'photo'
      ])
      .on('end', resolve)
      .on('error', reject)
      .save(output)
  })

const handler = async (m: any, { Morela, text, reply, fkontak }: any) => {
  if (!text?.trim()) return reply('Contoh: *.bratgura Njirr lah*')
  if (text.length > 500) return reply('❌ Text terlalu panjang! Maks *500 karakter*.')

  const id   = Date.now()
  const img  = path.join(TMP, `${id}.png`)
  const webp = path.join(TMP, `${id}.webp`)

  await Morela.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

  try {
    const res = await axios.get(API, {
      params: { text: text.trim() },
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/png, image/jpeg, image*'
      }
    })

    const contentType = res.headers['content-type'] || ''
    if (contentType.includes('application/json')) {
      const json = JSON.parse(Buffer.from(res.data).toString())
      throw new Error(json.message || json.error || 'API error')
    }

    const buffer = Buffer.from(res.data)
    if (buffer.length < 500) throw new Error('Generated image terlalu kecil / rusak')

    fs.writeFileSync(img, buffer)
    await imageToWebp(img, webp)

    await Morela.sendMessage(m.chat,
      { sticker: fs.readFileSync(webp) },
      { quoted: fkontak || m }
    )

    await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

  } catch (e) {
    console.error('[BRATGURA]', (e as Error).message)
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    reply('❌ Gagal buat stiker: ' + (e as Error).message)
  } finally {
    try { fs.unlinkSync(img)  } catch {}
    try { fs.unlinkSync(webp) } catch {}
  }
}

handler.command = ['bratgura', 'bgura']
handler.tags    = ['sticker']
handler.help    = ['bratgura <teks>']

export default handler