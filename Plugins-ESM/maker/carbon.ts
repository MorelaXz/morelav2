import axios from "axios"

const handler = async (m: any, { Morela, args, reply, fkontak }: any) => {
  const from = m.chat
  let code = args.join(" ")

  const quoted =
    m.message?.extendedTextMessage?.contextInfo?.quotedMessage

  const quotedText =
    quoted?.conversation ||
    quoted?.extendedTextMessage?.text ||
    ""

  if (!code && quotedText) code = quotedText

  if (!code) {
    return reply(
      "Contoh:\n.carbon console.log(\"Hello World\");\n\nAtau reply pesan berisi kode lalu ketik .carbon"
    )
  }

  await Morela.sendMessage(from, {
    react: { text: "⏳", key: m.key }
  })

  try {
    const res = await axios.post(
      "https://api.nekolabs.web.id/canvas/carbonify",
      { code },
      { responseType: "arraybuffer" }
    )

    await Morela.sendMessage(
      from,
      { image: Buffer.from(res.data) },
      { quoted: fkontak || m }
    )

    await Morela.sendMessage(from, {
      react: { text: "✅", key: m.key }
    })
  } catch (e) {
    reply("Gagal membuat gambar kode")
  }
}

handler.command = ["carbon", "code"]
handler.tags = ["tools"]
handler.help = ["carbon <kode>", "code <kode>"]

export default handler