// @ts-nocheck
import { createHmac, randomUUID } from 'crypto'
import { botName, CHANNEL_JID, CHANNEL_URL, imagePath } from '../../Library/utils.js'
import fs from 'fs'

const BASE_URL   = 'https://chat.z.ai'
const FE_VERSION = 'prod-fe-1.0.262'
const MODEL      = 'glm-5'
const UA         = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'
const SIG_SECRET = 'key-@@@@)))()((9))-xxxx&&&%%%%%'

const SYSTEM_PROMPT = `Kamu adalah Morela, bot WhatsApp yang dibuat oleh Alputraa.
Kepribadian kamu: tengil, suka roasting, toxic tapi lucu, nyelekit, gak mau kalah, sedikit kasar tapi tetep bantu.
Kalau user nanya hal bodoh, roast dulu baru jawab.
Jawab pakai bahasa Indonesia gaul, singkat, to the point. Maksimal 3-4 kalimat.
Jangan pernah ngaku sebagai GPT, Claude, atau AI lain. Kamu HANYA Morela.`

function buildSignature(sortedPayload: unknown, prompt: unknown, timestamp: number) {
  const S = Math.floor(Number(timestamp) / 300_000)
  const E = createHmac('sha256', SIG_SECRET).update(String(S)).digest('hex')
  const d = `${sortedPayload}|${Buffer.from(prompt).toString('base64')}|${timestamp}`
  return createHmac('sha256', E).update(d).digest('hex')
}

