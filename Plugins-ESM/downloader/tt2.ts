// @ts-nocheck
import axios        from 'axios'
import * as cheerio from 'cheerio'
import { bi, CHANNEL_URL, imagePath, botName } from '../../Library/utils.js'
import fs from 'fs'

const UA_DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 Edg/135.0.0.0'
const UA_MOBILE  = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36'


function extractCookies(headers: any): string {
  const raw = headers['set-cookie'] || []
  return raw.map((c: string) => c.split(';')[0]).join('; ')
}


async function scrapeTiktokVideo(url: string) {
  const res = await axios.get(url, {
    headers: {
      'User-Agent':      UA_DESKTOP,
      'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer':         'https://www.tiktok.com/',
    },
    timeout:      30000,
    maxRedirects: 10,
  })

  
  const cookieStr = extractCookies(res.headers)

  const $             = cheerio.load(res.data)
  const scriptContent = $('#__UNIVERSAL_DATA_FOR_REHYDRATION__').html() || $('#SIGI_STATE').html()
  if (!scriptContent) throw new Error('Gagal scrape data (Captcha/IP Block)')

  const jsonData   = JSON.parse(scriptContent)
  const scope      = jsonData?.__DEFAULT_SCOPE__
  const itemStruct = scope?.['webapp.video-detail']?.itemInfo?.itemStruct
                  || Object.values(jsonData?.ItemModule || {})[0]

  if (!itemStruct) throw new Error('Data video tidak ditemukan')

  const videoData = itemStruct.video
  let playUrl = videoData?.playAddr || videoData?.downloadAddr

  
  if (videoData?.bitrateInfo?.length) {
    const best    = [...videoData.bitrateInfo].sort((a: any, b: any) => b.Bitrate - a.Bitrate)[0]
    const urlList = best?.PlayAddr?.UrlList || []
    const hdUrl   = urlList.find((u: string) => u.includes('v16-webapp-prime'))
                 || urlList.find((u: string) => u.includes('v19-webapp-prime'))
                 || urlList.find((u: string) => !u.includes('aweme/v1/play'))
                 || urlList[0]
    if (hdUrl) playUrl = hdUrl
  }

  return {
    playUrl,
    cookieStr, 
    desc:     itemStruct.desc || '',
    author:   itemStruct.author?.nickname || itemStruct.author?.uniqueId || 'unknown',
    uniqueId: itemStruct.author?.uniqueId || '',
    duration: videoData?.duration || 0,
    views:    itemStruct.statsV2?.playCount || itemStruct.stats?.playCount || 0,
    likes:    itemStruct.statsV2?.diggCount || itemStruct.stats?.diggCount || 0,
    music:    itemStruct.music?.title || '',
  }
}


async function scrapeTiktokSlide(url: string) {
  const res = await axios.get(url, {
    headers: {
      'User-Agent': UA_MOBILE,
      'Accept':     'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Referer':    'https://www.tiktok.com/',
    },
    timeout:      30000,
    maxRedirects: 10,
  })

  const cookieStr     = extractCookies(res.headers)
  const $             = cheerio.load(res.data)
  const scriptContent = $('#__UNIVERSAL_DATA_FOR_REHYDRATION__').html() || $('#SIGI_STATE').html()
  if (!scriptContent) throw new Error('Gagal scrape data (Captcha/IP Block)')

  const jsonData   = JSON.parse(scriptContent)
  const scope      = jsonData?.__DEFAULT_SCOPE__
  const itemStruct = scope?.['webapp.reflow.video.detail']?.itemInfo?.itemStruct
                  || scope?.['webapp.video-detail']?.itemInfo?.itemStruct

  if (!itemStruct)         throw new Error('Data slide tidak ditemukan')
  if (!itemStruct.imagePost) throw new Error('Bukan konten slide — coba .tt2 untuk video')

  const images   = itemStruct.imagePost.images.map((img: any) => img.imageURL.urlList[0])
  const audioUrl = itemStruct.music?.playUrl

  return {
    images,
    audioUrl,
    cookieStr,
    desc:     itemStruct.desc || '',
    author:   itemStruct.author?.nickname || itemStruct.author?.uniqueId || 'unknown',
    uniqueId: itemStruct.author?.uniqueId || '',
    music:    itemStruct.music?.title || '',
    views:    itemStruct.statsV2?.playCount || itemStruct.stats?.playCount || 0,
    likes:    itemStruct.statsV2?.diggCount || itemStruct.stats?.diggCount || 0,
  }
}


