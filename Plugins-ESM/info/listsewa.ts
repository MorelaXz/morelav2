// @ts-nocheck


import axios from 'axios'
import { botName, OWNER_WA } from '../../Library/utils.js'

const BG_IMAGE_URL = 'https://files.catbox.moe/928865.jpg'

const caption = `🤖 *LIST SEWA BOT WHATSAPP*
━━━━━━━━━━━━━━━━━━━

╭╌╌⬡「 💸 *ᴘᴀᴋᴇᴛ sᴇᴡᴀ* 」
┃ ◦ *10K*  / Minggu
┃ ◦ *20K*  / Bulan
┃ ◦ *25K*  / 2 Bulan
┃ ◦ *30K*  / 3 Bulan
┃ ◦ *60K*  / Bot Permanen
╰╌╌⬡

╭╌╌⬡「 ✨ *ꜰɪᴛᴜʀ sᴇᴡᴀ ʙᴏᴛ* 」
┃ ✓ Anti link
┃ ✓ Anti bot
┃ ✓ Anti tag SW
┃ ✓ Auto downloader
┃ ✓ Kick member otomatis / manual
┃ ✓ Tag all & hidetag
┃ ✓ Menu stiker & maker
┃ ✓ Fitur game
┃ ✓ HD foto
┃ ✓ Store menu / katalog
┃ ✓ Dan banyak fitur lainnya
╰╌╌⬡

╭╌╌⬡「 🏆 *ᴋᴇᴜɴᴛᴜɴɢᴀɴ* 」
┃ ✅ Bot aktif 24/7
┃ ✅ Bebas pakai tanpa batas
┃ ✅ Setting mudah
┃ ✅ Fitur rame & lengkap
╰╌╌⬡

━━━━━━━━━━━━━━━━━━━
© ${botName}`

const handler = async (m: any, { Morela, fkontak }: any) => {
  try {
    await Morela.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

    const res = await axios.get(BG_IMAGE_URL, { responseType: 'arraybuffer', timeout: 10_000 })
    const imgBuffer = Buffer.from(res.data)

    await Morela.sendMessage(
      m.chat,
      {
        image: imgBuffer,
        caption,
        interactiveButtons: [
          {
            name: 'cta_url',
            buttonParamsJson: JSON.stringify({
              display_text: '📞 Hubungin Kami',
              url: OWNER_WA,
              merchant_url: OWNER_WA,
            }),
          },
        ],
        hasMediaAttachment: true,
      },
      { quoted: fkontak || m }
    )

    await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
  } catch (err) {
    console.error('[LISTSEWA] Error:', (err as Error).message)
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    await Morela.sendMessage(
      m.chat,
      { text: `❌ *Gagal kirim list sewa!*\n\n${(err as Error).message}` },
      { quoted: fkontak || m }
    )
  }
}

handler.command  = ['listsewa', 'sewalist', 'sewa', 'hargasewa']
handler.help     = ['listsewa']
handler.tags     = ['info', 'owner']
handler.noLimit  = true
handler.owner    = false
handler.premium  = false
handler.group    = false
handler.private  = false
handler.admin    = false
handler.botAdmin = false

export default handler