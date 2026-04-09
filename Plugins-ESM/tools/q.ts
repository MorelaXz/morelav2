// @ts-nocheck
const handler = async (m: any, { Morela, reply, fkontak }: any) => {
  if (!m.quoted) return reply('❌ Reply pesan dulu baru ketik .q')
  try {
    const json = JSON.stringify(m.quoted, null, 2)
    if (json.length > 3500) {
      await Morela.sendMessage(m.chat, {
        document: Buffer.from(json),
        mimetype: 'application/json',
        fileName: 'quoted.json',
        caption: '📄 Quoted message (terlalu panjang, dikirim sebagai file)'
      }, { quoted: fkontak || m })
    } else {
      await reply('\`\`\`json\n' + json + '\n\`\`\`')
    }
  } catch (e: any) {
    reply('❌ Gagal: ' + e.message)
  }
}
handler.command = ['q', 'quoted', 'analis']
handler.tags    = ['tools']
handler.help    = ['q']
handler.owner   = true
handler.noLimit = true
export default handler