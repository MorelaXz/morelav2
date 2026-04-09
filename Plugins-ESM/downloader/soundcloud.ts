// @ts-nocheck


import axios from 'axios'
import fs    from 'fs'
import path  from 'path'
import { botName, CHANNEL_JID, CHANNEL_URL, imagePath } from '../../Library/utils.js'
import { canvasSoundCloud } from '../../Library/canvas-soundcloud.js'


const SC_CLIENT_ID = 'KKzJxmw11tYpCs6T24P4uUYhqmjalG6M'
const SC_API_BASE  = 'https://api-mobi.soundcloud.com'
const SC_RESOLVE   = `${SC_API_BASE}/resolve`
const SC_SEARCH    = `${SC_API_BASE}/search/tracks`
const MAX_DURATION = 20 * 60 * 1000
const MAX_SIZE_MB  = 80

const HEADERS = {
  'User-Agent' : 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36',
  'Referer'    : 'https://m.soundcloud.com/',
  'Origin'     : 'https://m.soundcloud.com'
}


const scSessions = new Map()


function fmtDur(ms: number) {
  const total = Math.floor(ms / 1000)
  const m     = Math.floor(total / 60)
  const s     = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function fmtNum(n: number) {
  if (!n) return '0'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K'
  return n.toString()
}


async function resolveTrack(url: string) {
  const res = await axios.get(SC_RESOLVE, {
    params : { url, client_id: SC_CLIENT_ID },
    headers: HEADERS,
    timeout: 15000
  })
  return res.data
}

async function searchTracks(query: Record<string, unknown>, limit: unknown = 5) {
  const res = await axios.get(SC_SEARCH, {
    params : { q: query, client_id: SC_CLIENT_ID, limit, linked_partitioning: 1 },
    headers: HEADERS,
    timeout: 15000
  })
  return res.data.collection || []
}

async function getStreamUrl(track: unknown) {
  const transcodings = track.media?.transcodings || []
  const progressive  = transcodings.find((t: unknown) => t.format?.protocol === 'progressive' && t.format?.mime_type?.includes('mpeg'))
  const hls          = transcodings.find((t: unknown) => t.format?.protocol === 'hls' && t.format?.mime_type?.includes('mpeg'))
  const fallback     = transcodings.find((t: unknown) => t.format?.protocol === 'progressive' || t.format?.protocol === 'hls')
  const chosen       = progressive || hls || fallback
  if (!chosen) throw new Error('Tidak ada stream yang tersedia')

  const res = await axios.get(chosen.url, {
    params : { client_id: SC_CLIENT_ID },
    headers: HEADERS,
    timeout: 10000
  })
  return { url: res.data.url, protocol: chosen.format?.protocol }
}

async function downloadAudio(streamUrl: unknown, protocol: unknown, outPath: unknown) {
  if (protocol === 'progressive') {
    const res = await axios.get(streamUrl, { responseType: 'stream', headers: HEADERS, timeout: 120000 })
    await new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(outPath)
      res.data.pipe(writer)
      writer.on('finish', resolve)
      writer.on('error', reject)
    })
  } else {
    const m3u8Res  = await axios.get(streamUrl, { headers: HEADERS, timeout: 15000 })
    const m3u8Text = m3u8Res.data
    const base     = streamUrl.substring(0, streamUrl.lastIndexOf('/') + 1)
    const segments = m3u8Text
      .split('\n')
      .filter((l: unknown) => l.trim() && !l.startsWith('#'))
      .map((l: unknown) => l.startsWith('http') ? l.trim() : base + l.trim())
    if (!segments.length) throw new Error('HLS: tidak ada segment ditemukan')
    const chunks = []
    for (const seg of segments) {
      const r = await axios.get(seg, { responseType: 'arraybuffer', headers: HEADERS, timeout: 30000 })
      chunks.push(Buffer.from(r.data))
    }
    await fs.promises.writeFile(outPath, Buffer.concat(chunks))
  }
}

function buildInfo(track: unknown, sizeMB: unknown) {
  return (
    `╭━━━━━━━━━━━━━━━━━━━━╮\n` +
    `┃  🎵 *SOUNDCLOUD DL*\n` +
    `╰━━━━━━━━━━━━━━━━━━━━╯\n\n` +
    `🎵 *${track.title || 'Unknown'}*\n` +
    `👤 ${track.user?.username || 'Unknown'}\n` +
    `🕐 ${fmtDur(track.duration || 0)}  •  🎸 ${track.genre || '-'}\n` +
    `▶️ ${fmtNum(track.playback_count)} plays  •  ❤️ ${fmtNum(track.likes_count)} likes\n` +
    `📦 ${sizeMB.toFixed(2)} MB\n\n` +
    `© ${botName}`
  )
}


