// @ts-nocheck
import axios from 'axios'

const handler = async (m, { Morela, reply, command, text, args, isOwn, isPrem, isAdmin, botAdmin, fkontak, usedPrefix }) => {
  if (!text) return reply(`Contoh: ${usedPrefix}${command} hello world`)
  try {
    await reply('⏳ Sedang memproses...')
    const url = `https://ryuu-dev.offc.my.id/canvas/brat/v2?text=${encodeURIComponent(text)}`
    const response = await axios.get(url, { responseType: 'arraybuffer' })
    if (!response.data || response.data.length === 0) throw new Error('API tidak mengembalikan data')
    await Morela.sendMessage(m.chat, { image: response.data, caption: '🎨 Brat v2 berhasil dibuat!', quoted: m }, { quoted: m })
  } catch (e) {
    reply(`❌ Error: ${e.message}`)
  }
}

handler.command  = ['bratv2']
handler.tags     = ['tools']
handler.owner    = false
handler.premium  = false
handler.noLimit  = false
handler.help     = ['bratv2 <teks>']
export default handler