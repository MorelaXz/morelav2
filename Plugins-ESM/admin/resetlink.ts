const handler = async (m: any, { Morela, reply, fkontak }: any) => {
  if (!m.isGroup) return reply('❌ Command ini hanya untuk grup!')

  await Morela.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

  try {
    await Morela.groupRevokeInvite(m.chat)

    await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

    await reply(
      `🔄 *RESET LINK GRUP BERHASIL!*\n\n` +
      `⚠️ Link lama sudah tidak berlaku!\n` +
      `✅ Link baru sudah aktif.\n\n` +
      `_Minta link baru ke admin grup._`
    )

  } catch (e) {
    console.error('[resetlink error]', e)
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    reply('❌ Gagal reset link: ' + (e as Error).message)
  }
}

handler.command  = ['resetlink', 'rl', 'revokelink']
handler.tags     = ['group']
handler.help     = ['resetlink']
handler.group    = true       
handler.admin    = true       
handler.botAdmin = true       
handler.noLimit  = true

export default handler