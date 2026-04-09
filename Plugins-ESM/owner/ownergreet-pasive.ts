// @ts-nocheck
import fs   from 'fs'
import path from 'path'
import { getPhoneByLid } from '../../Database/db.js'
import { OWNER_WA, botName } from '../../Library/utils.js'


const DB_PATH      = path.join(process.cwd(), 'data', 'ownsalam.json')
const GREET_COOLDOWN = 3 * 60 * 60 * 1000 

function loadDB(): Record<string, number> {
  try {
    if (!fs.existsSync(DB_PATH)) return {}
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'))
  } catch { return {} }
}

function saveDB(data: Record<string, number>) {
  try { fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2)) } catch {}
}


const GREETINGS = [
  '👑 *Owner Tercinta Telah Hadir!*\n\nSelamat datang kembali boss, semoga harimu menyenangkan 😄',
  '🔥 *Bosnya Dateng Gaes!*\n\nSambut kedatangan owner kita yang kece abis 👑',
  '✨ *The Owner Has Entered The Chat!*\n\nSelamat datang balik, boss! Grup langsung on fire 🔥',
  '🎉 *Halo Owner!*\n\nWelcome back, semua siap melayani 🫡',
  '👋 *Owner Aktif Nih!*\n\nSelamat datang boss, semoga mood bagus terus ya 😎',
]

export default {
  tags: ['passive', 'owner'],

  handler: async (m, { Morela }) => {
    
    if (m.key?.fromMe)                    return
    if (!m.isGroup)                       return
    if (m.chat === 'status@broadcast')    return

    
    const rawSender = m.sender || m.key?.participant || ''
    let senderNum   = rawSender.split('@')[0].split(':')[0].replace(/[^0-9]/g, '')

    if (rawSender.endsWith('@lid')) {
      const resolved = getPhoneByLid(rawSender.split('@')[0])
      if (resolved) senderNum = resolved.replace(/[^0-9]/g, '')
      else return
    }

    if (!senderNum || senderNum.length < 8) return

    
    
    
    const ownerList: string[] = Array.isArray(OWNER_WA) ? OWNER_WA : [OWNER_WA]
    const isOwner = ownerList.some(num =>
      num.replace(/[^0-9]/g, '').includes(senderNum) ||
      senderNum.includes(num.replace(/[^0-9]/g, ''))
    )
    if (!isOwner) return

    
    const db  = loadDB()
    const now = Date.now()
    const key = `${m.chat}_${senderNum}`

    if (now - (db[key] || 0) < GREET_COOLDOWN) return

    
    db[key] = now
    saveDB(db)

    
    const msg = GREETINGS[Math.floor(Math.random() * GREETINGS.length)]

    await Morela.sendMessage(m.chat, {
      text: msg,
      contextInfo: {
        externalAdReply: {
          title:                 '👑 Owner Datang!',
          body:                  `Powered by ${botName}`,
          thumbnailUrl:          'https://i.imgur.com/jNNT4LE.jpeg',
          sourceUrl:             `https://wa.me/${senderNum}`,
          mediaType:             1,
          renderLargerThumbnail: true
        }
      }
    }, { quoted: m })
  }
}