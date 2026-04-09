// @ts-nocheck
import axios from "axios"
import sharp from "sharp"

const handler = async (m: any, { Morela, args, reply, fkontak }: any) => {
  const from = m.chat
  const input = args.join(" ").trim()

  if (!input) {
    return reply("Contoh:\n.emojimix 😎 😭")
  }

  const parts = input.split(/[\s+|]+/).filter(Boolean)
  if (parts.length < 2) {
    return reply("❌ Masukkan 2 emoji\nContoh: .emojimix 😎 😭")
  }

  const emoji1 = parts[0]
  const emoji2 = parts[1]

  await Morela.sendMessage(from, {
    react: { text: "⏳", key: m.key }
  })

  try {
    const json = await axios.get(
      "https://api.deline.web.id/maker/emojimix",
      {
        params: { emoji1, emoji2 }
      }
    )

    if (!json.data?.status || !json.data?.result?.png) {
      throw new Error("Invalid API response")
    }

    const pngUrl = json.data.result.png

    const img = await axios.get(pngUrl, {
      responseType: "arraybuffer"
    })

    const webp = await sharp(img.data)
      .resize(512, 512, { fit: "contain" })
      .webp()
      .toBuffer()

    await Morela.sendMessage(
      from,
      { sticker: webp },
      { quoted: fkontak || m }
    )

    await Morela.sendMessage(from, {
      react: { text: "✅", key: m.key }
    })
  } catch (err) {
    console.error("EMOJIMIX ERROR:", err?.message || err)

    await reply("❌ Gagal membuat emojimix")
    await Morela.sendMessage(from, {
      react: { text: "❌", key: m.key }
    })
  }
}

handler.command = ["emojimix"]
handler.tags = ["maker"]
handler.help = ["emojimix <emoji1> <emoji2>"]

export default handler