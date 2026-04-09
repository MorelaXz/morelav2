// @ts-nocheck


import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { buildFkontak, imagePath, CHANNEL_URL, botName } from '../../Library/utils.js'

const __filename = fileURLToPath(import.meta.url as string)
const __dirname  = path.dirname(__filename)

const BOT_ROOT          = path.join(__dirname, '../..')
const BAILEYS_CACHE_DIR = path.join(BOT_ROOT, '.cache')


const SESSION_DIR      = path.join(BOT_ROOT, 'session')             
const JADIBOT_BASE_DIR = path.join(BOT_ROOT, 'sessions', 'jadibot') 


const SESSION_SAFE_PREFIX = [
  'pre-key-',            
  'app-state-sync-key-', 
  'sender-key-memory-',  
  'lid-mapping-',        
]

const MEDIA_DIRS = [
  path.join(BOT_ROOT, 'media/temp'),
  path.join(BOT_ROOT, 'media/bratvid'),
  path.join(BOT_ROOT, 'media/cewekbrat'),
  path.join(BOT_ROOT, 'media/ttp'),
  path.join(BOT_ROOT, 'media/brat'),
  path.join(BOT_ROOT, 'temp'),
  path.join(BOT_ROOT, 'tmp'),
]

const TEMP_EXTENSIONS = new Set([
  '.mp4', '.mp3', '.webm', '.jpg', '.jpeg',
  '.png', '.webp', '.gif', '.pdf', '.zip',
  '.tmp', '.bin', '.opus'
])

function formatBytes(bytes: unknown) {
  if (bytes === 0) return '0 Bytes'
  const k     = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i     = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

function clearFolderContents(dirPath: unknown, recursive: unknown = false) {
  let deleted = 0, bytes = 0
  if (!fs.existsSync(dirPath)) return { deleted, bytes }
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)
      try {
        if (entry.isDirectory()) {
          if (recursive) {
            const sub = clearFolderContents(fullPath, true)
            deleted += sub.deleted
            bytes   += sub.bytes
            try { fs.rmdirSync(fullPath) } catch {}
          }
        } else {
          const stat = fs.statSync(fullPath)
          bytes += stat.size
          fs.unlinkSync(fullPath)
          deleted++
        }
      } catch {}
    }
  } catch {}
  return { deleted, bytes }
}


function cleanSessionDir(sessionPath: unknown) {
  let deleted = 0, bytes = 0
  if (!fs.existsSync(sessionPath)) return { deleted, bytes }
  try {
    const files = fs.readdirSync(sessionPath)
    for (const file of files) {
      
      if (file === 'creds.json') continue

      
      const isSafe = SESSION_SAFE_PREFIX.some((p: unknown) => file.startsWith(p))
      if (!isSafe) continue

      try {
        const filePath = path.join(sessionPath, file)
        bytes += fs.statSync(filePath).size
        fs.unlinkSync(filePath)
        deleted++
      } catch {}
    }
  } catch {}
  return { deleted, bytes }
}


function cleanAllSessions() {
  let totalDeleted = 0, totalBytes = 0
  const details = []

  
  const mainResult = cleanSessionDir(SESSION_DIR)
  totalDeleted += mainResult.deleted
  totalBytes   += mainResult.bytes
  if (mainResult.deleted > 0) {
    details.push(`✅ Session utama: *${mainResult.deleted} file* sampah dihapus`)
  } else {
    details.push(`ℹ️ Session utama: bersih`)
  }

  
  if (fs.existsSync(JADIBOT_BASE_DIR)) {
    const jadibots = fs.readdirSync(JADIBOT_BASE_DIR)
    let jadibotTotal = 0

    for (const nomor of jadibots) {
      const jadibotPath = path.join(JADIBOT_BASE_DIR, nomor)
      if (!fs.statSync(jadibotPath).isDirectory()) continue

      const r = cleanSessionDir(jadibotPath)
      totalDeleted  += r.deleted
      totalBytes    += r.bytes
      jadibotTotal  += r.deleted
    }

    if (jadibotTotal > 0) {
      details.push(`✅ Session jadibot (${jadibots.length}): *${jadibotTotal} file* sampah dihapus`)
    } else {
      details.push(`ℹ️ Session jadibot (${jadibots.length}): bersih`)
    }
  } else {
    details.push(`ℹ️ Session jadibot: tidak ada`)
  }

  return { deleted: totalDeleted, bytes: totalBytes, details }
}

