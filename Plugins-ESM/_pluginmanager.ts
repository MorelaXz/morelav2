
import fs from 'fs'
import { buildFkontak, buildCtx } from '../Library/utils.js'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import chalk from 'chalk'
import { checkLimit, addUsage, getUsage, DAILY_LIMIT, getUserDailyLimit } from '../Database/usagelimit.js'
import { trackCommand } from '../Database/stats.js'
import { checkAbuse } from '../Library/antiabuse.js'
import { isJadibot } from '../Library/jadibotdb.js'
import { isMainOwner } from '../System/mainowner.js'
import { getPhoneByLid } from '../Database/db.js'
import type { PluginModule, HandleData, MsgObj, ExtSocket } from '../types/global.js'
import { EventEmitter } from 'events'



EventEmitter.defaultMaxListeners = 50




interface FkontakCache {
  value: any
  expireAt: number
}
let _fkontakCache: FkontakCache | null = null
const FKONTAK_TTL_MS = 30_000  

async function buildFkontakCached(Morela: ExtSocket): Promise<any> {
  const now = Date.now()
  if (_fkontakCache && now < _fkontakCache.expireAt) {
    return _fkontakCache.value
  }
  try {
    const val = await buildFkontak(Morela)
    _fkontakCache = { value: val, expireAt: now + FKONTAK_TTL_MS }
    return val
  } catch {
    return _fkontakCache?.value ?? null  
  }
}

const __filename  = fileURLToPath(import.meta.url as string)
const __dirname   = path.dirname(__filename)


const DISABLED_PATH = path.join(process.cwd(), 'data', 'disabled_plugins.json')

interface DisabledEntry {
  disabledAt: number
  reason:     string
}

function _loadDisabled(): Record<string, DisabledEntry> {
  try {
    if (!fs.existsSync(DISABLED_PATH)) return {}
    return JSON.parse(fs.readFileSync(DISABLED_PATH, 'utf-8'))
  } catch { return {} }
}

function _saveDisabled(data: Record<string, DisabledEntry>): void {
  try { fs.writeFileSync(DISABLED_PATH, JSON.stringify(data, null, 2)) } catch {}
}

export function disablePlugin(command: string, reason = 'Dalam perbaikan'): boolean {
  const data = _loadDisabled()
  data[command.toLowerCase()] = { disabledAt: Date.now(), reason }
  _saveDisabled(data)
  return true
}

export function enablePlugin(command: string): boolean {
  const data = _loadDisabled()
  if (!data[command.toLowerCase()]) return false
  delete data[command.toLowerCase()]
  _saveDisabled(data)
  return true
}

export function isPluginDisabled(command: string): DisabledEntry | null {
  const data = _loadDisabled()
  return data[command.toLowerCase()] || null
}

export function getDisabledPlugins(): Record<string, DisabledEntry> {
  return _loadDisabled()
}

const PLUGINS_DIR = __dirname


function getPluginExt(): string {
  
  
  return __filename.endsWith('.ts') ? '.ts' : '.js'
}
function getManagerFilename(): string {
  const ext = getPluginExt()
  return `_pluginmanager${ext}`
}

interface PluginEntry {
  file: string
  plugin: PluginModule
  command: string[]
  help: string[]
  tags: string[]
}

interface PassiveEntry {
  file: string
  plugin: PluginModule
  tags: string[]
}

interface ValidationResult {
  valid: boolean
  plugin?: PluginModule
  error?: string
}

interface ReloadResult {
  success: boolean
  error?: string
  rolledBack?: boolean
}

class PluginManager {
  plugins: Map<string, PluginEntry>
  passiveHandlers: PassiveEntry[]
  pluginCount: number
  passiveCount: number
  ready: Promise<void>

  constructor() {
    this.plugins         = new Map()
    this.passiveHandlers = []
    this.pluginCount     = 0
    this.passiveCount    = 0
    this.ready           = this.loadAllPlugins()
    this.watchPlugins()
  }

