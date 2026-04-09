// @ts-nocheck
import fs    from 'fs'
import path  from 'path'
import axios from 'axios'
import sharp from 'sharp'
import PDFDocument from 'pdfkit'
import { finished } from 'stream/promises'
import { bi, CHANNEL_URL, imagePath, botName } from '../../Library/utils.js'

const TMP_DIR = path.join(process.cwd(), 'tmp')
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true })

const BASE    = 'https://api.theresav.biz.id/manga/webtoon'
const API_KEY = 'Fid6P'

const HEADERS = {
  'User-Agent' : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  'Accept'     : 'image/webp,image/apng,image/*,*/*;q=0.8',
  'Referer'    : 'https://www.webtoons.com/',
  'Origin'     : 'https://www.webtoons.com'
}

const thumb = () => fs.existsSync(imagePath) ? fs.readFileSync(imagePath) : undefined

async function getBuffer(url: string): Promise<Buffer | null> {
  try {
    const r = await axios.get(url, { headers: HEADERS, responseType: 'arraybuffer', timeout: 20000 })
    return Buffer.from(r.data)
  } catch { return null }
}

async function downloadImage(url: string, savePath: string): Promise<void> {
  const r = await axios({ method: 'GET', url, responseType: 'stream', headers: HEADERS, timeout: 20000, validateStatus: s => s < 500 })
  if (r.status !== 200) throw new Error('Bad image status: ' + r.status)
  const writer = fs.createWriteStream(savePath)
  r.data.pipe(writer)
  await new Promise<void>((resolve, reject) => {
    writer.on('finish', resolve)
    writer.on('error', reject)
  })
}

