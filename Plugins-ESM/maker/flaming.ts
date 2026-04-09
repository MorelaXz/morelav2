

import path from 'path'
import fs from 'fs'
import { bi, buildFkontak, sendCard, uploadImage, createSend, menuBuf, CHANNEL_URL, OWNER_WA, BOT_JID, imagePath, botName, botVersion } from '../../Library/utils.js'

const waContext = () => ({
  externalAdReply: {
    body:                  botName,
    thumbnail:             fs.existsSync(imagePath) ? fs.readFileSync(imagePath) : undefined,
    sourceUrl:             'https://www.whatsapp.com',
    mediaType:             2,
    renderLargerThumbnail: false,
    showAdAttribution:     false
  }
})

const handler = async (m: any, { Morela, text, reply, usedPrefix, command, fkontak }: any) => {
  try {
    if (!text) return reply(
      `Contoh: ${usedPrefix + command} 1|sxznightmare\nGunakan flaming 1 sampai flaming 6 untuk variasi efeknya`
    )

    await Morela.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

    let type  = 1
    let input = text

    if (text.includes('|')) {
      const [num, ...rest] = text.split('|')
      if (!isNaN(num) && num >= 1 && num <= 6) {
        type  = parseInt(num)
        input = rest.join('|').trim()
      }
    }

    if (!input)         return reply('*Teks tidak boleh kosong!* 🍂')
    if (type < 1 || type > 6) return reply('*Pilihan flaming hanya 1 sampai 6!* 🍂')

    const url = `https://api.cuki.biz.id/api/flaming/flaming${type}?apikey=cuki-x&text=${encodeURIComponent(input)}`

    const res = await fetch(url)
    if (!res.ok) return reply('*Gagal mengambil gambar dari server!* 🍂')

    const buffer = Buffer.from(await res.arrayBuffer())
    if (!buffer || buffer.length === 0) return reply('*Buffer kosong, kemungkinan server bermasalah!* 🍂')

    await Morela.sendMessage(m.chat, {
      image:       buffer,
      caption:     ' ',
      contextInfo: waContext()
    }, { quoted: fkontak || m })

  } catch (e) {
    reply('*Terjadi kesalahan saat memproses permintaan!* 🍂')
  } finally {
    await Morela.sendMessage(m.chat, { react: { text: '', key: m.key } })
  }
}

handler.help     = ['flaming']
handler.tags     = ['maker']
handler.command  = ['flaming']
handler.limit    = false
handler.register = false

export default handler