// @ts-nocheck
import fetch from 'node-fetch'
import FormData from 'form-data'
import { fileTypeFromBuffer } from 'file-type'
import { downloadContentFromMessage } from '@itsukichan/baileys'
import { botName, buildFkontak } from '../../Library/utils.js'

const BASE_URL   = 'https://math-gpt.pro'
const USER_AGENT = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36'

async function getCsrfToken() {
  const response = await fetch(BASE_URL, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  })

  const html    = await response.text()
  const cookies = response.headers.raw()['set-cookie']

  const tokenMatch = html.match(/name="csrf-token" content="([^"]+)"/i) ||
    html.match(/csrf[_-]?token["']?\s:\s["']([^"']+)["']/i)

  if (!tokenMatch) throw new Error('CSRF token tidak ditemukan')

  let xsrf = '', session = ''
  if (cookies) {
    cookies.forEach((cookie: unknown) => {
      if (cookie.includes('XSRF-TOKEN='))     xsrf    = cookie.split('XSRF-TOKEN=')[1].split(';')[0]
      if (cookie.includes('laravel_session=')) session = cookie.split('laravel_session=')[1].split(';')[0]
    })
  }

  return { token: tokenMatch[1], cookie: `XSRF-TOKEN=${xsrf}; laravel_session=${session}` }
}

async function uploadImage(buffer: Buffer, csrf: unknown) {
  const fileType = await fileTypeFromBuffer(buffer)
  const form = new FormData()
  form.append('image', buffer, {
    filename:    `image.${fileType?.ext || 'jpg'}`,
    contentType: fileType?.mime || 'image/jpeg'
  })
  form.append('_token', csrf.token)

  const response = await fetch(`${BASE_URL}/upload-image`, {
    method:  'POST',
    headers: {
      'User-Agent':        USER_AGENT,
      'X-Requested-With':  'XMLHttpRequest',
      'Cookie':            csrf.cookie,
      ...form.getHeaders()
    },
    body: form
  })

  if (!response.ok) throw new Error(`Upload gagal: HTTP ${response.status}`)
  const result = await response.json()
  if (!result.file) throw new Error('Upload gagal: Tidak ada file')
  return result.file
}

async function chatAI(message: string, imageFile: unknown, csrf: unknown) {
  const body = { message, _token: csrf.token }
  if (imageFile) body.image = imageFile

  const response = await fetch(`${BASE_URL}/chat`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'User-Agent':    USER_AGENT,
      'X-CSRF-TOKEN':  csrf.token,
      'Cookie':        csrf.cookie
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) throw new Error(`Chat gagal: HTTP ${response.status}`)
  const result = await response.json()
  if (!result.reply) throw new Error('Tidak ada respon dari AI')
  return result.reply
}

const handler = async (m: any, { Morela, text, usedPrefix, command, reply, fkontak, downloadContentFromMessage: dlc }: any) => {
  const quoted = m.quoted || m
  const mime   = quoted.mimetype || quoted.message?.imageMessage?.mimetype || ''
  const hasImg = mime.startsWith('image/')

  if (!text && !hasImg) return reply(
    `╭╌「 🧮 *MathGPT Pro* 」\n` +
    `┃ Contoh:\n` +
    `┃ *.${command} integral x^2*\n` +
    `┃\n` +
    `┃ Atau reply gambar soal:\n` +
    `┃ *.${command}*\n` +
    `┃ *.${command} jelaskan ini*\n` +
    `╰╌\n\n© ${botName}`
  )

  await Morela.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

  try {
    const csrf = await getCsrfToken()
    let imageFile = null

    if (hasImg) {
      const imgMsg = quoted.message?.imageMessage || quoted
      const stream = await (dlc || downloadContentFromMessage)(imgMsg, 'image')
      const chunks = []
      for await (const chunk of stream) chunks.push(chunk)
      const buffer = Buffer.concat(chunks)
      imageFile = await uploadImage(buffer, csrf)
    }

    const prompt  = text || 'Solve this problem'
    const answer  = await chatAI(prompt, imageFile, csrf)

    await Morela.sendMessage(m.chat, {
      text: `╭╌「 🧮 *MathGPT Pro* 」\n┃\n${answer.trim().split('\n').map((l: unknown) => `┃ ${l}`).join('\n')}\n┃\n╰╌\n\n© ${botName}`
    }, { quoted: fkontak || m })

    await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

  } catch (e) {
    console.error('[MATHGPT]', (e as Error).message)
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    reply('❌ Error: ' + (e as Error).message)
  }
}

handler.help    = ['mathgpt <teks/reply gambar soal>']
handler.tags    = ['ai']
handler.command = ['mathgpt', 'math', 'mathgptpro']

export default handler