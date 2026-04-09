// @ts-nocheck
import fs       from 'fs'
import path     from 'path'
import axios    from 'axios'
import FormData from 'form-data'
import archiver from 'archiver'
import { botName } from '../../Library/utils.js'
import { getTgToken, getTgChatId } from '../../Library/tg_global.js'
import { getMainOwner } from '../../System/mainowner.js'
import { getPhoneByLid } from '../../Database/db.js'

const DATA_DIR = path.join(process.cwd(), 'data')

const EXCLUDE = [
  'fkontak_cache.json',
  'lastchat_owner.json',
  'rvo_sent.json',
  'rvo_tg.json',
  'meta-sessions.json',
]

function genZipName() {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
  return `backupdb-${ts}.zip`
}

function fmtSize(bytes: number) {
  if (bytes < 1024)         return `${bytes} B`
  if (bytes < 1024 * 1024)  return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}


function getMainOwnerJid(): string {
  const num = getMainOwner().replace(/[^0-9]/g, '')
  if (!num) return ''
  return num + '@s.whatsapp.net'
}


async function sendToTg(zipBuf: Buffer, zipName: string, caption: string): Promise<boolean> {
  const token  = getTgToken()
  const chatId = getTgChatId()
  if (!token || !chatId) return false
  try {
    const form = new FormData()
    form.append('chat_id', chatId)
    form.append('caption', caption.replace(/[*_`]/g, ''))
    form.append('document', zipBuf, { filename: zipName, contentType: 'application/zip' })
    await axios.post(
      `https://api.telegram.org/bot${token}/sendDocument`,
      form,
      { headers: form.getHeaders(), timeout: 60000 }
    )
    return true
  } catch (e: any) {
    console.error('[BACKUPDB] TG error:', e.message)
    return false
  }
}


async function sendToMainOwnerDM(Morela: any, zipBuf: Buffer, zipName: string, caption: string, reason: string) {
  const ownerJid = getMainOwnerJid()
  if (!ownerJid) {
    console.error('[BACKUPDB] Main owner JID tidak ditemukan!')
    return
  }
  try {
    
    await Morela.sendMessage(ownerJid, {
      document: zipBuf,
      fileName: zipName,
      mimetype: 'application/zip',
      caption:  caption + `\n\n⚠️ _${reason}_`
    })
    console.log('[BACKUPDB] File terkirim ke DM main owner:', ownerJid)
  } catch (e: any) {
    console.error('[BACKUPDB] Gagal kirim ke main owner DM:', e.message)
  }
}

const handler = async (m: any, { Morela, reply, fkontak }: any) => {
  const start = Date.now()

  let files: string[]
  try {
    files = fs.readdirSync(DATA_DIR)
      .filter(f => f.endsWith('.json') && !EXCLUDE.includes(f))
  } catch (e: any) {
    return reply(`❌ Gagal baca folder data/\n${e.message}`)
  }

  if (!files.length) return reply(`❌ Tidak ada file JSON di data/`)

  await Morela.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })
  await reply(
    `⏳ *Membuat backup database...*\n\n` +
    `📁 *File yang dibackup (${files.length}):*\n` +
    files.map(f => `┃ 📄 ${f}`).join('\n') +
    `\n\n꒰ © ${botName} ꒱`
  )

  const zipName = genZipName()

  try {
    
    const zipBuf: Buffer = await new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      const archive = archiver('zip', { zlib: { level: 9 } })
      archive.on('data',  (chunk: Buffer) => chunks.push(chunk))
      archive.on('end',   () => resolve(Buffer.concat(chunks)))
      archive.on('error', reject)

      for (const f of files) {
        archive.file(path.join(DATA_DIR, f), { name: f })
      }

      
      const sewaPath = path.join(DATA_DIR, 'sewagrub.json')
      if (fs.existsSync(sewaPath) && !files.includes('sewagrub.json')) {
        archive.file(sewaPath, { name: 'sewagrub.json' })
      }

      archive.finalize()
    })

    const size     = fmtSize(zipBuf.length)
    const duration = ((Date.now() - start) / 1000).toFixed(1)
    const hasTg    = !!(getTgToken() && getTgChatId())

    const caption =
      `╭──「 ✅ *Backup DB ${botName}* 」\n` +
      `│\n` +
      `│  📦 File   » ${zipName}\n` +
      `│  📁 Total  » ${files.length} file JSON\n` +
      `│  💾 Size   » ${size}\n` +
      `│  ⏱️ Waktu  » ${duration}s\n` +
      `│\n` +
      `│  Restore: extract zip → taruh ke folder data/\n` +
      `│  lalu restart bot.\n` +
      `│\n` +
      `╰─────────────────────\n` +
      `꒰ © ${botName} ꒱`

    
    if (hasTg) {
      await Morela.sendMessage(m.chat, { react: { text: '📤', key: m.key } })
      const tgOk = await sendToTg(zipBuf, zipName, caption)

      if (tgOk) {
        
        await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
        await Morela.sendMessage(m.chat, {
          text:
            `╭──「 ✅ *Backup DB Berhasil* 」\n` +
            `│\n` +
            `│  📁 Total  » *${files.length} file JSON*\n` +
            `│  💾 Size   » *${size}*\n` +
            `│  ⏱️ Waktu  » *${duration}s*\n` +
            `│\n` +
            `│  ✅ _Terkirim ke Telegram!_\n` +
            `│\n` +
            `╰─────────────────────\n` +
            `꒰ © ${botName} ꒱`
        }, { quoted: fkontak || m })
        return
      }

      
      console.warn('[BACKUPDB] TG gagal, fallback ke DM main owner')
      await sendToMainOwnerDM(
        Morela, zipBuf, zipName, caption,
        'Telegram gagal — file dikirim ke DM kamu'
      )
      await Morela.sendMessage(m.chat, { react: { text: '⚠️', key: m.key } })
      await Morela.sendMessage(m.chat, {
        text:
          `⚠️ *Telegram gagal!*\n\n` +
          `File backup sudah dikirim ke *DM main owner* agar tetap aman.\n\n` +
          `꒰ © ${botName} ꒱`
      }, { quoted: fkontak || m })
      return
    }

    
    await sendToMainOwnerDM(
      Morela, zipBuf, zipName, caption,
      'TG belum disetup — setup: .tgbot token & .tgbot id'
    )
    await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
    await Morela.sendMessage(m.chat, {
      text:
        `✅ *Backup DB Selesai!*\n\n` +
        `📁 *${files.length} file JSON* — *${size}* — *${duration}s*\n\n` +
        `📨 File dikirim ke *DM main owner*.\n\n` +
        `💡 Setup Telegram agar lebih aman:\n` +
        `*.tgbot token* & *.tgbot id*\n\n` +
        `꒰ © ${botName} ꒱`
    }, { quoted: fkontak || m })

  } catch (e: any) {
    console.error('[BACKUPDB]', e)
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    await reply(`❌ *Backup DB Gagal!*\n\n${e.message}\n\n꒰ © ${botName} ꒱`)
  }
}

handler.command  = ['backupdb', 'dbbackup', 'backupdata']
handler.tags     = ['owner']
handler.help     = ['backupdb']
handler.noLimit  = true
handler.owner    = true
handler.premium  = false
handler.group    = false
handler.private  = false
handler.admin    = false
handler.botAdmin = false

export default handler