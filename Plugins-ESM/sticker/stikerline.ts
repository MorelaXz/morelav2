// @ts-nocheck
import axios   from 'axios'
import fs      from 'fs'
import path    from 'path'
import crypto  from 'crypto'
import ffmpeg  from 'fluent-ffmpeg'
import webpmux from 'node-webpmux'

const { Image } = webpmux
const NEOXR_KEY = 'LBvaK7'
const TMP = path.join(process.cwd(), 'media', 'temp')
if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true })

const toWebp = (input, output, animated = false) =>
  new Promise((resolve, reject) => {
    ffmpeg(input).outputOptions([
      '-vcodec', 'libwebp',
      '-vf', animated
        ? 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000'
        : 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,format=rgba',
      '-loop', '0', '-an', '-vsync', '0',
      animated ? '-t' : '-frames:v', animated ? '8' : '1',
      '-quality', '80', '-compression_level', '4', '-preset', 'photo'
    ])
    .on('end', resolve)
    .on('error', reject)
    .save(output)
  })



async function addPackExif(buffer: Buffer, packId: unknown, packName: unknown, packAuthor: unknown) {
  try {
    const img = new Image()
    await img.load(buffer)

    const jsonBuf = Buffer.from(JSON.stringify({
      'sticker-pack-id':        packId,
      'sticker-pack-name':      packName,
      'sticker-pack-publisher': packAuthor,
      'emojis':                 ['🌟']
    }), 'utf8')

    const exifAttr = Buffer.from([
      0x49, 0x49, 0x2A, 0x00,
      0x08, 0x00, 0x00, 0x00,
      0x01, 0x00,
      0x41, 0x57,
      0x07, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x16, 0x00, 0x00, 0x00
    ])

    const exif = Buffer.concat([exifAttr, jsonBuf])
    exif.writeUIntLE(jsonBuf.length, 14, 4)

    img.exif = exif
    return await img.save(null)
  } catch {
    return buffer 
  }
}

const handler = async (m: any, { Morela, args, reply, usedPrefix, command, fkontak }: any) => {
  const url = args[0]?.trim()

  if (!url || !url.includes('store.line.me')) {
    return reply(
      `🎨 *ʟɪɴᴇ sᴛɪᴄᴋᴇʀ ᴘᴀᴄᴋ*\n\n` +
      `> Download LINE sticker pack\n\n` +
      `╭┈┈⬡「 📋 *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ* 」\n` +
      `┃ ${usedPrefix}${command} <url>\n` +
      `╰┈┈┈┈┈┈┈┈⬡\n\n` +
      `*ᴄᴀʀᴀ ᴅᴀᴘᴀᴛ ᴜʀʟ:*\n` +
      `> 1. Buka https://store.line.me\n` +
      `> 2. Pilih sticker pack\n` +
      `> 3. Copy URL dari browser\n\n` +
      `*ᴄᴏɴᴛᴏʜ:*\n` +
      `> ${usedPrefix}${command} https://store.line.me/stickershop/product/9801/en`
    )
  }

  await Morela.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

  try {
    const apiUrl = `https://api.neoxr.eu/api/linesticker?url=${encodeURIComponent(url)}&apikey=${NEOXR_KEY}`
    const res    = await axios.get(apiUrl, { timeout: 60000 })

    if (!res.data?.status || !res.data?.data) {
      await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      return reply(`❌ Gagal mengambil sticker dari URL tersebut!`)
    }

    const data        = res.data.data
    const title       = data.title  || 'LINE Sticker'
    const author      = data.author || 'Unknown'
    const isAnimated  = data.animated || false

    const stickerUrls = isAnimated && data.sticker_animation_url?.length
      ? data.sticker_animation_url
      : data.sticker_url || []

    if (!stickerUrls.length) {
      await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      return reply(`❌ Tidak ada sticker ditemukan!`)
    }

    await reply(
      `🎨 *ʟɪɴᴇ sᴛɪᴄᴋᴇʀ ᴘᴀᴄᴋ*\n\n` +
      `╭┈┈⬡「 📦 *ɪɴꜰᴏ* 」\n` +
      `┃ 📝 *Title:* ${title}\n` +
      `┃ 👤 *Author:* ${author}\n` +
      `┃ 🎬 *Animated:* ${isAnimated ? 'Ya' : 'Tidak'}\n` +
      `┃ 📊 *Total:* ${stickerUrls.length}\n` +
      `╰┈┈┈┈┈┈┈┈⬡\n\n` +
      `> ⏳ Mengirim sticker...`
    )

    const maxStickers = Math.min(stickerUrls.length, 30)
    let sent = 0

    
    const packId     = crypto.randomUUID()
    const packName   = title
    const packAuthor = author

    for (let i = 0; i < maxStickers; i++) {
      const id   = Date.now() + '_' + i
      const ext  = isAnimated ? 'gif' : 'png'
      const inp  = path.join(TMP, `line_${id}.${ext}`)
      const webp = path.join(TMP, `line_${id}.webp`)

      try {
        const imgRes = await axios.get(stickerUrls[i], {
          responseType: 'arraybuffer',
          timeout: 30000,
          headers: { 'User-Agent': 'Mozilla/5.0' }
        })
        fs.writeFileSync(inp, Buffer.from(imgRes.data))
        await toWebp(inp, webp, isAnimated)

        
        const rawWebp   = fs.readFileSync(webp)
        const stickerBuf = await addPackExif(rawWebp, packId, packName, packAuthor)

        await Morela.sendMessage(m.chat, { sticker: stickerBuf }, { quoted: fkontak || m })
        sent++
        await new Promise(r => setTimeout(r, 700))
      } catch (e) {
        console.error('[LineSticker] Sticker error:', (e as Error).message)
      } finally {
        try { fs.unlinkSync(inp)  } catch {}
        try { fs.unlinkSync(webp) } catch {}
      }
    }

    if (sent > 0) {
      await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
      await reply(`✅ Berhasil kirim *${sent}/${stickerUrls.length}* sticker`)
    } else {
      await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      await reply(`❌ Gagal mengirim sticker`)
    }

  } catch (error) {
    console.error('[LineSticker] Error:', (error as Error).message)
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    reply(`❌ *ᴇʀʀᴏʀ*\n\n> ${(error as Error).message}`)
  }
}

handler.command = ['linesticker', 'linepack', 'line']
handler.help    = ['linesticker <url store.line.me>']
handler.tags    = ['sticker']
handler.premium = true
handler.noLimit = false

export default handler