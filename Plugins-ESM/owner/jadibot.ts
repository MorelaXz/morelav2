// @ts-nocheck
import baileys from '@itsukichan/baileys'
import pino    from 'pino'
import fs      from 'fs'
import path    from 'path'
import { botName } from '../../Library/utils.js'
import { addJadibot, removeJadibot, isJadibot, listJadibot } from '../../Library/jadibotdb.js'

const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  jidNormalizedUser
} = baileys




if (!global.jadibotSessions) global.jadibotSessions = new Map()

const MAX_JADIBOT_SESSIONS = 5

const sessionDir = (nomor) =>
  path.join(process.cwd(), 'sessions', 'jadibot', nomor)

const cleanNumber = (text) => text.replace(/[^0-9]/g, '')

async function spawnJadibot(nomor: unknown, sendMsg: unknown, m: Record<string, unknown>, chatJid: unknown) {
  const dir = sessionDir(nomor)
  fs.mkdirSync(dir, { recursive: true })

  
  
  
  
  
  
  addJadibot(nomor)

  const { state, saveCreds } = await useMultiFileAuthState(dir)
  const { version }          = await fetchLatestBaileysVersion()

  const conn = makeWASocket({
    logger:             pino({ level: 'silent' }),
    printQRInTerminal:  false,
    version,
    auth:               state,
    browser:            ['Ubuntu', 'Chrome', '114.0.5735.198'],
    syncFullHistory:    false,
    getMessage:         async () => undefined
  })

  let stopped = false

  const { jidDecode: _jidDecode } = baileys
  conn.decodeJid = (jid) => {
    if (!jid) return jid
    if (/:\d+@/gi.test(jid)) {
      const decode = _jidDecode(jid) || {}
      return decode.user && decode.server ? decode.user + '@' + decode.server : jid
    }
    return jid
  }

  if (!conn.authState.creds.registered) {
    try {
      await new Promise(r => setTimeout(r, 2000))
      const code      = await conn.requestPairingCode(nomor)
      const formatted = code?.match(/.{1,4}/g)?.join('-') || code

      const _sock = (globalThis as Record<string, unknown>).__sock__
      await _sock.sendMessage(chatJid, {
        text:
          `╭─「 🤖 *JADIBOT* 」\n` +
          `│\n` +
          `│ 📱 Nomor: *+${nomor}*\n` +
          `│\n` +
          `│ 🔐 Kode Pairing:\n` +
          `│ *${formatted}*\n` +
          `│\n` +
          `│ _Masukkan kode di WA dalam 60 detik._\n` +
          `╰──────────────────\n\n꒰ © ${botName} ꒱`
      })
    } catch (e) {
      await sendMsg(`❌ Gagal meminta pairing code: ${(e as Error).message}`)
      
      removeJadibot(nomor)
      fs.rmSync(dir, { recursive: true, force: true })
      return null
    }
  }

  conn.ev.on('creds.update', saveCreds)

  conn.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update

    if (connection === 'open') {
      const botNum = conn.user?.id?.split(':')[0] || nomor
      
      
      addJadibot(nomor)
      await sendMsg(
        `✅ *Jadibot berhasil terhubung!*\n\n` +
        `📱 Nomor: *+${botNum}*\n\n` +
        `_Gunakan .stopbot ${nomor} untuk menghentikannya._\n\n` +
        `꒰ © ${botName} ꒱`
      )
    }

    if (connection === 'close') {
      const code   = lastDisconnect?.error?.output?.statusCode
      const logout = code === DisconnectReason.loggedOut

      
      
      
      const safeNotify = async (teks) => {
        try {
          const _main = (globalThis as Record<string, unknown>).__sock__
          if (_main) await _main.sendMessage(chatJid, { text: teks })
        } catch {}
      }

      if (stopped || logout) {
        removeJadibot(nomor) 
        global.jadibotSessions.delete(nomor)
        if (logout) {
          fs.rmSync(dir, { recursive: true, force: true })
          await safeNotify(`⚠️ Jadibot *+${nomor}* logout. Sesi dihapus.`)
        }
      } else {
        
        
        
        setTimeout(() => spawnJadibot(nomor, safeNotify, null, chatJid), 5000)
      }
    }
  })

  conn.ev.on('messages.upsert', async (update) => {
    
    if (update.type !== 'notify') {
      const _tmp = update.messages?.[0]
      const _isSelf = _tmp?.key?.fromMe && !_tmp?.key?.remoteJid?.endsWith('@g.us')
      if (update.type !== 'append' || !_isSelf) return
    }

    let mek = update.messages[0]
    if (!mek?.message) return
    if (mek.key.fromMe && mek.key.remoteJid?.endsWith('@g.us')) return
    if (mek.key?.remoteJid === 'status@broadcast') return

    
    const _outerKey = Object.keys(mek.message)[0]
    if (_outerKey === 'deviceSentMessage') {
      mek.message = mek.message.deviceSentMessage?.message || mek.message
    } else if (_outerKey === 'ephemeralMessage') {
      mek.message = mek.message.ephemeralMessage?.message || mek.message
    }

    try {
      const { default: morelaHandler } = await import('../../Morela.js')
      const { smsg }                   = await import('../../System/message.js')

      const store = global.jadibotSessions.get(nomor)?.store || { messages: {}, groupMetadata: {} }
      const sMsg  = smsg(conn, mek, store)

      
      
      
      sMsg._isJadibot        = true
      sMsg._jadibotOwnerNomor = nomor  

      await morelaHandler(conn, sMsg, update, store).catch((e: unknown) => {
        console.error(`[JADIBOT-${nomor}] morelaHandler error:`, (e as Error).message)
      })
    } catch (e) {
      console.error(`[JADIBOT-${nomor}] upsert error:`, (e as Error).message)
    }
  })

  const session = {
    conn,
    store:     { messages: {}, groupMetadata: {}, contacts: {} },
    startedAt: Date.now(),
    stop: async () => {
      stopped = true
      try { await conn.logout() } catch { conn.end() }
      removeJadibot(nomor) 
      global.jadibotSessions.delete(nomor)
      fs.rmSync(dir, { recursive: true, force: true })
    }
  }

  global.jadibotSessions.set(nomor, session)
  return session
}

