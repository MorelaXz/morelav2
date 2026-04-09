// @ts-nocheck
const handler = async (m: any, { Morela, reply, fkontak }: any) => {
  const jid = m.chat

  if (!jid.endsWith("@g.us"))
    return reply("Perintah ini hanya bisa digunakan di grup")

  const metadata     = await Morela.groupMetadata(jid)
  const participants = metadata.participants.map((p: unknown) => p.id)

  const sender    = m.key.participant || m.chat
  const senderTag = "@" + sender.split("@")[0]

  let content = ""

  const quoted =
    m.message?.extendedTextMessage?.contextInfo?.quotedMessage

  if (quoted && !m.text) {
    content =
      quoted.conversation ||
      quoted.extendedTextMessage?.text ||
      ""
  } else {
    content = m.text
      ?.replace(/^(\.hidetag|\!hidetag|\/hidetag|\.h|\!h|\/h)\s*/i, "")
      .trim()
  }

  const message = `${senderTag} : ${content || "‎"}`

  await Morela.sendMessage(
    jid,
    {
      text: message,
      mentions: [sender, ...participants]
    },
    { quoted: fkontak || m }
  )
}

handler.command = ["hidetag", "h"]
handler.tags    = ["group"]
handler.help    = ["hidetag <teks>"]
handler.group   = true
handler.admin   = true
handler.noLimit = true

export default handler
