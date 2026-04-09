// @ts-nocheck
import { getUser, countUsers, countGroups, getAllGroups, getGroup } from '../../Database/db.js'
import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { buildFkontak, botName, CHANNEL_URL } from '../../Library/utils.js'
import baileys from '@itsukichan/baileys'

const __dirname = path.dirname(fileURLToPath(import.meta.url as string))
const DATA_DIR  = path.join(__dirname, '../../data')
const CHANNEL_JID = '120363420704282055@newsletter'

async function sendText(Morela: Record<string, unknown>, chat: unknown, text: string, fkontak: unknown) {
  return Morela.sendMessage(chat, {
    text: ' ',
    footer: text + `\n\n© ${botName}`,
    interactiveButtons: [{
      name: 'cta_url',
      buttonParamsJson: JSON.stringify({ display_text: 'Channel', url: CHANNEL_URL, merchant_url: CHANNEL_URL })
    }],
    hasMediaAttachment: false
  }, { quoted: fkontak })
}

function readJson(filename: unknown) {
  const filePath = path.join(DATA_DIR, filename.endsWith('.json') ? filename : filename + '.json')
  if (!fs.existsSync(filePath)) return null
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    const str = JSON.stringify(JSON.parse(raw), null, 2)
    return str.length > 3000 ? str.slice(0, 3000) + '\n\n...(terpotong)' : str
  } catch (e) { return `❌ Gagal baca: ${(e as Error).message}` }
}

function listJsonFiles() {
  try { return fs.readdirSync(DATA_DIR).filter((f: unknown) => f.endsWith('.json')) } catch { return [] }
}

function shortName(name: string, max: unknown = 25) {
  if (!name) return 'Grup'
  return name.length > max ? name.slice(0, max - 1) + '…' : name
}

const KEY_LABELS = {
  __aiStatus__:               { emoji: '🤖', name: 'Auto AI' },
  __aiHistory__:              { emoji: '🧠', name: 'AI History' },
  __chatCountDB__:            { emoji: '💬', name: 'Topchat' },
  __groupMetadataCache__:     { emoji: '📋', name: 'Group Cache' },
  __messageStore__:           { emoji: '💾', name: 'Message Store' },
  __dymDedup__:               { emoji: '🔍', name: 'Did You Mean' },
  __chatCountTimer__:         { emoji: '⏱️', name: 'Topchat Timer' },
  __chatCountExitRegistered__:{ emoji: '🔒', name: 'Exit Handler' },
  __sock__:                   { emoji: '🔌', name: 'Socket' },
  __scheduledTasks__:         { emoji: '📅', name: 'Scheduled Tasks' },
  __nananaSession__:          { emoji: '🍌', name: 'Nanana Session' },
}

function isGroupStatusMap(val: unknown) {
  if (typeof val !== 'object' || val === null || Array.isArray(val)) return false
  const keys = Object.keys(val)
  if (!keys.length) return false
  return keys.some((k: unknown) => k.endsWith('@g.us') || k.endsWith('@s.whatsapp.net'))
}

function resolveGroupName(jid: string) {
  try {
    const groups = getAllGroups()
    return groups[jid]?.name || jid.split('@')[0].slice(-8) + '...'
  } catch { return jid.split('@')[0].slice(-8) + '...' }
}

