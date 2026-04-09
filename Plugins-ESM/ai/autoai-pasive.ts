// @ts-nocheck

import axios from 'axios'

if (!(globalThis as Record<string, unknown>).__aiStatus__)   (globalThis as Record<string, unknown>).__aiStatus__   = {}
if (!(globalThis as Record<string, unknown>).__aiHistory__)  (globalThis as Record<string, unknown>).__aiHistory__  = {}

const delay       = ms => new Promise(res => setTimeout(res, ms))
const MAX_HISTORY = 10


const API_URL = 'https://api-faa.my.id/faa/gpt-promt'

const SYSTEM_PROMPT = `Kamu adalah "Morela", cowok toxic sarkas tengil mau menang sendiri. Ngomong pakai bahasa gaul Indonesia. Sesekali pakai kata anjg/jir/tolol/bgst tapi jangan tiap kalimat. Selalu ngerasa paling pinter, sering sindir halus. Jawaban tetap nyambung dan informatif tapi disampaikan dengan nada males-malesan dan sombong. JANGAN pernah sebut nama Claude atau bilang kamu AI. Kamu Morela, titik.`

function getHistory(userId, chatId) {
  const key = `${chatId}:${userId}`
  if (!(globalThis as Record<string, unknown>).__aiHistory__[key])
    (globalThis as Record<string, unknown>).__aiHistory__[key] = []
  return (globalThis as Record<string, unknown>).__aiHistory__[key]
}

function pushHistory(userId, chatId, role, text) {
  const key     = `${chatId}:${userId}`
  const history = (globalThis as Record<string, unknown>).__aiHistory__[key] || []
  history.push({ role, text })
  if (history.length > MAX_HISTORY * 2) history.splice(0, 2)
  ;(globalThis as Record<string, unknown>).__aiHistory__[key] = history
}

function clearHistory(userId, chatId) {
  const key = `${chatId}:${userId}`
  ;(globalThis as Record<string, unknown>).__aiHistory__[key] = []
}

function buildMessage(history, newText) {
  
  if (history.length === 0) return newText
  let ctx = 'Konteks percakapan sebelumnya:\n'
  for (const h of history) {
    ctx += h.role === 'user' ? `User: ${h.text}\n` : `Bego: ${h.text}\n`
  }
  return ctx + `\nUser: ${newText}`
}

async function callAI(history, text) {
  const message = buildMessage(history, text)
  
  const fullText = `[SYSTEM: ${SYSTEM_PROMPT}]\n\n${message}`
  const { data } = await axios.get(API_URL, {
    params: {
      prompt: SYSTEM_PROMPT,
      text:   fullText
    },
    timeout: 20000
  })
  if (!data?.status || !data?.result) return null
  return data.result.trim()
}

const handler = {
  tags: ['passive', 'ai'],

  handler: async (m, { Morela, fkontak }) => {
    try {
      if (!m.message)                                return
      if (m.message?.reactionMessage)               return
      if (m.message?.protocolMessage)               return
      if (m.message?.senderKeyDistributionMessage)  return
      if (m.chat === 'status@broadcast')            return
      if (m.key?.fromMe)                            return
      if (!m.isGroup)                               return
      if (!(globalThis as Record<string, unknown>).__aiStatus__[m.chat]) return

      const text = m.body || m.text || ''
      if (!text) return
      if (/^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#$%^&.©^]/i.test(text)) return

      const userId = m.sender || m.key?.participant || ''

      if (/^(reset|lupa|forget|clear)$/i.test(text.trim())) {
        clearHistory(userId, m.chat)
        return Morela.sendMessage(m.chat, {
          text: 'oke anjg, gue udah lupa semua. mulai dari nol lagi.'
        }, { quoted: fkontak || m })
      }

      const history = getHistory(userId, m.chat)
      const answer  = await callAI(history, text)
      if (!answer) return

      pushHistory(userId, m.chat, 'user', text)
      pushHistory(userId, m.chat, 'ai', answer)

      await Morela.sendPresenceUpdate('composing', m.chat)
      await delay(Math.min(2000, 500 + answer.length * 10))
      await Morela.sendPresenceUpdate('paused', m.chat)

      await Morela.sendMessage(m.chat, { text: answer }, { quoted: fkontak || m })

    } catch {
      
    }
  }
}

export default handler
