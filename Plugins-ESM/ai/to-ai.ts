import axios, { AxiosError, AxiosResponse } from 'axios'
import { downloadContentFromMessage, proto } from '@itsukichan/baileys'
import type { MsgObj, ExtSocket, HandleData } from '../../types/global.js'
import { botName } from '../../Library/utils.js'

const FAA_BASE  = 'https://api-faa.my.id/faa'
const IMGBB_KEY = 'a0fa1c4b6c7b1570879c6d71b590f4bf'
const MAX_FILE_SIZE = 20 * 1024 * 1024 
const MAX_RETRY     = 3

type SpecialType = 'tobersama' | 'editfoto'

interface CmdInfo {
  emoji:     string
  title:     string
  endpoint:  string
  special?:  SpecialType
}

interface ImgBBResponse {
  data?: {
    url?: string
  }
}

interface FaaApiResponse {
  result_url?: string
  result?:     string
  url?:        string
  imageUrl?:   string
  image?:      string
  data?:       string | { url?: string }
}

interface FkontakKey {
  participant: string
  fromMe:      boolean
  id:          string
  remoteJid:   string
}

interface FkontakObject {
  key:     FkontakKey
  message: proto.IMessage
}

interface PluginCtx extends HandleData {
  fkontak: FkontakObject | MsgObj
}

type ImageMessageNode = proto.Message.IImageMessage & {
  fileLength?: number | Long | null
}