  scanPlugins(dir: string): string[] {
    const ext     = getPluginExt()
    const manager = getManagerFilename()
    const results: string[] = []
    let items: fs.Dirent[]
    try { items = fs.readdirSync(dir, { withFileTypes: true }) } catch { return results }
    for (const item of items) {
      if (item.isDirectory()) {
        results.push(...this.scanPlugins(path.join(dir, item.name)))
      } else if (item.name.endsWith(ext) && item.name !== manager) {
        results.push(path.join(dir, item.name))
      }
    }
    return results
  }

  
  scanMjs(dir: string): string[] { return this.scanPlugins(dir) }

  async loadAllPlugins(): Promise<void> {
    const files = this.scanPlugins(PLUGINS_DIR)
    for (const filepath of files) await this.loadPlugin(filepath)
    const total = this.pluginCount + this.passiveCount
    console.log(chalk.green.bold(`\n✓ ${total} plugin loaded (${this.pluginCount} command + ${this.passiveCount} passive)\n`))
  }

  async _validatePlugin(filepath: string): Promise<ValidationResult> {
    const relFile = path.relative(PLUGINS_DIR, filepath)
    try {
      if (!fs.existsSync(filepath)) {
        return { valid: false, error: `File tidak ditemukan: ${relFile}` }
      }
      const url = pathToFileURL(filepath).href + `?v=${Date.now()}`
      const { default: mod } = await import(url) as { default: PluginModule }

      if (!mod) return { valid: false, error: 'Tidak ada default export' }

      let plugin: PluginModule
      if (typeof mod === 'function') {
        
        const modAny = mod as any
        plugin = {
          handler:  modAny,
          command:  modAny.command  || [],
          owner:    modAny.owner,
          premium:  modAny.premium,
          group:    modAny.group,
          private:  modAny.private,
          admin:    modAny.admin,
          botAdmin: modAny.botAdmin,
          noLimit:  modAny.noLimit,
          help:     modAny.help     || [],
          tags:     modAny.tags     || []
        }
      } else {
        plugin = mod
      }

      if (!plugin.handler || typeof plugin.handler !== 'function') {
        return { valid: false, error: 'handler bukan fungsi atau tidak ada' }
      }

      if (plugin.command && plugin.command.length > 0) {
        if (!Array.isArray(plugin.command)) {
          return { valid: false, error: 'command harus berupa array' }
        }
        for (const c of plugin.command) {
          if (typeof c !== 'string' || c.trim() === '') {
            return { valid: false, error: `command "${c}" tidak valid` }
          }
        }
      }

      return { valid: true, plugin }
    } catch (e) { const err = e as Error
      return { valid: false, error: err.message }
    }
  }

  async loadPlugin(filepath: string): Promise<boolean> {
    if (!path.isAbsolute(filepath)) filepath = path.join(PLUGINS_DIR, filepath)
    const relFile = path.relative(PLUGINS_DIR, filepath)

    const { valid, plugin, error } = await this._validatePlugin(filepath)
    if (!valid || !plugin) {
      console.error(chalk.red(`✗ Plugin invalid [${relFile}]: ${error}`))
      return false
    }

    if (!plugin.command || plugin.command.length === 0) {
      this.passiveHandlers.push({ file: relFile, plugin, tags: plugin.tags || [] })
      this.passiveCount++
      return true
    }

    const cmds = Array.isArray(plugin.command) ? plugin.command : [plugin.command]
    for (const c of cmds) {
      this.plugins.set(c.toLowerCase(), {
        file: relFile, plugin, command: cmds,
        help: plugin.help || [], tags: plugin.tags || []
      })
    }
    this.pluginCount++
    return true
  }

  getPlugin(cmd: string): PluginEntry | undefined {
    return this.plugins.get(cmd.toLowerCase())
  }

  getPassiveHandlers(): PassiveEntry[] {
    return this.passiveHandlers
  }