const handler = async (m: any, { Morela, args, reply, fkontak }: any) => {
  const sub = (args[0] || '').toLowerCase()

  
  if (!sub || !['search', 'detail', 'download'].includes(sub)) {
    return Morela.sendMessage(m.chat, {
      text: `╭╌「 📖 *${bi('Webtoon')}* 」\n` +
            `┃ Download & baca komik Webtoon\n` +
            `╰╌\n\n` +
            `*Command:*\n` +
            `┃ .webtoon search <judul>\n` +
            `┃ .webtoon detail <url>\n` +
            `┃ .webtoon download <url>\n\n` +
            `*Contoh:*\n` +
            `┃ .webtoon search solo leveling\n\n` +
            `© ${botName}`,
      contextInfo: {
        externalAdReply: {
          title: '📖 Webtoon Downloader', body: `${botName} Multidevice 🔥`,
          mediaType: 1, renderLargerThumbnail: false,
          showAdAttribution: false, sourceUrl: CHANNEL_URL, thumbnail: thumb()
        }
      }
    }, { quoted: fkontak || m })
  }

  
  if (sub === 'search') {
    const keyword = args.slice(1).join(' ')
    if (!keyword) return reply('❌ Masukkan judul webtoon!\nContoh: .webtoon search solo leveling')

    await Morela.sendMessage(m.chat, { react: { text: '🔍', key: m.key } })

    try {
      const { data } = await axios.get(`${BASE}/search`, { params: { q: keyword, apikey: API_KEY }, timeout: 30000 })
      if (!data?.status || !data?.result) return reply('❌ Tidak ditemukan')

      const all = [...(data.result.original || []), ...(data.result.canvas || [])]
      const seen = new Set<string>()
      const unique = all.filter(v => {
        if (!v?.link || seen.has(v.link)) return false
        seen.add(v.link)
        return true
      })

      if (!unique.length) return reply('❌ Tidak ditemukan')

      let txt = `╭╌「 🔍 *${bi('Hasil Pencarian')}* 」\n`
      txt += `┃ Keyword: *${keyword}*\n`
      txt += `┃ Total: *${unique.length}* hasil\n`
      txt += `╰╌\n\n`
      unique.slice(0, 10).forEach((v: any, i: number) => {
        txt += `*${i + 1}.* ${v.title || 'No title'}\n`
        txt += `◦ Author: ${v.author || '-'}\n`
        txt += `◦ Genre : ${v.genre || '-'}\n`
        txt += `◦ Views : ${v.viewCount || '-'}\n`
        txt += `◦ Link  : ${v.link}\n\n`
      })
      txt += `© ${botName}`

      await Morela.sendMessage(m.chat, {
        text: txt,
        contextInfo: {
          externalAdReply: {
            title: '🔍 Webtoon Search', body: `${botName} Multidevice 🔥`,
            mediaType: 1, renderLargerThumbnail: false,
            showAdAttribution: false, sourceUrl: CHANNEL_URL, thumbnail: thumb()
          }
        }
      }, { quoted: fkontak || m })

      await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

    } catch (e: any) {
      await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      reply('❌ Error: ' + e.message)
    }
    return
  }

  
  if (sub === 'detail') {
    let url = args[1]
    if (!url) return reply('❌ Masukkan URL webtoon!\nContoh: .webtoon detail https://...')
    url = decodeURIComponent(url)

    await Morela.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

    try {
      const { data } = await axios.get(`${BASE}/detail`, { params: { url, apikey: API_KEY }, timeout: 30000 })
      if (!data?.status || !data?.result) return reply('❌ Gagal mengambil detail')

      const r = data.result
      const thumbBuf = await getBuffer(r.thumbnail)

      let caption =
        `╭╌「 📖 *${bi(r.title || 'Webtoon')}* 」\n` +
        `┃ Genre  : ${r.genre || '-'}\n` +
        `┃ Author : ${r.authors?.join(', ') || '-'}\n` +
        `┃ Views  : ${r.stats?.views || '-'}\n` +
        `┃ Subs   : ${r.stats?.subscribers || '-'}\n` +
        `╰╌\n\n` +
        `${r.description || '-'}\n\n`

      if (!r.episodes?.length) {
        caption += '_(Tidak ada episode)_\n\n© ' + botName
        return Morela.sendMessage(m.chat, {
          ...(thumbBuf ? { image: thumbBuf } : {}),
          caption,
          contextInfo: {
            externalAdReply: {
              title: r.title || 'Webtoon', body: `${botName} Multidevice 🔥`,
              mediaType: 1, renderLargerThumbnail: false,
              showAdAttribution: false, sourceUrl: CHANNEL_URL, thumbnail: thumb()
            }
          }
        }, { quoted: fkontak || m })
      }

      
      const eps = r.episodes.slice(0, 10)
      caption += `*Episode (${r.episodes.length} total):*\n`
      eps.forEach((ep: any) => {
        caption += `◦ ${ep.title || '-'} — ${ep.date || ''}\n`
        caption += `  *.webtoon download ${ep.link}*\n`
      })
      caption += `\n© ${botName}`

      await Morela.sendMessage(m.chat, {
        ...(thumbBuf ? { image: thumbBuf } : {}),
        caption,
        contextInfo: {
          externalAdReply: {
            title: r.title || 'Webtoon', body: `${botName} Multidevice 🔥`,
            mediaType: 1, renderLargerThumbnail: false,
            showAdAttribution: false, sourceUrl: CHANNEL_URL, thumbnail: thumb()
          }
        }
      }, { quoted: fkontak || m })

      await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

    } catch (e: any) {
      await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      reply('❌ Error: ' + e.message)
    }
    return
  }

  
  if (sub === 'download') {
    let url = args[1]
    if (!url || !url.startsWith('http')) return reply('❌ Link tidak valid!')
    url = decodeURIComponent(url)

    await Morela.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })
    await reply('⏳ Mengunduh gambar & membuat PDF...\nSabar ya, prosesnya agak lama 🙏')

    try {
      const { data } = await axios.get(`${BASE}/download`, { params: { url, apikey: API_KEY }, timeout: 60000 })
      if (!data?.status || !data?.images) return reply('❌ Gagal ambil data gambar')

      const images: string[] = data.images
      const cleanName = (data.title || 'webtoon').replace(/[^\w\s]/gi, '').replace(/\s+/g, '-')
      const pdfPath = path.join(TMP_DIR, `${Date.now()}.pdf`)
      const imgPaths: string[] = []

      
      const BATCH = 5
      for (let i = 0; i < images.length; i += BATCH) {
        const batch = images.slice(i, i + BATCH)
        const results = await Promise.allSettled(
          batch.map((imgUrl: string, idx: number) => {
            const p = path.join(TMP_DIR, `${Date.now()}-${i + idx}.jpg`)
            return downloadImage(imgUrl, p).then(() => p)
          })
        )
        results.forEach((r: any) => {
          if (r.status === 'fulfilled') imgPaths.push(r.value)
        })
      }

      if (!imgPaths.length) return reply('❌ Semua gambar gagal didownload')

      
      const doc = new PDFDocument({ autoFirstPage: false, margin: 0 })
      const stream = fs.createWriteStream(pdfPath)
      doc.pipe(stream)

      for (const img of imgPaths) {
        try {
          const meta = await sharp(img).metadata()
          doc.addPage({ size: [meta.width || 800, meta.height || 1200], margin: 0 })
          doc.image(img, 0, 0, { width: meta.width, height: meta.height })
        } catch {}
        try { fs.unlinkSync(img) } catch {}
      }

      doc.end()
      await finished(stream)

      await Morela.sendMessage(m.chat, {
        document: fs.readFileSync(pdfPath),
        mimetype: 'application/pdf',
        fileName: cleanName + '.pdf',
        caption: `📖 *${data.title || 'Webtoon'}*\n` +
                 `┃ Total: ${data.total || imgPaths.length} halaman\n\n` +
                 `© ${botName}`
      }, { quoted: fkontak || m })

      try { fs.unlinkSync(pdfPath) } catch {}

      await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

    } catch (e: any) {
      await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      reply('❌ Error: ' + e.message)
    }
  }
}

handler.command = ['webtoon', 'wt']
handler.tags    = ['downloader']
handler.help    = ['webtoon search <judul>', 'webtoon detail <url>', 'webtoon download <url>']
handler.noLimit = false

export default handler