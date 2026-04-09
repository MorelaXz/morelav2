// @ts-nocheck
import pluginManager from '../_pluginmanager.js'
import { botName } from '../../Library/utils.js'

const handler = async (m: any, { args, Morela, fkontak }: any) => {

  const send = async text => Morela.sendMessage(m.chat, { text }, { quoted: fkontak || m })

  
  const { isMainOwner: _isMO } = await import('../../System/mainowner.js')
  const { getPhoneByLid: _getPBL } = await import('../../Database/db.js')
  const _rawSnd = (m.sender || '')
  let _sndNum = _rawSnd.split('@')[0].split(':')[0].replace(/[^0-9]/g, '')
  if (_rawSnd.endsWith('@lid')) {
    const _res = _getPBL(_sndNum)
    if (_res) _sndNum = _res.replace(/[^0-9]/g, '')
  }
  if (!_isMO(_sndNum)) return send('❌ Fitur ini hanya untuk Main Owner!')
  

  try {
    const plugins = pluginManager.listPlugins()
    if (!plugins.length) return send(`❌ Tidak ada plugin yang terload\n\n© ${botName}`)

    const search   = args[0]?.toLowerCase()
    let   filtered = plugins

    if (search) {
      filtered = plugins.filter((p: any) => {
        const file = p.file.toLowerCase()
        return file.includes(search) ||
          p.tags?.some((t: any) => t.toLowerCase().includes(search)) ||
          p.commands?.some((c: any) => c.toLowerCase().includes(search))
      })
      if (!filtered.length) return send(
        `❌ Tidak ditemukan: *${search}*\nKetik .listplugin untuk lihat semua\n\n© ${botName}`
      )
    }

    
    const groups: Record<string, any[]> = {}
    for (const p of filtered) {
      const parts  = p.file.replace(/\\/g, '/').split('/')
      const folder = parts.length > 1 ? parts[0] : 'other'
      if (!groups[folder]) groups[folder] = []
      groups[folder].push(p)
    }

    const folderEmoji: Record<string, string> = {
      ai: '🤖', downloader: '📥', sticker: '✨',
      maker: '🎨', ephoto: '🖼️', tools: '🛠️',
      games: '🎮', game: '🎮', admin: '🔰',
      owner: '👑', info: 'ℹ️', system: '⚙️',
      other: '📦'
    }

    
    let totalCmd     = 0
    let totalPassive = 0
    for (const folder of Object.keys(groups)) {
      totalCmd     += groups[folder].filter((p: any) => p.type === 'command').length
      totalPassive += groups[folder].filter((p: any) => p.type === 'passive').length
    }

    
    const tableRows: any[] = [
      { items: ['Folder', 'Plugin', 'Type'], isHeading: true }
    ]

    const sortedFolders = Object.keys(groups).sort()
    for (const folder of sortedFolders) {
      const list  = groups[folder]
      const emoji = folderEmoji[folder.toLowerCase()] || '📁'

      const cmdList = list.filter((p: any) => p.type === 'command').sort((a, b) => a.file.localeCompare(b.file))
      const pasList = list.filter((p: any) => p.type === 'passive')

      for (const p of cmdList) {
        const name = p.file.split('/').pop().replace('.ts', '')
        tableRows.push({ items: [`${emoji} ${folder}`, name, '⚡ cmd'] })
      }
      for (const p of pasList) {
        const name = p.file.split('/').pop().replace('.ts', '')
        tableRows.push({ items: [`${emoji} ${folder}`, name, '🔄 auto'] })
      }
    }

    
    tableRows.push({ items: ['📊 Command', String(totalCmd), ''] })
    tableRows.push({ items: ['📊 Passive', String(totalPassive), ''] })
    tableRows.push({ items: ['📊 Total', String(totalCmd + totalPassive), ''] })

    
    const submessages: any[] = [
      
      {
        messageType: 2,
        messageText: `📦 *ᴘʟᴜɢɪɴ ʟɪꜱᴛ* — ${botName}${search ? `\n🔍 Filter: ${search}` : ''}`
      },
      
      {
        messageType: 4,
        tableMetadata: {
          title: `Plugin List${search ? ` · ${search}` : ''}`,
          rows: tableRows
        }
      }
    ]

    const content = {
      botForwardedMessage: {
        message: {
          richResponseMessage: {
            messageType: 1,
            submessages,
            contextInfo: {
              forwardingScore: 1,
              isForwarded: true,
              forwardedAiBotMessageInfo: { botJid: '867051314767696@bot' },
              forwardOrigin: 4,
            }
          }
        }
      }
    }

    return Morela.relayMessage(m.chat, content, {})

  } catch (e) {
    return send(`❌ *Error:* ${(e as Error).message}\n\n© ${botName}`)
  }
}

handler.command   = ['listplugin', 'listplug', 'plugins', 'pluginlist']
handler.mainOwner = true
handler.tags      = ['owner']
handler.help      = ['listplugin [search]']
handler.noLimit   = true

export default handler