async function downloadVideo(videoUrl: string, cookieStr: string): Promise<Buffer> {
  const res = await axios.get(videoUrl, {
    responseType: 'arraybuffer',
    headers: {
      'User-Agent':      UA_DESKTOP,
      'Referer':         'https://www.tiktok.com/',
      'Cookie':          cookieStr,   
      'Accept':          'video/webm,video/ogg,video/*;q=0.9,*/*;q=0.5',
      'Accept-Language': 'en-US,en;q=0.9',
      'Range':           'bytes=0-',
    },
    timeout:      90000,
    maxRedirects: 10,
  })
  return Buffer.from(res.data)
}

function numFmt(n: any): string {
  const num = parseInt(n) || 0
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M'
  if (num >= 1_000)     return (num / 1_000).toFixed(1) + 'K'
  return String(num)
}


const handler = async (m: any, { Morela, args, reply, fkontak, command }: any) => {
  const url   = args[0]
  const thumb = fs.existsSync(imagePath) ? fs.readFileSync(imagePath) : undefined

  if (!url) {
    return reply(
      `╭╌「 🎵 *${bi('TikTok Downloader')}* 」\n` +
      `┃ Download video & slide TikTok\n` +
      `╰╌\n\n` +
      `*Command:*\n` +
      `┃ .tt2 <link>       — video no watermark\n` +
      `┃ .ttslide2 <link>  — slide gambar\n\n` +
      `*Contoh:*\n` +
      `┃ .tt2 https://vm.tiktok.com/xxx\n\n` +
      `© ${botName}`
    )
  }

  if (!url.includes('tiktok.com') && !url.includes('vm.tiktok')) {
    return reply('❌ Link tidak valid!\nContoh: https://vm.tiktok.com/xxx')
  }

  await Morela.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

  const isSlide = command === 'ttslide2'

  try {
    if (isSlide) {
      
      const data = await scrapeTiktokSlide(url)

      const caption =
        `╭╌「 🖼️ *${bi('TikTok Slide')}* 」\n` +
        `┃ 👤 *${data.author}*\n` +
        `┃ 📝 ${data.desc.slice(0, 80)}${data.desc.length > 80 ? '...' : ''}\n` +
        `┃ 🎵 ${data.music}\n` +
        `┃ 👁️ ${numFmt(data.views)}  ❤️ ${numFmt(data.likes)}\n` +
        `┃ 🖼️ Total: ${data.images.length} gambar\n` +
        `╰╌\n\n© ${botName}`

      for (let i = 0; i < data.images.length; i++) {
        await Morela.sendMessage(m.chat, {
          image:   { url: data.images[i] },
          caption: i === 0 ? caption : `🖼️ ${i + 1}/${data.images.length}`,
        }, { quoted: i === 0 ? (fkontak || m) : undefined })
      }

      if (data.audioUrl) {
        await Morela.sendMessage(m.chat, {
          audio:    { url: data.audioUrl },
          mimetype: 'audio/mpeg',
          ptt:      false,
        }, { quoted: fkontak || m })
      }

    } else {
      
      const data = await scrapeTiktokVideo(url)
      if (!data.playUrl) throw new Error('URL video tidak ditemukan')

      const caption =
        `╭╌「 🎵 *${bi('TikTok Downloader')}* 」\n` +
        `┃ 👤 *${data.author}* (@${data.uniqueId})\n` +
        `┃ 📝 ${data.desc.slice(0, 100)}${data.desc.length > 100 ? '...' : ''}\n` +
        `┃ 🎵 ${data.music}\n` +
        `┃ 👁️ ${numFmt(data.views)}  ❤️ ${numFmt(data.likes)}\n` +
        `┃ ⏱️ ${data.duration}s\n` +
        `╰╌\n\n© ${botName}`

      
      const videoBuf = await downloadVideo(data.playUrl, data.cookieStr)

      await Morela.sendMessage(m.chat, {
        video:    videoBuf,
        caption,
        mimetype: 'video/mp4',
        contextInfo: {
          externalAdReply: {
            title:                 '🎵 TikTok Downloader',
            body:                  `${botName} Multidevice 🔥`,
            mediaType:             1,
            renderLargerThumbnail: false,
            showAdAttribution:     false,
            sourceUrl:             CHANNEL_URL,
            thumbnail:             thumb,
          }
        }
      }, { quoted: fkontak || m })
    }

    await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

  } catch (e: any) {
    console.error('[TT2]', e.message)
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    reply(`❌ Error: ${e.message}`)
  }
}

handler.command  = ['tt2', 'ttslide2', 'tiktok2']
handler.tags     = ['downloader']
handler.help     = ['tt2 <link>', 'ttslide2 <link>']
handler.noLimit  = false
handler.owner    = false
handler.premium  = false
handler.group    = false
handler.private  = false
handler.admin    = false
handler.botAdmin = false

export default handler