  async reloadPlugin(relPath: string): Promise<ReloadResult> {
    const ext = getPluginExt()
    if (!relPath.endsWith(ext)) relPath += ext
    const fullPath = path.join(PLUGINS_DIR, relPath)

    const _oldPlugins = new Map<string, PluginEntry>()
    const _oldPassive: PassiveEntry[] = []

    for (const [k, v] of this.plugins.entries()) {
      if (v.file === relPath) _oldPlugins.set(k, v)
    }
    for (const h of this.passiveHandlers) {
      if (h.file === relPath) _oldPassive.push(h)
    }

    const { valid, plugin, error } = await this._validatePlugin(fullPath)
    if (!valid || !plugin) {
      console.error(chalk.red(`✗ Reload gagal [${relPath}]: ${error}`))
      console.log(chalk.yellow(`↩ Rollback: plugin lama dipertahankan`))
      return { success: false, error, rolledBack: true }
    }

    for (const [k, v] of this.plugins.entries()) {
      if (v.file === relPath) this.plugins.delete(k)
    }
    this.passiveHandlers = this.passiveHandlers.filter((h: PassiveEntry) => h.file !== relPath)

    try {
      if (!plugin.command || plugin.command.length === 0) {
        this.passiveHandlers.push({ file: relPath, plugin, tags: plugin.tags || [] })
      } else {
        const cmds = Array.isArray(plugin.command) ? plugin.command : [plugin.command]
        for (const c of cmds) {
          this.plugins.set(c.toLowerCase(), {
            file: relPath, plugin, command: cmds,
            help: plugin.help || [], tags: plugin.tags || []
          })
        }
      }
      console.log(chalk.green(`✓ Reloaded: ${relPath}`))
      return { success: true, rolledBack: false }
    } catch (e) { const err = e as Error
      console.error(chalk.red(`✗ Reload runtime error [${relPath}]: ${err.message}`))
      console.log(chalk.yellow(`↩ Rollback: restore plugin lama`))
      for (const [k, v] of this.plugins.entries()) {
        if (v.file === relPath) this.plugins.delete(k)
      }
      this.passiveHandlers = this.passiveHandlers.filter((h: PassiveEntry) => h.file !== relPath)
      for (const [k, v] of _oldPlugins) this.plugins.set(k, v)
      for (const h of _oldPassive) this.passiveHandlers.push(h)
      return { success: false, error: err.message, rolledBack: true }
    }
  }

  async addPlugin(filename: string, code: string): Promise<string> {
    const ext = getPluginExt()
    if (!filename.endsWith(ext)) filename += ext
    const filepath = path.join(PLUGINS_DIR, filename)
    fs.mkdirSync(path.dirname(filepath), { recursive: true })
    fs.writeFileSync(filepath, code)
    await this.reloadPlugin(filename)
    return `✅ Plugin ${filename} ditambahkan`
  }

  deletePlugin(filename: string): string {
    const ext = getPluginExt()
    if (!filename.endsWith(ext)) filename += ext
    let relPath  = filename
    let filepath = path.join(PLUGINS_DIR, filename)
    if (!fs.existsSync(filepath)) {
      const allFiles = this.scanPlugins(PLUGINS_DIR)
      const found    = allFiles.find((f: string) => path.basename(f) === path.basename(filename))
      if (!found) throw new Error('Plugin tidak ditemukan')
      filepath = found
      relPath  = path.relative(PLUGINS_DIR, found)
    }
    for (const [k, v] of this.plugins.entries()) {
      if (v.file === relPath) this.plugins.delete(k)
    }
    this.passiveHandlers = this.passiveHandlers.filter((h: PassiveEntry) => h.file !== relPath)
    fs.unlinkSync(filepath)
    return `✅ Plugin ${relPath} dihapus`
  }

  listPlugins(): PluginEntry[] {
    const map = new Map<string, any>()
    for (const v of this.plugins.values()) {
      if (!map.has(v.file))
        map.set(v.file, { file: v.file, commands: v.command, help: v.help, tags: v.tags, type: 'command' })
    }
    for (const h of this.passiveHandlers) {
      if (!map.has(h.file))
        map.set(h.file, { file: h.file, commands: [], help: [], tags: h.tags, type: 'passive' })
    }
    return [...map.values()]
  }

