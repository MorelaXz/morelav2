

import fs    from 'fs'
import path  from 'path'
import chalk from 'chalk'
import { fileURLToPath } from 'url'
import type { UserData, GroupData, LidMapData } from '../types/global.js'

const __dirname   = path.dirname(fileURLToPath(import.meta.url as string))
const DB_DIR      = path.join(__dirname, '../data')
const USERS_PATH  = path.join(DB_DIR, 'users.json')
const GROUPS_PATH = path.join(DB_DIR, 'groups.json')
const LIDMAP_PATH = path.join(DB_DIR, 'lidmap.json')

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true })


const _writeTimers = new Map<string, ReturnType<typeof setTimeout>>()
const _pendingData = new Map<string, unknown>()

function scheduleWrite(filePath: string, data: unknown): void {
  _pendingData.set(filePath, data)
  const existing = _writeTimers.get(filePath)
  if (existing) clearTimeout(existing)
  const timer = setTimeout(async () => {
    _writeTimers.delete(filePath)
    const latest = _pendingData.get(filePath)
    _pendingData.delete(filePath)
    if (!latest) return
    try {
      await fs.promises.writeFile(filePath, JSON.stringify(latest, null, 2))
    } catch (e) {
      const err = e as Error
      console.error(chalk.red(`❌ DB async write gagal [${path.basename(filePath)}]:`, err.message))
    }
  }, 2000)
  _writeTimers.set(filePath, timer)
}

function saveJSONSync(filePath: string, data: unknown): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
  } catch (e) {
    const err = e as Error
    console.error(chalk.red(`❌ DB save gagal [${path.basename(filePath)}]:`, err.message))
  }
}

function loadJSON<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T
    }
  } catch (e) {
    const err = e as Error
    console.warn(chalk.yellow(`⚠️  DB load gagal [${path.basename(filePath)}]:`, err.message))
  }
  return fallback
}


type UsersStore  = Record<string, UserData>
type GroupsStore = Record<string, GroupData>

let _users:  UsersStore  | null = null
let _groups: GroupsStore | null = null
let _lidmap: LidMapData  | null = null

function getUsers():    UsersStore  { if (!_users)  _users  = loadJSON<UsersStore>(USERS_PATH,   {}); return _users  }
function getGroupsDB(): GroupsStore { if (!_groups) _groups = loadJSON<GroupsStore>(GROUPS_PATH, {}); return _groups }
function getLidMap():   LidMapData  { if (!_lidmap) _lidmap = loadJSON<LidMapData>(LIDMAP_PATH,  {}); return _lidmap }


export function initDB(): void {
  if (!fs.existsSync(USERS_PATH)) {
    saveJSONSync(USERS_PATH, {})
    console.log(chalk.green.bold('✅ Users DB created →'), chalk.cyan(USERS_PATH))
  } else {
    _users = loadJSON<UsersStore>(USERS_PATH, {})
    console.log(chalk.green.bold(`✅ Users DB ready → ${Object.keys(_users).length} user`))
  }

  if (!fs.existsSync(GROUPS_PATH)) {
    saveJSONSync(GROUPS_PATH, {})
    console.log(chalk.green.bold('✅ Groups DB created →'), chalk.cyan(GROUPS_PATH))
  } else {
    _groups = loadJSON<GroupsStore>(GROUPS_PATH, {})
    console.log(chalk.green.bold(`✅ Groups DB ready → ${Object.keys(_groups).length} grup`))
  }

  if (!fs.existsSync(LIDMAP_PATH)) {
    saveJSONSync(LIDMAP_PATH, {})
    console.log(chalk.green.bold('✅ LID Map DB created →'), chalk.cyan(LIDMAP_PATH))
  } else {
    _lidmap = loadJSON<LidMapData>(LIDMAP_PATH, {})
    console.log(chalk.green.bold(`✅ LID Map DB ready → ${Object.keys(_lidmap).length} mapping`))
  }
}

function cleanJid(jid: string): string {
  if (!jid) return ''
  const base = jid.split('@')[0].split(':')[0].replace(/[^0-9]/g, '')
  return base ? base + '@s.whatsapp.net' : ''
}


export function isRegistered(jid: string): boolean {
  try {
    const clean = cleanJid(jid)
    if (!clean || clean === '@s.whatsapp.net') return false
    return !!getUsers()[clean]
  } catch { return false }
}

export function registerUser(jid: string, number: string, name: string = 'User'): boolean {
  try {
    const clean = cleanJid(jid)
    if (!clean || clean === '@s.whatsapp.net') return false
    const users = getUsers()
    if (users[clean]) return false

    users[clean] = {
      id:           clean,
      number:       clean.replace('@s.whatsapp.net', ''),
      name,
      registered:   true,
      regName:      name,
      regDate:      new Date().toLocaleDateString('id-ID'),
      level:        1,
      exp:          0,
      premium:      false,
      premiumExpiry: null,
    }
    _users = users
    scheduleWrite(USERS_PATH, users)
    return true
  } catch (e) {
    const err = e as Error
    console.error('[DB registerUser error]', err.message)
    return false
  }
}

export function getUser(jid: string): UserData | null {
  try { return getUsers()[cleanJid(jid)] ?? null } catch { return null }
}

