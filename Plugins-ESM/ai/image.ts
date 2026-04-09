// @ts-nocheck


import axios    from 'axios'
import * as crypto from 'crypto'
import CryptoJS from 'crypto-js'
import { botName } from '../../Library/utils.js'

const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCwlO+boC6cwRo3UfXVBadaYwcX
0zKS2fuVNY2qZ0dgwb1NJ+/Q9FeAosL4ONiosD71on3PVYqRUlL5045mvH2K9i8b
AFVMEip7E6RMK6tKAAif7xzZrXnP1GZ5Rijtqdgwh+YmzTo39cuBCsZqK9oEoeQ3
r/myG9S+9cR5huTuFQIDAQAB
-----END PUBLIC KEY-----`

const APP_ID         = 'aifaceswap'
const U_ID           = '1H5tRtzsBkqXcaJ'
const THEME_VERSION  = '83EmcUoQTUv50LhNx0VrdcK8rcGexcP35FcZDcpgWsAXEyO4xqL5shCY6sFIWB2Q'

function generateRandomString(len: unknown) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let res = ''
  for (let i = 0; i < len; i++) res += chars.charAt(Math.floor(Math.random() * chars.length))
  return res
}

function aesenc(data: unknown[], key: string) {
  const k = CryptoJS.enc.Utf8.parse(key)
  return CryptoJS.AES.encrypt(data, k, {
    iv: k,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  }).toString()
}

function rsaenc(data: unknown[]) {
  return crypto.publicEncrypt(
    { key: PUBLIC_KEY, padding: crypto.constants.RSA_PKCS1_PADDING },
    Buffer.from(data, 'utf8')
  ).toString('base64')
}

function gencryptoheaders(type: string, fp: unknown = null) {
  const n           = Math.floor(new Date(new Date().toUTCString()).getTime() / 1000)
  const r           = crypto.randomUUID()
  const i           = generateRandomString(16)
  const fingerPrint = fp || crypto.randomBytes(16).toString('hex')
  const s           = rsaenc(i)
  const signStr     = (type === 'upload')
    ? `${APP_ID}:${r}:${s}`
    : `${APP_ID}:${U_ID}:${n}:${r}:${s}`

  return {
    'fp':      fingerPrint,
    'fp1':     aesenc(`${APP_ID}:${fingerPrint}`, i),
    'x-guide': s,
    'x-sign':  aesenc(signStr, i),
    'x-code':  Date.now().toString()
  }
}

function baseHeaders(type: string, fp: unknown) {
  return {
    'Accept':         'application/json, text/plain, */*',
    'Content-Type':   'application/json',
    'origin':         'https://live3d.io',
    'referer':        'https://live3d.io/',
    'theme-version':  THEME_VERSION,
    ...gencryptoheaders(type, fp)
  }
}

async function optimizePrompt(text: string, fp: unknown) {
  try {
    const { data } = await axios.post(
      'https://app.live3d.io/aitools/of/prompt/optimize',
      { prompt: text, fn_name: 'demo-prompt-optimize', request_from: 9, origin_from: '8f3f0c7387123ae0' },
      { headers: baseHeaders('create', fp), timeout: 15000 }
    )
    return data.code === 200 ? data.data : text
  } catch {
    return text
  }
}

async function createTask(prompt: unknown, fp: unknown) {
  const { data } = await axios.post(
    'https://app.live3d.io/aitools/of/create',
    {
      fn_name:      'demo-image-editor',
      call_type:    3,
      input: {
        model:         'nano_banana_pro',
        source_images: [],
        prompt,
        aspect_radio:  '1:1',
        request_from:  9
      },
      request_from:  9,
      origin_from:   '8f3f0c7387123ae0'
    },
    { headers: baseHeaders('create', fp), timeout: 20000 }
  )
  if (data.code !== 200) throw new Error(`Gagal buat task: ${data.message || JSON.stringify(data)}`)
  return data.data.task_id
}

async function pollStatus(taskId: unknown, fp: unknown, maxTry: unknown = 30) {
  for (let i = 0; i < maxTry; i++) {
    const { data } = await axios.post(
      'https://app.live3d.io/aitools/of/check-status',
      { task_id: taskId, fn_name: 'demo-image-editor', call_type: 3, request_from: 9, origin_from: '8f3f0c7387123ae0' },
      { headers: baseHeaders('check', fp), timeout: 15000 }
    )
    if (data.data.status === 2) {
      return `https://temp.live3d.io/${data.data.result_image}`
    }
    if (data.data.status === 3) throw new Error('Generasi gambar gagal di server')
    await new Promise(r => setTimeout(r, 3000))
  }
  throw new Error('Timeout — gambar terlalu lama diproses')
}

async function generateImage(prompt: unknown) {
  const fp       = crypto.randomBytes(16).toString('hex')
  const optimized = await optimizePrompt(prompt, fp)
  const taskId    = await createTask(optimized, fp)
  const imageUrl  = await pollStatus(taskId, fp)
  return { imageUrl, prompt: optimized }
}

const handler = async (m: any, { Morela, text, usedPrefix, command, reply, fkontak }: any) => {
  if (!text) return reply(
    `╭──「 🎨 *AI Image Generator* 」\n` +
    `│\n` +
    `│  Masukkan deskripsi gambar!\n` +
    `│\n` +
    `│  📌 *Contoh:*\n` +
    `│  ${usedPrefix}${command} anime girl with sword\n` +
    `│\n` +
    `╰─────────────────────`
  )

  await Morela.sendMessage(m.chat, { react: { text: '🎨', key: m.key } })

  await Morela.sendMessage(m.chat,
    { text: `⏳ *Sedang generate gambar...*\n_"${text}"_\n\nMohon tunggu, biasanya 10-30 detik.` },
    { quoted: fkontak || m }
  )

  try {
    const { imageUrl, prompt: optimized } = await generateImage(text)

    const res    = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 30000 })
    const imgBuf = Buffer.from(res.data)

    await Morela.sendMessage(m.chat, {
      image:   imgBuf,
      caption: `🎨 *AI Image Generator*\n\n📝 *Prompt:* ${text}\n\n꒰ © ${botName} ꒱`
    }, { quoted: fkontak || m })

    await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

  } catch (e) {
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    reply('❌ Gagal generate gambar: ' + (e as Error).message)
    console.error('[IMG GEN ERROR]', (e as Error).message)
  }
}

handler.command  = ['image']
handler.tags     = ['ai']
handler.help     = ['img <prompt>']
handler.noLimit  = false
handler.owner    = false
handler.premium  = false
handler.group    = false
handler.private  = false
handler.admin    = false
handler.botAdmin = false

export default handler