  getPluginCode(filename: string): string {
    const ext = getPluginExt()
    if (!filename.endsWith(ext)) filename += ext
    let filepath = path.join(PLUGINS_DIR, filename)
    if (!fs.existsSync(filepath)) {
      const allFiles = this.scanPlugins(PLUGINS_DIR)
      const found    = allFiles.find((f: string) => path.basename(f) === path.basename(filename))
      if (!found) throw new Error('Plugin tidak ditemukan')
      filepath = found
    }
    return fs.readFileSync(filepath, 'utf-8')
  }

  watchPlugins(): void {
    
    
    
    
    if ((this as any)._watcher) return
    const _watchDebounce = new Map<string, NodeJS.Timeout>()
    const ext = getPluginExt()
    const watcher = fs.watch(PLUGINS_DIR, { recursive: true }, (_, file) => {
      if (!file || !file.endsWith(ext)) return
      if (file === getManagerFilename()) return
      if (_watchDebounce.has(file)) clearTimeout(_watchDebounce.get(file)!)
      const t = setTimeout(async () => {
        _watchDebounce.delete(file)
        const fullPath = path.join(PLUGINS_DIR, file)
        if (!fs.existsSync(fullPath)) return
        console.log(chalk.cyan(`[PLUGIN-WATCH] Perubahan terdeteksi: ${file}`))
        const result = await this.reloadPlugin(file)
        if (result.success) {
          console.log(chalk.green(`[PLUGIN-WATCH] ✅ Auto-reload berhasil: ${file}`))
        } else if (result.rolledBack) {
          console.log(chalk.yellow(`[PLUGIN-WATCH] ⚠️ Reload gagal, rollback ke versi lama: ${file}`))
          console.log(chalk.red(`[PLUGIN-WATCH] Error: ${result.error}`))
        }
      }, 300)
      _watchDebounce.set(file, t)
    })
    
    ;(this as any)._watcher = watcher
  }
}

const pluginManager = new PluginManager()
export default pluginManager


const _cooldownMap = new Map<string, number>()

function checkCooldown(jid: string, command: string, seconds: number = 3): number {
  const key  = `${jid}:${command}`
  const now  = Date.now()
  const last = _cooldownMap.get(key) || 0
  const sisa = (seconds * 1000) - (now - last)
  if (sisa > 0) return Math.ceil(sisa / 1000)
  _cooldownMap.set(key, now)
  return 0
}

setInterval(() => {
  const now = Date.now()
  for (const [key, time] of _cooldownMap.entries()) {
    if (now - time > 10 * 60 * 1000) _cooldownMap.delete(key)
  }
}, 10 * 60 * 1000)

