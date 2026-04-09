


import axios   from 'axios'
import fs      from 'fs'
import path    from 'path'
import os      from 'os'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { getTgToken, getTgChatId, initTgGlobal } from './Library/tg_global.js'

interface TgApiResult {
  result?: unknown
}

interface TgUpdate {
  update_id:      number
  message?:       TgMessage
  callback_query?: TgCallbackQuery
}

interface TgMessage {
  chat:  { id: number }
  from?: { id: number }
  text?: string
  message_id?: number
}

interface TgCallbackQuery {
  id:       string
  from?:    { id: number }
  message?: { chat: { id: number }; message_id?: number }
  data?:    string
}

type CommandHandler = (chatId: number | string, args?: string) => Promise<void>

const __dirname = path.dirname(fileURLToPath(import.meta.url as string))


function getTgCfg() {
  const token   = getTgToken()
  const ownerId = getTgChatId()
  return { token, ownerId: String(ownerId) }
}


let _offset         = 0
let _polling        = false
let _pollingTimer: ReturnType<typeof setTimeout> | null = null
let _startTime      = Date.now()
let _lastNotifTime  = 0
const NOTIF_COOLDOWN = 60000




const AXIOS_DEFAULT_TIMEOUT  = 15000
const AXIOS_POLLING_TIMEOUT  = 30000


async function tgApi(
  method: string,
  params: Record<string, unknown> = {},
  axiosTimeout: number = AXIOS_DEFAULT_TIMEOUT
): Promise<unknown> {
  const { token } = getTgCfg()
  if (!token) return null
  try {
    const { data } = await axios.post<TgApiResult>(
      `https://api.telegram.org/bot${token}/${method}`,
      params,
      { timeout: axiosTimeout }
    )
    return data?.result ?? null
  } catch (e) {
    const msg = (e as Error).message ?? ''
    
    const statusCode = (e as { response?: { status?: number } })?.response?.status ?? 0
    
    if (statusCode === 409) throw Object.assign(new Error('TGBOT_409_CONFLICT'), { code: 409 })
    
    const isSilent =
      method === 'getUpdates' &&
      (msg.includes('timeout') || msg.includes('ECONNRESET') || msg.includes('ETIMEDOUT') ||
       msg.includes('ENOTFOUND') || msg.includes('socket hang up') || msg.includes('network'))
    if (!isSilent) {
      console.error(`[TGBOT] API error ${method}:`, msg)
    }
    return null
  }
}

async function sendMsg(chatId: number | string, text: string, opts: Record<string, unknown> = {}): Promise<unknown> {
  return tgApi('sendMessage', {
    chat_id:    chatId,
    text:       text.slice(0, 4096),
    parse_mode: 'Markdown',
    ...opts
  })
}

async function sendPhoto(chatId: number | string, photoPath: string, caption: string, replyMarkup: unknown = null): Promise<unknown> {
  try {
    const FormData = (await import('form-data')).default
    const form     = new FormData()
    form.append('chat_id', String(chatId))
    form.append('caption', caption.slice(0, 1024))
    form.append('parse_mode', 'Markdown')
    if (replyMarkup) form.append('reply_markup', JSON.stringify(replyMarkup))
    if (photoPath.startsWith('http')) {
      form.append('photo', photoPath)
    } else {
      form.append('photo', fs.createReadStream(photoPath), { filename: 'menu.jpg' })
    }
    const { token } = getTgCfg()
    const { data }  = await axios.post<TgApiResult>(
      `https://api.telegram.org/bot${token}/sendPhoto`,
      form,
      { headers: form.getHeaders(), timeout: 30000 }
    )
    return data?.result ?? null
  } catch (e) {
    console.error('[TGBOT] sendPhoto error:', (e as Error).message)
    return null
  }
}

async function answerCallback(callbackQueryId: string, text: string = ''): Promise<unknown> {
  return tgApi('answerCallbackQuery', { callback_query_id: callbackQueryId, text })
}

