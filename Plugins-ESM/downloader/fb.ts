// @ts-nocheck
import axios from 'axios'
import * as cheerio from 'cheerio'

const handler = async (m: any, { args, reply, Morela, fkontak }: any) => {
  const url = args[0]
  if (!url) return reply('Kirim link Facebook!\nContoh: .fb https://facebook.com/...')
  if (!url.includes('facebook.com') && !url.includes('fb.watch')) {
    return reply('❌ Link tidak valid!')
  }

  await Morela.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

  try {
    
    const page = await axios.get('https://fdownloader.net/id', {
      headers: {
        'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/144.0.0.0 Mobile Safari/537.36',
        'accept-language': 'id-ID,id;q=0.9'
      }
    })

    const k_exp = page.data.match(/k_exp="([^"]+)"/)?.[1]
    const k_token = page.data.match(/k_token="([^"]+)"/)?.[1]

    if (!k_exp || !k_token) return reply('❌ Gagal ambil token!')

    const { data } = await axios.post(
      'https://v3.fdownloader.net/api/ajaxSearch',
      new URLSearchParams({
        q: url,
        lang: 'id',
        web: 'fdownloader.net',
        v: 'v2',
        k_exp,
        k_token,
        w: '',
        cftoken: '0'
      }),
      {
        headers: {
          'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'accept': '*/*',
          'referer': 'https://fdownloader.net/id',
          'origin': 'https://fdownloader.net',
          'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/144.0.0.0 Mobile Safari/537.36'
        }
      }
    )

    if (data.status !== 'ok') return reply('❌ Gagal: ' + data.status)

    const $ = cheerio.load(data.data)

    let videoUrl = null
    let quality = ''

    $('a.download-link-fb').each((i: number, el: unknown) => {
      if (!videoUrl) {
        videoUrl = $(el).attr('href')
        quality = $(el).closest('tr').find('.video-quality').text()
      }
    })

    if (!videoUrl) return reply('❌ Link download tidak ditemukan!')

    const thumb = $('img').first().attr('src') || ''

    await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

    await Morela.sendMessage(m.chat, {
      video: { url: videoUrl },
      caption: `✅ *Facebook Downloader*\n\n🎬 Kualitas: ${quality}\n💾 Via FDownloader`,
      mimetype: 'video/mp4'
    }, { quoted: fkontak || m })

  } catch (e) {
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    reply(`❌ Error: ${(e as Error).message}`)
  }
}

handler.command = ['fb', 'facebook']
handler.tags = ['downloader']
handler.help = ['fb <link>', 'facebook <link>']
export default handler