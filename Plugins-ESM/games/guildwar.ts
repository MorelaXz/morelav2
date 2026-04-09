// @ts-nocheck


import fs   from 'fs'
import cron from 'node-cron'
import { DateTime } from 'luxon'
import { fileURLToPath } from 'url'
import path from 'path'
import {
  bi, imagePath, botName, botVersion,
  CHANNEL_URL
} from '../../Library/utils.js'
import { getGroup, updateGroup, getAllGroups } from '../../Database/db.js'

const TZ          = 'Asia/Jakarta'

const DAY_MAP = {
  minggu: 0, ahad: 0, sun: 0, sunday: 0,
  senin: 1,  mon: 1,  monday: 1,
  selasa: 2, tue: 2,  tuesday: 2,
  rabu: 3,   wed: 3,  wednesday: 3,
  kamis: 4,  thu: 4,  thursday: 4,
  jumat: 5,  jum: 5,  fri: 5,  friday: 5,
  sabtu: 6,  sat: 6,  saturday: 6
}

const DAY_NAME = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu']

function getGuildwarData(groupJid: unknown) {
  return getGroup(groupJid)?.guildwar || null
}

function saveGuildwarData(groupJid: unknown, data: unknown[]) {
  updateGroup(groupJid, { guildwar: data })
}

function getAllActiveGuildwars() {
  const allGroups = getAllGroups()
  const result = {}
  for (const [jid, group] of Object.entries(allGroups)) {
    if (group?.guildwar) result[jid] = group.guildwar
  }
  return result
}


async function tagAllMembers(Morela: Record<string, unknown>, groupJid: unknown, type: string = 'war') {
  try {
    const meta    = await Morela.groupMetadata(groupJid)
    const members = meta.participants || []
    const jids    = members.map((p: unknown) => p.id)
    const total   = jids.length

    const now   = DateTime.now().setZone(TZ)
    const gw    = getGuildwarData(groupJid)
    const jam   = gw ? `${String(gw.hour).padStart(2,'0')}.${String(gw.minute).padStart(2,'0')} WIB` : ''

    let text = ''

    if (type === 'reminder') {
      text =
        `⚔️ *PENGINGAT GUILD WAR!* ⚔️\n\n` +
        `🔔 *WAR dimulai 30 menit lagi!*\n` +
        `🕐 Jam ${jam} — Segera siap-siap!\n\n` +
        `📌 *Jangan lupa:*\n` +
        `• Login sebelum war mulai\n` +
        `• Koordinasi dengan guild leader\n` +
        `• Gunakan hero terbaik kalian!\n\n` +
        `꒰ © ${botName} ꒱`
    } else {
      text =
        `⚔️ *GUILD WAR DIMULAI!* ⚔️\n\n` +
        `🔥 *WAR SUDAH MULAI SEKARANG!*\n` +
        `🕐 ${now.toFormat('HH:mm')} WIB — ${now.toFormat('cccc, d MMMM yyyy')}\n\n` +
        `📣 *SEMANGAT! RAIH KEMENANGAN!* 🏆\n` +
        `⚡ GL HF semua member!\n\n` +
        `꒰ © ${botName} ꒱`
    }

    await Morela.sendMessage(groupJid, {
      text,
      mentions: jids   
    })

    console.log(`[GUILDWAR] ✅ Tagged ${total} members di ${groupJid} (type: ${type})`)
    return total
  } catch (e) {
    console.error(`[GUILDWAR] ❌ tagAllMembers error [${groupJid}]:`, (e as Error).message)
    return 0
  }
}

let _cronJob = null

function getSock() {
  return (globalThis as Record<string, unknown>).__sock__ || null
}

function startScheduler() {
  if (_cronJob) {
    _cronJob.stop()
    _cronJob = null
  }

  _cronJob = cron.schedule('* * * * *', async () => {
    const sock = getSock()
    if (!sock) return

    const now  = DateTime.now().setZone(TZ)
    const day  = now.weekday % 7
    const hour = now.hour
    const min  = now.minute

    for (const [groupJid, cfg] of Object.entries(getAllActiveGuildwars())) {
      if (!cfg.active) continue
      if (cfg.day !== day) continue

      if (cfg.hour === hour && cfg.minute === min) {
        console.log(`[GUILDWAR] 🔥 War time! ${groupJid}`)
        tagAllMembers(sock, groupJid, 'war')
      }

      const warMoment  = DateTime.now().setZone(TZ).set({ hour: cfg.hour, minute: cfg.minute, second: 0, millisecond: 0 })
      const reminderMo = warMoment.minus({ minutes: 30 })
      if (reminderMo.hour === hour && reminderMo.minute === min) {
        console.log(`[GUILDWAR] ⏰ Reminder 30m! ${groupJid}`)
        tagAllMembers(sock, groupJid, 'reminder')
      }
    }
  }, { timezone: TZ })

  console.log('[GUILDWAR] ✅ Scheduler aktif')
}

startScheduler()

