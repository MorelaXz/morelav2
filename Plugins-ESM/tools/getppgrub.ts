import { botName } from '../../Library/utils.js'

const handler = async (m: any, { Morela, reply, fkontak }: any) => {
  await Morela.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

  try {
    const url = await Morela.profilePictureUrl(m.chat, 'image')

    await Morela.sendMessage(m.chat, {
      image: { url },
      caption: `╭╌「 🖼️ *Foto Grup* 」\n┃ 🔗 ${url}\n╰╌\n\n© ${botName}`
    }, { quoted: fkontak || m })

    await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

  } catch (e) {
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    reply('❌ Grup tidak punya foto atau tidak bisa diakses')
  }
}

handler.command = ['getppgrup', 'ppgrup', 'fotogroup']
handler.tags    = ['tools']
handler.help    = ['getppgrup']
handler.group   = true

export default handler