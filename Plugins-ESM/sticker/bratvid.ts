// @ts-nocheck
import axios from "axios"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import ffmpeg from "fluent-ffmpeg"
import { bi, buildFkontak, sendCard, uploadImage, createSend, menuBuf, CHANNEL_URL, OWNER_WA, BOT_JID, imagePath, botName, botVersion } from '../../Library/utils.js'

const __filename = fileURLToPath(import.meta.url as string)
const __dirname  = path.dirname(__filename)

const TMP      = path.join(process.cwd(), "media", "bratvid")
if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true })

const toWebp = (input, output) =>
  new Promise((resolve, reject) => {
    ffmpeg(input)
      .outputOptions([
        "-vcodec", "libwebp",
        "-vf", "scale=512:512:force_original_aspect_ratio=decrease,fps=15",
        "-loop", "0",
        "-an",
        "-vsync", "0"
      ])
      .on("end", resolve)
      .on("error", reject)
      .save(output)
  })

const handler = async (m: any, { Morela, reply, fkontak }: any) => {
  const text = m.text
    ?.replace(/^(\.bratvid|\!bratvid|\/bratvid|\.(bratvideo))\s*/i, "")
    .trim()

  if (!text) return reply("Contoh: *.bratvid hahahaha knpaaa*")

  const id   = Date.now()
  const mp4  = path.join(TMP, `${id}.mp4`)
  const webp = path.join(TMP, `${id}.webp`)

  await Morela.sendMessage(m.chat, { react: { text: "⏳", key: m.key } })

  try {
    const res = await axios.get(
      "https://api.deline.web.id/maker/bratvid?text=" +
        encodeURIComponent(text),
      { responseType: "arraybuffer" }
    )

    fs.writeFileSync(mp4, res.data)
    await toWebp(mp4, webp)

    await Morela.sendMessage(
      m.chat,
      { sticker: fs.readFileSync(webp) },
      { quoted: fkontak || m }
    )

    await Morela.sendMessage(m.chat, { react: { text: "✅", key: m.key } })
  } catch (e) {
    console.error("[BRATVID]", e)
    await reply("❌ Gagal membuat stiker bratvid.")
  } finally {
    try { fs.unlinkSync(mp4) } catch {}
    try { fs.unlinkSync(webp) } catch {}
  }
}

handler.command = ["bratvid", "bratvideo"]
handler.tags    = ["sticker"]
handler.help    = ["bratvid <teks>"]

export default handler