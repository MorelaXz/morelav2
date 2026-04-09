// @ts-nocheck
import pluginManager from '../_pluginmanager.js'
import { botName } from '../../Library/utils.js'


const TS_KEYWORDS = new Set([
  'import','export','from','default','const','let','var','function','async',
  'await','return','if','else','try','catch','throw','new','class','extends',
  'typeof','instanceof','true','false','null','undefined','void','type',
  'interface','enum','for','of','in','while','break','continue','switch',
  'case','delete','this','super','static','public','private','protected',
  'readonly','abstract','implements','as','declare','namespace','module',
])

function tokenizeCode(code: string): { highlightType: number; codeContent: string }[] {
  const blocks: { highlightType: number; codeContent: string }[] = []
  const tokens = code.match(/\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|[a-zA-Z_$][a-zA-Z0-9_$]*|[\s\S]/g) || []

  for (const tok of tokens) {
    if (tok.startsWith('//') || tok.startsWith('/*')) {
      blocks.push({ highlightType: 2, codeContent: tok })
    } else if (/^["'`]/.test(tok)) {
      blocks.push({ highlightType: 3, codeContent: tok })
    } else if (TS_KEYWORDS.has(tok)) {
      blocks.push({ highlightType: 1, codeContent: tok })
    } else if (/^\d+$/.test(tok)) {
      blocks.push({ highlightType: 4, codeContent: tok })
    } else {
      blocks.push({ highlightType: 0, codeContent: tok })
    }
  }

  const merged: { highlightType: number; codeContent: string }[] = []
  for (const b of blocks) {
    if (merged.length && merged[merged.length - 1].highlightType === b.highlightType) {
      merged[merged.length - 1].codeContent += b.codeContent
    } else {
      merged.push({ ...b })
    }
  }
  return merged
}


const handler = async (m: any, { args, Morela, reply, fkontak }: any) => {

  const send = (text: string) =>
    Morela.sendMessage(m.chat, { text }, { quoted: fkontak || m })

  const { isMainOwner: _isMO }    = await import('../../System/mainowner.js')
  const { getPhoneByLid: _getPBL } = await import('../../Database/db.js')
  const _rawSnd = (m.sender || '')
  let _sndNum = _rawSnd.split('@')[0].split(':')[0].replace(/[^0-9]/g, '')
  if (_rawSnd.endsWith('@lid')) {
    const _res = _getPBL(_sndNum)
    if (_res) _sndNum = _res.replace(/[^0-9]/g, '')
  }
  if (!_isMO(_sndNum)) return send('❌ Fitur ini hanya untuk Main Owner!')

  if (!args[0]) {
    return send(
`╭──「 📄 *Plugin Viewer* 」
│
│  ❌ Format salah!
│
│  📌 *Format:*
│  .getplugin <nama-plugin>
│
│  📌 *Contoh:*
│  .getplugin menu
│  .getplugin ping
│  .getplugin ocr
│
╰─────────────────────
_Nama file tanpa .ts_
© ${botName}`
    )
  }

  const pluginName = args[0].toLowerCase()

  if (!/^[a-zA-Z0-9_-]+$/.test(pluginName)) {
    return send(`❌ Nama plugin tidak valid!\nHanya boleh huruf, angka, - dan _`)
  }

  await Morela.sendMessage(m.chat, { react: { text: '🔍', key: m.key } })

  try {
    const pluginData   = pluginManager.getPlugin(pluginName)
    const passiveMatch = !pluginData
      ? pluginManager.getPassiveHandlers().find((h: any) =>
          h.file.replace(/^.*\//, '').replace('.ts', '') === pluginName
        )
      : null

    const resolvedFile = pluginData?.file || passiveMatch?.file || null
    const parts        = resolvedFile ? resolvedFile.split('/') : []
    const folder       = parts.length > 1 ? parts[0] : 'root'
    const filePath     = resolvedFile || `${pluginName}.ts`
    const fileName     = `${pluginName}.ts`

    const code   = pluginManager.getPluginCode(resolvedFile || pluginName)
    const lines  = code.split('\n').length
    const chars  = code.length
    const sizeKB = (chars / 1024).toFixed(2)

    const content = {
      botForwardedMessage: {
        message: {
          richResponseMessage: {
            messageType: 1,
            submessages: [
              {
                messageType: 2,
                messageText: `📄 *ᴘʟᴜɢɪɴ ᴄᴏᴅᴇ ᴠɪᴇᴡᴇʀ* — ${botName}`
              },
              {
                messageType: 4,
                tableMetadata: {
                  title: "Plugin Info",
                  rows: [
                    { items: ["Field", "Value"], isHeading: true },
                    { items: ["📁 Path",   filePath] },
                    { items: ["📂 Folder", folder] },
                    { items: ["📝 Nama",   fileName] },
                    { items: ["📊 Lines",  String(lines)] },
                    { items: ["💾 Size",   `${sizeKB} KB`] },
                    { items: ["📦 Chars",  String(chars)] },
                    { items: ["🔧 Status", "LOADED ✅"] },
                  ]
                }
              },
              {
                messageType: 5,
                codeMetadata: {
                  codeLanguage: "typescript",
                  codeBlocks: tokenizeCode(code)
                }
              }
            ],
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

    await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
    return Morela.relayMessage(m.chat, content, {})

  } catch (e: any) {
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    return send(
`╭──「 ❌ *Plugin Tidak Ditemukan* 」
│
│  📝 Plugin » *${pluginName}*
│  ⚠️ Error  » ${e?.message || 'Unknown'}
│
╰─────────────────────
_Gunakan .listplugin untuk melihat daftar plugin_
© ${botName}`
    )
  }
}

handler.command   = ['getplugin', 'viewplugin', 'showplugin']
handler.mainOwner = true
handler.tags      = ['owner']
handler.help      = ['getplugin <nama>']

export default handler
