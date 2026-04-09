import axios from "axios"
import sharp from "sharp"

const handler = async (m: any, { Morela, reply, text, fkontak }: any) => {
  try {
    await Morela.sendMessage(m.chat, {
      react: { text: "🌑", key: m.key }
    })

    let who  = m.key.participant || m.chat
    let name = m.pushName || "User"

    const quotedCtx = m.message?.extendedTextMessage?.contextInfo
    const quoted    = quotedCtx?.quotedMessage

    if (quoted) {
      who = quotedCtx.participant || quotedCtx.remoteJid || who

      if (!text) {
        text =
          quoted.conversation ||
          quoted.extendedTextMessage?.text ||
          quoted.imageMessage?.caption ||
          ""
      }

      name = who.split("@")[0]
    }

    if (!text) return reply("❌ Teksnya mana? Contoh: .qc halo dunia")

    let pp
    try {
      pp = await Morela.profilePictureUrl(who, "image")
    } catch {
      pp = "https://telegra.ph/file/24fa902ead26340f3df2c.png"
    }

    const res = await axios.get("https://api.deline.web.id/maker/qc", {
      params: { text, color: "white", avatar: pp, nama: name },
      responseType: "arraybuffer"
    })

    const sticker = await sharp(Buffer.from(res.data))
      .resize(512, 512, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .webp({ quality: 100 })
      .toBuffer()

    await Morela.sendMessage(m.chat, { sticker }, { quoted: fkontak || m })
    await Morela.sendMessage(m.chat, { react: { text: "✅", key: m.key } })

  } catch (e) {
    console.error("[QC]", e)
    await Morela.sendMessage(m.chat, { react: { text: "❌", key: m.key } }).catch(() => {})
    reply("❌ Gagal bikin quote.")
  }
}

handler.command = ["qc"]
handler.tags    = ["sticker"]
handler.help    = ["qc <teks>"]

export default handler