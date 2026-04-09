// @ts-nocheck


if (!(globalThis as Record<string, unknown>).__ai2Status__) (globalThis as Record<string, unknown>).__ai2Status__ = {}

const handler = async (m: any, { command, reply, isAdmin, isOwn }: any) => {
  if (command === 'ai2on') {
    (globalThis as Record<string, unknown>).__ai2Status__[m.chat] = true
    return reply('✅ Auto AI telah *ON* di grup ini.\n\nBot akan merespon semua pesan otomatis.')
  }
  if (command === 'ai2off') {
    (globalThis as Record<string, unknown>).__ai2Status__[m.chat] = false
    return reply('❌ Auto AI telah *OFF* di grup ini.')
  }
  if (command === 'ai2reset') {
    
    if (!(globalThis as Record<string, unknown>).__aiHistory__) (globalThis as Record<string, unknown>).__aiHistory__ = {}
    const keys = Object.keys((globalThis as Record<string, unknown>).__aiHistory__).filter((k: unknown) => k.startsWith(m.chat))
    keys.forEach((k: unknown) => delete (globalThis as Record<string, unknown>).__aiHistory__[k])
    return reply(`🧹 History percakapan AI di grup ini sudah direset! (${keys.length} user)`)
  }
  if (command === 'ai2status') {
    const status = (globalThis as Record<string, unknown>).__ai2Status__[m.chat] ? '✅ *ON*' : '❌ *OFF*'
    return reply(`🤖 Status Auto AI di grup ini: ${status}`)
  }
}

handler.command = ['ai2on', 'ai2off', 'ai2status', 'ai2reset']
handler.tags    = ['a2i']
handler.group   = true
handler.admin   = true
handler.noLimit = true
handler.help    = ['ai2on — aktifkan auto AI di grup', 'ai2off — matikan auto AI di grup', 'ai2status — cek status auto AI', 'ai2reset — reset history percakapan AI']

export default handler