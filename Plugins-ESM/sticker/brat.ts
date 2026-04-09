// @ts-nocheck
import { botName } from '../../Library/utils.js'

const bratSessions = new Map()

const handler = async (m: any, { Morela, text, command, reply, fkontak }: any) => {

  const bratCommands = ['brat_orig', 'brat_v2', 'brat_gura', 'brat_ruromiya', 'brat_spongebob', 'brat_tren', 'brat_vid']
  if (bratCommands.includes(command)) {
    const session = bratSessions.get(m.sender)
    if (!session) return reply('❌ Session expired tolol, ketik ulang .brat lagi')

    bratSessions.delete(m.sender)

    const cmdMap = {
      brat_orig:      'bratoriginal',
      brat_v2:        'bratv2',
      brat_gura:      'bratgura',
      brat_ruromiya:  'bratruromiya',
      brat_spongebob: 'bratspongebob',
      brat_tren:      'brattren',
      brat_vid:       'bratvid'
    }

    const { default: pluginManager } = await import('../_pluginmanager.js')
    const plugin = pluginManager.getPlugin(cmdMap[command])
    if (!plugin) return reply('❌ Plugin tidak ditemukan!')

    m.text = session.text
    m.body = `.${cmdMap[command]} ${session.text}`

    return plugin.plugin.handler(m, {
      Morela,
      text:       session.text,
      args:       session.text.split(' '),
      reply,
      command:    cmdMap[command],
      fkontak,
      usedPrefix: '.',
      isOwn:      false,
      isPrem:     false,
      isAdmin:    false,
      botAdmin:   false
    })
  }

  if (!text?.trim()) return reply(
    `╭╌「 🎨 *Brat Sticker* 」\n` +
    `┃ Contoh: *.brat haloii*\n` +
    `┃\n` +
    `┃ Style tersedia:\n` +
    `┃ ◦ 🖤 Original\n` +
    `┃ ◦ ✨ V2\n` +
    `┃ ◦ 🐙 Gura\n` +
    `┃ ◦ 🌸 Ruromiya\n` +
    `┃ ◦ 🧽 Spongebob\n` +
    `┃ ◦ 📈 Tren\n` +
    `┃ ◦ 🎬 Vid\n` +
    `╰╌\n\n© ${botName}`
  )

  bratSessions.set(m.sender, { text: text.trim() })
  setTimeout(() => bratSessions.delete(m.sender), 2 * 60 * 1000)

  await Morela.sendMessage(
    m.chat,
    {
      text: ' ',
      footer:
        `╭╌「 🎨 *Brat Sticker* 」\n` +
        `┃ Teks: _${text.trim()}_\n` +
        `┃\n` +
        `┃ Pilih style di bawah 👇\n` +
        `╰╌\n\n© ${botName}`,
      interactiveButtons: [
        { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '🖤 Original', id: '.brat_orig' }) },
        { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '✨ V2',       id: '.brat_v2' }) },
        { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '🐙 Gura',     id: '.brat_gura' }) },
        { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '🌸 Ruromiya', id: '.brat_ruromiya' }) },
        { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '🧽 Spongebob',id: '.brat_spongebob' }) },
        { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '📈 Tren',     id: '.brat_tren' }) },
        { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '🎬 Vid',      id: '.brat_vid' }) },
      ],
      hasMediaAttachment: false
    },
    { quoted: fkontak || m }
  )
}

handler.command = ['brat', 'brat_orig', 'brat_v2', 'brat_gura', 'brat_ruromiya', 'brat_spongebob', 'brat_tren', 'brat_vid']
handler.tags    = ['sticker']
handler.help    = ['brat <teks>']

export default handler