// @ts-nocheck


import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { bi, botName, imagePath } from '../../Library/utils.js'

const __dirname  = path.dirname(fileURLToPath(import.meta.url as string))
const DATA_PATH  = path.join(__dirname, '../../data/gc_schedule.json')
const TZ         = 'Asia/Jakarta'


interface GcSchedule {
  groupId:    string
  action:     'open' | 'close'
  timeStr:    string    
  targetTs:   number    
  dateLabel:  string    
  setBy:      string    
}

type ScheduleStore = Record<string, GcSchedule>  


let _store: ScheduleStore = {}
let _timers: Map<string, ReturnType<typeof setTimeout>> = new Map()

function loadStore(): void {
  try {
    if (fs.existsSync(DATA_PATH)) {
      _store = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8')) as ScheduleStore
    }
  } catch { _store = {} }
}

function saveStore(): void {
  try { fs.writeFileSync(DATA_PATH, JSON.stringify(_store, null, 2)) } catch {}
}




function parseTime(str: string): { hour: number; minute: number } | null {
  const m = str.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const hour   = parseInt(m[1])
  const minute = parseInt(m[2])
  if (hour > 23 || minute > 59) return null
  return { hour, minute }
}


function nextTargetTs(hour: number, minute: number): number {
  const now    = new Date()
  
  const wib    = new Date(now.toLocaleString('en-US', { timeZone: TZ }))
  const target = new Date(wib)
  target.setHours(hour, minute, 0, 0)

  
  if (target.getTime() <= wib.getTime()) {
    target.setDate(target.getDate() + 1)
  }

  
  const diffMs = target.getTime() - wib.getTime()
  return Date.now() + diffMs
}


function dateLabel(ts: number): string {
  return new Date(ts).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ
  })
}


function timeUntil(ts: number): string {
  const diff  = ts - Date.now()
  if (diff <= 0) return 'sekarang'
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(mins / 60)
  const remM  = mins % 60
  if (hours > 0) return `${hours} hours ${remM} minutes`
  return `${mins} minutes`
}


let _sock: any = null   

function cancelTimer(groupId: string): void {
  const t = _timers.get(groupId)
  if (t) { clearTimeout(t); _timers.delete(groupId) }
}

async function executeSchedule(sched: GcSchedule): Promise<void> {
  try {
    const setting = sched.action === 'open' ? 'not_announcement' : 'announcement'
    await _sock.groupSettingUpdate(sched.groupId, setting)

    const label = sched.action === 'open' ? '🔓 *Group Opened!*' : '🔒 *Group Closed!*'
    await _sock.sendMessage(sched.groupId, {
      text: `${label}\n\nSesuai jadwal.`
    })
  } catch (e) {
    console.error(`[GC SCHEDULE] Gagal execute ${sched.groupId}:`, (e as Error).message)
    
    try {
      await _sock.sendMessage(sched.groupId, {
        text: `❌ Gagal ${sched.action === 'open' ? 'membuka' : 'menutup'} grup sesuai jadwal.\nPastikan bot masih jadi admin.`
      })
    } catch {}
  }

  
  delete _store[sched.groupId]
  saveStore()
  _timers.delete(sched.groupId)
}

function armTimer(sched: GcSchedule): void {
  cancelTimer(sched.groupId)
  const delay = Math.max(0, sched.targetTs - Date.now())
  const t = setTimeout(() => executeSchedule(sched), delay)
  _timers.set(sched.groupId, t)
}


export function initGcScheduler(sock: any): void {
  _sock = sock
  loadStore()

  const now = Date.now()
  let armed = 0, expired = 0

  for (const [gid, sched] of Object.entries(_store)) {
    if (sched.targetTs > now) {
      armTimer(sched)
      armed++
    } else {
      
      executeSchedule(sched)
      expired++
    }
  }

  if (armed + expired > 0) {
    console.log(`[GC SCHEDULE] Init: ${armed} jadwal aktif, ${expired} dieksekusi (terlewat)`)
  }
}