const handler = async (m: any, { Morela, args, reply, fkontak }: any) => {
  (globalThis as Record<string, unknown>).__sock__ = Morela

  const from = m.chat
  const sub  = (args[0] || '').toLowerCase()

  if (!sub || sub === 'status' || sub === 'cek') {
    const cfg = getGuildwarData(from)
    if (!cfg) {
      return reply(
        `⚔️ *GUILD WAR REMINDER*\n\n` +
        `❌ Belum ada jadwal war di grup ini.\n\n` +
        `*Cara pakai:*\n` +
        `• *.guildwar set sabtu 16:00* — set jadwal\n` +
        `• *.guildwar on* — aktifkan\n` +
        `• *.guildwar off* — nonaktifkan\n` +
        `• *.guildwar tagall* — tag semua sekarang\n` +
        `• *.guildwar test* — test reminder\n\n` +
        `꒰ © ${botName} ꒱`
      )
    }
    return reply(
      `⚔️ *GUILD WAR REMINDER*\n\n` +
      `📅 Hari   : *${DAY_NAME[cfg.day]}*\n` +
      `🕐 Jam    : *${String(cfg.hour).padStart(2,'0')}.${String(cfg.minute).padStart(2,'0')} WIB*\n` +
      `🔔 Status : ${cfg.active ? '🟢 *AKTIF*' : '🔴 *NONAKTIF*'}\n\n` +
      `⏰ Reminder otomatis 30 menit sebelum war.\n\n` +
      `꒰ © ${botName} ꒱`
    )
  }

  if (sub === 'set') {
    const dayArg  = (args[1] || '').toLowerCase()
    const timeArg = args[2] || ''

    if (!dayArg || !timeArg) {
      return reply(
        `⚔️ *SET Jadwal Guild War*\n\n` +
        `❌ Format salah!\n\n` +
        `✅ Contoh:\n` +
        `*.guildwar set sabtu 16:00*\n` +
        `*.guildwar set minggu 20:00*\n\n` +
        `📋 Hari valid:\n` +
        `minggu, senin, selasa, rabu, kamis, jumat, sabtu\n\n` +
        `꒰ © ${botName} ꒱`
      )
    }

    const dayNum = DAY_MAP[dayArg]
    if (dayNum === undefined) {
      return reply(`❌ Hari "*${dayArg}*" tidak valid!\n\nContoh: sabtu, minggu, senin`)
    }

    const timeParts = timeArg.replace('.', ':').split(':')
    const hour      = parseInt(timeParts[0])
    const minute    = parseInt(timeParts[1] || '0')

    if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return reply(`❌ Format jam salah! Contoh: *16:00* atau *20:30*`)
    }

    const existing = getGuildwarData(from) || {}
    const newData  = {
      ...existing,
      day: dayNum,
      hour,
      minute,
      active: existing.active !== false
    }
    saveGuildwarData(from, newData)

    return reply(
      `✅ *Jadwal Guild War Disimpan!*\n\n` +
      `📅 Hari : *${DAY_NAME[dayNum]}*\n` +
      `🕐 Jam  : *${String(hour).padStart(2,'0')}.${String(minute).padStart(2,'0')} WIB*\n` +
      `🔔 Bot akan tag semua member otomatis!\n` +
      `⏰ Reminder dikirim 30 menit sebelum war.\n\n` +
      `꒰ © ${botName} ꒱`
    )
  }

  if (sub === 'on') {
    const cfg = getGuildwarData(from)
    if (!cfg) return reply(`❌ Set jadwal dulu!\n\nContoh: *.guildwar set sabtu 16:00*`)
    if (cfg.active) return reply(`⚠️ Reminder sudah aktif!`)
    saveGuildwarData(from, { ...cfg, active: true })
    return reply(
      `✅ *Guild War Reminder Diaktifkan!*\n\n` +
      `🔔 Bot akan tag semua member setiap:\n` +
      `📅 *${DAY_NAME[cfg.day]}*, jam *${String(cfg.hour).padStart(2,'0')}.${String(cfg.minute).padStart(2,'0')} WIB*\n\n` +
      `꒰ © ${botName} ꒱`
    )
  }

  if (sub === 'off') {
    const cfg = getGuildwarData(from)
    if (!cfg) return reply(`❌ Belum ada jadwal.`)
    if (!cfg.active) return reply(`⚠️ Reminder sudah nonaktif!`)
    saveGuildwarData(from, { ...cfg, active: false })
    return reply(`✅ *Guild War Reminder Dinonaktifkan!*\n\nBot tidak akan kirim reminder sampai diaktifkan lagi.\n\n꒰ © ${botName} ꒱`)
  }

  if (sub === 'tagall') {
    await reply('⏳ Sedang tag semua member...')
    const total = await tagAllMembers(Morela, from, 'war')
    if (total === 0) return reply('❌ Gagal tag member. Pastikan bot admin grup.')
    return
  }

  if (sub === 'test') {
    await reply('⏳ Mengirim test reminder...')
    const total = await tagAllMembers(Morela, from, 'reminder')
    if (total === 0) return reply('❌ Gagal. Pastikan bot admin grup.')
    return
  }

  if (sub === 'hapus' || sub === 'reset' || sub === 'delete') {
    if (!getGuildwarData(from)) return reply('❌ Tidak ada jadwal untuk dihapus.')
    saveGuildwarData(from, null)
    return reply(`✅ Jadwal guild war grup ini dihapus.\n\n꒰ © ${botName} ꒱`)
  }

  return reply(
    `⚔️ *GUILD WAR REMINDER*\n\n` +
    `*Command:*\n` +
    `• *.guildwar set <hari> <jam>* — set jadwal\n` +
    `• *.guildwar on* — aktifkan reminder\n` +
    `• *.guildwar off* — nonaktifkan\n` +
    `• *.guildwar status* — cek jadwal\n` +
    `• *.guildwar tagall* — tag semua sekarang\n` +
    `• *.guildwar test* — test kirim reminder\n` +
    `• *.guildwar hapus* — hapus jadwal\n\n` +
    `*Contoh:*\n` +
    `_.guildwar set sabtu 16:00_\n\n` +
    `꒰ © ${botName} ꒱`
  )
}

handler.command = ['guildwar', 'gw', 'war']
handler.tags    = ['group']
handler.help    = ['guildwar set <hari> <jam>', 'guildwar on/off']
handler.group   = true
handler.admin   = true
handler.noLimit = true

export default handler