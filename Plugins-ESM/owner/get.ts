import axios from 'axios'
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


async function sendCodeViewer(
  Morela: any,
  chatId: string,
  quoted: any,
  {
    code,
    lang = 'json',
  }: { code: string; lang?: string }
) {
  const codeBlocks = tokenizeCode(code)

  const content = {
    botForwardedMessage: {
      message: {
        richResponseMessage: {
          messageType: 1,
          submessages: [
            {
              messageType: 2,
              messageText: 'json', 
            },
            {
              messageType: 5,
              title: 'json', 
              codeMetadata: {
                codeLanguage: lang,
                codeBlocks,
              },
            },
          ],
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedAiBotMessageInfo: {
              botJid: '867051314767696@bot',
            },
            forwardOrigin: 4,
          },
        },
      },
    },
  }

  return Morela.relayMessage(chatId, content, {})
}

const handler = async (m: any, { Morela, text, command, usedPrefix, reply, fkontak }: any) => {
  if (!text || !text.match(/^https?:\/\//i)) {
    return reply(
      `╭╌╌⬡「 🌐 *ɢᴇᴛ / ꜰᴇᴛᴄʜ* 」\n` +
      `┃\n` +
      `┃ ◦ Contoh : \`${usedPrefix + command} https://api.github.com\`\n` +
      `┃\n` +
      `╰╌╌⬡\n\n© ${botName}`
    )
  }

  await Morela.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

  try {
    const res = await axios.get(text, {
      responseType: 'arraybuffer',
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      }
    })

    const contentType = String(res.headers['content-type'] || 'application/octet-stream')
    const buffer      = Buffer.from(res.data)

    
    if (contentType.startsWith('image/')) {
      await Morela.sendMessage(m.chat, { image: buffer, caption: `🌐 ${text}` }, { quoted: fkontak || m })
      return await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
    }
    if (contentType.startsWith('video/')) {
      await Morela.sendMessage(m.chat, { video: buffer, caption: `🌐 ${text}` }, { quoted: fkontak || m })
      return await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
    }
    if (contentType.startsWith('audio/')) {
      await Morela.sendMessage(m.chat, { audio: buffer, mimetype: contentType }, { quoted: fkontak || m })
      return await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
    }

    
    if (contentType.includes('json') || contentType.includes('text')) {
      let body = buffer.toString('utf-8')
      let isJson = false

      try {
        body = JSON.stringify(JSON.parse(body), null, 2)
        isJson = true
      } catch { }

      if (body.length > 50000) body = body.substring(0, 50000) + '\n\n...(terpotong)'

      await sendCodeViewer(Morela, m.chat, fkontak || m, {
        code: body,
        lang: isJson ? 'json' : 'plaintext'
      })

      return await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
    }

    
    const ext = contentType.split('/')[1]?.split(';')[0] || 'bin'
    await Morela.sendMessage(m.chat, {
      document: buffer,
      mimetype: contentType,
      fileName: `morela-get.${ext}`,
    }, { quoted: fkontak || m })

    await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

  } catch (e: any) {
    console.error('[GET ERROR]:', e.message)
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    reply(`╭╌╌⬡「 ❌ *ɢᴀɢᴀʟ ꜰᴇᴛᴄʜ* 」\n┃\n┃ \`\`\`${e.message.substring(0, 400)}\`\`\`\n╰╌╌⬡\n\n© ${botName}`)
  }
}

handler.help    = ['get <url>']
handler.tags    = ['tools']
handler.command = ['get', 'fetch']
handler.owner   = true
handler.noLimit = true

export default handler