const handler = async (m: any, { Morela, command, text, reply, isAdmin, botAdmin, fkontak }: any) => {
  if (!m.isGroup) return reply('❌ Command ini hanya bisa dipakai di dalam grup!')
  if (!isAdmin)   return reply('❌ Kamu harus jadi admin untuk menggunakan command ini!')
  
  

  
  if (!_sock) _sock = Morela

  const groupId  = m.chat
  const senderNum = (m.sender ?? '').replace(/@.*/, '').replace(/[^0-9]/g, '')

  const send = (txt: string) =>
    Morela.sendMessage(groupId, { text: txt }, { quoted: fkontak || m })

  
  if (command === 'listgc' || command === 'jadwalgc') {
    loadStore()
    const sched = _store[groupId]
    if (!sched) return send(`📋 *Jadwal GC*\n\n📭 Tidak ada jadwal aktif di grup ini.`)

    const icon = sched.action === 'open' ? '🔓' : '🔒'
    return send(
      `📋 *Jadwal GC Aktif*\n\n` +
      `${icon} Aksi    : ${sched.action.toUpperCase()}\n` +
      `🕐 Waktu   : ${sched.timeStr} (Asia/Jakarta)\n` +
      `📅 Tanggal : ${sched.dateLabel}\n` +
      `⏳ Dalam   : ${timeUntil(sched.targetTs)}\n\n` +
      `_Diset oleh: +${sched.setBy}_`
    )
  }

  
  if (command === 'cancelgc' || command === 'canceljadwal') {
    loadStore()
    const sched = _store[groupId]
    if (!sched) return send(`⚠️ Tidak ada jadwal aktif di grup ini.`)

    cancelTimer(groupId)
    delete _store[groupId]
    saveStore()

    return send(
      `🗑️ *Jadwal Dibatalkan!*\n\n` +
      `Jadwal ${sched.action.toUpperCase()} pukul ${sched.timeStr} telah dibatalkan.`
    )
  }

  
  if (!['opengc', 'closegc'].includes(command)) return

  if (!text) return send(
    `⏰ *Jadwal Open/Close GC*\n\n` +
    `📌 Format:\n` +
    `┌──────────────────────\n` +
    `│ .opengc  06:00\n` +
    `│ .closegc 22:25\n` +
    `└──────────────────────\n\n` +
    `📋 Cek jadwal aktif: .listgc\n` +
    `🗑️ Batalkan jadwal : .cancelgc`
  )

  const parsed = parseTime(text)
  if (!parsed) return send(
    `❌ *Format waktu salah!*\n\n` +
    `Gunakan format HH:MM\n` +
    `Contoh: .${command} *22:25*`
  )

  const action: 'open' | 'close' = command === 'opengc' ? 'open' : 'close'
  const targetTs = nextTargetTs(parsed.hour, parsed.minute)
  const timeStr  = `${String(parsed.hour).padStart(2,'0')}:${String(parsed.minute).padStart(2,'0')}`
  const dLabel   = dateLabel(targetTs)
  const icon     = action === 'open' ? '🔓' : '🔒'
  const label    = action === 'open' ? 'BUKA GC' : 'TUTUP GC'

  
  cancelTimer(groupId)

  const sched: GcSchedule = {
    groupId,
    action,
    timeStr,
    targetTs,
    dateLabel: dLabel,
    setBy:     senderNum,
  }

  _store[groupId] = sched
  saveStore()
  armTimer(sched)

  return send(
    `\n⏰ *Jadwal ${label}*\n\n` +
    `📌 Status: ${action.toUpperCase()}\n` +
    `🕐 Waktu: ${timeStr} (Asia/Jakarta)\n` +
    `📅 Tanggal: ${dLabel}\n` +
    `⏳ Dalam: ${timeUntil(targetTs)}\n\n` +
    `Bot akan otomatis ${action === 'open' ? 'buka' : 'tutup'} grup.`
  )
}

handler.command  = ['opengc', 'closegc', 'listgc', 'jadwalgc', 'cancelgc', 'canceljadwal']
handler.group    = true
handler.admin    = true
handler.tags     = ['group']
handler.help     = ['opengc HH:MM', 'closegc HH:MM', 'listgc', 'cancelgc']
handler.noLimit  = true

export default handler