const CMD_INFO: Record<string, CmdInfo> = {
  tofigurav3:   { emoji: '🗿', title: 'ᴛᴏ ꜰɪɢᴜʀᴀ ᴠ3',    endpoint: 'tofigurav3'   },
  tofigurav2:   { emoji: '🗿', title: 'ᴛᴏ ꜰɪɢᴜʀᴀ ᴠ2',    endpoint: 'tofigurav2'   },
  tofigura:     { emoji: '🗿', title: 'ᴛᴏ ꜰɪɢᴜʀᴀ',        endpoint: 'tofigura'     },
  tosad:        { emoji: '😢', title: 'ᴛᴏ sᴀᴅ',           endpoint: 'tosad'        },
  tosatan:      { emoji: '😈', title: 'ᴛᴏ sᴀᴛᴀɴ',         endpoint: 'tosatan'      },
  tosdmtinggi:  { emoji: '📏', title: 'ᴛᴏ sᴅᴍ ᴛɪɴɢɢɪ',    endpoint: 'tosdmtinggi'  },
  toreal:       { emoji: '📷', title: 'ᴛᴏ ʀᴇᴀʟ',          endpoint: 'toreal'       },
  tomoai:       { emoji: '🗿', title: 'ᴛᴏ ᴍᴏᴀɪ',          endpoint: 'tomoai'       },
  tomaya:       { emoji: '🌿', title: 'ᴛᴏ ᴍᴀʏᴀ',          endpoint: 'tomaya'       },
  tolego:       { emoji: '🧱', title: 'ᴛᴏ ʟᴇɢᴏ',          endpoint: 'tolego'       },
  tokamboja:    { emoji: '🌸', title: 'ᴛᴏ ᴋᴀᴍʙᴏᴊᴀ',       endpoint: 'tokamboja'    },
  tokacamata:   { emoji: '🕶️', title: 'ᴛᴏ ᴋᴀᴄᴀᴍᴀᴛᴀ',      endpoint: 'tokacamata'   },
  tojepang:     { emoji: '🇯🇵', title: 'ᴛᴏ ᴊᴇᴘᴀɴɢ',        endpoint: 'tojepang'     },
  toghibli:     { emoji: '🎋', title: 'ᴛᴏ ɢʜɪʙʟɪ',        endpoint: 'toghibli'     },
  todubai:      { emoji: '🏙️', title: 'ᴛᴏ ᴅᴜʙᴀɪ',         endpoint: 'todubai'      },
  todpr:        { emoji: '🏢', title: 'ᴛᴏ ᴅᴘʀ',           endpoint: 'todpr'        },
  tochibi:      { emoji: '🌸', title: 'ᴛᴏ ᴄʜɪʙɪ',         endpoint: 'tochibi'      },
  tobrewok:     { emoji: '🧔', title: 'ᴛᴏ ʙʀᴇᴡᴏᴋ',        endpoint: 'tobrewok'     },
  toblonde:     { emoji: '👱', title: 'ᴛᴏ ʙʟᴏɴᴅᴇ',        endpoint: 'toblonde'     },
  tobotak:      { emoji: '👨‍🦲', title: 'ᴛᴏ ʙᴏᴛᴀᴋ',         endpoint: 'tobotak'      },
  tohijab:      { emoji: '🧕', title: 'ᴛᴏ ʜɪᴊᴀʙ',         endpoint: 'tohijab'      },
  tomekah:      { emoji: '🕌', title: 'ᴛᴏ ᴍᴇᴋᴀʜ',         endpoint: 'tomekah'      },
  tomirror:     { emoji: '🪞', title: 'ᴛᴏ ᴍɪʀʀᴏʀ',        endpoint: 'tomirror'     },
  tovintage:    { emoji: '📽️', title: 'ᴛᴏ ᴠɪɴᴛᴀɢᴇ',       endpoint: 'tovintage'    },
  tomaid:       { emoji: '👩‍🍳', title: 'ᴛᴏ ᴍᴀɪᴅ',          endpoint: 'tomaid'       },
  tomangu:      { emoji: '😶', title: 'ᴛᴏ ᴍᴀɴɢᴜ',         endpoint: 'tomangu'      },
  topeci:       { emoji: '🕌', title: 'ᴛᴏ ᴘᴇᴄɪ',          endpoint: 'topeci'       },
  topiramida:   { emoji: '🔺', title: 'ᴛᴏ ᴘɪʀᴀᴍɪᴅᴀ',      endpoint: 'topiramida'   },
  topolaroid:   { emoji: '📸', title: 'ᴛᴏ ᴘᴏʟᴀʀᴏɪᴅ',      endpoint: 'topolaroid'   },
  topunk:       { emoji: '🤘', title: 'ᴛᴏ ᴘᴜɴᴋ',          endpoint: 'topunk'       },
  toroh:        { emoji: '🔴', title: 'ᴛᴏ ʀᴏʜ',           endpoint: 'toroh'        },
  tostreetwear: { emoji: '🧥', title: 'ᴛᴏ sᴛʀᴇᴇᴛᴡᴇᴀʀ',    endpoint: 'tostreetwear' },
  totato:       { emoji: '🥔', title: 'ᴛᴏ ᴛᴀᴛᴏ',          endpoint: 'totato'       },
  totrain:      { emoji: '🚂', title: 'ᴛᴏ ᴛʀᴀɪɴ',         endpoint: 'totrain'      },
  totua:        { emoji: '👴', title: 'ᴛᴏ ᴛᴜᴀ',           endpoint: 'totua'        },
  toturky:      { emoji: '🦃', title: 'ᴛᴏ ᴛᴜʀᴋʏ',         endpoint: 'toturky'      },
  toanime:      { emoji: '🎌', title: 'ᴛᴏ ᴀɴɪᴍᴇ',         endpoint: 'toanime'      },
  tomonyet:     { emoji: '🐒', title: 'ᴛᴏ ᴍᴏɴʏᴇᴛ',        endpoint: 'tomonyet'     },
  toroblox:     { emoji: '🎮', title: 'ᴛᴏ ʀᴏʙʟᴏx',        endpoint: 'toroblox'     },
  tobabi:       { emoji: '🐷', title: 'ᴛᴏ ʙᴀʙɪ',          endpoint: 'tobabi'       },
  toputih:      { emoji: '⬜', title: 'ᴛᴏ ᴘᴜᴛɪʜ',         endpoint: 'toputih'      },
  tobersama:    { emoji: '🤝', title: 'ᴛᴏ ʙᴇʀsᴀᴍᴀ',       endpoint: 'tobersama',   special: 'tobersama' },
  putihkan:     { emoji: '⬜', title: 'ᴘᴜᴛɪʜᴋᴀɴ',         endpoint: 'editfoto',    special: 'editfoto'  },
  hitamkan:     { emoji: '⬛', title: 'ʜɪᴛᴀᴍᴋᴀɴ',         endpoint: 'editfoto',    special: 'editfoto'  },
}

