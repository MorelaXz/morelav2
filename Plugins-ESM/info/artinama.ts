// @ts-nocheck
import axios from 'axios'

const handler = async (m, { Morela, reply, command, text, args, isOwn, isPrem, isAdmin, botAdmin, fkontak, usedPrefix }) => {
  if (!text) return reply(`Contoh: ${usedPrefix}${command} <nama>`)
  try {
    const response = await axios.get(`https://api.siputzx.my.id/api/primbon/artinama?nama=${encodeURIComponent(text)}`)
    const { status, data, timestamp } = response.data
    if (!status) throw new Error('API tidak mengembalikan status sukses')
    const { nama, arti, catatan } = data
    reply(`📖 Arti Nama "${nama}"
────────────────────
${arti}

📝 Catatan:
${catatan}

⏰ ${new Date(timestamp).toLocaleString()}`)
  } catch (e) {
    reply(`❌ Error: ${e.message}`)
  }
}

handler.command  = ['artinama']
handler.tags     = ['info']
handler.owner    = false
handler.premium  = false
handler.noLimit  = false
handler.help     = ['artinama <nama>']
export default handler