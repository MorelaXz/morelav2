// @ts-nocheck


if (!(globalThis as Record<string, unknown>).__aiStatus__) (globalThis as Record<string, unknown>).__aiStatus__ = {}

const handler = async (m: any, { command, reply, isAdmin, isOwn }: any) => {
  if (command === 'aion') {
    (globalThis as Record<string, unknown>).__aiStatus__[m.chat] = true
    return reply('✅ Auto AI telah *ON* di grup ini.\n\nBot akan merespon semua pesan otomatis.')
  }
  if (command === 'aioff') {
    (globalThis as Record<string, unknown>).__aiStatus__[m.chat] = false
    return reply('❌ Auto AI telah *OFF* di grup ini.')
  }
  if (command === 'aireset') {
    
    if (!(globalThis as Record<string, unknown>).__aiHistory__) (globalThis as Record<string, unknown>).__aiHistory__ = {}
    const keys = Object.keys((globalThis as Record<string, unknown>).__aiHistory__).filter((k: unknown) => k.startsWith(m.chat))
    keys.forEach((k: unknown) => delete (globalThis as Record<string, unknown>).__aiHistory__[k])
    return reply(`🧹 History percakapan AI di grup ini sudah direset! (${keys.length} user)`)
  }
  if (command === 'aistatus') {
    const status = (globalThis as Record<string, unknown>).__aiStatus__[m.chat] ? '✅ *ON*' : '❌ *OFF*'
    return reply(`🤖 Status Auto AI di grup ini: ${status}`)
  }
}

handler.command = ['aion', 'aioff', 'aistatus', 'aireset']
handler.tags    = ['ai']
handler.group   = true
handler.admin   = true
handler.noLimit = true
handler.help    = ['aion — aktifkan auto AI di grup', 'aioff — matikan auto AI di grup', 'aistatus — cek status auto AI', 'aireset — reset history percakapan AI']

export default handler