async function uploadImage(buffer: Buffer): Promise<string> {
  const base64 = buffer.toString('base64')
  const res = await axios.post<ImgBBResponse>(
    `https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`,
    new URLSearchParams({ image: base64 }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 30_000 }
  )
  const url = res.data?.data?.url
  if (!url) throw new Error('ImgBB: tidak ada URL di response')
  return url
}

function extractResultUrl(data: FaaApiResponse): string | null {
  const candidates: (string | undefined)[] = [
    data.result_url,
    data.result,
    data.url,
    data.imageUrl,
    data.image,
    typeof data.data === 'object' && data.data !== null ? data.data.url : undefined,
    typeof data.data === 'string' ? data.data : undefined,
  ]
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) {
      return c.startsWith('http') ? c : `https://${c}`
    }
  }
  return null
}

function unwrapMessage(msg: proto.IMessage): proto.IMessage {
  let m = msg
  for (let i = 0; i < 10; i++) {
    if (m.ephemeralMessage?.message)           { m = m.ephemeralMessage.message;           continue }
    if (m.viewOnceMessage?.message)            { m = m.viewOnceMessage.message;            continue }
    if (m.viewOnceMessageV2?.message)          { m = m.viewOnceMessageV2.message;          continue }
    if (m.viewOnceMessageV2Extension?.message) { m = m.viewOnceMessageV2Extension.message; continue }
    if (m.documentWithCaptionMessage?.message) { m = m.documentWithCaptionMessage.message; continue }
    break
  }
  return m
}

function pickImageNode(m: MsgObj): ImageMessageNode | null {
  const quoted = m.quoted

  if (quoted?.mtype === 'imageMessage') {
    return quoted as unknown as ImageMessageNode
  }
  if (quoted?.message) {
    const unwrapped = unwrapMessage(quoted.message as proto.IMessage)
    if (unwrapped?.imageMessage) return unwrapped.imageMessage as ImageMessageNode
  }
  if (m.mtype === 'imageMessage') {
    return m as unknown as ImageMessageNode
  }
  if (m.message) {
    const unwrapped = unwrapMessage(m.message as proto.IMessage)
    if (unwrapped?.imageMessage) return unwrapped.imageMessage as ImageMessageNode
  }

  return null
}

