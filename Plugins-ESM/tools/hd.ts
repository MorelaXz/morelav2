// @ts-nocheck
import axios      from 'axios'
import FormData   from 'form-data'
import fs         from 'fs'
import path       from 'path'
import { downloadContentFromMessage } from '@itsukichan/baileys'
import { botName } from '../../Library/utils.js'

const TMP_DIR = path.join(process.cwd(), 'media', 'temp')
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true })


async function uploadDeline(buffer: Buffer, ext = 'jpg'): Promise<string> {
  const fd = new FormData()
  fd.append('file', buffer, { filename: `file.${ext}`, contentType: 'image/jpeg' })
  const res = await axios.post('https://api.deline.web.id/uploader', fd, {
    headers: fd.getHeaders(),
    timeout: 30000,
    maxBodyLength:   20 * 1024 * 1024,
    maxContentLength: 20 * 1024 * 1024
  })
  const link = res.data?.result?.link || res.data?.url || res.data?.path
  if (!link) throw new Error('Upload gagal: ' + JSON.stringify(res.data).slice(0, 100))
  return link
}


async function superHD(imageUrl: string): Promise<Buffer> {
  const res = await axios.get('https://api.deline.web.id/tools/hd', {
    params: { url: imageUrl },
    responseType: 'arraybuffer',
    timeout: 120000,
    headers: { 'User-Agent': 'Mozilla/5.0' }
  })
  const buf = Buffer.from(res.data)
  if (buf.length < 1000) throw new Error('Response tidak valid: ' + buf.toString().slice(0, 100))
  return buf
}

const handler = async (m: any, { Morela, reply }: any) => {
  const quoted = m.quoted || m
  const mime   = quoted.mimetype || quoted.message?.imageMessage?.mimetype || ''

  if (!mime.startsWith('image/')) return reply(
    `╭╌「 🖼️ *Super HD* 」\n` +
    `┃ Reply gambar dengan *.hd*\n` +
    `╰╌\n\n© ${botName}`
  )

  await Morela.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

  try {
    
    const imgMsg = quoted.message?.imageMessage || quoted
    const stream = await downloadContentFromMessage(imgMsg, 'image')
    const chunks: Buffer[] = []
    for await (const chunk of stream) chunks.push(chunk)
    const imgBuf = Buffer.concat(chunks)

    
    const imageUrl = await uploadDeline(imgBuf)

    
    const resultBuf = await superHD(imageUrl)

    await Morela.sendMessage(m.chat, {
      image:   resultBuf,
      caption: `╭╌「 🖼️ *Super HD* 」\n┃ ✅ Selesai!\n╰╌\n\n© ${botName}`,
      mimetype: 'image/jpeg'
    }, { quoted: m })

    await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

  } catch (e: any) {
    console.error('[HD DELINE]', e.message)
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    reply('❌ Gagal: ' + e.message)
  }
}

handler.command = ['hd', 'superhd']
handler.tags    = ['tools']
handler.help    = ['hd <reply gambar> — Super HD via Deline']
handler.noLimit = false
handler.owner   = false

export default handler