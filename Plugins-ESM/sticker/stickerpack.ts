// @ts-nocheck
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import ffmpeg from 'fluent-ffmpeg'

const imagePath = path.join(process.cwd(), 'media/menu.jpg')
const BOT_JID   = "13135550002@s.whatsapp.net"
const botName   = global.botName || "Morela"

async function buildFkontak(Morela: Record<string, unknown>) {
  const BOT_NUMBER = BOT_JID.split("@")[0]
  let Mekik
  try {
    const pp  = await Morela.profilePictureUrl(BOT_JID, "image")
    const res = await fetch(pp)
    Mekik = Buffer.from(await res.arrayBuffer())
  } catch {
    Mekik = fs.existsSync(imagePath) ? fs.readFileSync(imagePath) : Buffer.alloc(0)
  }
  return {
    key: { participant: '0@s.whatsapp.net', fromMe: false, id: "StatusBiz", remoteJid: "status@broadcast" },
    message: {
      contactMessage: {
        displayName:   botName,
        vcard: `BEGIN:VCARD
VERSION:3.0
N:${botName}
FN:${botName}
ORG:${botName};
TEL;type=CELL;type=VOICE;waid=${BOT_NUMBER}:${BOT_NUMBER}
END:VCARD`,
        jpegThumbnail: Mekik
      }
    }
  }
}

const TMP = path.join(process.cwd(), 'media', 'brat')
if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true })

const HISTORY_FILE = path.join(process.cwd(), 'data', 'stickerpack_history.json')
if (!fs.existsSync(path.dirname(HISTORY_FILE))) fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true })

function loadHistory() {
  try {
    if (!fs.existsSync(HISTORY_FILE)) return {}
    return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'))
  } catch { return {} }
}

