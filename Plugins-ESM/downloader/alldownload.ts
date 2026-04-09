// @ts-nocheck
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { bi, buildFkontak, sendCard, uploadImage, createSend, menuBuf, CHANNEL_URL, OWNER_WA, BOT_JID, imagePath, botName, botVersion } from '../../Library/utils.js'

class DownrScraper {
  constructor() {
    this.baseURL = 'https://downr.org'
    this.headers = {
      'accept': '*/*',
      'content-type': 'application/json',
      'origin': 'https://downr.org',
      'referer': 'https://downr.org/',
      'user-agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36'
    }
  }

  async getSessionCookie() {
    const baseCookie = '_ga=GA1.1.536005378.1770437315; _clck=17lj13q%5E2%5Eg3d'
    const res = await axios.get(`${this.baseURL}/.netlify/functions/analytics`, {
      headers: { ...this.headers, cookie: baseCookie }
    })
    const sess = res.headers['set-cookie']?.[0]?.split(';')[0]
    return sess ? `${baseCookie}; ${sess}` : baseCookie
  }

  async fetch(url) {
    const cookie = await this.getSessionCookie()
    const res = await axios.post(
      `${this.baseURL}/.netlify/functions/nyt`,
      { url },
      { headers: { ...this.headers, cookie } }
    )
    return res.data
  }
}

const urlRegex = /https?:\/\/(?:www\.|m\.|vm\.|vt\.|v\.|open\.)?(?:tiktok\.com|instagram\.com|facebook\.com|fb\.watch|twitter\.com|x\.com|youtube\.com|youtu\.be|threads\.net|threads\.com|pin\.it|pinterest\.com|snapchat\.com|spotify\.com|soundcloud\.com)(?:[\/?#][^\s]*)?/gi

async function processDownload(Morela: Record<string, unknown>, m: Record<string, unknown>, url: string) {
  await Morela.sendMessage(m.chat, { react: { text: '🔍', key: m.key } })

  const downr = new DownrScraper()
  const data = await downr.fetch(url)

  if (!data?.medias?.length) throw new Error('Media tidak ditemukan')

  const medias = data.medias
  const images = medias.filter((v: unknown) => v.type === 'image')
  const videos = medias.filter((v: unknown) => v.type === 'video')
  const audios = medias.filter((v: unknown) => v.type === 'audio')

  if (/tiktok\.com/i.test(url)) {
    const video =
      videos.find((v: unknown) => v.quality === 'no_watermark') ||
      videos.find((v: unknown) => v.quality === 'hd_no_watermark') ||
      videos[0]

    if (video) {
      await Morela.sendMessage(m.chat, {
        video: { url: video.url },
        mimetype: 'video/mp4'
      }, { quoted: fkontak || m })
    }

    if (!videos.length && images.length) {
      for (const img of images) {
        await Morela.sendMessage(m.chat, {
          image: { url: img.url }
        }, { quoted: fkontak || m })
      }
    }

    if (audios[0]) {
      await Morela.sendMessage(m.chat, {
        audio: { url: audios[0].url },
        mimetype: 'audio/mpeg'
      }, { quoted: fkontak || m })
    }

    return
  }

  if (images.length) {
    for (const img of images) {
      await Morela.sendMessage(m.chat, {
        image: { url: img.url }
      }, { quoted: fkontak || m })
    }
    return
  }

  if (videos.length) {
    await Morela.sendMessage(m.chat, {
      video: { url: videos[0].url },
      mimetype: 'video/mp4'
    }, { quoted: fkontak || m })
    return
  }

  if (audios.length) {
    await Morela.sendMessage(m.chat, {
      audio: { url: audios[0].url },
      mimetype: 'audio/mpeg'
    }, { quoted: fkontak || m })
    return
  }

  throw new Error('Format media tidak didukung')
}

const handler = async (m: any, { Morela, text, usedPrefix, command, reply, fkontak }: any) => {
  
  if (!usedPrefix) return
  if (!text) return reply(
`╭──「 📥 *Auto Download* 」
│
│  Masukkan link media!
│
│  📌 *Support:*
│  TikTok, Instagram, YouTube
│  Twitter/X, Facebook, Pinterest
│  Threads, Snapchat, Spotify
│  SoundCloud
│
│  💡 *Contoh:*
│  ${usedPrefix}${command} https://vm.tiktok.com/xxx
│
╰─────────────────────`
  )

  const urls = text.match(urlRegex)
  if (!urls?.length) return reply('❌ Link tidak valid atau platform tidak didukung')

  try {
    await processDownload(Morela, m, urls[0])
    await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
  } catch (e) {
    console.error('[AUTODOWNLOAD ERROR]', e)
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    reply('❌ Gagal download: ' + (e?.message || e))
  }
}

handler.help    = ['dl <link>', 'alldownload <link>']
handler.tags    = ['downloader']
handler.command = ['dl', 'alldownload', 'download']

export default handler