async function editMsg(chatId: number | string, messageId: number | undefined, text: string, replyMarkup: unknown = null): Promise<unknown> {
  return tgApi('editMessageText', {
    chat_id:    chatId,
    message_id: messageId,
    text:       text.slice(0, 4096),
    parse_mode: 'Markdown',
    ...(replyMarkup ? { reply_markup: replyMarkup } : {})
  })
}

function isOwner(from: number | undefined): boolean {
  const { ownerId } = getTgCfg()
  if (!ownerId) return false
  return String(from) === ownerId
}

function formatUptime(ms: number): string {
  const s   = Math.floor(ms / 1000)
  const h   = Math.floor(s / 3600)
  const m   = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${h}j ${m}m ${sec}d`
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}





const commands: Record<string, CommandHandler> = {

  async start(chatId) {
    const menuPath = path.join(__dirname, 'media', 'menu.jpg')
    const mem      = process.memoryUsage()
    const sock     = globalThis.__sock__ as Record<string, unknown> | undefined
    const waUp     = (sock?.['user'] as Record<string, unknown>)?.['id'] ? '✅ Online' : '❌ Offline'
    const uptime   = formatUptime(Date.now() - _startTime)
    const caption  =
      `*╔══〔 🤖 MORELA BOT 〕══╗*\n` +
      `┃ WA Bot  : ${waUp}\n` +
      `┃ Uptime  : ${uptime}\n` +
      `┃ Node.js : ${process.version}\n` +
      `┃ RAM     : ${formatBytes(mem.heapUsed)}\n` +
      `*╚══════════════════╝*`
    const keyboard = {
      inline_keyboard: [
        [{ text: '📊 Status', callback_data: 'cb_status' }, { text: '🔄 Restart', callback_data: 'cb_restart' }],
        [{ text: '🧹 Clear Cache', callback_data: 'cb_cc' }, { text: '✅ Bot ON', callback_data: 'cb_on' }],
        [{ text: '❌ Bot OFF', callback_data: 'cb_off' }, { text: '🤖 Listbot', callback_data: 'cb_listbot' }],
        [{ text: '📋 Menu Lengkap', callback_data: 'cb_menu' }, { text: '❎ Tutup', callback_data: 'cb_close' }]
      ]
    }
    if (fs.existsSync(menuPath)) {
      await sendPhoto(chatId, menuPath, caption, keyboard)
    } else {
      await sendMsg(chatId, caption, { reply_markup: keyboard })
    }
  },

  async status(chatId) {
    const mem    = process.memoryUsage()
    const uptime = formatUptime(Date.now() - _startTime)
    const sock   = globalThis.__sock__ as Record<string, unknown> | undefined
    const waUp   = (sock?.['user'] as Record<string, unknown>)?.['id'] ? '✅ Online' : '❌ Offline'
    const jadibotCount = globalThis.jadibotSessions?.size ?? 0
    const jadibots = jadibotCount > 0
      ? [...(globalThis.jadibotSessions?.keys() ?? [])].map(n => `+${n}`).join(', ')
      : 'Tidak ada'
    await sendMsg(chatId,
      `📊 *STATUS BOT MORELA*\n\n` +
      `🤖 WA Bot    : ${waUp}\n` +
      `⏱️ Uptime    : ${uptime}\n` +
      `🔢 Node.js   : ${process.version}\n\n` +
      `💾 *Memory:*\n` +
      `├ Heap Used : ${formatBytes(mem.heapUsed)}\n` +
      `├ RSS       : ${formatBytes(mem.rss)}\n` +
      `└ Free RAM  : ${formatBytes(os.freemem())} / ${formatBytes(os.totalmem())}\n\n` +
      `🤖 *Jadibot:*\n` +
      `├ Aktif     : ${jadibotCount}\n` +
      `└ Nomor     : ${jadibots}`
    )
  },

  async restart(chatId) {
    await sendMsg(chatId, '🔄 *Merestart bot WA...*\n\n_Bot akan online lagi dalam beberapa detik._')
    console.log('[TGBOT] Restart diminta dari Telegram')
    setTimeout(() => process.kill(process.pid, 'SIGTERM'), 1500)
  },

  async cc(chatId) {
    await sendMsg(chatId, '🧹 *Membersihkan cache...*')
    try {
      const { clearAllCache } = await import('./Plugins-ESM/owner/clearcache.js') as { clearAllCache: () => Promise<{ filesDeleted: number; bytesFreed: number; duration: number; results: string[] }> }
      const result = await clearAllCache()
      await sendMsg(chatId,
        `✅ *Cache berhasil dibersihkan!*\n\n` +
        `🗑️ File dihapus : ${result.filesDeleted}\n` +
        `💾 Space freed  : ${formatBytes(result.bytesFreed)}\n` +
        `⏱️ Durasi       : ${result.duration}ms\n\n` +
        `_Detail:_\n` +
        result.results.map(r => `• ${r}`).join('\n')
      )
    } catch (e) {
      await sendMsg(chatId, `❌ Gagal: ${(e as Error).message}`)
    }
  },

  async on(chatId) {
    try {
      const sock = globalThis.__sock__
      if (!sock) return void sendMsg(chatId, '❌ WA Bot tidak terhubung')
      globalThis.__privateModeOn__ = false
      try { const { setPrivateMode } = await import('./System/privatemode.js') as { setPrivateMode: (v: boolean) => void }; setPrivateMode(false) } catch {}
      await sendMsg(chatId, '✅ *Bot WA aktif* — Semua orang bisa pakai fitur bot.')
    } catch (e) {
      await sendMsg(chatId, `❌ Gagal: ${(e as Error).message}`)
    }
  },

  async off(chatId) {
    try {
      const sock = globalThis.__sock__
      if (!sock) return void sendMsg(chatId, '❌ WA Bot tidak terhubung')
      globalThis.__privateModeOn__ = true
      try { const { setPrivateMode } = await import('./System/privatemode.js') as { setPrivateMode: (v: boolean) => void }; setPrivateMode(true) } catch {}
      await sendMsg(chatId, '❌ *Bot WA self mode* — Hanya owner yang bisa pakai.')
    } catch (e) {
      await sendMsg(chatId, `❌ Gagal: ${(e as Error).message}`)
    }
  },

  async listbot(chatId) {
    const sessions = globalThis.jadibotSessions
    if (!sessions || sessions.size === 0) return void sendMsg(chatId, 'ℹ️ Tidak ada jadibot yang aktif.')
    let teks = `🤖 *JADIBOT AKTIF (${sessions.size})*\n\n`
    let no   = 1
    for (const [nomor, session] of sessions) {
      const uptime = formatUptime(Date.now() - (session.startedAt ?? 0))
      teks += `${no++}. *+${nomor}*\n    ⏱️ Uptime: ${uptime}\n`
    }
    teks += `\nStop: /stopbot \\<nomor\\>`
    await sendMsg(chatId, teks)
  },

  async stopbot(chatId, args = '') {
    const nomor = args.replace(/[^0-9]/g, '')
    if (!nomor) return void sendMsg(chatId, '❌ Format: /stopbot 628xxxxxxxxxx')
    const sessions = globalThis.jadibotSessions
    if (!sessions?.has(nomor)) return void sendMsg(chatId, `⚠️ Jadibot *+${nomor}* tidak ditemukan.\nCek: /listbot`)
    try {
      await sessions.get(nomor)!.stop()
      await sendMsg(chatId, `✅ Jadibot *+${nomor}* berhasil dihentikan.`)
    } catch {
      sessions.delete(nomor)
      await sendMsg(chatId, `✅ Jadibot *+${nomor}* dihentikan (force).`)
    }
  },

  async kirim(chatId, args = '') {
    const sock = globalThis.__sock__ as Record<string, unknown> | null
    if (!sock) return void sendMsg(chatId, '❌ WA Bot tidak terhubung')
    if (!args) return void sendMsg(chatId, '❌ Format: /kirim <url>\n\nContoh:\n/kirim https://t.me/addstickers/bocilsambel')
    const ownerNum = (global.mainOwner || '').replace(/[^0-9]/g, '')
    if (!ownerNum) return void sendMsg(chatId, '❌ mainOwner belum diset di config.js')
    const { token } = getTgCfg()
    const match    = args.trim().match(/(?:t\.me\/addstickers\/|t\.me\/addemoji\/)([a-zA-Z0-9_]+)/)
    const packName = match?.[1] || args.trim()
    if (!packName) return void sendMsg(chatId, '❌ URL tidak valid!\n\nContoh: https://t.me/addstickers/namapack')
    await sendMsg(chatId, `🔍 Mengambil pack: *${packName}*...`)
    try {
      const stickerSet = await tgApi('getStickerSet', { name: packName }) as { title: string; stickers: Array<{ file_id: string; is_animated?: boolean; is_video?: boolean }> } | null
      if (!stickerSet?.stickers?.length) return void sendMsg(chatId, '❌ Pack tidak ditemukan atau kosong!')
      const allStickers = stickerSet.stickers
      const total       = Math.min(allStickers.length, 20)
      const ownerJid    = ownerNum + '@s.whatsapp.net'
      await sendMsg(chatId,
        `✅ Pack ditemukan: *${stickerSet.title}*\n` +
        `📦 Total: ${allStickers.length} stiker\n` +
        `📤 Mengirim ${total} stiker ke WA...\n\n_Harap tunggu, ada jeda antar stiker_`
      )
      const tmpDir = path.join(__dirname, 'tmp_sticker')
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })
      let berhasil = 0, gagal = 0
      for (let i = 0; i < total; i++) {
        const stk        = allStickers[i]
        const isAnimated = stk.is_animated || stk.is_video
        const tmpInput   = path.join(tmpDir, `stk_${Date.now()}.${isAnimated ? 'webm' : 'webp'}`)
        const tmpOutput  = path.join(tmpDir, `stk_out_${Date.now()}.webp`)
        try {
          const fileInfo = await tgApi('getFile', { file_id: stk.file_id }) as { file_path?: string } | null
          if (!fileInfo?.file_path) { gagal++; continue }
          const fileUrl = `https://api.telegram.org/file/bot${token}/${fileInfo.file_path}`
          const { data: rawBuf } = await axios.get<ArrayBuffer>(fileUrl, { responseType: 'arraybuffer' })
          const inputBuf = Buffer.from(rawBuf)
          let finalBuf: Buffer
          if (isAnimated) {
            fs.writeFileSync(tmpInput, inputBuf)
            try {
              await new Promise<void>((resolve, reject) => {
                const ff = spawn('ffmpeg', ['-i', tmpInput, '-vcodec', 'libwebp', '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,fps=15', '-loop', '0', '-preset', 'default', '-an', '-vsync', '0', '-y', tmpOutput])
                ff.on('close', (code: number) => code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}`)))
                ff.on('error', (err: Error) => reject(err))
                setTimeout(() => reject(new Error('timeout')), 20000)
              })
              finalBuf = fs.readFileSync(tmpOutput)
            } catch {
              const sendMsg_ = sock['sendMessage'] as (jid: string, content: unknown) => Promise<unknown>
              await sendMsg_(ownerJid, { video: inputBuf, gifPlayback: true })
              berhasil++
              await new Promise<void>(r => setTimeout(() => r(), 1500))
              continue
            }
          } else {
            finalBuf = inputBuf
          }
          const sendMsg_ = sock['sendMessage'] as (jid: string, content: unknown) => Promise<unknown>
          await sendMsg_(ownerJid, { sticker: finalBuf })
          berhasil++
        } catch (e) {
          console.error(`[TGBOT] stiker ${i+1} gagal:`, (e as Error).message)
          gagal++
        } finally {
          try { if (fs.existsSync(tmpInput))  fs.unlinkSync(tmpInput)  } catch {}
          try { if (fs.existsSync(tmpOutput)) fs.unlinkSync(tmpOutput) } catch {}
        }
        if (i < total - 1) await new Promise<void>(r => setTimeout(() => r(), 1500))
      }
      await sendMsg(chatId, `🎉 *Selesai!*\n\n✅ Berhasil : ${berhasil} stiker\n❌ Gagal    : ${gagal} stiker\n📱 Dikirim ke: +${ownerNum}`)
    } catch (e) {
      await sendMsg(chatId, `❌ Gagal: ${(e as Error).message}`)
    }
  },

  async resetlink(chatId, args = '') {
    const sock = globalThis.__sock__ as Record<string, unknown> | null
    if (!sock) return void sendMsg(chatId, '❌ WA Bot tidak terhubung')
    try {
      const groupsPath = path.join(__dirname, 'data', 'groups.json')
      if (!fs.existsSync(groupsPath)) return void sendMsg(chatId, '❌ data/groups.json tidak ditemukan.')
      const groupsData = JSON.parse(fs.readFileSync(groupsPath, 'utf-8')) as Record<string, { name?: string; participants?: Array<{ id: string; admin?: string }> }>
      const botNum     = ((sock['user'] as Record<string, string>)?.['id']?.split(':')[0] || '').replace(/[^0-9]/g, '')
      const adminGroups: Array<{ jid: string; name: string }> = []
      for (const [jid, meta] of Object.entries(groupsData)) {
        const botP = meta.participants?.find(p => p.id?.split('@')[0]?.split(':')[0]?.replace(/[^0-9]/g, '') === botNum)
        if (botP?.admin === 'admin' || botP?.admin === 'superadmin') adminGroups.push({ jid, name: meta.name || jid })
      }
      if (!adminGroups.length) return void sendMsg(chatId, `⚠️ *Bot bukan admin di grup manapun!*\n\nTotal grup di DB: ${Object.keys(groupsData).length}`)
      const target = args?.trim()
      if (target) {
        const idx   = parseInt(target) - 1
        const group = (!isNaN(idx) && idx >= 0 && idx < adminGroups.length) ? adminGroups[idx] : adminGroups.find(g => g.name.toLowerCase().includes(target.toLowerCase()))
        if (!group) return void sendMsg(chatId, `❌ Grup tidak ditemukan: *${target}*`)
        const revokeInvite = sock['groupRevokeInvite'] as (jid: string) => Promise<unknown>
        const sendWA       = sock['sendMessage'] as (jid: string, content: unknown) => Promise<unknown>
        await revokeInvite(group.jid)
        try { await sendWA(group.jid, { text: `🔄 *Link grup telah direset!*\n\n⚠️ Link lama sudah tidak berlaku.\n✅ Link baru sudah aktif.\n\n_Direset via Telegram Remote_` }) } catch {}
        return void sendMsg(chatId, `✅ *Link berhasil direset!*\n\n📌 Grup : *${group.name}*`)
      }
      let list = `🔑 *GRUP YANG BOT JADI ADMIN (${adminGroups.length})*\n\n`
      adminGroups.forEach((g, i) => { list += `${i + 1}. *${g.name}*\n` })
      list += `\n*Cara reset:*\n/resetlink <nomor> — reset 1 grup\n/resetlink all — reset SEMUA`
      return void sendMsg(chatId, list)
    } catch (e) {
      await sendMsg(chatId, `❌ Gagal: ${(e as Error).message}`)
    }
  },

  async resetlinkall(chatId) {
    const sock = globalThis.__sock__ as Record<string, unknown> | null
    if (!sock) return void sendMsg(chatId, '❌ WA Bot tidak terhubung')
    await sendMsg(chatId, '⏳ Reset link semua grup (bot admin)...')
    try {
      const groupsPath = path.join(__dirname, 'data', 'groups.json')
      if (!fs.existsSync(groupsPath)) return void sendMsg(chatId, '❌ data/groups.json tidak ditemukan.')
      const groupsData = JSON.parse(fs.readFileSync(groupsPath, 'utf-8')) as Record<string, { participants?: Array<{ id: string; admin?: string }> }>
      const botNum     = ((sock['user'] as Record<string, string>)?.['id']?.split(':')[0] || '').replace(/[^0-9]/g, '')
      let berhasil = 0, gagal = 0, dilewati = 0
      const revokeInvite = sock['groupRevokeInvite'] as (jid: string) => Promise<unknown>
      const sendWA       = sock['sendMessage'] as (jid: string, content: unknown) => Promise<unknown>
      for (const [jid, meta] of Object.entries(groupsData)) {
        const botP    = meta.participants?.find(p => p.id?.split('@')[0]?.split(':')[0]?.replace(/[^0-9]/g, '') === botNum)
        const isAdmin = botP?.admin === 'admin' || botP?.admin === 'superadmin'
        if (!isAdmin) { dilewati++; continue }
        try {
          await revokeInvite(jid)
          try { await sendWA(jid, { text: `🔄 *Link grup telah direset!*\n\n⚠️ Link lama sudah tidak berlaku.\n✅ Link baru sudah aktif.\n\n_Direset via Telegram Remote_` }) } catch {}
          berhasil++
          await new Promise<void>(r => setTimeout(() => r(), 1000))
        } catch { gagal++ }
      }
      await sendMsg(chatId, `✅ *Reset Link Selesai!*\n\n✅ Berhasil : ${berhasil} grup\n❌ Gagal    : ${gagal} grup\n⏭️ Dilewati : ${dilewati} grup (bukan admin)`)
    } catch (e) {
      await sendMsg(chatId, `❌ Gagal: ${(e as Error).message}`)
    }
  },

  async exec(chatId, args = '') {
    if (!args) return void sendMsg(chatId, '❌ Format: /exec <kode JS>')
    try {
      const util   = (await import('util')).default
      const conn   = globalThis.__sock__
      const Morela = globalThis.__sock__
      const sock   = globalThis.__sock__
      const code   = args.replace(/[\u200e\u200f\u200b\u200d\u2028\u2029\ufeff\u00a0]/g, ' ').trim()
      const result = await eval(`(async () => { return ${code} })()`)
      let output   = util.format(result)
      if (output.length > 3800) output = output.slice(0, 3800) + '\n...(terpotong)'
      await sendMsg(chatId, `📤 *Result*\n\n\`\`\`\n${output}\n\`\`\``)
    } catch (e) {
      await sendMsg(chatId, `❌ *Error*\n\n\`\`\`\n${(e as Error).message}\n\`\`\``)
    }
  },

  async eval(chatId, args = '') {
    if (!args) return void sendMsg(chatId, '❌ Format: /eval <kode JS>')
    try {
      const util   = (await import('util')).default
      const conn   = globalThis.__sock__
      const Morela = globalThis.__sock__
      const sock   = globalThis.__sock__
      const code   = args.replace(/[\u200e\u200f\u200b\u200d\u2028\u2029\ufeff\u00a0]/g, ' ').trim()
      let evaled: unknown
      try {
        evaled = await eval(`(async () => { return ${code} })()`)
      } catch {
        evaled = await eval(`(async () => { ${code} })()`)
      }
      if (evaled === undefined) evaled = '✅ Done (no return value)'
      let output = typeof evaled === 'string' ? evaled : util.inspect(evaled, { depth: 3 })
      if (output.length > 3800) output = output.slice(0, 3800) + '\n...(terpotong)'
      await sendMsg(chatId, `✅ *Eval*\n\n\`\`\`\n${output}\n\`\`\``)
    } catch (e) {
      await sendMsg(chatId, `❌ *Eval Error*\n\n\`\`\`\n${(e as Error).message}\n\`\`\``)
    }
  },

  async shell(chatId, args = '') {
    if (!args) return void sendMsg(chatId, '❌ Format: /shell <command>')
    try {
      const { promisify } = await import('util')
      const { exec }      = await import('child_process')
      const execP         = promisify(exec)
      const { stdout, stderr } = await execP(args, { timeout: 30000 })
      if (stderr) return void sendMsg(chatId, `⚠️ *stderr*\n\n\`\`\`\n${stderr.slice(0, 3800)}\n\`\`\``)
      const out = stdout?.trim() || '✅ Command executed (no output)'
      await sendMsg(chatId, `📤 *stdout*\n\n\`\`\`\n${out.slice(0, 3800)}\n\`\`\``)
    } catch (e) {
      await sendMsg(chatId, `❌ *Shell Error*\n\n\`\`\`\n${(e as Error).message}\n\`\`\``)
    }
  },

  async broadcast(chatId, args = '') {
    if (!args) return void sendMsg(chatId, '❌ Format: /broadcast <pesan>')
    const sock = globalThis.__sock__ as Record<string, unknown> | null
    if (!sock) return void sendMsg(chatId, '❌ WA Bot tidak terhubung')
    await sendMsg(chatId, `⏳ Mengirim broadcast ke semua grup...`)
    try {
      const fetchAll = sock['groupFetchAllParticipating'] as () => Promise<Record<string, unknown>>
      const sendWA   = sock['sendMessage'] as (jid: string, content: unknown) => Promise<unknown>
      const chats    = await fetchAll()
      const jids     = Object.keys(chats)
      let   sukses   = 0
      for (const jid of jids) {
        try {
          await sendWA(jid, { text: args })
          sukses++
          await new Promise<void>(r => setTimeout(() => r(), 500))
        } catch {}
      }
      await sendMsg(chatId, `✅ *Broadcast selesai!*\n\n📤 Terkirim : ${sukses}/${jids.length} grup`)
    } catch (e) {
      await sendMsg(chatId, `❌ Gagal broadcast: ${(e as Error).message}`)
    }
  }
}




async function poll(): Promise<void> {
  const { token, ownerId } = getTgCfg()
  if (!token || !ownerId) return
  try {
    
    
    const updates = await tgApi(
      'getUpdates',
      { offset: _offset, timeout: 12, limit: 10 },
      AXIOS_POLLING_TIMEOUT
    ) as TgUpdate[] | null
    if (!updates || !Array.isArray(updates)) return
    for (const update of updates) {
      _offset = update.update_id + 1
      if (update.callback_query) {
        const cb     = update.callback_query
        const cbFrom = cb.from?.id
        const cbChat = cb.message?.chat?.id
        const cbData = cb.data || ''
        const msgId  = cb.message?.message_id
        await answerCallback(cb.id)
        if (!isOwner(cbFrom)) { await sendMsg(cbChat!, '⛔ Akses ditolak.'); continue }
        if      (cbData === 'cb_status')  await commands.status!(cbChat!)
        else if (cbData === 'cb_restart') await commands.restart!(cbChat!)
        else if (cbData === 'cb_cc')      await commands.cc!(cbChat!)
        else if (cbData === 'cb_on')      await commands.on!(cbChat!)
        else if (cbData === 'cb_off')     await commands.off!(cbChat!)
        else if (cbData === 'cb_listbot') await commands.listbot!(cbChat!)
        else if (cbData === 'cb_menu') {
          await sendMsg(cbChat!,
            `📋 *SEMUA COMMAND*\n\n` +
            `🔧 /status /restart /cc /on /off\n` +
            `🤖 /listbot /stopbot <nomor>\n` +
            `📢 /broadcast /resetlink /resetlink all\n` +
            `🎨 /kirim <url> [target]\n` +
            `💻 /exec /eval /shell <cmd>`
          )
        } else if (cbData === 'cb_close') {
          await tgApi('editMessageReplyMarkup', { chat_id: cbChat, message_id: msgId, reply_markup: { inline_keyboard: [] } })
        }
        continue
      }
      const msg    = update.message
      if (!msg || !msg.text) continue
      const chatId = msg.chat.id
      const from   = msg.from?.id
      const text   = msg.text?.trim() || ''
      if (!isOwner(from)) { await sendMsg(chatId, '⛔ Akses ditolak.'); continue }
      if (!text) continue
      const [cmd, ...argParts] = text.split(' ')
      const command = cmd.toLowerCase().replace('/', '')
      const args    = argParts.join(' ')
      console.log(`[TGBOT] Command: ${cmd} dari ${from}`)
      if (command === 'resetlink' && args.trim().toLowerCase() === 'all') {
        try { await commands.resetlinkall!(chatId) } catch (e) { await sendMsg(chatId, `❌ Error: ${(e as Error).message}`) }
      } else if (commands[command]) {
        try { await commands[command]!(chatId, args) } catch (e) {
          await sendMsg(chatId, `❌ Error: ${(e as Error).message}`)
        }
      } else if (text.startsWith('/')) {
        await sendMsg(chatId, `❌ Command tidak dikenal: ${cmd}\n\nKetik /start untuk daftar command.`)
      }
    }
  } catch (e) {
    const err = e as Error & { code?: number }
    const msg = err.message ?? ''
    
    
    if (err.code === 409 || msg.includes('TGBOT_409_CONFLICT') || msg.includes('409')) {
      console.warn('[TGBOT] ⚠️ 409 Conflict — instance lain masih polling. Tunggu 15s lalu restart...')
      _polling = false
      await new Promise<void>(r => setTimeout(() => r(), 15000))
      
      startTgBot().catch(() => {})
      return
    }
    
    if (!msg.includes('timeout') && !msg.includes('ECONNRESET') && !msg.includes('ETIMEDOUT')) {
      console.error('[TGBOT] Poll error:', msg)
    }
  }
}

async function skipPendingUpdates(): Promise<void> {
  try {
    const updates = await tgApi('getUpdates', { offset: -1, limit: 1, timeout: 0 }, 10000) as TgUpdate[] | null
    if (updates && updates.length > 0) {
      _offset = updates[updates.length - 1].update_id + 1
      console.log(`[TGBOT] Skip pending updates, offset → ${_offset}`)
    }
  } catch (e) {
    console.error('[TGBOT] skipPendingUpdates error:', (e as Error).message)
  }
}


export async function startTgBot(): Promise<void> {
  initTgGlobal()
  const { token, ownerId } = getTgCfg()
  if (!token) { console.log('[TGBOT] ⚠️  Token belum diset di tg_global.json'); return }
  
  if (_polling) { tgNotifyWaOnline(); return }
  _polling   = true
  _startTime = Date.now()
  
  
  try {
    await tgApi('deleteWebhook', { drop_pending_updates: false })
    console.log('[TGBOT] 🔁 Webhook cleared — safe to poll')
  } catch {  }
  await skipPendingUpdates()
  console.log('[TGBOT] ✅ Telegram Remote Control aktif')
  console.log(`[TGBOT] Owner ID: ${ownerId || '(belum diset)'}`)
  tgNotifyWaOnline()
  const loop = async () => {
    while (_polling) {
      await poll()
      
      await new Promise<void>(r => setTimeout(() => r(), 500))
    }
  }
  loop().catch(e => console.error('[TGBOT] Loop error:', (e as Error).message))
}

export function tgNotifyWaOnline(): void {
  const { ownerId } = getTgCfg()
  if (!ownerId) return
  const now = Date.now()
  if (now - _lastNotifTime < NOTIF_COOLDOWN) { console.log('[TGBOT] Notif "WA Online" di-skip (cooldown aktif)'); return }
  _lastNotifTime = now
  sendMsg(ownerId,
    `✅ *Bot WA Online!*\n\n` +
    `⏰ ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\n` +
    `Ketik /status untuk lihat kondisi bot.`
  ).catch(() => {})
}

export function stopTgBot(): void {
  _polling = false
  if (_pollingTimer) clearInterval(_pollingTimer)
  console.log('[TGBOT] Telegram bot dihentikan')
}

export async function tgNotify(text: string): Promise<unknown> {
  const { ownerId } = getTgCfg()
  if (!ownerId) return
  return sendMsg(ownerId, text)
}


export async function tgNotifyLogout(): Promise<void> {
  const { ownerId } = getTgCfg()
  if (!ownerId) return
  try {
    await sendMsg(ownerId,
      `🔴 *BOT WA LOGOUT!*\n\n` +
      `WhatsApp telah memutus sesi bot.\n\n` +
      `*Cara fix:*\n` +
      `1. Hapus folder \`./session\`\n` +
      `2. Restart bot: \`pm2 restart morela\`\n` +
      `3. Scan QR atau masukkan pairing code baru\n\n` +
      `⏰ ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`
    )
  } catch {}
}

export default { startTgBot, stopTgBot, tgNotify, tgNotifyWaOnline, tgNotifyLogout }
