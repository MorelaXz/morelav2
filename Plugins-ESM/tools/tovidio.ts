// @ts-nocheck
import fs   from 'fs'
import path from 'path'
import os   from 'os'
import sharp from 'sharp'
import { execSync } from 'child_process'
import { downloadContentFromMessage } from '@itsukichan/baileys'

function isAnimatedWebp(buffer: Buffer) {
  if (!buffer || buffer.length < 50) return false
  const header = buffer.toString('hex', 0, 200)
  return header.includes('414e494d') || header.includes('616e696d')
}

function checkFfmpeg() {
  try {
    execSync('ffmpeg -version', { stdio: 'pipe', timeout: 5000 })
    return true
  } catch {
    return false
  }
}

async function webpToGif(buffer: Buffer) {
  try {
    const metadata = await sharp(buffer, { animated: true }).metadata()
    if (!metadata.pages || metadata.pages <= 1) return null
    return await sharp(buffer, { animated: true, pages: -1 })
      .gif({ loop: 0 })
      .toBuffer()
  } catch {
    return null
  }
}

function gifToMp4(gifBuffer: unknown) {
  const tmpDir    = os.tmpdir()
  const timestamp = Date.now()
  const gifPath   = path.join(tmpDir, `gif_${timestamp}.gif`)
  const mp4Path   = path.join(tmpDir, `video_${timestamp}.mp4`)

  fs.writeFileSync(gifPath, gifBuffer)
  try {
    execSync(
      `ffmpeg -y -i "${gifPath}" -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -c:v libx264 -preset ultrafast -crf 23 "${mp4Path}"`,
      { stdio: 'pipe', timeout: 60000 }
    )
    if (!fs.existsSync(mp4Path)) throw new Error('Output file not created')
    const buf = fs.readFileSync(mp4Path)
    fs.unlinkSync(mp4Path)
    fs.unlinkSync(gifPath)
    return buf
  } catch (e) {
    try { fs.unlinkSync(gifPath) } catch {}
    try { fs.unlinkSync(mp4Path) } catch {}
    throw e
  }
}

async function downloadStickerBuffer(m: Record<string, unknown>) {
  const target = m.quoted || m
  const mtype  = target.mtype || ''

  const stickerMsg = target.stickerMessage
    || target[mtype]
    || target.msg
    || target

  if (!stickerMsg?.mediaKey && !stickerMsg?.url) {
    throw new Error('Tidak bisa menemukan data stiker')
  }

  const stream = await downloadContentFromMessage(stickerMsg, 'sticker')
  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  const buffer = Buffer.concat(chunks)

  if (!buffer || buffer.length === 0) throw new Error('Buffer kosong setelah download')
  return buffer
}

const handler = async (m: any, { Morela, reply, usedPrefix, command, fkontak }: any) => {
  const selfIsSticker   = m.mtype === 'stickerMessage'
  const quotedIsSticker = m.quoted?.mtype === 'stickerMessage'

  if (!selfIsSticker && !quotedIsSticker) {
    return reply(
      `❌ *ɢᴀɢᴀʟ*\n\n` +
      `> Tidak ada sticker yang terdeteksi!\n\n` +
      `*Cara penggunaan:*\n` +
      `> 1. Kirim sticker + caption \`${usedPrefix}${command}\`\n` +
      `> 2. Reply sticker dengan \`${usedPrefix}${command}\``
    )
  }

  await Morela.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

  try {
    const buffer = await downloadStickerBuffer(m)
    const isAnimated = isAnimatedWebp(buffer)

    if (!isAnimated) {
      const pngBuffer = await sharp(buffer).png().toBuffer()
      await Morela.sendMessage(m.chat, {
        image:   pngBuffer,
        caption: `✅ *ʙᴇʀʜᴀsɪʟ*\n\n> Sticker statis → gambar!`
      }, { quoted: fkontak || m })
      await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
      return
    }

    await reply(`⏳ *ᴍᴇᴍᴘʀᴏsᴇs...*\n\n> WebP → GIF → MP4...`)

    const gifBuffer = await webpToGif(buffer)

    if (!gifBuffer) {
      await Morela.sendMessage(m.chat, {
        document: buffer,
        fileName: 'sticker.webp',
        mimetype: 'image/webp',
        caption:  `⚠️ Sticker tidak bisa dikonversi.`
      }, { quoted: fkontak || m })
      await Morela.sendMessage(m.chat, { react: { text: '⚠️', key: m.key } })
      return
    }

    if (checkFfmpeg()) {
      try {
        const mp4Buffer = gifToMp4(gifBuffer)
        if (mp4Buffer && mp4Buffer.length > 100) {
          await Morela.sendMessage(m.chat, {
            video:    mp4Buffer,
            mimetype: 'video/mp4',
            caption:  `✅ *ʙᴇʀʜᴀsɪʟ*\n\n> Sticker animasi → video!`
          }, { quoted: fkontak || m })
          await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
          return
        }
      } catch (e) {
        console.error('[ToVideo] FFmpeg error:', (e as Error).message)
      }
    }

    await Morela.sendMessage(m.chat, {
      video:       gifBuffer,
      gifPlayback: true,
      caption:     `✅ *ʙᴇʀʜᴀsɪʟ*\n\n> Sticker animasi → GIF!\n> _FFmpeg tidak tersedia untuk MP4._`
    }, { quoted: fkontak || m })
    await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

  } catch (error) {
    console.error('[ToVideo] Error:', error)
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    reply(`❌ *ᴇʀʀᴏʀ*\n\n> ${(error as Error).message}`)
  }
}

handler.command = ['tovideo', 'tovid', 'stickertovideo', 'giftomp4', 'webmtomp4']
handler.help    = ['tovideo — reply/caption sticker animasi']
handler.tags    = ['tools']
handler.noLimit = false

export default handler