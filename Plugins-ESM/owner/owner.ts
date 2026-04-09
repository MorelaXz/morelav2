// @ts-nocheck
import fs from 'fs'
import { promises as fsPromises } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { atomicWriteJSON, CHANNEL_URL, imagePath, botName, ownerName } from '../../Library/utils.js'
import { isJadibot, removeJadibot } from '../../Library/jadibotdb.js'
import { invalidateOwnerCache } from '../../Morela.js'
import { getOwnerType } from './setownertype.js'

const __filename = fileURLToPath(import.meta.url as string)
const __dirname  = path.dirname(__filename)
const OWNER_PATH = path.join(__dirname, '../..', 'data', 'Own.json')

async function readOwners() {
  if (!fs.existsSync(OWNER_PATH)) return []
  return JSON.parse(await fsPromises.readFile(OWNER_PATH, 'utf-8'))
}

async function saveOwners(owners: unknown) {
  await atomicWriteJSON(OWNER_PATH, owners)
  global.owner = [...owners]
}

const handler = async (m: any, { Morela, command, args, fkontak, isOwn }: any) => {
  const pushname = m.pushName || 'Kak'

  const send = text =>
    Morela.sendMessage(m.chat, { text }, { quoted: fkontak || m })

  let owners = []
  try {
    owners = await readOwners()
  } catch (e) {
    return send(`❌ Error membaca data owner: ${(e as Error).message}`)
  }

  
  if (command === 'owner') {
    if (owners.length === 0) return send(
      `╭╌╌⬡「 👑 *ᴏᴡɴᴇʀ* 」\n` +
      `┃ ❌ Belum ada owner terdaftar!\n` +
      `╰╌╌⬡\n\n© ${botName}`
    )

    const { getMainOwner } = await import('../../System/mainowner.js')
    const mainOwnerNum = getMainOwner()

    const allNums: string[] = []
    if (mainOwnerNum) allNums.push(mainOwnerNum)
    for (const n of owners) {
      const clean = n.replace(/[^0-9]/g, '')
      if (clean && clean !== mainOwnerNum) allNums.push(clean)
    }

    const ownerType = getOwnerType()

    
    if (ownerType !== 2 && ownerType !== 3) {
      const buttons = allNums.map((num, i) => {
        const isMain = num === mainOwnerNum
        const label  = isMain ? `👑 Main Owner` : `👤 Owner ${i + 1}`
        return {
          name: 'cta_url',
          buttonParamsJson: JSON.stringify({
            display_text: label,
            url: `https://wa.me/${num}`,
            merchant_url: `https://wa.me/${num}`
          })
        }
      })
      await Morela.sendMessage(
        m.chat,
        {
          text: `No Owner ku 🤙`,
          footer: `© ${botName}`,
          interactiveButtons: buttons,
          hasMediaAttachment: false
        },
        { quoted: fkontak || m }
      )
      return
    }

    
    if (ownerType === 2) {
      const imgBuf = fs.existsSync(imagePath) ? fs.readFileSync(imagePath) : null

      const ownerLines = allNums.map((num, i) => {
        const isMain = num === mainOwnerNum
        return `┃ ◦ ${isMain ? '👑 Main Owner' : `👤 Owner ${i + 1}`} : +${num}`
      }).join('\n')

      const buttons = allNums.map((num, i) => {
        const isMain = num === mainOwnerNum
        const label  = isMain ? `👑 Main Owner` : `👤 Owner ${i + 1}`
        return {
          name: 'cta_url',
          buttonParamsJson: JSON.stringify({
            display_text: `💬 Chat ${label}`,
            url: `https://wa.me/${num}`,
            merchant_url: `https://wa.me/${num}`
          })
        }
      })

      const msg: Record<string, unknown> = {
        caption:
          `╭╌╌⬡「 👑 *ᴏᴡɴᴇʀ* 」\n` +
          ownerLines + `\n` +
          `╰╌╌⬡`,
        footer: `© ${botName}`,
        interactiveButtons: buttons,
        hasMediaAttachment: true,
      }

      if (imgBuf) {
        msg.image = imgBuf
      } else {
        msg.image = { url: 'https://files.catbox.moe/928865.jpg' }
      }

      await Morela.sendMessage(m.chat, msg, { quoted: fkontak || m })
      return
    }

    
    if (ownerType === 3) {
      await Morela.sendMessage(
        m.chat,
        {
          text:
            `╭╌╌⬡「 👑 *ᴏᴡɴᴇʀ* 」\n` +
            `┃ Total: *${allNums.length} owner*\n` +
            `╰╌╌⬡\n\n© ${botName}`
        },
        { quoted: fkontak || m }
      )
      for (let i = 0; i < allNums.length; i++) {
        const num    = allNums[i]
        const isMain = num === mainOwnerNum
        const label  = isMain ? `👑 Main Owner` : `👤 Owner ${i + 1}`
        const vcard  =
          `BEGIN:VCARD\nVERSION:3.0\n` +
          `N:${label}\nFN:${label}\n` +
          `ORG:${botName};\n` +
          `TEL;type=CELL;type=VOICE;waid=${num}:${num}\n` +
          `END:VCARD`
        await Morela.sendMessage(
          m.chat,
          { contacts: { displayName: label, contacts: [{ vcard }] } },
          { quoted: fkontak || m }
        )
      }
      return
    }
  }

  if (command === 'addowner') {
    const { isMainOwner } = await import('../../System/mainowner.js')
    const { getPhoneByLid } = await import('../../Database/db.js')
    const _rawSender = (m.sender || '')
    let _senderNum = _rawSender.split('@')[0].split(':')[0].replace(/[^0-9]/g, '')
    
    if (_rawSender.endsWith('@lid')) {
      const _resolved = getPhoneByLid(_senderNum)
      if (_resolved) _senderNum = _resolved.replace(/[^0-9]/g, '')
    }
    if (!isMainOwner(_senderNum)) return send(`❌ Fitur ini hanya untuk Main Owner!`)
    let number = args[0]

    if (!number) {
      if (m.mentionedJid?.[0]) {
        number = m.mentionedJid[0].split('@')[0].split(':')[0]
      } else if (m.quoted) {
        number = (m.quoted.sender || m.quoted.key?.participant || '').split('@')[0].split(':')[0]
      } else {
        return send(
          `╭╌╌⬡「 👑 *ᴀᴅᴅ ᴏᴡɴᴇʀ* 」\n` +
          `┃ ❌ *Format Salah!*\n` +
          `┃\n` +
          `┃ _Cara pakai:_\n` +
          `┃ ◦ \`.addowner 628xxx\`\n` +
          `┃ ◦ \`.addowner @mention\`\n` +
          `┃ ◦ Reply + \`.addowner\`\n` +
          `╰╌╌⬡\n\n© ${botName}`
        )
      }
    }

    number = number.split(':')[0].replace(/[^0-9]/g, '')
    if (number.length < 10) return send(
      `╭╌╌⬡「 👑 *ᴀᴅᴅ ᴏᴡɴᴇʀ* 」\n` +
      `┃ ❌ Nomor tidak valid!\n` +
      `┃ _Contoh: 628xxxxxxxxxx_\n` +
      `╰╌╌⬡\n\n© ${botName}`
    )

    if (owners.includes(number)) return send(
      `╭╌╌⬡「 👑 *ᴀᴅᴅ ᴏᴡɴᴇʀ* 】\n` +
      `┃ ⚠️ *Sudah Terdaftar!*\n` +
      `┃ ◦ Nomor *+${number}* sudah owner\n` +
      `╰╌╌⬡\n\n© ${botName}`
    )

    
    
    
    const _isActiveSession = global.jadibotSessions?.has(number)
    if (isJadibot(number) || _isActiveSession) return send(
      `╭╌╌⬡「 👑 *ᴀᴅᴅ ᴏᴡɴᴇʀ* 」\n` +
      `┃ 🚫 *Ditolak! Risiko Keamanan!*\n` +
      `┃\n` +
      `┃ ◦ Nomor *+${number}* sedang aktif\n` +
      `┃   sebagai *jadibot*!\n` +
      `┃\n` +
      `┃ Hentikan dulu dengan:\n` +
      `┃ ◦ *.stopbot ${number}*\n` +
      `┃\n` +
      `┃ _Lalu ulangi .addowner._\n` +
      `╰╌╌⬡\n\n© ${botName}`
    )

    owners.push(number)
    try {
      await saveOwners(owners)
      invalidateOwnerCache()
      return send(
        `╭╌╌⬡「 👑 *ᴀᴅᴅ ᴏᴡɴᴇʀ* 」\n` +
        `┃ ✅ *Owner Ditambahkan!*\n` +
        `┃\n` +
        `┃ ◦ 📱 Nomor  : *+${number}*\n` +
        `┃ ◦ 👑 Status : *Owner Aktif*\n` +
        `┃ ◦ 📊 Total  : *${owners.length} owner*\n` +
        `┃\n` +
        `┃ _Owner baru sudah aktif sekarang!_\n` +
        `╰╌╌⬡\n\n© ${botName}`
      )
    } catch (e) {
      return send(
        `╭╌╌⬡「 👑 *ᴀᴅᴅ ᴏᴡɴᴇʀ* 」\n` +
        `┃ ❌ Gagal menyimpan\n` +
        `┃ ${(e as Error).message}\n` +
        `╰╌╌⬡\n\n© ${botName}`
      )
    }
  }

  if (command === 'delowner') {
    const { isMainOwner } = await import('../../System/mainowner.js')
    const { getPhoneByLid } = await import('../../Database/db.js')
    const _rawSender = (m.sender || '')
    let _senderNum = _rawSender.split('@')[0].split(':')[0].replace(/[^0-9]/g, '')
    
    if (_rawSender.endsWith('@lid')) {
      const _resolved = getPhoneByLid(_senderNum)
      if (_resolved) _senderNum = _resolved.replace(/[^0-9]/g, '')
    }
    if (!isMainOwner(_senderNum)) return send(`❌ Fitur ini hanya untuk Main Owner!`)
    let number = args[0]

    if (!number) {
      if (m.mentionedJid?.[0]) {
        number = m.mentionedJid[0].split('@')[0].split(':')[0]
      } else if (m.quoted) {
        number = (m.quoted.sender || m.quoted.key?.participant || '').split('@')[0].split(':')[0]
      } else {
        return send(
          `╭╌╌⬡「 👑 *ᴅᴇʟ ᴏᴡɴᴇʀ* 」\n` +
          `┃ ❌ *Format Salah!*\n` +
          `┃\n` +
          `┃ _Cara pakai:_\n` +
          `┃ ◦ \`.delowner 628xxx\`\n` +
          `┃ ◦ \`.delowner @mention\`\n` +
          `┃ ◦ Reply + \`.delowner\`\n` +
          `╰╌╌⬡\n\n© ${botName}`
        )
      }
    }

    number = number.split(':')[0].replace(/[^0-9]/g, '')
    const index = owners.indexOf(number)

    if (index === -1) return send(
      `╭╌╌⬡「 👑 *ᴅᴇʟ ᴏᴡɴᴇʀ* 」\n` +
      `┃ ⚠️ *Tidak Ditemukan!*\n` +
      `┃ ◦ Nomor *+${number}* bukan owner\n` +
      `╰╌╌⬡\n\n© ${botName}`
    )

    if (owners.length === 1) return send(
      `╭╌╌⬡「 👑 *ᴅᴇʟ ᴏᴡɴᴇʀ* 」\n` +
      `┃ 🚫 *Tidak Bisa Dihapus!*\n` +
      `┃\n` +
      `┃ _Ini satu-satunya owner!_\n` +
      `┃ _Tambahkan owner lain dulu._\n` +
      `╰╌╌⬡\n\n© ${botName}`
    )

    owners.splice(index, 1)
    try {
      await saveOwners(owners)
      invalidateOwnerCache()

      
      
      
      let jadibotStopNote = ''
      if (global.jadibotSessions?.has(number) || isJadibot(number)) {
        try {
          removeJadibot(number) 
          const session = global.jadibotSessions.get(number)
          await session?.stop?.()
          jadibotStopNote = `\n` +
            `┃ ⚠️ Jadibot *+${number}* juga\n` +
            `┃   dihentikan otomatis.\n`
        } catch (_) {
          jadibotStopNote = `\n` +
            `┃ ⚠️ Gagal stop jadibot *+${number}*.\n` +
            `┃   Hentikan manual: *.stopbot ${number}*\n`
        }
      }

      return send(
        `╭╌╌⬡「 👑 *ᴅᴇʟ ᴏᴡɴᴇʀ* 」\n` +
        `┃ 🗑️ *Owner Dihapus!*\n` +
        `┃\n` +
        `┃ ◦ 📱 Nomor  : *+${number}*\n` +
        `┃ ◦ 👑 Status : *Dicabut*\n` +
        `┃ ◦ 📊 Sisa   : *${owners.length} owner*\n` +
        jadibotStopNote +
        `┃\n` +
        `┃ _Akses owner telah dicabut!_\n` +
        `╰╌╌⬡\n\n© ${botName}`
      )
    } catch (e) {
      return send(
        `╭╌╌⬡「 👑 *ᴅᴇʟ ᴏᴡɴᴇʀ* 」\n` +
        `┃ ❌ Gagal menyimpan\n` +
        `┃ ${(e as Error).message}\n` +
        `╰╌╌⬡\n\n© ${botName}`
      )
    }
  }
}

handler.command = ['owner', 'addowner', 'delowner']


handler.tags    = ['owner']
handler.help    = ['owner', 'addowner <nomor>', 'delowner <nomor>']
handler.noLimit = true

export default handler