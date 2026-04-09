import { botName } from '../../Library/utils.js'

const handler = async (m: any, { Morela, text, command, reply, fkontak }: any) => {
  const targetJid = text?.trim()

  if (!targetJid || !targetJid.endsWith('@g.us')) return reply(
    `╭╌「 🔒 *Remote Open/Close* 」\n` +
    `┃ Contoh:\n` +
    `┃ *.openrem 120363xxx@g.us*\n` +
    `┃ *.closerem 120363xxx@g.us*\n` +
    `╰╌\n\n© ${botName}`
  )

  await Morela.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

  try {
    if (command === 'openrem') {
      await Morela.groupSettingUpdate(targetJid, 'not_announcement')
      await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
      reply(`✅ Grup *${targetJid}* berhasil di-*OPEN*`)
    } else {
      await Morela.groupSettingUpdate(targetJid, 'announcement')
      await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
      reply(`✅ Grup *${targetJid}* berhasil di-*CLOSE*`)
    }
  } catch (e) {
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    reply('❌ Gagal: ' + (e as Error).message + '\n\n_Pastikan bot admin di grup tujuan_')
  }
}

handler.command = ['openrem', 'closerem']
handler.owner   = true
handler.tags    = ['owner']
handler.help    = ['openrem <jid>', 'closerem <jid>']
handler.noLimit = true

export default handler