const handler = async (m: any, { Morela, conn, reply, text, fkontak }: any) => {
  conn = conn || Morela

  
  
  if (m._isJadibot) {
    return reply(
      `❌ *Tidak Bisa Spawn Jadibot dari Jadibot!*\n\n` +
      `Gunakan bot utama untuk menjalankan .jadibot.\n\n` +
      `꒰ © ${botName} ꒱`
    )
  }

  if (!text) return reply(
    `🤖 *JADIBOT*\n\n` +
    `Jadikan nomor WA lain sebagai bot!\n\n` +
    `*Format:*\n` +
    `_.jadibot 628xxxxxxxxxx_\n\n` +
    `*Contoh:*\n` +
    `_.jadibot 628xxxxxxxxxx_\n\n` +
    `꒰ © ${botName} ꒱`
  )

  const nomor = cleanNumber(text)
  if (nomor.length < 8) return reply('❌ Nomor tidak valid. Gunakan format: 628xxxxxxxxxx')

  if (global.jadibotSessions?.has(nomor) || isJadibot(nomor)) return reply(
    `⚠️ Jadibot untuk *+${nomor}* sudah berjalan!\n\n` +
    `Gunakan *.stopbot ${nomor}* untuk menghentikannya.`
  )

  
  
  
  
  
  try {
    const _ownPath = (await import('path')).default.join(process.cwd(), 'data', 'Own.json')
    const _fs = (await import('fs')).default
    if (_fs.existsSync(_ownPath)) {
      const _owners = JSON.parse(_fs.readFileSync(_ownPath, 'utf-8'))
      const { isMainOwner: _isMainOwnerFn } = await import('../../System/mainowner.js')
      if (_owners.map((n: unknown) => n.replace(/[^0-9]/g, '')).includes(nomor) && !_isMainOwnerFn(nomor)) {
        return reply(
          `╭╌╌⬡「 🤖 *ᴊᴀᴅɪʙᴏᴛ* 」\n` +
          `┃ 🚫 *Ditolak! Risiko Keamanan!*\n` +
          `┃\n` +
          `┃ Nomor *+${nomor}* terdaftar\n` +
          `┃ sebagai *Owner*!\n` +
          `┃\n` +
          `┃ Hapus dulu dengan:\n` +
          `┃ ◦ *.delowner ${nomor}*\n` +
          `┃\n` +
          `┃ _Lalu ulangi .jadibot._\n` +
          `╰╌╌⬡\n\n© ${botName}`
        )
      }
    }
  } catch (_) {}

  
  if (listJadibot().length >= MAX_JADIBOT_SESSIONS) {
    return reply(
      `❌ *Batas Jadibot Tercapai!*\n\n` +
      `Maksimal *${MAX_JADIBOT_SESSIONS}* jadibot aktif sekaligus.\n` +
      `Gunakan *.listbot* untuk lihat yang aktif.\n` +
      `Gunakan *.stopbot <nomor>* untuk hentikan yang lama dulu.\n\n` +
      `꒰ © ${botName} ꒱`
    )
  }

  await reply(
    `⏳ Memulai jadibot untuk *+${nomor}*...\n` +
    `_Tunggu kode pairing..._`
  )

  const sendMsg = (teks) => conn.sendMessage(m.chat, { text: teks }, { quoted: fkontak || m })

  try {
    await spawnJadibot(nomor, sendMsg, m, m.chat)
  } catch (e) {
    reply(`❌ Gagal menjalankan jadibot: ${(e as Error).message}`)
  }
}

handler.command = ['jadibot']
handler.owner   = true
handler.noLimit = true
handler.tags    = ['owner']
handler.help    = ['jadibot <nomor>']

export { spawnJadibot }
export default handler