function buildKeyLines(key: string, val: unknown) {
  const label = KEY_LABELS[key] || { emoji: '⚙️', name: key.replace(/__/g, '') }
  const title = `${label.emoji} *${label.name}*`

  if (isGroupStatusMap(val)) {
    const activeEntries = Object.entries(val).filter(([, v]) => {
      if (typeof v === 'boolean') return v
      if (typeof v === 'object' && v !== null) return true
      return !!v
    })
    if (!activeEntries.length) return `${title} (0)\n  • (tidak ada)`
    const names = activeEntries.map(([jid]) => `  • ${resolveGroupName(jid)}`).join('\n')
    return `${title} (${activeEntries.length})\n${names}`
  }

  let desc = ''
  if (val === null || val === undefined)  desc = '❌ tidak aktif'
  else if (typeof val === 'boolean')      desc = val ? '✅ aktif' : '❌ tidak aktif'
  else if (typeof val === 'number')       desc = String(val)
  else if (typeof val === 'string')       desc = val.slice(0, 60)
  else if (val instanceof Map)            desc = `${val.size} entry`
  else if (val instanceof Set)            desc = `${val.size} entry`
  else if (typeof val === 'function')     desc = 'function'
  else if (Array.isArray(val))            desc = `${val.length} item`
  else if (key === '__aiHistory__') {
    const users = Object.keys(val).length
    const msgs  = Object.values(val).reduce((a, v) => a + (Array.isArray(v) ? v.length : 0), 0)
    desc = `${users} user, ${msgs} pesan`
  }
  else if (key === '__chatCountDB__') {
    const groups = Object.keys(val).filter((k: unknown) => k !== '_global').length
    const total  = val._global ? Object.keys(val._global).length : 0
    desc = `${groups} grup, ${total} user tercatat`
  }
  else if (key === '__nananaSession__') {
    const age = Math.round((Date.now() - val.createdAt) / 60000)
    desc = `aktif, ${age} menit lalu`
  }
  else {
    const size = Object.keys(val).length
    desc = size === 0 ? '(kosong)' : `${size} entries`
  }

  return `${title}: ${desc}`
}

function buildFeatureSection() {
  const skip = new Set([
    '__dirname', '__filename', '__extends', '__assign', '__rest',
    '__decorate', '__param', '__esDecorate', '__runInitializers', '__propKey',
    '__setFunctionName', '__metadata', '__awaiter', '__generator', '__exportStar',
    '__createBinding', '__values', '__read', '__spread', '__spreadArrays',
    '__spreadArray', '__await', '__asyncGenerator', '__asyncDelegator', '__asyncValues',
    '__makeTemplateObject', '__importStar', '__importDefault', '__classPrivateFieldGet',
    '__classPrivateFieldSet', '__classPrivateFieldIn', '__addDisposableResource',
    '__disposeResources', '__rewriteRelativeImportExtension'
  ])
  const filtered = Object.keys(globalThis).filter((k: unknown) => /^__[a-zA-Z].*__$/.test(k) && !skip.has(k))
  if (!filtered.length) return `⚡ *FITUR AKTIF*\n  • (tidak ada)`
  const lines = filtered.map((k: unknown) => buildKeyLines(k, globalThis[k]))
  return `⚡ *FITUR AKTIF (${filtered.length})*\n\n` + lines.join('\n\n')
}

