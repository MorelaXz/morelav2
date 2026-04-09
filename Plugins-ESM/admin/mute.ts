// @ts-nocheck
import { getGroup, updateGroup } from '../../Database/db.js'
import { botName } from '../../Library/utils.js'

export default {
  command:  ['mute', 'unmute', 'bisukan', 'buka'],
  tags:     ['admin'],
  help:     ['mute', 'unmute'],
  noLimit:  true,
  owner:    false,
  premium:  false,
  group:    true,
  private:  false,
  admin:    true,

  handler: async (m, { Morela, command, reply, fkontak }) => {
    const from      = m.chat
    const groupData = getGroup(from)
    const isMute    = command === 'mute' || command === 'bisukan'

    if (isMute) {
      if (groupData?.mute) return reply(
        `╭╌╌⬡「 🔇 *ᴍᴜᴛᴇ ɢʀᴜᴘ* 」\n` +
        `┃\n` +
        `┃ ⚠️ Grup sudah dalam mode *mute*!\n` +
        `┃ Ketik \`.unmute\` untuk membuka.\n` +
        `┃\n` +
        `╰╌╌⬡\n\n© ${botName}`
      )

      updateGroup(from, { mute: true })

      await Morela.sendMessage(from, {
        text:
          `╭╌╌⬡「 🔇 *ᴍᴜᴛᴇ ɢʀᴜᴘ* 」\n` +
          `┃\n` +
          `┃ ✅ Grup berhasil di-*mute*!\n` +
          `┃\n` +
          `┃ 📌 Hanya *admin* yang bisa\n` +
          `┃    mengirim pesan.\n` +
          `┃\n` +
          `┃ 💡 Ketik \`.unmute\` untuk buka.\n` +
          `┃\n` +
          `╰╌╌⬡\n\n© ${botName}`
      }, { quoted: fkontak || m })

    } else {
      if (!groupData?.mute) return reply(
        `╭╌╌⬡「 🔊 *ᴜɴᴍᴜᴛᴇ ɢʀᴜᴘ* 」\n` +
        `┃\n` +
        `┃ ⚠️ Grup tidak dalam mode mute!\n` +
        `┃\n` +
        `╰╌╌⬡\n\n© ${botName}`
      )

      updateGroup(from, { mute: false })

      await Morela.sendMessage(from, {
        text:
          `╭╌╌⬡「 🔊 *ᴜɴᴍᴜᴛᴇ ɢʀᴜᴘ* 」\n` +
          `┃\n` +
          `┃ ✅ Grup berhasil di-*unmute*!\n` +
          `┃\n` +
          `┃ 📌 Semua anggota kini bisa\n` +
          `┃    mengirim pesan kembali.\n` +
          `┃\n` +
          `╰╌╌⬡\n\n© ${botName}`
      }, { quoted: fkontak || m })
    }
  }
}