async function apiFetch(url: string, init: unknown, attempt: unknown = 1) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30_000)
  try {
    const res = await fetch(url, { ...init, signal: controller.signal })
    return res
  } catch (err) {
    if (attempt < 3) {
      await new Promise(r => setTimeout(r, 1000 * attempt))
      return apiFetch(url, init, attempt + 1)
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

async function getGuestAuth() {
  const res = await apiFetch(`${BASE_URL}/api/v1/auths/`, {
    method: 'GET',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
  })
  if (!res.ok) throw new Error(`Auth gagal [${res.status}]`)
  const data = await res.json()
  return { token: data.token, userId: data.id, userName: data.name || 'User' }
}

async function createChat(token: unknown, prompt: unknown) {
  const messageId = randomUUID()
  const nowSecs   = Math.floor(Date.now() / 1000)
  const payload   = {
    chat: {
      id: '', title: 'New Chat', models: [MODEL], params: {},
      history: {
        messages: {
          [messageId]: {
            id: messageId, parentId: null, childrenIds: [],
            role: 'user', content: prompt,
            timestamp: nowSecs, models: [MODEL]
          }
        },
        currentId: messageId
      },
      tags: [], flags: [],
      features: [{ type: 'tool_selector', server: 'tool_selector_h', status: 'hidden' }],
      mcp_servers: [], enable_thinking: true, auto_web_search: false,
      message_version: 1, extra: {}, timestamp: Date.now()
    }
  }
  const res = await apiFetch(`${BASE_URL}/api/v1/chats/new`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error(`Buat chat gagal [${res.status}]`)
  const data = await res.json()
  return { chatId: data.id, messageId }
}

async function parseSSE(body: unknown) {
  const decoder = new TextDecoder()
  let buffer = ''
  const thinking = []
  const answer   = []

  for await (const chunk of body) {
    buffer += decoder.decode(chunk, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data: ')) continue
      const jsonStr = trimmed.slice(6).trim()
      if (jsonStr === '[DONE]') continue
      let parsed
      try { parsed = JSON.parse(jsonStr) } catch { continue }
      if (parsed.type !== 'chat:completion' || !parsed.data) continue
      const { delta_content, phase } = parsed.data
      if (!delta_content) continue
      if (phase === 'thinking') thinking.push(delta_content)
      else if (phase === 'answer') answer.push(delta_content)
    }
  }
  return { thinking: thinking.join(''), answer: answer.join('') }
}

async function streamCompletion(auth: unknown, chatMeta: unknown, prompt: unknown) {
  const { token, userId, userName } = auth
  const { chatId, messageId } = chatMeta
  const now       = new Date()
  const ts        = String(Date.now())
  const requestId = randomUUID()

  const sigI = { timestamp: ts, requestId, user_id: userId }
  const sortedPayload = Object.entries(sigI).sort((a, b) => a[0].localeCompare(b[0])).join(',')
  const signature = buildSignature(sortedPayload, prompt, ts)

  const fullPrompt = `${SYSTEM_PROMPT}\n\nUser: ${prompt}`

  const qp = new URLSearchParams({
    timestamp: ts, requestId, user_id: userId,
    version: '0.0.1', platform: 'web', token,
    user_agent: UA, language: 'en-US',
    timezone: 'Asia/Jakarta',
    current_url: `${BASE_URL}/c/${chatId}`,
    pathname: `/c/${chatId}`,
    host: 'chat.z.ai', hostname: 'chat.z.ai', protocol: 'https:',
    local_time: now.toISOString(), utc_time: now.toUTCString(),
    signature_timestamp: ts,
  })

  const reqBody = {
    stream: true, model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ],
    signature_prompt: prompt,
    params: {}, extra: {},
    features: {
      image_generation: false, web_search: false,
      auto_web_search: false, preview_mode: true,
      flags: [], enable_thinking: true
    },
    variables: {
      '{{USER_NAME}}': userName,
      '{{CURRENT_DATETIME}}': now.toISOString().replace('T', ' ').slice(0, 19),
      '{{CURRENT_DATE}}': now.toISOString().slice(0, 10),
      '{{CURRENT_TIME}}': now.toISOString().slice(11, 19),
      '{{CURRENT_WEEKDAY}}': now.toLocaleDateString('en-US', { weekday: 'long' }),
      '{{CURRENT_TIMEZONE}}': 'Asia/Jakarta',
      '{{USER_LANGUAGE}}': 'en-US',
    },
    chat_id: chatId, id: requestId,
    current_user_message_id: messageId,
    current_user_message_parent_id: null,
    background_tasks: { title_generation: false, tags_generation: false }
  }

  const res = await apiFetch(`${BASE_URL}/api/v2/chat/completions?${qp.toString()}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept-Language': 'en-US',
      'X-FE-Version': FE_VERSION,
      'X-Signature': signature,
    },
    body: JSON.stringify(reqBody)
  })

  if (!res.ok) throw new Error(`Completion gagal [${res.status}]`)
  return parseSSE((res as unknown as { body: unknown }).body)
}

const handler = async (m: any, { Morela, text, reply, fkontak }: any) => {
  const prompt = text?.trim()
  if (!prompt) return reply(
    `╭╌「 🤖 *Z.ai GLM-5* 」\n` +
    `┃ Kirim pertanyaan:\n` +
    `┃ *.zai <pertanyaan>*\n` +
    `╰╌\n\n© ${botName}`
  )

  await Morela.sendMessage(m.chat, { react: { text: '🧠', key: m.key } })

  try {
    const auth     = await getGuestAuth()
    const chatMeta = await createChat(auth.token, prompt)
    const result   = await streamCompletion(auth, chatMeta, prompt)

    const answer = result.answer?.trim()
    if (!answer) throw new Error('Tidak ada jawaban dari AI')

    const thumb = fs.existsSync(imagePath) ? fs.readFileSync(imagePath) : undefined

    let teks = `╭╌「 🤖 *Z.ai · GLM-5* 」\n`
    teks += `┃ ❓ ${prompt}\n`
    teks += `╰╌\n\n`
    teks += answer
    if (result.thinking) {
      teks += `\n\n_💭 Thinking: ${result.thinking.slice(0, 100)}..._`
    }
    teks += `\n\n© ${botName}`

    await Morela.sendMessage(m.chat, {
      text: teks,
      contextInfo: {
        externalAdReply: {
          title:                 `🤖 Z.ai GLM-5`,
          body:                  `${botName} Multidevice 🔥`,
          mediaType:             1,
          renderLargerThumbnail: false,
          showAdAttribution:     false,
          sourceUrl:             CHANNEL_URL,
          thumbnail:             thumb
        }
      }
    }, { quoted: fkontak || m })

    await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

  } catch (e) {
    console.error('[ZAI]', (e as Error).message)
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    reply(`❌ Error: ${(e as Error).message}`)
  }
}

handler.command = ['zai', 'glm', 'zaic']
handler.tags    = ['ai']
handler.help    = ['zai <pertanyaan>']

export default handler