async function clearAllCache() {
  const startTime  = Date.now()
  let filesDeleted = 0
  let bytesFreed   = 0
  const results    = []

  try {
    if (fs.existsSync(BAILEYS_CACHE_DIR)) {
      const r = clearFolderContents(BAILEYS_CACHE_DIR, true)
      filesDeleted += r.deleted
      bytesFreed   += r.bytes
      results.push(r.deleted > 0
        ? `✅ \`.cache\`: ${r.deleted} file dihapus (${formatBytes(r.bytes)})`
        : `ℹ️ \`.cache\`: sudah bersih`)
    } else {
      results.push(`ℹ️ \`.cache\`: tidak ditemukan`)
    }
  } catch (e) {
    results.push(`⚠️ \`.cache\`: ${(e as Error).message}`)
  }

  try {
    const cache = (globalThis as Record<string, unknown>).__groupMetadataCache__
    if (cache && typeof cache.size === 'number') {
      const sz = cache.size
      cache.clear()
      results.push(`✅ Group cache: *${sz} grup* di-clear`)
    } else {
      results.push(`ℹ️ Group cache: kosong`)
    }
  } catch (e) {
    results.push(`⚠️ Group cache: ${(e as Error).message}`)
  }

  try {
    const msgStore = (globalThis as Record<string, unknown>).__messageStore__
    if (msgStore && msgStore.messages) {
      let msgCount = 0
      for (const jid of Object.keys(msgStore.messages)) {
        msgCount += msgStore.messages[jid]?.array?.length || 0
        if (msgStore.messages[jid]?.array) msgStore.messages[jid].array = []
      }
      results.push(`✅ Message store: *${msgCount} pesan* di-clear`)
    } else {
      results.push(`ℹ️ Message store: tidak terekspos`)
    }
  } catch (e) {
    results.push(`⚠️ Message store: ${(e as Error).message}`)
  }

  
  try {
    const sessionResult = cleanAllSessions()
    filesDeleted += sessionResult.deleted
    bytesFreed   += sessionResult.bytes
    for (const d of sessionResult.details) results.push(d)
  } catch (e) {
    results.push(`⚠️ Session cleanup: ${(e as Error).message}`)
  }

  let totalMediaDeleted = 0, totalMediaBytes = 0
  for (const dir of MEDIA_DIRS) {
    if (!fs.existsSync(dir)) continue
    try {
      const files = fs.readdirSync(dir, { withFileTypes: true })
      let dirDeleted = 0, dirBytes = 0
      for (const entry of files) {
        if (entry.isDirectory()) continue
        try {
          const filePath = path.join(dir, entry.name)
          const ext      = path.extname(entry.name).toLowerCase()
          if (!TEMP_EXTENSIONS.has(ext)) continue
          dirBytes += fs.statSync(filePath).size
          fs.unlinkSync(filePath)
          dirDeleted++
        } catch {}
      }
      if (dirDeleted > 0) {
        totalMediaDeleted += dirDeleted
        totalMediaBytes   += dirBytes
        results.push(`✅ \`media/${path.basename(dir)}\`: ${dirDeleted} file (${formatBytes(dirBytes)})`)
      }
    } catch {}
  }
  filesDeleted += totalMediaDeleted
  bytesFreed   += totalMediaBytes
  if (totalMediaDeleted === 0) results.push(`ℹ️ Media folders: bersih`)

  try {
    if (global.gc) { global.gc(); results.push(`✅ GC: dipanggil`) }
  } catch {}

  return {
    success: true,
    filesDeleted,
    bytesFreed,
    duration: Date.now() - startTime,
    results
  }
}

function restartBot(delayMs: unknown = 0) {
  setTimeout(() => {
    console.log('[CACHE] 🔄 Restarting bot...')
    process.exit(0)
  }, delayMs)
}

let _autoTimer = null

function startAutoCleanup() {
  if (_autoTimer) return
  _autoTimer = setInterval(async () => {
    try {
      console.log('[AUTO-CACHE] 🧹 Auto clear cache setiap 12 jam...')
      const r = await clearAllCache()
      console.log(`[AUTO-CACHE] ✅ Done: ${r.filesDeleted} files, ${formatBytes(r.bytesFreed)} freed`)

    } catch (err) {
      console.error('[AUTO-CACHE] ❌ Error:', (err as Error).message)
    }
  }, 12 * 60 * 60 * 1000)

  if (_autoTimer.unref) _autoTimer.unref()
  console.log('[AUTO-CACHE] ⏰ Auto cleanup aktif — setiap 12 jam (no restart)')
}

startAutoCleanup()

const handler = async (m: any, { Morela, reply, fkontak }: any) => {

  const send = (text) =>
    Morela.sendMessage(m.chat, {
      text
    }, { quoted: fkontak || m })

  await Morela.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

  const result = await clearAllCache()

  await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

  await send(
    `╭╌╌⬡「 🧹 *ᴄʟᴇᴀʀ ᴄᴀᴄʜᴇ* 」\n` +
    `┃\n` +
    result.results.map((r: unknown) => `┃ ${r}`).join('\n') + '\n' +
    `┃\n` +
    `┃ ◦ 🗑️ File dihapus : *${result.filesDeleted}*\n` +
    `┃ ◦ 💾 Space freed  : *${formatBytes(result.bytesFreed)}*\n` +
    `┃ ◦ ⏱️ Durasi       : *${result.duration}ms*\n` +
    `┃ ◦ ⏰ Auto cleanup : *setiap 12 jam (session + cache)*\n` +
    `╰╌╌⬡\n\n© ${botName}`
  )

}

handler.command = ['clearcache', 'cc', 'clearc']
handler.owner   = true
handler.help    = ['cc — Clear .cache + restart bot']
handler.tags    = ['owner']
handler.noLimit = true

export default handler
export { clearAllCache, startAutoCleanup }