const handler = async (m: any, { Morela, text, command, usedPrefix, reply, fkontak }: any) => {

  
  if (/^sc[1-5]$/.test(command)) {
    const idx     = parseInt(command.replace('sc', '')) - 1
    const session = scSessions.get(m.sender)
    if (!session) return reply(`❌ Session expired!\n\nKetik \`${usedPrefix}soundcloud <judul>\` lagi.`)
    const track = session.results[idx]
    if (!track) return reply('❌ Nomor tidak valid.')
    scSessions.delete(m.sender)
    return processDownload(m, Morela, track, reply, fkontak)
  }

  
  if (!text) return reply(
    `╭━━━━━━━━━━━━━━━━━━━━╮\n` +
    `┃  🎵 *SOUNDCLOUD DL*\n` +
    `╰━━━━━━━━━━━━━━━━━━━━╯\n\n` +
    `Download lagu dari SoundCloud!\n\n` +
    `📌 *Cara pakai:*\n` +
    `• \`${usedPrefix}${command} <judul lagu>\`\n` +
    `• \`${usedPrefix}${command} <url soundcloud>\`\n\n` +
    `📎 *Contoh:*\n` +
    `\`${usedPrefix}${command} lily alan walker\`\n` +
    `\`${usedPrefix}${command} https://soundcloud.com/xxx/yyy\`\n\n` +
    `© ${botName}`
  )

  await Morela.sendMessage(m.chat, { react: { text: '🔍', key: m.key } })

  
  if (/^https?:\/\/(www\.|m\.)?soundcloud\.com\//i.test(text)) {
    let track
    try { track = await resolveTrack(text.trim()) }
    catch (e) {
      await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      return reply(`❌ Gagal resolve URL:\n${(e as Error).message}`)
    }
    if (track.kind !== 'track') {
      await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      return reply('❌ URL bukan track! Masukkan link lagu, bukan playlist/profil.')
    }
    return processDownload(m, Morela, track, reply, fkontak)
  }

  
  let results
  try { results = await searchTracks(text, 5) }
  catch (e) {
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    return reply(`❌ Pencarian gagal: ${(e as Error).message}`)
  }

  if (!results.length) {
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    return reply(`❌ Tidak ada lagu ditemukan untuk: *${text}*`)
  }

  scSessions.set(m.sender, { results, query: text })
  setTimeout(() => scSessions.delete(m.sender), 3 * 60 * 1000)

  
  const rows = results.map((t, i) => ({
    header     : `Track ${i + 1}`,
    title      : t.title.length > 40 ? t.title.slice(0, 38) + '..' : t.title,
    description: `👤 ${t.user?.username || 'Unknown'}  🕐 ${fmtDur(t.duration || 0)}  ▶️ ${fmtNum(t.playback_count)}`,
    id         : `${usedPrefix}sc${i + 1}`
  }))

  const top     = results[0]
  const topTitle = top.title.length > 35 ? top.title.slice(0, 33) + '..' : top.title
  const q       = text.charAt(0).toUpperCase() + text.slice(1)

  const caption =
`┌──「 🎵 *SoundCloud Search* 」
│
│  Kata kunci  » *${q}*
│  Ditemukan   » *${results.length} track*
│
├──「 *Track Teratas* 」
│
│  Judul    » ${topTitle}
│  Artis    » ${top.user?.username || 'Unknown'}
│  Durasi   » ${fmtDur(top.duration || 0)}
│  Diputar  » ${fmtNum(top.playback_count)} kali
│
└─────────────────────
_Ketuk tombol untuk download track_ 👇`

  
  let canvasBuf = null
  try { canvasBuf = await canvasSoundCloud(results, text) }
  catch (e) { console.error('[SC Canvas]', (e as Error).message) }

  await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

  try {
    await Morela.sendMessage(m.chat, {
      image              : canvasBuf || (fs.existsSync(imagePath) ? fs.readFileSync(imagePath) : undefined),
      caption,
      footer             : '© ' + botName,
      interactiveButtons : [
        {
          name            : 'single_select',
          buttonParamsJson: JSON.stringify({
            title   : 'Pilih Lagu untuk Download',
            sections: [{
              title          : 'Hasil: ' + (text.length > 22 ? text.slice(0, 20) + '..' : text),
              highlight_label: 'Top Tracks',
              rows
            }]
          })
        }
      ],
      hasMediaAttachment: true
    }, { quoted: m })
  } catch {
    
    let fallback = `🎵 *Hasil Pencarian SoundCloud*\nQuery: *${text}*\n\n`
    results.forEach((t, i) => {
      fallback += `*${i + 1}.* ${t.title}\n   👤 ${t.user?.username || 'Unknown'}  🕐 ${fmtDur(t.duration || 0)}\n\n`
    })
    fallback += `📌 Ketik: \`${usedPrefix}sc1\` hingga \`${usedPrefix}sc${results.length}\``
    await reply(fallback)
  }
}


