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
      url = (parsed.id || '').replace(/^(\.ytmp3|\.yta|\.mp3)\s*/i, '').trim()
    } catch {}
  }

  if (!url && m.text) url = m.text.replace(/^(\.ytmp3|\.yta|\.mp3)\s*/i, '').trim()
  if (!url) return reply('📝 Contoh: *.ytmp3 <link YouTube>*')
  if (!url.match(/(youtube\.com|youtu\.be)/)) return reply('❌ Link YouTube tidak valid')

  await Morela.sendMessage(m.chat, { react: { text: '📥', key: m.key } })

  try {
    const videoId  = extractVideoId(url)
    const thumbUrl = videoId ? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg` : null

    let title   = 'YouTube Audio'
    let channel = 'Unknown'
    try {
      const oembed = await axios.get(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, { timeout: 10000 })
      title   = oembed.data.title       || title
      channel = oembed.data.author_name || channel
    } catch {}

    
    const res  = await axios.get(`${FAA_BASE}/ytmp3`, { params: { url }, timeout: 120000 })
    const data = res.data

    
    const dlUrl =
      data?.result?.mp3          ||
      data?.result?.download_url ||
      data?.result?.url          ||
      data?.download_url         ||
      data?.url                  ||
      data?.link                 ||
      data?.audio                ||
      null

    if (!dlUrl) throw new Error(`API tidak memberikan link download. Respon: ${JSON.stringify(data).slice(0, 150)}`)

    
    const tempDir = path.join(process.cwd(), 'media', 'temp')
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })

    const stamp    = Date.now()
    const audioOut = path.join(tempDir, `${stamp}.mp3`)
    const thumbOut = path.join(tempDir, `${stamp}_thumb.jpg`)

    const audioRes = await axios.get(dlUrl, { responseType: 'arraybuffer', timeout: 120000 })
    fs.writeFileSync(audioOut, Buffer.from(audioRes.data))

    const sizeMB = fs.statSync(audioOut).size / 1024 / 1024

    let thumbBuffer: Buffer | null = null
    if (thumbUrl) {
      try {
        const tr = await axios.get(thumbUrl, { responseType: 'arraybuffer', timeout: 10000 })
        thumbBuffer = Buffer.from(tr.data)
        fs.writeFileSync(thumbOut, thumbBuffer)
      } catch {}
    }

    await Morela.sendMessage(m.chat, { react: { text: '📤', key: m.key } })

    await Morela.sendMessage(m.chat, {
      audio:    fs.readFileSync(audioOut),
      mimetype: 'audio/mpeg',
      fileName: `${title}.mp3`,
      contextInfo: {
        forwardingScore: 999,
        isForwarded:     true,
        forwardedNewsletterMessageInfo: {
          newsletterJid:   '120363420704282055@newsletter',
          newsletterName:  `🎵 ${title}`,
          serverMessageId: 143
        },
        ...(thumbBuffer ? {
          externalAdReply: {
            title,
            body:                  `By ${channel} • ${sizeMB.toFixed(2)} MB`,
            thumbnail:             thumbBuffer,
            sourceUrl:             url,
            mediaType:             1,
            renderLargerThumbnail: true,
            showAdAttribution:     false
          }
        } : {})
      }
    }, { quoted: fkontak || m })

    await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

    fs.unlinkSync(audioOut)
    if (thumbBuffer && fs.existsSync(thumbOut)) fs.unlinkSync(thumbOut)

  } catch (e) {
    console.error('[YTMP3 ERROR]', e)
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    reply('❌ Gagal download audio: ' + (e as Error).message)
  }
}

handler.command = ['ytmp3', 'yta', 'mp3']
handler.tags    = ['downloader']
handler.help    = ['ytmp3 <link YouTube>']

export default handler