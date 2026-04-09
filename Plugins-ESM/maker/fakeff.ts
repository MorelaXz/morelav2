import { buildFkontak, menuBuf, imagePath, botName, CHANNEL_URL } from '../../Library/utils.js'
import fs from 'fs'

const API_KEY  = "YOUR_TOKEN_HERE"
const BASE_URL = "https://kazztzyy.my.id/api/maker/fakeff"

const handler = async (m: any, { Morela, text, reply, fkontak }: any) => {
  if (!text) return reply(
    `╭──「 🎮 *Fake Free Fire* 」\n` +
    `│\n` +
    `│  📌 *Cara pakai:*\n` +
    `│  .fakeff <nama>.<bg>\n` +
    `│\n` +
    `│  🖼️ Background: *1 - 60*\n` +
    `│\n` +
    `│  *Contoh:*\n` +
    `│  .fakeff Being Rizky.3\n` +
    `│\n` +
    `╰─────────────────────`
  )

  const args = text.split('.')
  const name = args[0]?.trim()
  const bg   = parseInt(args[1]?.trim())

  if (!name) return reply('❌ Masukkan nama!\n\nContoh: *.fakeff Being Rizky.3*')
  if (!bg || bg < 1 || bg > 60) return reply('❌ Background harus angka *1 - 60*\n\nContoh: *.fakeff Being Rizky.3*')

  await Morela.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

  try {
    const apiUrl  = `${BASE_URL}?text=${encodeURIComponent(name)}&bg=${bg}&apikey=${API_KEY}`
    const imgBuf  = fs.existsSync(imagePath) ? fs.readFileSync(imagePath) : menuBuf

    const caption =
      `╭──「 🎮 *Fake Free Fire* 」\n` +
      `│\n` +
      `│  👤 Nama  : *${name}*\n` +
      `│  🖼️ BG    : *${bg}*\n` +
      `│\n` +
      `╰─────────────────────\n\n` +
      `© ${botName}`

    await Morela.sendMessage(m.chat, {
      image: { url: apiUrl },
      caption,
      contextInfo: {
        externalAdReply: {
          title:                 `🎮 Fake FF — ${botName}`,
          body:                  CHANNEL_URL,
          mediaType:             1,
          thumbnail:             imgBuf,
          renderLargerThumbnail: false,
          showAdAttribution:     false
        }
      }
    }, { quoted: fkontak || m })

    await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
  } catch (e) {
    console.error('[FAKEFF]', e)
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    reply('❌ Gagal buat Fake FF: ' + (e as Error).message)
  }
}

handler.help    = ['fakeff <nama>.<bg 1-60>']
handler.tags    = ['maker']
handler.command = ['fakeff']

export default handler