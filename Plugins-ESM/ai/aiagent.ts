// @ts-nocheck

if (!(globalThis as Record<string, unknown>).__aiAgentStatus__)  (globalThis as Record<string, unknown>).__aiAgentStatus__  = {}
if (!(globalThis as Record<string, unknown>).__aiAgentHistory__) (globalThis as Record<string, unknown>).__aiAgentHistory__ = {}

const handler = async (m: any, { command, reply }: any) => {

  
  if (command === 'aiagenton' || command === 'agenton') {
    ;(globalThis as Record<string, unknown>).__aiAgentStatus__[m.chat] = true
    return reply(
      `🤖 *AI Agent telah ON* di grup ini!\n\n` +
      `Bot akan merespon semua pesan secara otomatis tanpa perlu command.\n\n` +
      `📌 *Kemampuan AI Agent:*\n` +
      `▸ Chat & tanya jawab bebas\n` +
      `▸ Download video (TikTok, IG, YT, dll)\n` +
      `▸ Download & putar lagu/musik\n` +
      `▸ Fetch data dari URL/API\n` +
      `▸ Baca & list file di server _(khusus Main Owner)_\n` +
      `▸ Buat / convert plugin bot lain ke Morela _(khusus Main Owner)_\n\n` +
      `💡 Ketik *reset* untuk hapus history percakapan.`
    )
  }

  
  if (command === 'aiagentoff' || command === 'agentoff') {
    ;(globalThis as Record<string, unknown>).__aiAgentStatus__[m.chat] = false
    return reply('❌ *AI Agent telah OFF* di grup ini.')
  }

  
  if (command === 'aiagenreset' || command === 'agenreset') {
    const hist = (globalThis as Record<string, unknown>).__aiAgentHistory__ as Record<string, unknown>
    const keys = Object.keys(hist).filter((k: string) => k.startsWith(m.chat))
    keys.forEach((k: string) => delete hist[k])
    return reply(`🧹 History percakapan AI Agent di grup ini sudah direset! _(${keys.length} user)_`)
  }

  
  if (command === 'aiagenstat' || command === 'agenstat') {
    const isOn  = !!(globalThis as Record<string, unknown>).__aiAgentStatus__[m.chat]
    const hist  = (globalThis as Record<string, unknown>).__aiAgentHistory__ as Record<string, unknown>
    const users = Object.keys(hist).filter((k: string) => k.startsWith(m.chat)).length
    return reply(
      `╭─「 🤖 *AI Agent Status* 」\n` +
      `│\n` +
      `│ Status : ${isOn ? '✅ *ON*' : '❌ *OFF*'}\n` +
      `│ History: ${users} user aktif\n` +
      `│\n` +
      `╰─ _Ketik *reset* untuk bersihkan history_`
    )
  }
}

handler.command = [
  'aiagenton', 'aiagentoff', 'aiagenreset', 'aiagenstat',
  'agenton',   'agentoff',   'agenreset',   'agenstat',
]
handler.tags    = ['ai']
handler.group   = true
handler.admin   = true
handler.noLimit = true
handler.help    = [
  'aiagenton / agenton     — aktifkan AI Agent di grup',
  'aiagentoff / agentoff   — matikan AI Agent di grup',
  'aiagenstat / agenstat   — cek status AI Agent',
  'aiagenreset / agenreset — reset history percakapan',
]

export default handler