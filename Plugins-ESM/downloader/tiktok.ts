// @ts-nocheck
import axios from 'axios'

const handler = async (m: any, { args, reply, Morela, fkontak }: any) => {
  const url = args[0]

  if (!url) return reply('Link mana, jenius? Kirim link TikTok yang bener.\nContoh: .tt https://vm.tiktok.com/xxx')

  if (!url.includes('tiktok.com') && !url.includes('vm.tiktok')) {
    return reply('❌ Itu link apaan sih? Belajar bedain TikTok dulu sana.')
  }

  await Morela.sendMessage(m.chat, {
    react: { text: '⏳', key: m.key }
  })

  try {
    
    const page = await axios.get('https://ssstik.io/id', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36',
        'Accept-Language': 'id-ID,id;q=0.9'
      }
    })

    const ttMatch = page.data.match(/s_tt\s*=\s*'([^']+)'/)
    if (!ttMatch) return reply('❌ Gagal ambil token. Situsnya aja males, apalagi gue.')
    const tt = ttMatch[1]

    const cookies = page.headers['set-cookie'] || []
    const cookieStr = cookies.map((c: string) => c.split(';')[0]).join('; ')

    
    const { data } = await axios.post(
      'https://ssstik.io/abc?url=dl',
      new URLSearchParams({ id: url, locale: 'id', tt }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'HX-Request': 'true',
          'HX-Trigger': '_gcaptcha_pt',
          'HX-Target': 'target',
          'HX-Current-URL': 'https://ssstik.io/id',
          'Cookie': cookieStr,
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36',
          'Referer': 'https://ssstik.io/id'
        }
      }
    )

    
    const videoUrl = data.match(/href="(https:\/\/tikcdn\.io\/ssstik\/\d+[^"]+)"/)?.[1]
    const author = data.match(/<h2>([^<]+)<\/h2>/)?.[1]?.trim() || 'gak jelas'
    const caption = data.match(/<p class="maintext">([^<]+)<\/p>/)?.[1]?.trim() || ''

    if (!videoUrl) return reply('❌ Videonya ga ketemu. Link lu mungkin zonk.')

    
    const videoBuffer = await axios.get(videoUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36',
        'Referer': 'https://ssstik.io/'
      },
      timeout: 30000
    })

    await Morela.sendMessage(m.chat, {
      react: { text: '✅', key: m.key }
    })

    
    await Morela.sendMessage(m.chat, {
      video: Buffer.from(videoBuffer.data),
      caption: `✅ *TikTok Downloader*\n\n👤 ${author}\n📝 ${caption.slice(0, 100) || 'Captionnya aja kosong, kayak harapan.'}`,
      mimetype: 'video/mp4'
    }, { quoted: fkontak || m })

  } catch (e) {
    await Morela.sendMessage(m.chat, {
      react: { text: '❌', key: m.key }
    })
    reply(`❌ Error: ${(e as Error).message}\nMantap, rusak lagi. Biasain cek input sebelum nyusahin sistem.`)
  }
}

handler.command = ['tt', 'tiktok']
handler.tags = ['downloader']
handler.help = ['tt <link>', 'tiktok <link>']
handler.noLimit = false

export default handler