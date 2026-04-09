// @ts-nocheck


import axios from 'axios'
import { botName, OWNER_WA } from '../../Library/utils.js'

const BG_IMAGE_URL = 'https://files.catbox.moe/928865.jpg'

const caption = `💢 *WTS Morela v 2.0.0*
━━━━━━━━━━━━━━━━

╭╌╌⬡「 ✨ *ꜰɪᴛᴜʀ ʟᴇɴɢᴋᴀᴘ* 」
┃ ◦ Menu Stiker, Maker, Tools & Downloader Lengkap
┃ ◦ Anti SW Grup, Anti Tag SW, Anti-NSFW, dll
┃ ◦ Sewa Bot & Premium Bot Full Otomatis Payment Gateway
┃ ◦ 3 Tampilan Menu Berbeda (Bisa Diganti)
┃ ◦ Auto React Status WhatsApp
┃ ◦ Menu, Group & Owner Tools
┃ ◦ Auto Downloader All Social Media
┃ ◦ Smart Auto AI Menggunakan Sessions
┃ ◦ Kode Rapi & Bersih — Semua Setting di 1 File
┃ ◦ Update Rutin & Maintenance Terjaga
┃ ◦ Anti Over-Limit & Anti Bad Session
┃ ◦ Siap Online 24/7
╰╌╌⬡

╭╌╌⬡「 💰 *ʜᴀʀɢᴀ sᴄʀɪᴘᴛ* 」
┃ ◦ Harga  : *Rp 20.000*
┃ ◦ Free Update
┃ ◦ Source Code Terjaga
┃ ◦ Support & Bantuan 24/7
┃ ◦ Free Panel & Reseller Panel
┃ ◦ Grup Info Update
┃ ◦ Request Fitur Tiap Update
╰╌╌⬡

╭╌╌⬡「 🏪 *ʀᴇsᴇʟʟᴇʀ sᴄʀɪᴘᴛ* 」
┃ ◦ Harga  : *Rp 30.000*
┃ ◦ Bebas Jual Script
┃ ◦ Akses Database Full
╰╌╌⬡

╭╌╌⬡「 ⬆️ *ʙᴜʏᴇʀ → ʀᴇsᴇʟʟᴇʀ* 」
┃ ◦ Harga  : *Rp 50.000*
┃ ◦ Bebas Jual Script
┃ ◦ Akses Database Full
╰╌╌⬡

╭╌╌⬡「 🛠️ *sᴘᴇsɪꜰɪᴋᴀsɪ ʙᴏᴛ* 」
┃ ◦ Language  : *TypeScript (Pure ESM)*
┃ ◦ Runtime   : *Node.js ≥ 20 + tsx*
┃ ◦ Library   : *@itsukichan/baileys v7*
┃ ◦ Process   : *PM2 (autorestart 24/7)*
┃ ◦ Plugins   : *163 file | 388+ command*
╰╌╌⬡

━━━━━━━━━━━━━━━━
© Morela`

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
    console.error('[SC] Error:', (err as Error).message)
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    await Morela.sendMessage(
      m.chat,
      { text: `❌ *Gagal kirim SC!*\n\n${(err as Error).message}` },
      { quoted: fkontak || m }
    )
  }
}

handler.command  = ['sc', 'scriptcard', 'jualbot']
handler.help     = ['sc']
handler.tags     = ['info', 'owner']
handler.noLimit  = true
handler.owner    = false
handler.premium  = false
handler.group    = false
handler.private  = false
handler.admin    = false
handler.botAdmin = false

export default handler