export async function handlePluginCommand(
  m: MsgObj,
  command: string,
  { Morela, text, args, reply, isOwn, isPrem, isAdmin, botAdmin, downloadContentFromMessage, senderJid, usedPrefix }: HandleData & { reply: (msg: string) => Promise<unknown> }
): Promise<unknown> {
  const data = pluginManager.getPlugin(command)
  if (!data) return false

  const h = data.plugin

  const _rawSenderJid = (senderJid || m?.sender || '')
  let _senderNum = _rawSenderJid.split('@')[0].split(':')[0].replace(/[^0-9]/g, '')
  
  if (_rawSenderJid.endsWith('@lid')) {
    const _resolved = getPhoneByLid(_senderNum)
    if (_resolved) _senderNum = _resolved.replace(/[^0-9]/g, '')
  }
  const _isMainOwner = isMainOwner(_senderNum)

  
  
  if (!_isMainOwner) {
    const _disabledInfo = isPluginDisabled(command)
    if (_disabledInfo) {
      const _tglDisable = new Date(_disabledInfo.disabledAt).toLocaleDateString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta'
      })
      return reply(
        `🔧 *Fitur Sedang Dalam Perbaikan*\n\n` +
        `◦ Command  : *.${command}*\n` +
        `◦ Alasan   : ${_disabledInfo.reason}\n` +
        `◦ Sejak    : ${_tglDisable}\n\n` +
        `_Mohon tunggu hingga fitur ini dipulihkan. 🙏_`
      )
    }
  }
  

  const _isJadibotSender = !_isMainOwner && (
    !!(((global as Record<string, unknown>).jadibotSessions as Map<string,unknown> | undefined)?.has(_senderNum)) || isJadibot(_senderNum)
  )

  if (_isJadibotSender) {
    console.warn(chalk.red(`[SECURITY] Blocked jadibot sender ${_senderNum} — command: ${command}`))
    if (h.mainOwner || h.owner || h.premium) return reply('❌ Fitur ini tidak tersedia saat kamu sedang aktif sebagai jadibot!')
    isOwn  = false
    isPrem = false
  }

  if (h.mainOwner && !_isMainOwner)     return reply('❌ Fitur ini hanya untuk Main Owner!')
  if (h.owner    && !isOwn)             return reply('❌ Fitur ini hanya untuk Owner!')
  if (h.premium  && !isPrem && !isOwn)  return reply('❌ Fitur ini hanya untuk Premium!')
  if (h.group    && !m.isGroup)         return reply('❌ Fitur ini hanya di dalam Grup!')
  if (h.private  && m.isGroup)          return reply('❌ Fitur ini hanya di Private Chat!')
  if (h.admin    && !isAdmin && !isOwn) return reply('❌ Fitur ini hanya untuk Admin Grup!')
  if (h.botAdmin && !botAdmin)          return reply('❌ Bot harus jadi Admin Grup dulu!')

  if (!isOwn) {
    const abuseResult = checkAbuse(
      senderJid || m.sender || m.key?.remoteJid || '',
      command
    )
    if (!abuseResult.allowed) {
      if ('autoBlacklist' in abuseResult && abuseResult.autoBlacklist) {
        try {
          const { banUser } = await import('../Database/db.js')
          banUser(senderJid || m.sender || m.key?.remoteJid || '', 1)
          console.warn(chalk.red(`[ANTIABUSE] Auto-blacklist: ${senderJid || m?.sender}`))
        } catch {}
      }
      return reply(abuseResult.action)
    }

    const sisaDetik = checkCooldown(
      senderJid || m.sender || m.key?.remoteJid || '',
      command,
      3
    )
    if (sisaDetik > 0) {
      return reply(`⏳ Pelan-pelan! Tunggu *${sisaDetik}s* dulu.`)
    }
  }

  const shouldLimit = !isOwn && !isPrem && !h.noLimit
  let userDailyLimit = DAILY_LIMIT

  if (shouldLimit) {
    const limitKey = senderJid || m.sender || m.key?.remoteJid || ''
    try {
      const { getUser: _getUser } = await import('../Database/db.js')
      const _ud = _getUser(limitKey)
      userDailyLimit = getUserDailyLimit(_ud?.level || 0)
    } catch { userDailyLimit = DAILY_LIMIT }

    const cek = checkLimit(limitKey, userDailyLimit)
    if (!cek.allowed) {
      const sisaMs  = (cek as any).resetAt - Date.now()
      const sisaJam = Math.floor(sisaMs / (60 * 60 * 1000))
      const sisaMnt = Math.floor((sisaMs % (60 * 60 * 1000)) / (60 * 1000))
      return reply(
        `🚫 *Limit Harian Tercapai!*\n\n` +
        `Kamu sudah pakai *${userDailyLimit} fitur* hari ini.\n\n` +
        `⏰ Reset dalam: *${sisaJam}j ${sisaMnt}m*\n\n` +
        `_Naikkan level untuk limit lebih banyak!_`
      )
    }
  }

  if (!isOwn && !isPrem) {
    try {
      const { getUser } = await import('../Database/db.js')
      const lookupJid   = senderJid || m.sender || m.key?.remoteJid || ''
      const userData    = getUser(lookupJid)
      if (userData?.is_banned === 1) {
        console.warn(`[BAN] Blocked banned user: ${lookupJid}`)
        return true
      }
    } catch {}
  }

  
  const _REGISTER_BYPASS = ['daftar', 'daftar_auto', 'unreg', 'unregister']
  
  
  
  if (!isOwn && !isPrem && !_isMainOwner && !_REGISTER_BYPASS.includes(command)) {
    try {
      const { isRegistered: _isReg, getPhoneByLid: _getPhone } = await import('../Database/db.js')
      const { botName: _botName } = await import('../Library/utils.js')
      const rawLookup = senderJid || m.sender || m.key?.remoteJid || ''
      if (!rawLookup || rawLookup.length < 5) {  }
      else {
        
        let lookupJid = rawLookup
        if (rawLookup.endsWith('@lid')) {
          const _resolved = _getPhone(rawLookup.split('@')[0])
          if (_resolved) lookupJid = _resolved + '@s.whatsapp.net'
        }
        if (!_isReg(lookupJid)) {
          let _fk = m
          try { _fk = await buildFkontakCached(Morela) } catch {}
          const _warnMsg =
            `⚠️ *Kamu belum terdaftar!*\n\n` +
            `Ketik *.daftar* untuk mulai menggunakan bot.\n\n` +
            `꒰ © ${_botName} ꒱`
          
          try {
            const _imgPath = path.join(process.cwd(), 'media', 'register.jpg')
            const _imgBuf  = fs.existsSync(_imgPath) ? fs.readFileSync(_imgPath) : null
            if (_imgBuf) {
              await Morela.sendMessage(m.chat || '', {
                image:   _imgBuf,
                caption: _warnMsg
              }, { quoted: _fk })
            } else {
              await Morela.sendMessage(m.chat || '', { text: _warnMsg }, { quoted: _fk })
            }
          } catch {
            await Morela.sendMessage(m.chat || '', { text: _warnMsg }, { quoted: _fk })
          }
          return true
        }
      }
    } catch (e) { const err = e as Error
      console.error('[REG CHECK] error:', err.message)
    }
  }

  let fkontak: any = m
  try { fkontak = await buildFkontakCached(Morela) } catch {}

  const ctx = buildCtx()
  const _origSend = Morela.sendMessage.bind(Morela)
  let _lastSentMsg: any = null
  let _lastSentJid: string | null = null

  const wrappedMorela = new Proxy(Morela, {
    get(target: any, prop: any) {
      if (prop !== 'sendMessage') return target[prop]
      return async (jid: string, content: any, opts: any = {}) => {
        const isSticker = !!(content?.sticker)
        const isRawMedia = !!(content?.audio && !content.contextInfo?.externalAdReply)
        if (content && !content.react && !content.delete && !content.poll && !isSticker && !isRawMedia) {
          content = { ...content, contextInfo: { ...ctx, ...(content.contextInfo || {}) } }
        }
        const result = await _origSend(jid, content, opts)
        if (content && !content.react && !content.delete && !content.poll && !content.edit) {
          _lastSentMsg = result || null
          _lastSentJid = jid
        }
        return result
      }
    }
  })

  const replyFk = async (teks: string) => {
    try {
      return await wrappedMorela.sendMessage(m.chat || '', { text: teks }, { quoted: fkontak })
    } catch {
      return reply(teks)
    }
  }

  const _trackJid = senderJid || m.sender || m.key?.remoteJid || ''
  try { trackCommand(command, _trackJid) } catch {}

  try {
    await h.handler(m, {
      Morela: wrappedMorela,
      conn: wrappedMorela,
      text, args,
      reply: replyFk,
      command,
      isOwn, isPrem, isAdmin, botAdmin,
      downloadContentFromMessage,
      senderJid,
      usedPrefix,
      fkontak
    } as any)

    if (shouldLimit) {
      const limitJid = senderJid || m.sender || m.key?.remoteJid || ''
      addUsage(limitJid, userDailyLimit)
      try {
        const usage   = getUsage(limitJid, userDailyLimit)
        const isHabis = (usage as any).sisa <= 0
        if (isHabis) {
          const quotedRef = _lastSentMsg || m
          await wrappedMorela.sendMessage(
            _lastSentJid || m.chat,
            { text: `⚠️ *Limit harian habis!* (${(usage as any).count}/${userDailyLimit}x) — Reset otomatis 24 jam` },
            { quoted: quotedRef }
          )
        }
      } catch (notifErr: any) {
        console.error('[LIMIT NOTIF] Gagal kirim notif:', notifErr.message)
      }
    }

    return true
  } catch (e) { const err = e as Error
    replyFk(`❌ Error: ${err.message}`)
    console.error(`[Plugin Error] ${command}:`, e)
    try {
      const _own = JSON.parse(fs.readFileSync('./data/Own.json', 'utf-8'))
      const _jid = _own[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net'
      ;((globalThis as Record<string, unknown>).__sock__ as any)?.sendMessage(_jid, {
        text: `⚠️ *Plugin Error*\n\n📌 Command: ${command}\n\n${err.stack || err.message}`.slice(0, 1500)
      })
    } catch {}
    return true
  }
}

