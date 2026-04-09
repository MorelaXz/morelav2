// @ts-nocheck


if (!(globalThis as Record<string, unknown>).__ai2Status__)  (globalThis as Record<string, unknown>).__ai2Status__  = {}
if (!(globalThis as Record<string, unknown>).__aiHistory__) (globalThis as Record<string, unknown>).__aiHistory__ = {}

const delay     = ms => new Promise(res => setTimeout(res, ms))
const MAX_HISTORY = 10  

function getHistory(userId: unknown, chatId: unknown) {
  const key = `${chatId}:${userId}`
  if (!(globalThis as Record<string, unknown>).__aiHistory__[key]) (globalThis as Record<string, unknown>).__aiHistory__[key] = []
  return (globalThis as Record<string, unknown>).__aiHistory__[key]
}

function pushHistory(userId: unknown, chatId: unknown, role: unknown, text: string) {
  const key     = `${chatId}:${userId}`
  const history = (globalThis as Record<string, unknown>).__aiHistory__[key] || []
  history.push({ role, text })
  
  if (history.length > MAX_HISTORY * 2) history.splice(0, 2)
  (globalThis as Record<string, unknown>).__aiHistory__[key] = history
}

function clearHistory(userId: unknown, chatId: unknown) {
  const key = `${chatId}:${userId}`
  (globalThis as Record<string, unknown>).__aiHistory__[key] = []
}

function buildPrompt(history: unknown, newText: unknown) {
  
  let context = ''
  if (history.length > 0) {
    context = 'Berikut adalah percakapan sebelumnya:\n'
    for (const h of history) {
      context += h.role === 'user' ? `User: ${h.text}\n` : `Kamu: ${h.text}\n`
    }
    context += '\nLanjutkan percakapan:\n'
  }
  return context + `User: ${newText}`
}

const handler = {
  tags: ['passive', 'ai'],

  handler: async (m, { Morela, isOwn, fkontak }) => {
    try {
      if (!m.message)                               return
      if (m.message?.reactionMessage)              return
      if (m.message?.protocolMessage)              return
      if (m.message?.senderKeyDistributionMessage) return
      if (m.chat === 'status@broadcast')           return
      if (m.key?.fromMe)                           return
      if (!m.isGroup)                              return
      if (!(globalThis as Record<string, unknown>).__ai2Status__[m.chat])        return

      const text = m.body || m.text || ''
      if (!text) return

      if (/^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#$%^&.©^]/i.test(text)) return

      const userId = m.sender || m.key?.participant || ''

      if (/^(reset|lupa|forget|clear)$/i.test(text.trim())) {
        clearHistory(userId, m.chat)
        return Morela.sendMessage(m.chat, {
          text: '🧹 Oke, aku udah lupa semua percakapan kita sebelumnya!'
        }, { quoted: fkontak || m })
      }

      const history = getHistory(userId, m.chat)
      const prompt  = buildPrompt(history, text)

      const url  = `https://api.ryuu-dev.offc.my.id/ai/mahiru-ai?text=${encodeURIComponent(prompt)}`
      const res  = await fetch(url)
      const json = await res.json()
      if (!json?.output) return

      const answer = json.output.trim().replace(/^kamu\s*:\s*/i, '')

      pushHistory(userId, m.chat, 'user', text)
      pushHistory(userId, m.chat, 'ai', answer)

      await Morela.sendPresenceUpdate('composing', m.chat)
      await delay(Math.min(8000, 2000 + answer.length * 40))
      await Morela.sendPresenceUpdate('paused', m.chat)

      await Morela.sendMessage(m.chat, { text: answer }, { quoted: fkontak || m })

    } catch {
      
    }
  }
}

export default handler