async function processDownload(m: Record<string, unknown>, Morela: Record<string, unknown>, track: unknown, reply: unknown, fkontak: unknown) {
  const title  = track.title || 'Unknown'
  const artist = track.user?.username || 'Unknown'

  if (track.duration > MAX_DURATION) {
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    return Morela.sendMessage(m.chat, { text: `❌ *Durasi terlalu panjang!*\n\nDurasi: *${fmtDur(track.duration)}*\nMaksimal: *${fmtDur(MAX_DURATION)}*` }, { quoted: m })
  }

  if (!track.streamable && track.policy !== 'ALLOW') {
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    return Morela.sendMessage(m.chat, { text: `❌ Track ini tidak bisa di-stream karena pembatasan pemilik.` }, { quoted: m })
  }

  await Morela.sendMessage(m.chat, { react: { text: '📥', key: m.key } })
  const tempDir = path.join(process.cwd(), 'media', 'temp')
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })

  const outPath = path.join(tempDir, `sc_${Date.now()}.mp3`)

  let streamUrl, protocol
  try {
    const s = await getStreamUrl(track)
    streamUrl = s.url
    protocol  = s.protocol
  } catch (e) {
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    return Morela.sendMessage(m.chat, { text: `❌ Gagal mendapatkan stream URL:\n${(e as Error).message}` }, { quoted: m })
  }

  try {
    await downloadAudio(streamUrl, protocol, outPath)
  } catch (e) {
    if (fs.existsSync(outPath)) fs.unlinkSync(outPath)
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    return Morela.sendMessage(m.chat, { text: `❌ Gagal download audio:\n${(e as Error).message}` }, { quoted: m })
  }

  const sizeMB = fs.statSync(outPath).size / (1024 * 1024)
  if (sizeMB > MAX_SIZE_MB) {
    fs.unlinkSync(outPath)
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    return Morela.sendMessage(m.chat, { text: `❌ *File terlalu besar!*\n\nUkuran: *${sizeMB.toFixed(2)} MB*\nMaks WA: *${MAX_SIZE_MB} MB*` }, { quoted: m })
  }

  let thumbBuffer = null
  try {
    const thumbUrl = (track.artwork_url || '').replace('-large', '-t500x500').replace('-t300x300', '-t500x500')
    if (thumbUrl) {
      const r = await axios.get(thumbUrl, { responseType: 'arraybuffer', headers: HEADERS, timeout: 10000 })
      thumbBuffer = Buffer.from(r.data)
    }
  } catch {}
  if (!thumbBuffer && fs.existsSync(imagePath)) thumbBuffer = fs.readFileSync(imagePath)

  try {
    await Morela.sendMessage(m.chat, {
      audio   : fs.readFileSync(outPath),
      mimetype: 'audio/mpeg',
      fileName: `${title} - ${artist}.mp3`,
      contextInfo: {
        externalAdReply: {
          title: title, body: `👤 ${artist} • 🎵 SoundCloud`,
          mediaType: 1, renderLargerThumbnail: true, showAdAttribution: false,
          sourceUrl: track.permalink_url || CHANNEL_URL, thumbnail: thumbBuffer || undefined
        }
      }
    }, { quoted: m })

    await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
  } catch (e) {
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    await Morela.sendMessage(m.chat, { text: `❌ Gagal kirim file: ${(e as Error).message}` }, { quoted: m })
  } finally {
    try { if (fs.existsSync(outPath)) fs.unlinkSync(outPath) } catch {}
  }
}


handler.command  = ['soundcloud', 'scdl', 'sc', 'sc1', 'sc2', 'sc3', 'sc4', 'sc5']
handler.tags     = ['downloader']
handler.help     = ['soundcloud <judul/url> — download lagu dari SoundCloud', 'sc <judul/url>']
handler.noLimit  = false

export default handler