// @ts-nocheck
import fs from "fs"
import path from "path"
import ffmpeg from "fluent-ffmpeg"
import { downloadMediaMessage } from "@itsukichan/baileys"
import createMemePkg from "../../Library/meme.js"
import { bi, buildFkontak, sendCard, uploadImage, createSend, menuBuf, CHANNEL_URL, OWNER_WA, BOT_JID, imagePath, botName, botVersion } from '../../Library/utils.js'

const { createMeme } = createMemePkg

const TEMP_DIR  = path.join(process.cwd(), "media", "temp")
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true })

const pngToWebpSticker = buffer =>
  new Promise((resolve, reject) => {
    const stamp  = Date.now()
    const input  = path.join(TEMP_DIR, `sticker_in_${stamp}.png`)
    const output = path.join(TEMP_DIR, `sticker_out_${stamp}.webp`)

    fs.writeFileSync(input, buffer)

    ffmpeg(input)
      .on("error", (e: Error) => {
        try { fs.unlinkSync(input)  } catch {}
        try { fs.unlinkSync(output) } catch {}
        reject(e)
      })
      .on("end", () => {
        try { fs.unlinkSync(input) } catch {}
        const webp = fs.readFileSync(output)
        try { fs.unlinkSync(output) } catch {}
        resolve(webp)
      })
      .outputOptions([
        "-vcodec", "libwebp",
        "-vf",     "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2",
        "-loop",   "0",
        "-preset", "default",
        "-an",
        "-vsync",  "0"
      ])
      .save(output)
  })

const handler = async (m: any, { Morela, text, reply, fkontak }: any) => {
  try {
    const quoted   = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const imageMsg = quoted?.imageMessage || m.message?.imageMessage

    if (!imageMsg) return reply("Lu nyuruh bikin meme tapi ga ada foto. mikir dikit napa.")
    if (!text)     return reply("Format aja salah. contoh: .smeme atas | bawah")

    const [top, bottom] = text.split("|").map((v: unknown) => v?.trim() || "")

    await Morela.sendMessage(m.chat, { react: { text: "⏳", key: m.key } })

    const imgBuffer = await downloadMediaMessage(
      { key: m.key, message: { imageMessage: imageMsg } },
      "buffer",
      {},
      { logger: console }
    )

    const png  = await createMeme(imgBuffer, top, bottom)
    const webp = await pngToWebpSticker(png)

    await Morela.sendMessage(m.chat, { sticker: webp }, { quoted: fkontak || m })
    await Morela.sendMessage(m.chat, { react: { text: "✅", key: m.key } })

  } catch (e) {
    console.error("[SMEME]", e)
    reply("❌ Gagal bikin meme. errornya aja males liat: " + (e as Error).message)
  }
}

handler.help    = ["smeme <atas> | <bawah>"]
handler.tags    = ["sticker"]
handler.command = ["smeme"]

export default handler