// @ts-nocheck
import fs   from 'fs'
import path from 'path'
import axios from 'axios'

const FAA_BASE = 'https://api-faa.my.id/faa'

function extractVideoId(url: string) {
  const match = url.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/)
  return match ? match[1] : null
}

const handler = async (m: any, { Morela, reply, fkontak }: any) => {
  let url = ''

  const interactive = m.message?.interactiveResponseMessage?.nativeFlowResponseMessage
  if (interactive?.paramsJson) {
    try {
      const parsed = JSON.parse(interactive.paramsJson)
      url = (parsed.id || '').replace(/^(\.ytmp4|\.ytv|\.mp4)\s*/i, '').trim()
    } catch {}
  }

  if (!url && m.text) url = m.text.replace(/^(\.ytmp4|\.ytv|\.mp4)\s*/i, '').trim()
  if (!url) return reply('📝 Contoh: *.ytmp4 <link YouTube>*')
  if (!url.match(/(youtube\.com|youtu\.be)/)) return reply('❌ Link YouTube tidak valid')

  await Morela.sendMessage(m.chat, { react: { text: '📥', key: m.key } })

  try {
    const videoId  = extractVideoId(url)
    const thumbUrl = videoId ? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg` : null

    let title   = 'YouTube Video'
    let channel = 'Unknown'
    try {
      const oembed = await axios.get(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, { timeout: 10000 })
      title   = oembed.data.title       || title
      channel = oembed.data.author_name || channel
    } catch {}

    
    const res  = await axios.get(`${FAA_BASE}/ytmp4`, { params: { url }, timeout: 120000 })
    const data = res.data

    
    const dlUrl =
      data?.result?.mp4          ||
      data?.result?.download_url ||
      data?.result?.url          ||
      data?.download_url         ||
      data?.url                  ||
      data?.link                 ||
      data?.video                ||
      null

    if (!dlUrl) throw new Error(`API tidak memberikan link download. Respon: ${JSON.stringify(data).slice(0, 150)}`)

    
    const tempDir = path.join(process.cwd(), 'media', 'temp')
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })

    const stamp    = Date.now()
    const videoOut = path.join(tempDir, `${stamp}.mp4`)
    const thumbOut = path.join(tempDir, `${stamp}_thumb.jpg`)

    const videoRes = await axios.get(dlUrl, { responseType: 'arraybuffer', timeout: 180000 })
    fs.writeFileSync(videoOut, Buffer.from(videoRes.data))

    const sizeMB = fs.statSync(videoOut).size / 1024 / 1024
    if (sizeMB > 100) {
      fs.unlinkSync(videoOut)
      return reply(`❌ File terlalu besar (${sizeMB.toFixed(2)} MB). Batas maksimal adalah 100MB.`)
    }

    let thumbBuffer: Buffer | null = null
    if (thumbUrl) {
      try {
        const tr = await axios.get(thumbUrl, { responseType: 'arraybuffer', timeout: 10000 })
        thumbBuffer = Buffer.from(tr.data)
        fs.writeFileSync(thumbOut, thumbBuffer)
      } catch {}
    }

    await Morela.sendMessage(m.chat, { react: { text: '📤', key: m.key } })

    const msgObj: any = {
      video:    fs.readFileSync(videoOut),
      mimetype: 'video/mp4',
      fileName: `${title}.mp4`,
      caption:  `🎬 *${title}*\n👤 ${channel}\n📊 ${sizeMB.toFixed(2)} MB`
    }

    if (thumbBuffer) {
      msgObj.jpegThumbnail = thumbBuffer
      msgObj.contextInfo   = {
        externalAdReply: {
          title,
          body:                  `By ${channel}`,
          thumbnail:             thumbBuffer,
          sourceUrl:             url,
          mediaType:             2,
          renderLargerThumbnail: true,
          showAdAttribution:     false
        }
      }
    }

    await Morela.sendMessage(m.chat, msgObj, { quoted: fkontak || m })
    await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

    fs.unlinkSync(videoOut)
    if (thumbBuffer && fs.existsSync(thumbOut)) fs.unlinkSync(thumbOut)

  } catch (e) {
    console.error('[YTMP4 ERROR]', e)
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    reply('❌ Gagal download video: ' + (e as Error).message)
  }
}

handler.command = ['ytmp4', 'ytv', 'mp4']
handler.tags    = ['downloader']
handler.help    = ['ytmp4 <link YouTube>']

export default handler