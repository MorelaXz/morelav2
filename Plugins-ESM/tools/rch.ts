// @ts-nocheck
import axios from "axios"

const handler = async (m: any, { Morela, text, reply, fkontak }: any) => {
  if (!text || !text.includes("|")) {
    return reply(
      "Gunakan:\n.rch <link channel> | <emoji>\n\nContoh:\n.rch https://whatsapp.com/channel/xxxx/725 | 🔥"
    )
  }

  const [url, reactRaw] = text.split("|").map((v: unknown) => v.trim())

  if (!url.startsWith("https://whatsapp.com/channel/")) {
    return reply("Link channel tidak valid.")
  }

  if (!reactRaw) {
    return reply("Emoji reaction tidak boleh kosong.")
  }

  const react = reactRaw.replace(/\s+/g, "")

  await Morela.sendMessage(m.chat, {
    react: { text: "⏳", key: m.key }
  })

  try {
    const res = await axios.get(
      "https://api-faa.my.id/faa/react-channel",
      {
        params: { url, react },
        timeout: 60000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36",
          Accept: "application/json",
          Referer: "https://api-faa.my.id/",
          Origin: "https://api-faa.my.id"
        }
      }
    )

    if (!res.data || res.data.status !== true) {
      throw res.data
    }

    await Morela.sendMessage(m.chat, {
      react: { text: "✅", key: m.key }
    })

    await reply(
      `✅ *Reaction Channel Berhasil*\n\n📢 Channel:\n${url}\n\n😈 Reaction:\n${react}`
    )
  } catch (e) {
    console.error("REACT CHANNEL ERROR:", e?.response?.data || e)

    await Morela.sendMessage(m.chat, {
      react: { text: "❌", key: m.key }
    })

    await reply(
      "Error:\n" + JSON.stringify(e?.response?.data || e, null, 2)
    )
  }
}

handler.command = ["rch"]
handler.tags    = ["tools"]
handler.help    = ["rch <link channel> | <emoji>"]
handler.owner   = true    
handler.noLimit = true

export default handler