function getFileSize(node: ImageMessageNode): number {
  const fl = node.fileLength
  if (fl == null) return 0
  if (typeof fl === 'number') return fl
  
  return typeof (fl as { toNumber?: () => number }).toNumber === 'function'
    ? (fl as { toNumber: () => number }).toNumber()
    : Number(fl)
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const handler = async (m: MsgObj, { Morela, reply, text, usedPrefix, command, fkontak }: PluginCtx): Promise<void> => {
  if (!command) return
  const info = CMD_INFO[command]
  if (!info) return

  const imageNode = pickImageNode(m)
  if (!imageNode) {
    await reply(
      `╭╌╌⬡「 ${info.emoji} *${info.title}* 」\n` +
      `┃\n` +
      `┃ 📸 Kirim atau reply gambar\n` +
      `┃ dengan caption \`${usedPrefix}${command}\`\n` +
      (info.special === 'tobersama' ? `┃ ◦ Contoh: \`${usedPrefix}${command} Blackpink\`\n` : '') +
      `┃\n` +
      `┃ 📌 *Catatan:*\n` +
      `┃ ◦ Maks ukuran : *20 MB*\n` +
      `┃ ◦ Proses      : *±30–60 detik*\n` +
      `┃\n` +
      `╰╌╌⬡\n\n© ${botName}`
    )
    return
  }

  if (info.special === 'tobersama' && !text?.trim()) {
    await reply(
      `╭╌╌⬡「 ${info.emoji} *${info.title}* 」\n` +
      `┃\n` +
      `┃ ⚠️ Sertakan nama artis!\n` +
      `┃ Contoh: \`${usedPrefix}${command} Blackpink\`\n` +
      `┃\n` +
      `╰╌╌⬡\n\n© ${botName}`
    )
    return
  }

  if (getFileSize(imageNode) > MAX_FILE_SIZE) {
    await reply('❌ Gambar terlalu besar, maksimal *20 MB*')
    return
  }

  await Morela.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

  
  let buffer: Buffer
  try {
    const stream = await downloadContentFromMessage(
      imageNode as Parameters<typeof downloadContentFromMessage>[0],
      'image'
    )
    const chunks: Buffer[] = []
    for await (const chunk of stream) chunks.push(chunk as Buffer)
    buffer = Buffer.concat(chunks)
    if (!buffer.length) throw new Error('Buffer kosong')
  } catch (e) {
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    await reply(`❌ Gagal download gambar\n\n${(e as Error).message}`)
    return
  }

  await Morela.sendMessage(m.chat, { react: { text: '⚙️', key: m.key } })

  let imageUrl: string
  try {
    imageUrl = await uploadImage(buffer)
  } catch (e) {
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    await reply(`❌ Gagal upload gambar\n\n${(e as Error).message}`)
    return
  }

  
  let apiUrl: string
  if (info.special === 'tobersama') {
    apiUrl = `${FAA_BASE}/tobersama?url=${encodeURIComponent(imageUrl)}&nama-artis=${encodeURIComponent(text.trim())}`
  } else if (info.special === 'editfoto') {
    apiUrl = `${FAA_BASE}/editfoto?url=${encodeURIComponent(imageUrl)}&prompt=${encodeURIComponent(command + ' warna kulit')}`
  } else {
    apiUrl = `${FAA_BASE}/${info.endpoint}`
  }

  const API_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36',
    'Referer':    'https://flowfalcon.dpdns.org',
    'Origin':     'https://flowfalcon.dpdns.org',
    'Accept':     'image/*, application/json, */*',
  } as const

  let resultBuf: Buffer | null = null
  let resultUrl = ''

  try {
    for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
      let res: AxiosResponse<ArrayBuffer>

      try {
        res = await axios.get<ArrayBuffer>(apiUrl, {
          ...(info.special ? {} : { params: { url: imageUrl } }),
          timeout:      120_000,
          responseType: 'arraybuffer',
          headers:      API_HEADERS,
        })
      } catch (e) {
        const err = e as AxiosError
        if (err.response?.status === 429 && attempt < MAX_RETRY) {
          await sleep(attempt * 8_000)
          continue
        }
        throw e
      }

      if (res.status === 429) {
        if (attempt < MAX_RETRY) { await sleep(attempt * 8_000); continue }
        throw new Error('API rate limit (429), coba lagi beberapa menit lagi')
      }

      const contentType = String(res.headers['content-type'] ?? '')
      const buf = Buffer.from(res.data)

      
      const isPng = buf[0] === 0x89 && buf[1] === 0x50
      if (contentType.startsWith('image/') || isPng) {
        resultBuf = buf
        break
      }

      let json: FaaApiResponse
      try {
        json = JSON.parse(buf.toString('utf-8')) as FaaApiResponse
      } catch {
        throw new Error(`Respons tidak dikenal (${contentType}):\n${buf.toString('utf-8').slice(0, 200)}`)
      }

      const found = extractResultUrl(json)
      if (found) { resultUrl = found; break }

      throw new Error(`Format respons tidak dikenal:\n${buf.toString('utf-8').slice(0, 200)}`)
    }

    if (!resultBuf && !resultUrl) throw new Error('Gagal setelah 3x retry')
  } catch (e) {
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    await reply(`❌ Proses ${info.title} gagal\n\n${(e as Error).message}`)
    return
  }

  await Morela.sendMessage(
    m.chat,
    {
      image:   resultBuf ?? { url: resultUrl },
      caption:
        `╭╌╌⬡「 ${info.emoji} *${info.title}* 」\n` +
        `┃\n` +
        `┃ ◦ 🤖 Model : \`Faa AI\`\n` +
        `┃ ◦ ✅ Status : *Berhasil*\n` +
        `┃\n` +
        `╰╌╌⬡\n\n© ${botName}`,
    },
    { quoted: fkontak }
  )

  await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
}

const COMMANDS = Object.keys(CMD_INFO)

handler.command  = COMMANDS
handler.tags     = ['ai', 'tools']
handler.help     = COMMANDS.map(c =>
  c === 'tobersama'
    ? `${c} <reply foto> <nama artis>`
    : `${c} <reply foto>`
)
handler.noLimit  = false
handler.owner    = false
handler.premium  = true
handler.group    = false
handler.private  = false
handler.admin    = false
handler.botAdmin = false

export default handler
