// @ts-nocheck
import axios from "axios"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import ffmpeg from "fluent-ffmpeg"

const __filename = fileURLToPath(import.meta.url as string)
const __dirname = path.dirname(__filename)

const TEMP_DIR = path.join(process.cwd(), "media", "ttp")
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true })

const toWebp = (input, output) =>
  new Promise((resolve, reject) => {
    ffmpeg(input)
      .outputOptions([
        "-vcodec", "libwebp",
        "-vf", "scale=512:512:force_original_aspect_ratio=decrease",
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
    ?.replace(/^(\.ttp|\!ttp|\/ttp)\s*/i, "")
    .trim()

  if (!text) return reply("Contoh:\n*.ttp ndul cantik*")

  const id = Date.now()
  const png = path.join(TEMP_DIR, `${id}.png`)
  const webp = path.join(TEMP_DIR, `${id}.webp`)

  await Morela.sendMessage(m.chat, {
    react: { text: "⏳", key: m.key }
  })

  try {
    const res = await axios.get(
      "https://api.deline.web.id/maker/ttp",
      {
        params: { text, color: "white" },
        responseType: "arraybuffer"
      }
    )

    fs.writeFileSync(png, res.data)
    await toWebp(png, webp)

    const sticker = fs.readFileSync(webp)

    await Morela.sendMessage(
      m.chat,
      { sticker },
      { quoted: fkontak || m }
    )

    await Morela.sendMessage(m.chat, {
      react: { text: "✅", key: m.key }
    })
  } catch (e) {
    console.error("[TTP]", e)
    await reply("❌ Gagal membuat TTP.")
  } finally {
    try { fs.unlinkSync(png) } catch {}
    try { fs.unlinkSync(webp) } catch {}
  }
}

handler.command = ["ttp"]
handler.tags = ["sticker"]
handler.help = ["ttp <teks>"]

export default handler