// @ts-nocheck
import path from "path"
import fs from "fs"
import { bi, botName, botVersion, imagePath } from '../../Library/utils.js'

const CHANNEL_JID = '120363420704282055@newsletter'

function buildContextInfo() {
  return {
    forwardingScore: 1,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid:   CHANNEL_JID,
      serverMessageId: 1,
      newsletterName:  botName
    },
    externalAdReply: {
      title:                 botName,
      body:                  botVersion,
      mediaType:             1,
      thumbnail:             fs.existsSync(imagePath) ? fs.readFileSync(imagePath) : undefined,
      renderLargerThumbnail: false,
      showAdAttribution:     false
    }
  }
}

export default {
  command: ['open', 'close'],
  group: true,
  admin: true,
  
  noLimit: true,
  tags: ['group'],
  help: ['open', 'close'],

  handler: async (m, { Morela, command, fkontak }) => {
    const from = m.chat

    const send = async text =>
      Morela.sendMessage(
        from,
        {
          text: bi(text),
          contextInfo: buildContextInfo()
        },
        { quoted: fkontak || m }
      )

    if (!from || !from.endsWith('@g.us')) {
      return send('⚠️ Akses Ditolak\n\n❌ Command ini hanya bisa digunakan di dalam grup.\n\n`© ' + botName + '`')
    }

    if (command === 'open') {
      try {
        
        await Morela.groupSettingUpdate(from, 'not_announcement')
        return send(
          '🔓 Grup Dibuka\n\n' +
          '✅ Grup berhasil dibuka!\n' +
          'Semua anggota kini dapat mengirim pesan.\n\n' +
          `© ${botName}`
        )
      } catch (e) {
        return send('🔓 Grup Dibuka\n\n❌ Gagal membuka grup!\nPastikan bot memiliki hak admin.\n\n`© ' + botName + '`')
      }
    }

    if (command === 'close') {
      try {
        
        await Morela.groupSettingUpdate(from, 'announcement')
        return send(
          '🔒 Grup Ditutup\n\n' +
          '✅ Grup berhasil ditutup!\n' +
          'Hanya admin yang dapat mengirim pesan.\n\n' +
          `© ${botName}`
        )
      } catch (e) {
        return send('🔒 Grup Ditutup\n\n❌ Gagal menutup grup!\nPastikan bot memiliki hak admin.\n\n`© ' + botName + '`')
      }
    }
  }
}