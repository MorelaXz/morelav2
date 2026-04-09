import axios from "axios"

const handler = async (m: any, { Morela, args, reply, fkontak }: any) => {
  const from = m.chat
  const raw = args.join(" ")
  const parts = raw.split("|")

  if (parts.length < 2) {
    return reply("Contoh:\n.fakestory username|ndul cantik")
  }

  const username = parts[0].trim()
  const caption = parts.slice(1).join("|").trim()
  const avatar = "https://api.deline.web.id/Eu3BVf3K4x.jpg"

  await Morela.sendMessage(from, {
    react: { text: "⏳", key: m.key }
  })

  try {
    const url =
      "https://api.deline.web.id/maker/fakestory" +
      `?username=${encodeURIComponent(username)}` +
      `&caption=${encodeURIComponent(caption)}` +
      `&avatar=${encodeURIComponent(avatar)}`

    const res = await axios.get(url, {
      responseType: "arraybuffer"
    })

    const buffer = Buffer.from(res.data)

    await Morela.sendMessage(
      from,
      { image: buffer },
      { quoted: fkontak || m }
    )

    await Morela.sendMessage(from, {
      react: { text: "✅", key: m.key }
    })
  } catch (e) {
    console.error("FAKESTORY ERROR:", e)
    reply("❌ Gagal membuat fake story")
  }
}

handler.command = ["fakestory"]
handler.tags = ["maker"]
handler.help = ["fakestory <username>|<caption>"]

export default handler