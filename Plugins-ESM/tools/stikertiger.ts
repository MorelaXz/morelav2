// @ts-nocheck


import fs     from 'fs'
import * as crypto from 'crypto'
import path   from 'path'
import { fileURLToPath } from 'url'
import { handlePluginCommand } from '../_pluginmanager.js'
import { isMainOwner } from '../../System/mainowner.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url as string))
const DB_PATH   = path.join(__dirname, '../../data/sticker_cmd.json')

let _dbCache     = null
let _dbCacheTime = 0
const DB_TTL     = 10_000 

function loadDB() {
  const now = Date.now()
  if (_dbCache && now - _dbCacheTime < DB_TTL) return _dbCache
  try {
    if (fs.existsSync(DB_PATH)) {
      _dbCache     = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'))
      _dbCacheTime = now
      return _dbCache
    }
  } catch {}
  _dbCache = {}
  return _dbCache
}

export function invalidateStickerCmdCache() {
  _dbCache     = null
  _dbCacheTime = 0
}

const handler = async (m: any, { Morela, isPrem, isAdmin, botAdmin, downloadContentFromMessage }: any) => {
  try {
    
    if (m.mtype !== 'stickerMessage') return

    const _senderNum = (m.sender || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '')
    if (!isMainOwner(_senderNum)) return

    let sha256hex
    try {
      const stream = await downloadContentFromMessage(m.msg || m.message?.stickerMessage, 'sticker')
      const chunks = []
      for await (const chunk of stream) chunks.push(chunk)
      const buffer = Buffer.concat(chunks)
      if (!buffer.length) return
      sha256hex = crypto.createHash('sha256').update(buffer).digest('hex')
    } catch {
      return 
    }

    const db  = loadDB()
    const cmd = db[sha256hex]

    if (!cmd) return

    console.log(`[STICKER-TRIGGER] hash=${sha256hex.slice(0,12)}... → cmd="${cmd}"`)

    const parts   = cmd.trim().split(/\s+/)
    const command = parts[0].toLowerCase()
    const args    = parts.slice(1)
    const text    = args.join(' ')

    m._stikerHandled = true

    let fkontak = m
    try {
      const { buildFkontak: _bfk } = await import('../../Library/utils.js')
      fkontak = await _bfk(Morela)
    } catch {}

    await handlePluginCommand(m, command, {
      Morela,
      text,
      args,
      isOwn: true,  
      isPrem,
      isAdmin,
      botAdmin,
      reply:     (teks) => Morela.sendMessage(m.chat, { text: teks }, { quoted: fkontak }),
      command,
      senderJid: m.sender,
      usedPrefix: '.',
      fkontak,
      downloadContentFromMessage
    })

  } catch (e) {
    
    console.error('[STICKER-TRIGGER] error:', (e as Error).message)
  }
}

handler.tags = ['tools']

export default handler