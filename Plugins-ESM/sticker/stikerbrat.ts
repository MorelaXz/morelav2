// @ts-nocheck
import axios from "axios"
import fs from "fs"
import path from "path"
import ffmpeg from "fluent-ffmpeg"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url as string)
const __dirname = path.dirname(__filename)

const TMP = path.join(__dirname, "../..", "media", "cewekbrat")
if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true })

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

const handler = async (m: any, { Morela, args, reply, fkontak }: any) => {
  const from = m.chat
  const text = args.join(" ").trim()

  if (!text) return reply("Contoh:\n.stikerbrat haiii sayang")

  await Morela.sendMessage(from, {
    react: { text: "⏳", key: m.key }
  })

  const id = Date.now()
  const img = path.join(TMP, `${id}.png`)
  const webp = path.join(TMP, `${id}.webp`)

  try {
    const url =
      "https://api.deline.web.id/maker/cewekbrat?text=" +
      encodeURIComponent(text)

    const res = await axios.get(url, { responseType: "arraybuffer" })

    fs.writeFileSync(img, res.data)
    await toWebp(img, webp)

    await Morela.sendMessage(
      from,
      { sticker: fs.readFileSync(webp) },
      { quoted: fkontak || m }
    )

    await Morela.sendMessage(from, {
      react: { text: "✅", key: m.key }
    })
  } catch (e) {
    console.error(e)
    await reply("❌ Gagal membuat stiker brat.")
  } finally {
    try { fs.unlinkSync(img) } catch {}
    try { fs.unlinkSync(webp) } catch {}
  }
}

handler.command = ["stikerbrat"]
handler.tags = ["maker"]
handler.help = ["stikerbrat <teks>"]

export default handler