// @ts-nocheck


import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pluginManager from '../_pluginmanager.js'
import { botName } from '../../Library/utils.js'

const __dirname   = path.dirname(fileURLToPath(import.meta.url as string))
const PLUGINS_DIR = path.resolve(__dirname, '..')

const TAG_TO_FOLDER = {
  admin:      'admin',
  ai:         'ai',
  downloader: 'downloader',
  download:   'downloader',
  games:      'games',
  game:       'games',
  info:       'info',
  maker:      'maker',
  owner:      'owner',
  sticker:    'sticker',
  tools:      'tools',
  tool:       'tools',
  main:       'info',
}


function extractCodeInfo(code: unknown) {
  
  const fileComment = code.match(/\/\/\s*(?:Plugins-ESM\/)?([a-zA-Z0-9_\-]+\/[a-zA-Z0-9_\-]+)\.(mjs|ts)/i)
  if (fileComment) {
    const parts = fileComment[1].split('/')
    return { folder: parts[0].toLowerCase(), filename: parts[1].toLowerCase() }
  }

  
  let folder = null
  const tagsMatch = code.match(/handler\.tags\s*=\s*\[([^\]]+)\]/)
  if (tagsMatch) {
    const tags = tagsMatch[1].replace(/['"]/g, '').split(',').map((t: unknown) => t.trim().toLowerCase())
    for (const tag of tags) {
      if (TAG_TO_FOLDER[tag]) { folder = TAG_TO_FOLDER[tag]; break }
    }
  }

  
  let filename = null
  const cmdMatch = code.match(/handler\.command\s*=\s*\[([^\]]+)\]/)
  if (cmdMatch) {
    const first = cmdMatch[1].replace(/['"]/g, '').split(',')[0].trim()
    if (first) filename = first.toLowerCase().replace(/[^a-z0-9_\-]/g, '')
  }

  return { folder, filename }
}


const handler = async (m: any, { Morela, reply, text, fkontak }: any) => {

  const send = (txt) => Morela.sendMessage(m.chat, { text: txt }, { quoted: fkontak || m })

  
  const { isMainOwner: _isMO } = await import('../../System/mainowner.js')
  const { getPhoneByLid: _getPBL } = await import('../../Database/db.js')
  const _rawSnd = (m.sender || '')
  let _sndNum = _rawSnd.split('@')[0].split(':')[0].replace(/[^0-9]/g, '')
  if (_rawSnd.endsWith('@lid')) {
    const _res = _getPBL(_sndNum)
    if (_res) _sndNum = _res.replace(/[^0-9]/g, '')
  }
  if (!_isMO(_sndNum)) return send('❌ Fitur ini hanya untuk Main Owner!')
  

  const quoted = m.quoted
  if (!quoted) {
    return reply(
      `╭──「 💾 *Save Plugin* 」\n` +
      `│\n` +
      `│  Reply kode plugin dengan perintah ini.\n` +
      `│\n` +
      `│  📌 *Auto path:*\n` +
      `│  \`.sp\` → deteksi folder & nama otomatis\n` +
      `│\n` +
      `│  📌 *Manual path:*\n` +
      `│  \`.sp owner/namafile\`\n` +
      `│\n` +
      `│  ✅ File sama → timpa (update)\n` +
      `│  ✅ File baru → save otomatis\n` +
      `│\n` +
      `╰─────────────────────`
    )
  }

  const code = (
    quoted.text ||
    quoted.body ||
    quoted.msg?.text ||
    quoted.msg?.caption ||
    ''
  ).trim()

  if (!code || code.length < 20) {
    return reply(`❌ Kode terlalu pendek atau kosong.\n\nPastikan reply pesan yang berisi kode plugin.`)
  }

  await Morela.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

  
  let targetFolder   = null
  let targetFilename = null

  
  if (text && text.trim()) {
    const manual = text.trim().replace('.ts', '')
    if (manual.includes('/')) {
      const parts    = manual.split('/')
      targetFolder   = parts[0].toLowerCase()
      targetFilename = parts[1].toLowerCase()
    } else {
      targetFilename = manual.toLowerCase()
    }
  }

  
  if (!targetFolder || !targetFilename) {
    const detected = extractCodeInfo(code)
    if (!targetFolder)   targetFolder   = detected.folder
    if (!targetFilename) targetFilename = detected.filename
  }

  
  if (!targetFolder) {
    return reply(
      `❌ *Tidak bisa deteksi folder!*\n\n` +
      `Pastikan kode punya \`handler.tags = ['owner']\`\n\n` +
      `Atau manual: \`.sp owner/namafile\``
    )
  }

  if (!targetFilename) {
    return reply(
      `❌ *Tidak bisa deteksi nama file!*\n\n` +
      `Pastikan kode punya \`handler.command = ['nama']\`\n\n` +
      `Atau manual: \`.sp ${targetFolder}/namafile\``
    )
  }

  const targetRelPath = `${targetFolder}/${targetFilename}.ts`
  const targetAbsPath = path.join(PLUGINS_DIR, targetRelPath)
  const isUpdate      = fs.existsSync(targetAbsPath)

  
  fs.mkdirSync(path.dirname(targetAbsPath), { recursive: true })

  
  try {
    fs.writeFileSync(targetAbsPath, code, 'utf-8')

    
    const bakPath = targetAbsPath + '.bak'
    if (fs.existsSync(bakPath)) fs.unlinkSync(bakPath)

    
    await pluginManager.reloadPlugin(targetRelPath)

    await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

    return reply(
      `╭──「 💾 *Save Plugin* 」\n` +
      `│\n` +
      `│  ${isUpdate ? '✏️ *Plugin berhasil diupdate!*' : '✅ *Plugin berhasil disimpan!*'}\n` +
      `│\n` +
      `│  📄 File   : \`${targetRelPath}\`\n` +
      `│  📂 Folder : \`Plugins-ESM/${targetFolder}/\`\n` +
      `│  🔄 Status : *Loaded & Ready*\n` +
      `│  📝 Plugin   : *${isUpdate ? 'UPDATE' : 'BARU'}*\n` +
      `│\n` +
      `╰─────────────────────`
    )
  } catch (e) {
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    return reply(`❌ *Gagal menyimpan plugin*\n\nError: \`${(e as Error).message}\``)
  }
}

handler.help        = ['sp', 'saveplugin']
handler.tags        = ['owner']
handler.command     = ['sp', 'saveplugin']
handler.mainOwner   = true
handler.noLimit     = true
handler.description = 'Save/update plugin dari reply kode, auto deteksi path'

export default handler