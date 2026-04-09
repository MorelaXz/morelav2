// @ts-nocheck
import axios from 'axios'
import fs    from 'fs'
import path  from 'path'
import { botName } from '../../Library/utils.js'
import { canvasSpotify } from '../../Library/canvas-spotify.js'


const SHAZAM_SEARCH = 'https://www.shazam.com/services/amapi/v1/catalog/ID/search'
const FAA_PLAY      = 'https://api-faa.my.id/faa/ytplay'

const spotSessions = new Map()

const handler = async (m: any, { Morela, text, command, reply, fkontak }: any) => {

  
  if (command.startsWith('sptdl_')) {
    const idx = parseInt(command.replace('sptdl_', '')) - 1
    const session = spotSessions.get(m.sender)
    if (!session) return reply('❌ Sesi kadaluarsa! Silakan cari lagi.')

    const track = session.results[idx]
    await Morela.sendMessage(m.chat, { react: { text: '📥', key: m.key } })

    try {
      
      const querySearch = `${track.title} ${track.artist}`
      const { data: resFaa } = await axios.get(FAA_PLAY, { 
        params: { query: querySearch },
        timeout: 60000 
      })

      if (!resFaa.status || !resFaa.result?.mp3) throw new Error('Gagal mendapatkan file audio dari server download.')

      const dlUrl = resFaa.result.mp3
      
      
      const tempDir = path.join(process.cwd(), 'media', 'temp')
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })
      const audioPath = path.join(tempDir, `${Date.now()}.mp3`)
      
      const [audioRes, thumbRes] = await Promise.all([
        axios.get(dlUrl, { responseType: 'arraybuffer', timeout: 180000 }),
        axios.get(track.thumbnail, { responseType: 'arraybuffer' }).catch(() => null)
      ])

      fs.writeFileSync(audioPath, Buffer.from(audioRes.data))
      const thumbBuffer = thumbRes ? Buffer.from(thumbRes.data) : null
      const sizeMB = fs.statSync(audioPath).size / 1024 / 1024

      await Morela.sendMessage(m.chat, { react: { text: '📤', key: m.key } })

      
      await Morela.sendMessage(m.chat, {
        audio:    fs.readFileSync(audioPath),
        mimetype: 'audio/mpeg',
        fileName: `${track.title}.mp3`,
        contextInfo: {
          forwardingScore: 999,
          isForwarded:     true,
          forwardedNewsletterMessageInfo: {
            newsletterJid:   '120363420704282055@newsletter',
            newsletterName:  `🎧 Music: ${track.title}`,
            serverMessageId: 143
          },
          externalAdReply: {
            title:                 track.title,
            body:                  `👤 ${track.artist} • 📊 ${sizeMB.toFixed(2)} MB`,
            thumbnail:             thumbBuffer,
            sourceUrl:             track.url,
            mediaType:             1,
            renderLargerThumbnail: true,
            showAdAttribution:     false
          }
        }
      }, { quoted: fkontak || m })

      await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
      
      
      if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath)
      spotSessions.delete(m.sender)

    } catch (e) {
      console.error(e)
      reply('❌ Gagal Download: ' + (e as Error).message)
    }
    return
  }

  
  if (!text?.trim()) return reply(`╭╌「 🎵 *Music Search* 」\n┃ Contoh: *.spotify multo*\n╰╌`)

  await Morela.sendMessage(m.chat, { react: { text: '🔍', key: m.key } })

  try {
    
    const { data } = await axios.get(SHAZAM_SEARCH, {
      params: { 
        types: 'songs', 
        term: text.trim(), 
        limit: 7 
      },
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })

    const songs = data.results?.songs?.data
    if (!songs || songs.length === 0) return reply(`❌ Lagu *${text}* tidak ditemukan.`)

    
    const results = songs.map(s => ({
      title:       s.attributes.name,
      artist:      s.attributes.artistName,
      duration:    'Full', 
      thumbnail:   s.attributes.artwork.url.replace('{w}', '600').replace('{h}', '600'),
      url:         s.attributes.url
    }))

    spotSessions.set(m.sender, { results })
    setTimeout(() => spotSessions.delete(m.sender), 3 * 60 * 1000)

    
    const imgBuf = await canvasSpotify(results, text.trim())

    
    const buttons = results.map((t, i) => ({
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({
        display_text: `🎧 ${i + 1}. ${t.title}`.slice(0, 30),
        id: `.sptdl_${i + 1}`
      })
    }))

    await Morela.sendMessage(m.chat, {
      image:   imgBuf,
      caption: `╭╌「 🎵 *Music Search* 」\n┃ 🔍 *${text.trim()}*\n┃ Pilih lagu di bawah 👇\n╰╌\n\n© ${botName}`,
      footer: "Pencarian Akurat via Shazam Engine",
      interactiveButtons: buttons,
      hasMediaAttachment: true
    }, { quoted: fkontak || m })

    await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

  } catch (e) {
    console.error(e)
    reply('❌ Search Error: ' + (e as Error).message)
  }
}

handler.command = ['spotify', 'sptfy', 'sptdl_1', 'sptdl_2', 'sptdl_3', 'sptdl_4', 'sptdl_5', 'sptdl_6', 'sptdl_7']
handler.tags    = ['downloader']
handler.help    = ['spotify <judul lagu>']

export default handler