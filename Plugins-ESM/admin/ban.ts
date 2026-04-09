// @ts-nocheck
import fs   from 'fs'
import { bi, buildFkontak, sendCard, menuBuf as defaultMenuBuf, CHANNEL_URL, imagePath, botName } from '../../Library/utils.js'
import { banUser, getUser, getUsers, getPhoneByLid } from '../../Database/db.js'

function resolveJid(raw: string | null | undefined) {
  if (!raw) return null
  if (raw.endsWith('@lid')) {
    try {
      const phone = getPhoneByLid(raw.split('@')[0])
      if (phone) return phone + '@s.whatsapp.net'
    } catch {}
  }
  const num = raw.replace(/@.*/, '').replace(/[^0-9]/g, '')
  return num ? num + '@s.whatsapp.net' : null
}

function resolveTarget(m: Record<string,unknown>, args: string[]) {
  
  if (args[0]) {
    const num = args[0].replace(/[^0-9]/g, '')
    if (num.length >= 10) return num + '@s.whatsapp.net'
  }
  
  if (m.mentionedJid?.[0]) return resolveJid(m.mentionedJid[0])
  
  if (m.quoted) {
    const raw = m.quoted.sender || m.quoted.key?.participant || m.quoted.key?.remoteJid
    return resolveJid(raw)
  }
  return null
}

const handler = async (m: any, { Morela, command, args, senderJid, fkontak }: any) => {

  const imgBuf  = fs.existsSync(imagePath) ? fs.readFileSync(imagePath) : defaultMenuBuf
  const send    = (text) => sendCard(Morela, m.chat, text + `\n\n© ${botName}`, imgBuf, fkontak)

  if (command === 'banlist') {
    const usersRaw = getUsers()
    const banned   = Object.values(usersRaw).filter((u: unknown) => u.is_banned === 1)

    if (!banned.length) {
      return send(
        `🚫 *BAN LIST*\n\n` +
        `✅ Tidak ada user yang di-ban saat ini.`
      )
    }

    const list = banned.map((u, i) => {
      const num  = u.number || u.jid?.replace('@s.whatsapp.net', '') || '???'
      const nama = u.name || 'User'
      return `│ ${i + 1}. +${num} — ${nama}`
    }).join('\n')

    return send(
      `🚫 *BAN LIST*\n\n` +
      `╭─────────────────────\n` +
      `${list}\n` +
      `╰─────────────────────\n\n` +
      `📊 Total banned: *${banned.length} user*`
    )
  }

  const targetJid = resolveTarget(m, args)

  if (!targetJid) {
    const isBan = command === 'ban'
    return send(
      `${isBan ? '🚫' : '✅'} *${isBan ? 'Ban' : 'Unban'} User*\n\n` +
      `📌 *Cara pakai:*\n` +
      `╭─────────────────────\n` +
      `│ .${command} 628xxx\n` +
      `│ .${command} @mention\n` +
      `│ Reply pesan + .${command}\n` +
      `╰─────────────────────`
    )
  }

  const targetNum = targetJid.replace('@s.whatsapp.net', '')

  if (senderJid && targetJid === senderJid) {
    return send(`❌ Tidak bisa ban diri sendiri!`)
  }

  const userData    = getUser(targetJid)
  const namaTarget  = userData?.name || 'User'
  const sudahBanned = userData?.is_banned === 1

  if (command === 'ban') {
    if (sudahBanned) {
      return send(
        `⚠️ *Sudah Di-ban!*\n\n` +
        `📱 Nomor : +${targetNum}\n` +
        `👤 Nama  : ${namaTarget}\n\n` +
        `User ini sudah di-ban sebelumnya.\n` +
        `Gunakan *.unban* untuk mencabut ban.`
      )
    }

    banUser(targetJid, 1)

    return send(
      `🚫 *User Di-ban!*\n\n` +
      `╭─────────────────────\n` +
      `│ 📱 Nomor  : +${targetNum}\n` +
      `│ 👤 Nama   : ${namaTarget}\n` +
      `│ 🔒 Status : Banned\n` +
      `╰─────────────────────\n\n` +
      `User tidak bisa menggunakan bot lagi.\n` +
      `Gunakan *.unban* untuk mencabut.`
    )
  }

  if (command === 'unban') {
    if (!sudahBanned) {
      return send(
        `⚠️ *Tidak Di-ban!*\n\n` +
        `📱 Nomor : +${targetNum}\n` +
        `👤 Nama  : ${namaTarget}\n\n` +
        `User ini tidak sedang di-ban.`
      )
    }

    banUser(targetJid, 0)

    return send(
      `✅ *User Di-unban!*\n\n` +
      `╭─────────────────────\n` +
      `│ 📱 Nomor  : +${targetNum}\n` +
      `│ 👤 Nama   : ${namaTarget}\n` +
      `│ 🔓 Status : Aktif kembali\n` +
      `╰─────────────────────\n\n` +
      `User sudah bisa menggunakan bot lagi.`
    )
  }
}

handler.command = ['ban', 'unban', 'banlist']
handler.owner   = true
handler.tags    = ['owner']
handler.help    = ['ban <nomor/reply/mention>', 'unban <nomor/reply/mention>', 'banlist']
handler.noLimit = true

export default handler