export function updateUserName(jid: string, name: string): void {
  try {
    const clean = cleanJid(jid)
    const users = getUsers()
    if (users[clean]) {
      users[clean].name = name
      scheduleWrite(USERS_PATH, users)
    }
  } catch (e) {
    const err = e as Error
    console.error('[DB updateUserName error]', err.message)
  }
}

export function countUsers(): number {
  try { return Object.keys(getUsers()).length } catch { return 0 }
}

export function setPremium(jid: string, value: number = 1): void {
  try {
    const clean = cleanJid(jid)
    const users = getUsers()
    if (!users[clean]) users[clean] = { id: clean }
    users[clean].premium       = value === 1
    users[clean].premiumExpiry = value === 1 ? null : Date.now()
    _users = users
    scheduleWrite(USERS_PATH, users)
  } catch {  }
}

export function banUser(jid: string, value: number = 1): void {
  try {
    const clean = cleanJid(jid)
    if (!clean || clean === '@s.whatsapp.net') return
    const users = getUsers()
    if (!users[clean]) users[clean] = { id: clean }
    users[clean].is_banned = value === 1 ? 1 : 0
    _users = users
    scheduleWrite(USERS_PATH, users)
  } catch {  }
}

export function updateUser(jid: string, partial: Partial<UserData>): boolean {
  try {
    const clean = cleanJid(jid)
    if (!clean || clean === '@s.whatsapp.net') return false
    const users = getUsers()
    if (!users[clean]) return false
    users[clean] = { ...users[clean], ...partial }
    _users = users
    scheduleWrite(USERS_PATH, users)
    return true
  } catch (e) {
    const err = e as Error
    console.error('[DB updateUser error]', err.message)
    return false
  }
}

export function unregisterUser(jid: string): boolean {
  try {
    const clean = cleanJid(jid)
    if (!clean || clean === '@s.whatsapp.net') return false
    const users = getUsers()
    if (!users[clean]) return false
    delete users[clean]
    _users = users
    scheduleWrite(USERS_PATH, users)
    return true
  } catch (e) {
    const err = e as Error
    console.error('[DB unregisterUser error]', err.message)
    return false
  }
}


export function saveGroup(jid: string, metadata: Partial<GroupData>): void {
  try {
    if (!jid || !metadata) return
    const groups   = getGroupsDB()
    const existing = groups[jid] ?? { id: jid }

    
    groups[jid] = {
      ...existing,
      ...metadata,
      id: jid,
    }
    _groups = groups
    scheduleWrite(GROUPS_PATH, groups)
  } catch (e) {
    const err = e as Error
    console.error('[DB saveGroup error]', err.message)
  }
}

export function getGroup(jid: string): GroupData | null {
  try { return getGroupsDB()[jid] ?? null } catch { return null }
}

export function updateGroup(jid: string, partial: Partial<GroupData>): void {
  try {
    if (!jid) return
    const groups = getGroupsDB()
    if (!groups[jid]) groups[jid] = { id: jid }
    groups[jid] = { ...groups[jid], ...partial }
    _groups = groups
    scheduleWrite(GROUPS_PATH, groups)
  } catch (e) {
    const err = e as Error
    console.error('[DB updateGroup error]', err.message)
  }
}

export function deleteGroup(jid: string): void {
  try {
    const groups = getGroupsDB()
    if (groups[jid]) {
      delete groups[jid]
      _groups = groups
      scheduleWrite(GROUPS_PATH, groups)
    }
  } catch (e) {
    const err = e as Error
    console.error('[DB deleteGroup error]', err.message)
  }
}

export function countGroups(): number {
  try { return Object.keys(getGroupsDB()).length } catch { return 0 }
}

export function clearDBCache(): void {
  _users  = null
  _groups = null
  _lidmap = null
  console.log(chalk.cyan('[DB] In-memory cache cleared — akan reload dari file saat diakses berikutnya'))
}



export function cancelPendingWrites(): void {
  for (const timer of _writeTimers.values()) clearTimeout(timer)
  _writeTimers.clear()
  _pendingData.clear()
  console.log(chalk.cyan('[DB] Semua pending write dibatalkan'))
}

export function getAllGroups(): GroupsStore {
  try { return getGroupsDB() } catch { return {} }
}


export function saveLidMap(lid: string, phone: string): void {
  try {
    if (!lid || !phone) return
    const map = getLidMap()
    if (map[lid] === phone) return
    map[lid] = phone
    _lidmap  = map
    scheduleWrite(LIDMAP_PATH, map)
  } catch (e) {
    const err = e as Error
    console.error('[DB saveLidMap error]', err.message)
  }
}

export function getPhoneByLid(lid: string): string | null {
  try {
    if (!lid) return null
    return getLidMap()[lid] ?? null
  } catch { return null }
}

export { getUsers }

export default {
  initDB,
  isRegistered, registerUser, unregisterUser, getUser, updateUserName, updateUser,
  countUsers, getUsers, setPremium, banUser,
  saveGroup, getGroup, updateGroup, deleteGroup, countGroups, getAllGroups,
  saveLidMap, getPhoneByLid,
  clearDBCache, cancelPendingWrites
}
