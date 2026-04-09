// @ts-nocheck
import { getGroup, updateGroup } from '../../Database/db.js'
import { botName } from '../../Library/utils.js'

const handler = async (m, { args, reply }) => {
  const from    = m.chat
  const mode    = (args[0] || '').toLowerCase()
  const grp     = getGroup(from)
  const current = grp?.antivirtex || false

  if (!mode || mode === 'status' || mode === 'cek') {
    return reply(
      `╭╌╌⬡「 ⚡ *ᴀɴᴛɪ ᴠɪʀᴛᴇx* 」\n` +
      `┃\n` +
      `┃ Status: ${current ? '🟢 AKTIF' : '🔴 NONAKTIF'}\n` +
      `┃\n` +
      `┃ 🔹 ProductMessage panjang → kick\n` +
      `┃ 🔹 Teks >8000 karakter → kick\n` +
      `┃ 🔹 Karakter zalgo/unicode aneh → kick\n` +
      `┃ 🔹 Flood 5 pesan/2 detik → warn & kick\n` +
      `┃ 🔹 Semua pesan sender dihapus otomatis\n` +
      `┃ 🔹 Pesan command bot dikecualikan\n` +
      `┃\n` +
      `┃ *.antivirtex on*  — aktifkan\n` +
      `┃ *.antivirtex off* — nonaktifkan\n` +
      `╰╌╌⬡\n\n© ${botName}`
    )
  }

  if (mode === 'on' || mode === 'aktif') {
    if (current) return reply(
      `╭╌╌⬡「 ⚠️ *ɪɴꜰᴏ* 」\n┃ Anti Virtex sudah aktif!\n╰╌╌⬡\n\n© ${botName}`
    )
    updateGroup(from, { antivirtex: true })
    return reply(
      `╭╌╌⬡「 ✅ *ᴀɴᴛɪ ᴠɪʀᴛᴇx ᴀᴋᴛɪꜰ* 」\n` +
      `┃\n` +
      `┃ Anti Virtex berhasil *diaktifkan!*\n` +
      `┃\n` +
      `┃ 🔹 Virtex konten → kick + hapus pesan\n` +
      `┃ 🔹 Flood spam → warn, 3x → kick\n` +
      `┃ 🔹 Pesan command bot aman\n` +
      `┃\n` +
      `┃ _Pastikan bot sudah jadi admin!_\n` +
      `╰╌╌⬡\n\n© ${botName}`
    )
  }

  if (mode === 'off' || mode === 'nonaktif') {
    if (!current) return reply(
      `╭╌╌⬡「 ⚠️ *ɪɴꜰᴏ* 」\n┃ Anti Virtex memang sudah nonaktif!\n╰╌╌⬡\n\n© ${botName}`
    )
    updateGroup(from, { antivirtex: false })
    return reply(
      `╭╌╌⬡「 ✅ *ʙᴇʀʜᴀsɪʟ* 」\n┃ Anti Virtex *dinonaktifkan!*\n╰╌╌⬡\n\n© ${botName}`
    )
  }

  reply(
    `╭╌╌⬡「 ❌ *ᴇʀʀᴏʀ* 」\n┃ Gunakan: *.antivirtex on/off/status*\n╰╌╌⬡\n\n© ${botName}`
  )
}

handler.command  = ['antivirtex']
handler.group    = true
handler.admin    = true
handler.noLimit  = true
handler.tags     = ['group', 'anti']
handler.help     = ['antivirtex on', 'antivirtex off', 'antivirtex status']

export default handler