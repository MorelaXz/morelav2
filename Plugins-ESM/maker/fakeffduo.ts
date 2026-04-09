import axios from 'axios'
import { buildFkontak, menuBuf, imagePath, botName, CHANNEL_URL } from '../../Library/utils.js'
import fs from 'fs'

const API_KEY  = "YOUR_TOKEN_HERE"
const BASE_URL = "https://kazztzyy.my.id/api/maker/fakeffduo2"

const handler = async (m: any, { Morela, text, reply, fkontak }: any) => {
  if (!text) return reply(
    `╭──「 🎮 *Fake FF Duo* 」\n` +
    `│\n` +
    `│  📌 *Cara pakai:*\n` +
    `│  .fakeffduo <nama1>, <nama2>, <bg>\n` +
    `│\n` +
    `│  🖼️ Background: *1 - 30*\n` +
    `│\n` +
    `│  *Contoh:*\n` +
    `│  .fakeffduo putraa, cantika, 5\n` +
    `│\n` +
    `╰─────────────────────`
  )

  const args  = text.split(',')
  const name1 = args[0]?.trim()
  const name2 = args[1]?.trim()
  const bg    = parseInt(args[2]?.trim())

  if (!name1 || !name2) return reply(
    `❌ Masukkan 2 nama!\n\nContoh: *.fakeffduo putraa, cantika, 5*`
  )
  if (!bg || bg < 1 || bg > 30) return reply(
    `❌ Background harus angka *1 - 30*\n\nContoh: *.fakeffduo putraa, cantika, 5*`
  )

  await Morela.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

  try {
    const apiUrl  = `${BASE_URL}?name1=${encodeURIComponent(name1)}&name2=${encodeURIComponent(name2)}&bg=${bg}`
    const imgBuf  = fs.existsSync(imagePath) ? fs.readFileSync(imagePath) : menuBuf

    const caption =
      `╭──「 🎮 *Fake FF Duo* 」\n` +
      `│\n` +
      `│  👤 Player 1 : *${name1}*\n` +
      `│  👤 Player 2 : *${name2}*\n` +
      `│  🖼️ BG       : *${bg}*\n` +
      `│\n` +
      `╰─────────────────────\n\n` +
      `© ${botName}`

    await Morela.sendMessage(m.chat, {
      image: (await axios.get(apiUrl, { responseType: 'arraybuffer', timeout: 30000 })).data,
      caption,
      contextInfo: {
        externalAdReply: {
          title:                 `🎮 Fake FF Duo — ${botName}`,
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
    console.error('[FAKEFFDUO]', e)
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    reply('❌ Gagal buat Fake FF Duo: ' + (e as Error).message)
  }
}

handler.help    = ['fakeffduo <nama1>, <nama2>, <bg 1-30>']
handler.tags    = ['maker']
handler.command = ['fakeffduo', 'ffduo']

export default handler