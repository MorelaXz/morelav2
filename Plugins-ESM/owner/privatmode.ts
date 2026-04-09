import { botName } from '../../Library/utils.js'
import { isPrivateMode, setPrivateMode } from '../../System/privatemode.js'

const handler = async (m: any, { Morela, command, text, reply, fkontak }: any) => {
  const arg = text?.trim().toLowerCase()

  if (!arg || (arg !== 'on' && arg !== 'off')) {
    const status = isPrivateMode() ? '🔒 ON' : '🔓 OFF'
    return reply(
      `╭╌「 🔒 *Private Mode* 」\n` +
      `┃ Status : *${status}*\n` +
      `┃\n` +
      `┃ *.privatemode on* → hanya owner\n` +
      `┃ *.privatemode off* → semua bisa chat\n` +
      `╰╌\n\n© ${botName}`
    )
  }

  const newValue = arg === 'on'
  setPrivateMode(newValue)
  const status = newValue ? '🔒 ON' : '🔓 OFF'

  await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
  reply(
    `╭╌「 🔒 *Private Mode* 」\n` +
    `┃ Status : *${status}*\n` +
    `┃\n` +
    `┃ ${newValue ? 'Hanya owner yang bisa chat bot di private' : 'Semua user bisa chat bot di private'}\n` +
    `╰╌\n\n© ${botName}`
  )
}

handler.command = ['privatemode', 'pvmode']
handler.owner   = true
handler.tags    = ['owner']
handler.help    = ['privatemode on/off']
handler.noLimit = true

export default handler