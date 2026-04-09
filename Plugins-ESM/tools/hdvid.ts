// @ts-nocheck
import path   from 'path'
import axios  from 'axios'
import FormData from 'form-data'
import * as crypto from 'crypto'
import fs     from 'fs'
import { downloadContentFromMessage } from '@itsukichan/baileys'
import { botName, CHANNEL_URL, buildFkontak } from '../../Library/utils.js'

const API  = 'https://api.unblurimage.ai'
const SITE = 'https://unblurimage.ai'
const CDN  = 'https://cdn.unblurimage.ai'

const UA_POOL = [
  'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
]

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function initSession() {
  const UA = UA_POOL[Math.floor(Math.random() * UA_POOL.length)]
  let SERIAL = ''

  try {
    const html = (await axios.get(SITE + '/ai-unblur-video/', {
      headers: { 'user-agent': UA, accept: 'text/html' }, timeout: 20000
    })).data

    const sm = html.match(/src="([^"]*app\.[a-z0-9]+\.js)"/)
    if (sm) {
      let jsUrl = sm[1]
      if (!jsUrl.startsWith('http')) jsUrl = SITE + jsUrl
      const js = (await axios.get(jsUrl, { headers: { 'user-agent': UA, Referer: SITE }, timeout: 25000 })).data

      for (const pat of [
        /"product-serial"\s*:\s*"([a-f0-9]{32})"/i,
        /productSerial[^'"]*['"]([a-f0-9]{32})['"]/i,
        /serial['":\s]+([a-f0-9]{32})/i,
      ]) {
        const m = js.match(pat)
        if (m) { SERIAL = m[1]; break }
      }

      if (!SERIAL) {
        const anyHex = js.match(/['"]([a-f0-9]{32})['"]/)
        if (anyHex) SERIAL = anyHex[1]
      }
    }
  } catch {}

  if (!SERIAL) {
    SERIAL = crypto.createHash('md5')
      .update(UA + String(Math.floor(Date.now() / 3600000)))
      .digest('hex')
  }

  return { UA, SERIAL }
}

function buildHeaders(UA: unknown, SERIAL: unknown, extra: unknown = {}) {
  return Object.assign({
    'accept'             : '*/*',
    'accept-language'    : 'en-GB,en;q=0.9',
    'product-serial'     : SERIAL,
    'sec-ch-ua'          : '"Chromium";v="137", "Not/A)Brand";v="24"',
    'sec-ch-ua-mobile'   : '?1',
    'sec-ch-ua-platform' : '"Android"',
    'sec-fetch-dest'     : 'empty',
    'sec-fetch-mode'     : 'cors',
    'sec-fetch-site'     : 'same-site',
    'Referer'            : SITE + '/',
    'user-agent'         : UA,
  }, extra)
}

async function guestLogin(UA: unknown, SERIAL: unknown) {
  try {
    await axios.post(API + '/api/pai-login/v1/user/get-userinfo', null, {
      headers: buildHeaders(UA, SERIAL, { 'product-code': '067003', 'content-type': 'application/json' }),
      timeout: 10000
    })
  } catch {}
}

async function registerFileName(fileName: unknown, UA: unknown, SERIAL: unknown) {
  const form = new FormData()
  form.append('video_file_name', fileName)
  const r = await axios.post(
    API + '/api/upscaler/v1/ai-video-enhancer/upload-video',
    form,
    { headers: buildHeaders(UA, SERIAL, form.getHeaders()), timeout: 30000 }
  )
  if (r.data?.code !== 100000) throw new Error('Register gagal: ' + JSON.stringify(r.data))
  return { ossUrl: r.data.result.url, objectName: r.data.result.object_name }
}

async function uploadToOSS(ossUrl: unknown, buffer: Buffer, mimeType: unknown, fileName: unknown, UA: unknown) {
  try {
    await axios.put(ossUrl, buffer, {
      headers: { 'Content-Type': mimeType, 'User-Agent': UA },
      timeout: 180000, maxBodyLength: Infinity, maxContentLength: Infinity,
      validateStatus: s => s >= 200 && s < 300
    })
    return
  } catch {}

  const form = new FormData()
  form.append('file', buffer, { filename: fileName, contentType: mimeType })
  await axios.post(ossUrl, form, {
    headers: form.getHeaders(), timeout: 180000,
    maxBodyLength: Infinity, maxContentLength: Infinity,
    validateStatus: s => s >= 200 && s < 300
  })
}

async function createJob(cdnUrl: unknown, resolution: unknown, UA: unknown, SERIAL: unknown) {
  const form = new FormData()
  form.append('original_video_file', cdnUrl)
  form.append('resolution', resolution)
  form.append('is_preview', 'false')
  const r = await axios.post(
    API + '/api/upscaler/v2/ai-video-enhancer/create-job',
    form,
    { headers: buildHeaders(UA, SERIAL, form.getHeaders()), timeout: 30000 }
  )
  const code = r.data?.code
  if (code === 100000 || code === 300010) return r.data.result || {}
  throw new Error('Create job gagal: ' + JSON.stringify(r.data))
}

async function pollJob(jobId: unknown, UA: unknown, SERIAL: unknown, maxWaitSec: unknown = 1800) {
  const start = Date.now()
  while (true) {
    await sleep(5000)
    const elapsed = Math.floor((Date.now() - start) / 1000)
    if (elapsed > maxWaitSec) return null
    try {
      const r = await axios.get(
        API + '/api/upscaler/v2/ai-video-enhancer/get-job/' + jobId,
        { headers: buildHeaders(UA, SERIAL), timeout: 20000 }
      )
      const code   = r.data?.code
      const result = r.data?.result
      if (code === 100000 && result?.output_url) return result
      if (code !== 300010 && code) return null
    } catch {}
  }
}

const handler = async (m: any, { Morela, reply, text, fkontak }: any) => {
  const msg = m.message
  const vid =
    msg?.videoMessage ||
    msg?.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage

  if (!vid) return reply(
    `╭╌「 🎬 *HD Video Enhancer* 」\n` +
    `┃ Reply video + *.hdvid*\n` +
    `┃\n` +
    `┃ Resolusi:\n` +
    `┃ ◦ .hdvid      → 2K (default)\n` +
    `┃ ◦ .hdvid 4k   → 4K\n` +
    `╰╌\n\n© ${botName}`
  )

  const resolution = text?.trim().toLowerCase() === '4k' ? '4k' : '2k'

  await Morela.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })
  await reply(`⏳ Memproses video ke *${resolution.toUpperCase()}*...\n_Bisa memakan waktu beberapa menit_`)

  let videoBuffer, mimeType = 'video/mp4', ext = 'mp4'
  try {
    const stream = await downloadContentFromMessage(vid, 'video')
    const chunks = []
    for await (const c of stream) chunks.push(c)
    videoBuffer = Buffer.concat(chunks)
    if (!videoBuffer.length) throw new Error('Buffer kosong')
    const extM = (vid.fileName || '').match(/\.(mp4|webm|mov|avi|mkv)$/i)
    if (extM) {
      ext      = extM[1].toLowerCase()
      mimeType = ext === 'webm' ? 'video/webm' : ext === 'mov' ? 'video/quicktime' : 'video/mp4'
    }
  } catch (e) {
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    return reply('❌ Gagal download video: ' + (e as Error).message)
  }

  try {
    
    const { UA, SERIAL } = await initSession()
    await guestLogin(UA, SERIAL)

    const fileName = crypto.randomBytes(3).toString('hex') + '_video.' + ext
    const { ossUrl, objectName } = await registerFileName(fileName, UA, SERIAL)

    await uploadToOSS(ossUrl, videoBuffer, mimeType, fileName, UA)

    const cdnUrl  = CDN + '/' + objectName
    const jobInfo = await createJob(cdnUrl, resolution, UA, SERIAL)

    let outputUrl = jobInfo.output_url
    if (!outputUrl) {
      if (!jobInfo.job_id) throw new Error('Tidak ada job_id')
      const result = await pollJob(jobInfo.job_id, UA, SERIAL)
      if (!result) throw new Error('Job timeout atau gagal')
      outputUrl = result.output_url
    }

    await Morela.sendMessage(m.chat, {
      video:   { url: outputUrl },
      caption: `✅ *Video berhasil di-enhance (${resolution.toUpperCase()})!*\n\n© ${botName}`
    }, { quoted: fkontak || m })

    await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

  } catch (e) {
    console.error('[HDVID ERROR]', (e as Error).message)
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    reply('❌ Gagal: ' + (e as Error).message)
  }
}

handler.help    = ['hdvid <reply video>', 'hdvid 4k <reply video>']
handler.tags    = ['tools']
handler.command = ['hdvid', 'hdvideo', 'vhd']

export default handler