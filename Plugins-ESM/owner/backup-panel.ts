// @ts-nocheck
import fs       from 'fs'
import path     from 'path'
import axios    from 'axios'
import FormData from 'form-data'
import archiver  from 'archiver'
import { fileURLToPath } from 'url'
import { getTgToken, getTgChatId } from '../../Library/tg_global.js'
import { bi, buildFkontak, CHANNEL_URL, botName } from '../../Library/utils.js'
import { getMainOwner } from '../../System/mainowner.js'

const __filename = fileURLToPath(import.meta.url as string)
const __dirname  = path.dirname(__filename)
const ROOT_DIR   = path.join(__dirname, '../..')

const generateZipName = () => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
  return `backup-bot-${timestamp}.zip`
}


function getMainOwnerJid(): string {
  const num = getMainOwner().replace(/[^0-9]/g, '')
  return num ? num + '@s.whatsapp.net' : ''
}


async function sendZipToTelegram(zipPath: string, zipName: string, fileSizeMB: string, duration: string) {
  const token  = getTgToken()  || ''
  const chatId = getTgChatId() || ''
  if (!token || !chatId) return false

  try {
    const form = new FormData()
    form.append('chat_id', chatId)
    form.append('caption',
      `📦 BACKUP BOT MORELA\n\n` +
      `📄 File   : ${zipName}\n` +
      `💾 Size   : ${fileSizeMB} MB\n` +
      `⏱️ Waktu  : ${duration}s\n\n` +
      `Simpan file ini dengan aman!`
    )
    form.append('document', fs.createReadStream(zipPath), { filename: zipName })

    await axios.post(
      `https://api.telegram.org/bot${token}/sendDocument`,
      form,
      { headers: form.getHeaders(), timeout: 120000 }
    )
    return true
  } catch (e) {
    console.error('[BACKUP] Gagal kirim ke Telegram:', (e as Error).message)
    return false
  }
}


async function sendZipToMainOwnerDM(
  Morela: any,
  zipPath: string,
  zipName: string,
  fileSizeMB: string,
  duration: string
) {
  const ownerJid = getMainOwnerJid()
  if (!ownerJid) {
    console.error('[BACKUP] Main owner JID tidak ditemukan!')
    return
  }
  try {
    const caption =
      `╭──「 ✅ *Backup Bot ${botName}* 」\n` +
      `│\n` +
      `│  📦 File  » ${zipName}\n` +
      `│  💾 Size  » *${fileSizeMB} MB*\n` +
      `│  ⏱️ Waktu » *${duration}s*\n` +
      `│\n` +
      `│  ⚠️ _Telegram gagal — file dikirim ke DM kamu_\n` +
      `│\n` +
      `╰─────────────────────\n` +
      `꒰ © ${botName} ꒱`

    
    await Morela.sendMessage(ownerJid, {
      document: fs.readFileSync(zipPath),
      fileName: zipName,
      mimetype: 'application/zip',
      caption
    })
    console.log('[BACKUP] ZIP terkirim ke DM main owner:', ownerJid)
  } catch (e: any) {
    console.error('[BACKUP] Gagal kirim ke main owner DM:', e.message)
  }
}

export default {
  command: ['backup', 'backupbot'],
  owner:   true,
  noLimit: true,
  tags:    ['owner'],
  help:    ['backup'],

  handler: async (m: any, { Morela, fkontak }: any) => {
    const startTime = Date.now()
    const hasTg = !!(getTgToken() && getTgChatId())

    try {
      const zipName  = generateZipName()
      const ZIP_PATH = path.join(ROOT_DIR, zipName)

      await Morela.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

      
      const output  = fs.createWriteStream(ZIP_PATH)
      const archive = archiver('zip', { zlib: { level: 9 } })

      output.on('error',  (err: Error) => { throw new Error(`Output error: ${err.message}`) })
      archive.on('error', (err: Error) => { throw new Error(`Archive error: ${err.message}`) })

      archive.pipe(output)
      archive.glob('**/*', {
        cwd: ROOT_DIR,
        ignore: [
          '**/node_modules/**', '**/.git/**', '**/*.zip',
          '**/session/**', '**/sessions/**',
          '**/tmp/**', '**/temp/**',
          '**/.npm/**', '**/.pm2/**', '**/.config/**',
          '**/.cache/**', '**/node/**', '**/logs/**',
          '**/package-lock.json'
        ]
      })

      await archive.finalize()
      await new Promise((resolve, reject) => {
        output.on('close', resolve)
        output.on('error', reject)
      })

      await Morela.sendMessage(m.chat, { react: { text: '🗜️', key: m.key } })

      const stats      = fs.statSync(ZIP_PATH)
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2)
      const duration   = ((Date.now() - startTime) / 1000).toFixed(2)

      
      if (hasTg) {
        await Morela.sendMessage(m.chat, { react: { text: '📤', key: m.key } })
        const ok = await sendZipToTelegram(ZIP_PATH, zipName, fileSizeMB, duration)

        if (ok) {
          
          await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
          await Morela.sendMessage(m.chat, {
            text:
              `╭──「 ✅ *Backup Bot ${botName}* 」\n` +
              `│\n` +
              `│  💾 Size  » *${fileSizeMB} MB*\n` +
              `│  ⏱️ Waktu » *${duration}s*\n` +
              `│\n` +
              `│  ✅ _Berhasil dikirim ke Telegram!_\n` +
              `│\n` +
              `╰─────────────────────\n` +
              `꒰ © ${botName} ꒱`
          }, { quoted: fkontak || m })

        } else {
          
          await sendZipToMainOwnerDM(Morela, ZIP_PATH, zipName, fileSizeMB, duration)
          await Morela.sendMessage(m.chat, { react: { text: '⚠️', key: m.key } })
          await Morela.sendMessage(m.chat, {
            text:
              `⚠️ *Telegram gagal!*\n\n` +
              `File backup sudah dikirim ke *DM main owner* agar tetap aman.\n\n` +
              `꒰ © ${botName} ꒱`
          }, { quoted: fkontak || m })
        }

      } else {
        
        await sendZipToMainOwnerDM(Morela, ZIP_PATH, zipName, fileSizeMB, duration)
        await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
        await Morela.sendMessage(m.chat, {
          text:
            `✅ *Backup Selesai!*\n\n` +
            `💾 *${fileSizeMB} MB* — ⏱️ *${duration}s*\n\n` +
            `📨 File dikirim ke *DM main owner*.\n\n` +
            `💡 *Tip:* Backup bisa dikirim ke Telegram!\n` +
            `Setup dengan: *.tgbot token* & *.tgbot id*\n\n` +
            `꒰ © ${botName} ꒱`
        }, { quoted: fkontak || m })
      }

      
      try { fs.unlinkSync(ZIP_PATH) } catch {}

    } catch (err) {
      console.error('[BACKUP ERROR]', err)
      await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      await Morela.sendMessage(m.chat, {
        text: `❌ *Backup Gagal!*\n\n${(err as Error).message}\n\n꒰ © ${botName} ꒱`
      }, { quoted: fkontak || m })
    }
  }
}