// @ts-nocheck
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { bi, sendCard, imagePath, botName, botVersion, CHANNEL_URL, OWNER_WA } from '../../Library/utils.js'
import { clearAllLimits, cancelPendingWrite } from '../../Database/usagelimit.js'
import { clearDBCache, cancelPendingWrites } from '../../Database/db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url as string))
const DATA_DIR  = path.join(__dirname, '../../data')


const PROTECTED = new Set(['Own.json', 'Prem.json', 'mainowner.json', 'SewaGrub.json'])

const handler = async (m: any, { Morela, reply, fkontak }: any) => {
  const send = (text) => Morela.sendMessage(m.chat, { text }, { quoted: fkontak || m })

  
  const { isMainOwner: _isMO } = await import('../../System/mainowner.js')
  const { getPhoneByLid: _getPBL } = await import('../../Database/db.js')
  const _rawSnd = (m.sender || '')
  let _sndNum = _rawSnd.split('@')[0].split(':')[0].replace(/[^0-9]/g, '')
  if (_rawSnd.endsWith('@lid')) {
    const _res = _getPBL(_sndNum)
    if (_res) _sndNum = _res.replace(/[^0-9]/g, '')
  }
  if (!_isMO(_sndNum)) return send('❌ Fitur ini hanya untuk Main Owner!')
  

  
  
  try { cancelPendingWrites() } catch {}
  try { cancelPendingWrite()  } catch {}

  
  let allJsonFiles: string[] = []
  try {
    allJsonFiles = fs.readdirSync(DATA_DIR)
      .filter(f => f.endsWith('.json') && !PROTECTED.has(f))
      .sort()
  } catch (e) {
    return reply(`❌ Gagal membaca direktori data:\n${(e as Error).message}`)
  }

  const results: { file: string; ok: boolean; err?: string }[] = []
  let sukses = 0, gagal = 0

  
  for (const file of allJsonFiles) {
    const filePath = path.join(DATA_DIR, file)
    try {
      fs.writeFileSync(filePath, '{}', 'utf-8')
      results.push({ file, ok: true })
      sukses++
    } catch (e) {
      results.push({ file, ok: false, err: (e as Error).message })
      gagal++
    }
  }

  
  try { clearAllLimits() } catch {}
  try { clearDBCache()   } catch {}

  
  let txt = `*╔══〔 🧹 ʀᴇꜱᴇᴛ ᴅᴀᴛᴀʙᴀꜱᴇ 〕══╗*\n\n`

  txt += `*📂 ꜰɪʟᴇ ᴅɪʀᴇꜱᴇᴛ (${sukses + gagal} ꜰɪʟᴇ):*\n`
  results.forEach((r, i) => {
    const num  = String(i + 1).padStart(2, '0')
    const icon = r.ok ? '✅' : '❌'
    txt += `◦❒ ${bi(num)}. ${icon} ${bi(r.file)}${!r.ok ? `\n        ↳ ${r.err}` : ''}\n`
  })

  txt += `\n*🔒 ᴅɪᴊᴀɢᴀ (ᴛɪᴅᴀᴋ ᴅɪᴜʙᴀʜ):*\n`
  ;[...PROTECTED].forEach((f, i) => {
    txt += `◦❒ ${bi(String(i + 1).padStart(2, '0'))}. 🔒 ${bi(f)}\n`
  })

  txt += `\n*╔══〔 📊 ʀᴇᴋᴀᴘ 〕══╗*\n`
  txt += `◦❒ ꜱᴜᴋꜱᴇꜱ : ${bi(String(sukses))} ꜰɪʟᴇ\n`
  txt += `◦❒ ɢᴀɢᴀʟ   : ${bi(String(gagal))} ꜰɪʟᴇ\n`
  txt += `*╚══════════════════╝*\n\n`
  txt += `✅ _Cache RAM sudah otomatis di-clear. Tidak perlu restart bot!_`

  
  
  
  
  
  
  
  
  
  const imgBuf = fs.existsSync(imagePath) ? fs.readFileSync(imagePath) : null
  const quoted = fkontak || m

  try {
    if (imgBuf) {
      
      await sendCard(Morela, m.chat, txt, imgBuf, quoted)
    } else {
      
      await Morela.sendMessage(m.chat, {
        text: ' ',
        footer: txt,
        interactiveButtons: [{
          name: 'cta_url',
          buttonParamsJson: JSON.stringify({
            display_text: 'Chat Owner',
            url:          OWNER_WA,
            merchant_url: OWNER_WA
          })
        }],
        hasMediaAttachment: false
      }, { quoted })
    }
  } catch {
    
    reply(
      `🧹 *RESET DATABASE SELESAI*\n` +
      `━━━━━━━━━━━━━━━\n` +
      results.map(r => r.ok ? `✅ ${r.file}` : `❌ ${r.file} — ${r.err}`).join('\n') +
      `\n━━━━━━━━━━━━━━━\n` +
      `📊 Sukses: ${sukses} | Gagal: ${gagal}\n\n` +
      `🔒 Dijaga: ${[...PROTECTED].join(', ')}\n\n` +
      `✅ Cache RAM sudah otomatis di-clear. Tidak perlu restart!`
    )
  }
}

handler.help    = ['resetdb']
handler.tags    = ['owner']
handler.command = ['resetdb', 'resetcache', 'clrdb']
handler.mainOwner = true
handler.noLimit = true

export default handler