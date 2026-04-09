// @ts-nocheck
import axios from "axios"

const handler = async (m: any, { Morela, args, reply, fkontak }: any) => {
  const from = m.chat
  const raw = args.join(" ")
  const parts = raw.split("|").map((v: unknown) => v.trim())

  if (parts.length < 3) {
    return reply("Contoh: .faketweet nama aldo|user name @putraa|halo dunia")
  }

  const name = parts[0].replace(/^nama\s+/i, "")
  const username = parts[1]
    .replace(/^user\s*name\s*/i, "")
    .replace(/^@/, "")
  const tweet = parts.slice(2).join(" | ")

  const avatar = "https://api.deline.web.id/Eu3BVf3K4x.jpg"

  await Morela.sendMessage(from, {
    react: { text: "⏳", key: m.key }
  })

  try {
    const api =
      "https://api.deline.web.id/maker/faketweet2?" +
      "name=" + encodeURIComponent(name) +
      "&username=" + encodeURIComponent(username) +
      "&tweet=" + encodeURIComponent(tweet) +
      "&theme=light" +
      "&likes=1000" +
      "&retweets=500" +
      "&quotes=100" +
      "&client=" + encodeURIComponent("Twitter for iPhone") +
      "&profile=" + encodeURIComponent(avatar) +
      "&image=" + encodeURIComponent(avatar)

    const res = await axios.get(api, {
      responseType: "arraybuffer"
    })

    const type = res.headers["content-type"] || ""
    if (!type.startsWith("image/")) throw new Error("Invalid response")

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
    console.error("FAKETWEET ERROR:", e)
    reply("Gagal membuat fake tweet")
  }
}

handler.command = ["faketweet"]
handler.tags = ["maker"]
handler.help = ["faketweet <nama>|<username>|<tweet>"]

export default handler