export async function runPassiveHandlers(
  m: MsgObj,
  { Morela, isOwn, isPrem, isAdmin, botAdmin, downloadContentFromMessage }: Partial<HandleData> & { Morela: HandleData['Morela']; isOwn: boolean; isPrem: boolean; isAdmin: boolean; botAdmin: boolean }
): Promise<void> {
  if (!m._isJadibot && (((global as Record<string, unknown>).jadibotSessions as Map<string,unknown> | undefined)?.size ?? 0) > 0) {
    const _rawP1 = (m.sender || '')
    let _senderNum = _rawP1.split('@')[0].split(':')[0].replace(/[^0-9]/g, '')
    if (_rawP1.endsWith('@lid')) {
      const _rp1 = getPhoneByLid(_senderNum)
      if (_rp1) _senderNum = _rp1.replace(/[^0-9]/g, '')
    }
    if (!isMainOwner(_senderNum)) return
  }

  {
    const _rawP2 = (m.sender || '')
    let _senderNum = _rawP2.split('@')[0].split(':')[0].replace(/[^0-9]/g, '')
    if (_rawP2.endsWith('@lid')) {
      const _rp2 = getPhoneByLid(_senderNum)
      if (_rp2) _senderNum = _rp2.replace(/[^0-9]/g, '')
    }
    if (!isMainOwner(_senderNum) && ((((global as Record<string, unknown>).jadibotSessions as Map<string,unknown> | undefined)?.has(_senderNum)) || isJadibot(_senderNum))) {
      console.warn(chalk.red(`[SECURITY] Blocked jadibot sender ${_senderNum} from passive handler`))
      isOwn  = false
      isPrem = false
    }
  }

  let fkontak: any = m
  try { fkontak = await buildFkontakCached(Morela) } catch {}

  const ctx = buildCtx()
  const _origSendP = Morela.sendMessage.bind(Morela)
  const wrappedMorelaP = new Proxy(Morela, {
    get(target: any, prop: any) {
      if (prop !== 'sendMessage') return target[prop]
      return async (jid: string, content: any, opts: any = {}) => {
        const isSticker = !!(content?.sticker)
        const isRawMedia = !!(content?.audio && !content.contextInfo?.externalAdReply)
        if (content && !content.react && !content.delete && !content.poll && !isSticker && !isRawMedia) {
          content = { ...content, contextInfo: { ...ctx, ...(content.contextInfo || {}) } }
        }
        return _origSendP(jid, content, opts)
      }
    }
  })

  for (const { plugin, file } of pluginManager.getPassiveHandlers()) {
    try {
      await plugin.handler(m, {
        Morela: wrappedMorelaP,
        isOwn, isPrem, isAdmin, botAdmin,
        downloadContentFromMessage,
        fkontak
      } as any)
    } catch (error: any) {
      console.error(`[Passive Handler Error] ${file}:`, error.message)
    }
  }
}