function saveHistory(data: unknown[]) {
  try {
    
    const _tmp = HISTORY_FILE + '.tmp';
    fs.writeFileSync(_tmp, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(_tmp, HISTORY_FILE);
  } catch {}
}

function getSent(sender: unknown, slug: unknown) {
  const h = loadHistory()
  return new Set(h?.[sender]?.[slug] || [])
}

function markSent(sender: unknown, slug: unknown, urls: unknown) {
  const h = loadHistory()
  if (!h[sender]) h[sender] = {}
  const prev = new Set(h[sender][slug] || [])
  urls.forEach((u: unknown) => prev.add(u))
  h[sender][slug] = [...prev]
  saveHistory(h)
}

function resetSent(sender: unknown, slug: unknown) {
  const h = loadHistory()
  if (h[sender]) delete h[sender][slug]
  saveHistory(h)
}

function shuffle(arr: unknown[]) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const toWebp = (input, output, animated = false) =>
  new Promise((resolve, reject) => {
    ffmpeg(input).outputOptions([
      '-vcodec', 'libwebp',
      '-vf', animated
        ? 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2'
        : 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2,format=rgba',
      '-loop', '0', '-an', '-vsync', '0',
      animated ? '-t' : '-frames:v', animated ? '8' : '1',
      '-quality', '80', '-compression_level', '4', '-preset', 'photo'
    ])
    .on('end', resolve)
    .on('error', reject)
    .save(output)
  })

class StickerPack {
  async search(query) {
    const res = await axios.post('https://getstickerpack.com/api/v1/stickerdb/search', { query, page: 1 }).then((v: unknown) => v.data)
    return (res.data || []).map((v: unknown) => ({ name: v.title, slug: v.slug, download: v.download_counter }))
  }
  async detail(slug) {
    const res = await axios.get(`https://getstickerpack.com/api/v1/stickerdb/stickers/${slug}`).then((v: unknown) => v.data.data)
    return {
      title: res.title,
      stickers: (res.images || []).map((v: unknown) => ({ image: `https://s3.getstickerpack.com/${v.url}`, animated: v.is_animated !== 0 }))
    }
  }
}

const scraper = new StickerPack()

const handler = async (m: any, { Morela, text, usedPrefix, command, reply, fkontak }: any) => {

  if (command === 'stickerpack_pick') {
    const slug = text?.trim()
    if (!slug) return reply('❌ Slug tidak valid')

    await Morela.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

    try {
      const res = await scraper.detail(slug)
      if (!res.stickers.length) return reply('❌ Sticker kosong')

      const safeName  = res.title.replace(/[*_`]/g, '').replace(/\s*\n\s*/g, ' ')
      const hasStatic = res.stickers.some((s: unknown) => !s.animated)
      const pool      = res.stickers.filter((s: unknown) => !(hasStatic && s.animated))

      const sent = getSent(m.sender, slug)
      let fresh  = pool.filter((s: unknown) => !sent.has(s.image))

      if (!fresh.length) {
        resetSent(m.sender, slug)
        fresh = pool
        await reply(`🔄 Semua stiker dari *${safeName}* sudah pernah dikirim. Reset & mulai ulang!`)
      }

      const shuffled = shuffle(fresh).slice(0, 10)
      await reply(`⏳ Mengirim *${shuffled.length}* stiker dari *${safeName}*...`)

      let sentCount = 0
      const newlySent = []

      for (const s of shuffled) {
        const id   = Date.now() + '_' + sentCount
        const ext  = s.animated ? 'gif' : 'png'
        const inp  = path.join(TMP, `sp_${id}.${ext}`)
        const webp = path.join(TMP, `sp_${id}.webp`)

        try {
          const img = await axios.get(s.image, { responseType: 'arraybuffer', timeout: 15000 })
          fs.writeFileSync(inp, Buffer.from(img.data))
          await toWebp(inp, webp, s.animated)
          await Morela.sendMessage(m.chat, { sticker: fs.readFileSync(webp) }, { quoted: fkontak || m })
          newlySent.push(s.image)
          sentCount++
          await new Promise(r => setTimeout(r, 1000))
        } catch (e) {
          console.error('[SP STICKER]', (e as Error).message)
        } finally {
          try { fs.unlinkSync(inp) } catch {}
          try { fs.unlinkSync(webp) } catch {}
        }
      }

      markSent(m.sender, slug, newlySent)

      await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
      return reply(`✅ Terkirim *${sentCount}* stiker dari *${safeName}*\n_Ketik ulang untuk dapat stiker berbeda!_`)

    } catch (e) {
      await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      return reply('❌ Gagal: ' + (e as Error).message)
    }
  }

  if (!text) return reply(
`╭──「 🎴 *Sticker Pack* 」
│
│  Masukkan kata pencarian!
│
│  📌 *Contoh:*
│  ${usedPrefix}${command} blue archive
│
╰─────────────────────`
  )

  await Morela.sendMessage(m.chat, { react: { text: '🔍', key: m.key } })

  try {
    const packs = await scraper.search(text)
    if (!packs.length) {
      await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      return reply('❌ Sticker pack tidak ditemukan')
    }

    const rows = packs.slice(0, 10).map((p: unknown) => ({
      title:       p.name.length > 40 ? p.name.slice(0, 37) + '...' : p.name,
      description: `📥 Download ${Number(p.download).toLocaleString('id-ID')}x`,
      id:          `.stickerpack_pick ${p.slug}`
    }))

    const menuBuffer = fs.existsSync(imagePath) ? fs.readFileSync(imagePath) : null
    const q = text.charAt(0).toUpperCase() + text.slice(1)

    const footer =
`╭──「 🎴 *Sticker Pack* 」
│
│  🔍 Pencarian » *${q}*
│  📦 Ditemukan » *${packs.length} pack*
│
╰─────────────────────
_Ketuk tombol untuk pilih & kirim sticker_ 👇
© ${botName}`

    await Morela.sendMessage(m.chat, {
      ...(menuBuffer ? { image: menuBuffer, caption: ' ' } : { text: ' ' }),
      footer,
      interactiveButtons: [
        {
          name: 'single_select',
          buttonParamsJson: JSON.stringify({
            title: '🎴 Pilih Sticker Pack',
            sections: [{
              title: `Hasil: ${text.length > 22 ? text.slice(0, 20) + '..' : text}`,
              rows
            }]
          })
        }
      ],
      hasMediaAttachment: !!menuBuffer
    }, { quoted: fkontak || m })

    await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

  } catch (e) {
    console.error('[STICKERPACK ERROR]', e)
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    reply('❌ Gagal: ' + (e as Error).message)
  }
}

handler.help    = ['stickerpack <query>']
handler.tags    = ['sticker']
handler.command = ['stickerpack', 'stickerpack_pick']

export default handler