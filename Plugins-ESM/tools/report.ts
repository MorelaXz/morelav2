// @ts-nocheck



import fs from 'fs'
import { botName, sendCard, menuBuf, imagePath } from '../../Library/utils.js'
import { getMainOwner } from '../../System/mainowner.js'
import { DateTime } from 'luxon'

const handler = async (m: any, { Morela, reply, text, fkontak }: any) => {
    const from      = m.chat
    const pushname  = m.pushName || 'User'
    const sender    = m.sender || m.key?.remoteJid || ''
    const senderNum = sender.split('@')[0].split(':')[0].replace(/[^0-9]/g, '')
    const isGroup   = m.isGroup
    const groupName = isGroup
        ? (await Morela.groupMetadata(from).catch(() => ({ subject: from }))).subject
        : null

    
    if (!text || !text.trim()) {
        return reply(
            `╭╌╌⬡「 📋 *ʀᴇᴘᴏʀᴛ* 」\n` +
            `┃\n` +
            `┃ ◦ Format : *.report <pesan>*\n` +
            `┃\n` +
            `┃ ◦ Contoh :\n` +
            `┃   *.report bug di command .menu*\n` +
            `┃   *.report request fitur download reels*\n` +
            `┃\n` +
            `╰╌╌⬡\n\n꒰ © ${botName} ꒱`
        )
    }

    const mainOwner = getMainOwner()
    if (!mainOwner) return reply(`❌ Main Owner belum diset.`)

    const mainOwnerJid = mainOwner + '@s.whatsapp.net'
    const now = DateTime.now().setZone('Asia/Jakarta').setLocale('id').toFormat('dd/MM/yyyy HH:mm:ss')

    
    const toOwner =
        `╭╌╌⬡「 📋 *ʟᴀᴘᴏʀᴀɴ ᴍᴀꜱᴜᴋ* 」\n` +
        `┃\n` +
        `┃ ◦ 👤 Dari    : *${pushname}*\n` +
        `┃ ◦ 📱 Nomor   : *+${senderNum}*\n` +
        `┃ ◦ 📍 Lokasi  : *${isGroup ? `Grup: ${groupName}` : 'Private Chat'}*\n` +
        `┃ ◦ 🕐 Waktu   : *${now} WIB*\n` +
        `┃\n` +
        `┃ 📝 *Isi Laporan:*\n` +
        `┃ ${text.trim().split('\n').join('\n┃ ')}\n` +
        `┃\n` +
        `╰╌╌⬡\n\n꒰ © ${botName} ꒱`

    try {
        await Morela.sendMessage(mainOwnerJid, { text: toOwner })
    } catch (e: any) {
        console.error('[REPORT] Gagal kirim ke main owner:', e.message)
        return reply(`❌ Gagal mengirim laporan. Coba lagi nanti.`)
    }

    
    const imgBuf = fs.existsSync(imagePath) ? fs.readFileSync(imagePath) : menuBuf
    const caption =
        `*Report Berhasil*\n\n` +
        `*Status* : Laporan terkirim ke owner\n` +
        `Terima kasih sudah membantu\nimprove bot ini 🙌\n\n` +
        `© ${botName}`

    try {
        await sendCard(Morela, from, caption, imgBuf, fkontak || m)
    } catch {
        
        await reply(
            `╭╌╌⬡「 ✅ *ʀᴇᴘᴏʀᴛ ʙᴇʀʜᴀꜱɪʟ* 」\n` +
            `┃\n` +
            `┃ *Status* : Laporan terkirim ke owner\n` +
            `┃ Terima kasih sudah membantu\n` +
            `┃ improve bot ini 🙌\n` +
            `┃\n` +
            `╰╌╌⬡\n\n꒰ © ${botName} ꒱`
        )
    }
}

handler.command  = ['report']
handler.tags     = ['tools']
handler.help     = ['report <pesan/bug/request>']
handler.noLimit  = true
handler.owner    = false
handler.premium  = false
handler.group    = false
handler.private  = false
handler.admin    = false
handler.botAdmin = false

export default handler