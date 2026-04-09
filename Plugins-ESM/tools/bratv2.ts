// @ts-nocheck
import axios from 'axios'
import { botName } from '../../Library/utils.js'

const handler = async (m, { Morela, reply, command, text, args, isOwn, isPrem, isAdmin, botAdmin, fkontak, usedPrefix }) => {
  if (!text) return reply(`Contoh: ${usedPrefix}${command} <teks>`)
  try {
    await reply('⏳ Sedang membuat brat sticker...')
    const url = `https://ryuu-dev.offc.my.id/canvas/brat/v2?text=${encodeURIComponent(text)}`
    const response = await axios.get(url, { responseType: 'arraybuffer' })
    
    await Morela.sendMessage(m.chat, { sticker: response.data }, { quoted: m })
  } catch (e) {
    reply(`❌ Gagal membuat brat sticker: ${e.message}`)
  }
}

handler.command  = ['bratv2']
handler.tags     = ['tools']
handler.owner    = false
handler.premium  = false
handler.noLimit  = false
handler.help     = ['bratv2 <teks>']
export default handler