const handler = async (m: any, { Morela, reply, args, fkontak }: any) => {

  const send    = (text) => sendText(Morela, m.chat, text, fkontak)
  const sub     = args[0]?.toLowerCase()

  if (sub === 'json') {
    const file = args[1]
    if (file) {
      const content = readJson(file)
      if (!content) return send(`📂 *File tidak ditemukan!*\n\nFile: ${file}.json`)
      return send(`📄 *${file}.json*\n\n\`\`\`${content}\`\`\``)
    }
    const files = listJsonFiles()
    if (!files.length) return send(`📂 *JSON Files*\n\n📭 Tidak ada file JSON.`)
    return send(
      `📂 *JSON Files (${files.length} file)*\n\n` +
      files.map((f: string, i: number) => {
        const size = fs.statSync(path.join(DATA_DIR, f)).size
        const kb   = size >= 1024 ? (size / 1024).toFixed(1) + ' KB' : size + ' B'
        return `${i + 1}. 📄 ${f} *(${kb})*`
      }).join('\n') +
      `\n\nGunakan: *.cekdb json <nama>*`
    )
  }

  if (sub === 'own')  return send(`👑 *Own.json*\n\n\`\`\`${readJson('Own')      || '[]'}\`\`\``)
  if (sub === 'prem') return send(`💎 *Prem.json*\n\n\`\`\`${readJson('Prem')     || '[]'}\`\`\``)
  if (sub === 'lid')  return send(`🔗 *lidmap.json*\n\n\`\`\`${readJson('lidmap') || '{}'}\`\`\``)
  if (sub === 'self') return send(`⚙️ *selfmode.json*\n\n\`\`\`${readJson('selfmode') || '{}'}\`\`\``)

  if (sub === 'user') {
    const target = m.mentionedJid?.[0] ||
      (args[1] ? args[1].replace(/[^0-9]/g, '') + '@s.whatsapp.net' : m.sender)
    const u = getUser(target)
    if (!u) return send(`👤 *Data User*\n\n❌ User tidak ditemukan!\nJID: ${target}`)
    const regDate = u.registered_at
      ? new Date(u.registered_at * 1000).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
      : '-'
    return send(
      `👤 *Data User*\n\n` +
      `📱 JID     : ${u.jid}\n` +
      `📞 Nomor   : ${u.number}\n` +
      `📛 Nama    : ${u.name || '-'}\n` +
      `💎 Premium : ${u.is_premium === 1 ? 'Ya' : 'Tidak'}\n` +
      `🚫 Banned  : ${u.is_banned  === 1 ? 'Ya' : 'Tidak'}\n` +
      `📅 Daftar  : ${regDate}`
    )
  }

  if (sub === 'group') {
    const gid = args[1]?.trim()
    if (!gid) return send(`🏘️ *Data Grup*\n\n❌ Masukkan Group JID!`)
    const g = getGroup(gid)
    if (!g) return send(`🏘️ *Data Grup*\n\n❌ Grup tidak ditemukan!\nJID: ${gid}`)
    const updDate = g.updated_at
      ? new Date(g.updated_at * 1000).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
      : '-'
    const onOff = (v) => v ? '✅ ON' : '❌ OFF'
    return send(
      `🏘️ *Data Grup*\n\n` +
      `📛 Nama      : ${g.name || '-'}\n` +
      `👑 Owner     : ${g.owner || '-'}\n` +
      `👥 Member    : ${g.participants?.length || 0}\n\n` +
      `*Fitur:*\n` +
      `├ 👋 Welcome  : ${onOff(g.welcome)}\n` +
      `├ 🚪 Goodbye  : ${onOff(g.goodbye)}\n` +
      `├ 🔗 Antilink : ${onOff(g.antilink)}\n` +
      `└ 🤖 Self Mode: ${onOff(g.selfmode)}\n\n` +
      `📝 Desc   : ${g.desc?.slice(0, 40) || '-'}\n` +
      `🕐 Update : ${updDate}`
    )
  }

  if (sub === 'groups') {
    const list = Object.entries(getAllGroups())
    if (!list.length) return send(`🏘️ *List Grup*\n\n📭 Belum ada grup.`)
    const lines = list.slice(0, 25).map(([, g], i) => {
      const badges = [g.antilink ? '🔗' : '', g.welcome ? '👋' : '', g.goodbye ? '🚪' : '', g.selfmode ? '🤖' : ''].filter(Boolean).join('')
      return `${i + 1}. ${shortName(g.name)} (${g.participants?.length || 0}) ${badges}`
    })
    return send(
      `🏘️ *List Grup (${list.length} total)*\n\n` +
      lines.join('\n') +
      (list.length > 25 ? `\n... +${list.length - 25} lainnya` : '') +
      `\n\n🔗=Antilink 👋=Welcome 🚪=Goodbye 🤖=SelfMode`
    )
  }

  if (sub === 'users') {
    let usersRaw = {}
    try { usersRaw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'users.json'), 'utf-8')) } catch {}
    const list = Object.values(usersRaw)
    if (!list.length) return send(`👥 *List User*\n\n📭 Belum ada user.`)
    const lines = list.map((u, i) =>
      `${i + 1}. ${u.name || 'User'} — ${u.number}` +
      (u.is_premium === 1 ? ' 💎' : '') + (u.is_banned === 1 ? ' 🚫' : '')
    )
    return send(`👥 *List User (${list.length} total)*\n\n` + lines.join('\n'))
  }

  if (sub === 'banned' || sub === 'premium') {
    let usersRaw = {}
    try { usersRaw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'users.json'), 'utf-8')) } catch {}
    const field = sub === 'banned' ? 'is_banned' : 'is_premium'
    const emoji = sub === 'banned' ? '🚫' : '💎'
    const label = sub === 'banned' ? 'Banned' : 'Premium'
    const list  = Object.values(usersRaw).filter((u: unknown) => u[field] === 1)
    if (!list.length) return send(`${emoji} *User ${label}*\n\n📭 Tidak ada.`)
    return send(`${emoji} *User ${label} (${list.length})*\n\n` + list.map((u, i) => `${i + 1}. ${u.name || 'User'} — ${u.number}`).join('\n'))
  }

  if (sub === 'features' || sub === 'fitur') {
    return send(buildFeatureSection())
  }

  if (!sub) {
    const totalUsers  = countUsers()
    const totalGroups = countGroups()

    let lidCount = 0
    try {
      const lidmap = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'lidmap.json'), 'utf-8'))
      lidCount = Object.keys(lidmap).length
    } catch {}

    let premCount = 0, banCount = 0
    try {
      const usersRaw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'users.json'), 'utf-8'))
      for (const u of Object.values(usersRaw)) {
        if (u.is_premium === 1) premCount++
        if (u.is_banned  === 1) banCount++
      }
    } catch {}

    let welcomeOn = 0, goodbyeOn = 0, antilinkOn = 0, selfmodeOn = 0
    const welcomeGroups = [], goodbyeGroups = [], antilinkGroups = [], selfmodeGroups = []
    try {
      for (const [, g] of Object.entries(getAllGroups())) {
        const name = shortName(g.name)
        if (g.welcome)  { welcomeOn++;  welcomeGroups.push(name)  }
        if (g.goodbye)  { goodbyeOn++;  goodbyeGroups.push(name)  }
        if (g.antilink) { antilinkOn++; antilinkGroups.push(name) }
        if (g.selfmode) { selfmodeOn++; selfmodeGroups.push(name) }
      }
    } catch {}

    const listGrp = (arr) => arr.length ? arr.map((n: unknown) => `  • ${n}`).join('\n') : '  • (tidak ada)'

    return send(
      `🗄️ *Database Overview*\n\n` +
      `👥 USERS (${totalUsers} total)\n` +
      `├ 💎 Premium : ${premCount}\n` +
      `├ 🚫 Banned  : ${banCount}\n` +
      `└ 👤 Normal  : ${totalUsers - premCount - banCount}\n\n` +
      `🏘️ GROUPS (${totalGroups} total)\n\n` +
      `👋 *Welcome ON* (${welcomeOn})\n${listGrp(welcomeGroups)}\n\n` +
      `🚪 *Goodbye ON* (${goodbyeOn})\n${listGrp(goodbyeGroups)}\n\n` +
      `🔗 *Antilink ON* (${antilinkOn})\n${listGrp(antilinkGroups)}\n\n` +
      `🤖 *Self Mode ON* (${selfmodeOn})\n${listGrp(selfmodeGroups)}\n\n` +
      buildFeatureSection() + '\n\n' +
      `🔗 LID Map   : ${lidCount} mapping\n` +
      `📂 JSON Files: ${listJsonFiles().length} file\n\n` +
      `*Sub-command:*\n` +
      `┌ 👤 .cekdb user @tag\n` +
      `├ 👥 .cekdb users / banned / premium\n` +
      `├ 🏘️ .cekdb group <jid> / groups\n` +
      `├ ⚡ .cekdb fitur\n` +
      `├ 📂 .cekdb json / json <nama>\n` +
      `└ .cekdb own / prem / lid / self`
    )
  }

  return send(`❓ *Sub-command tidak dikenal*\n\nTersedia: user, users, group, groups, banned, premium, json, fitur, own, prem, lid, self`)
}

handler.help    = ['cekdb']
handler.tags    = ['owner']
handler.command = ['cekdb', 'checkdb', 'dbinfo']
handler.owner   = true
handler.noLimit = true

export default handler