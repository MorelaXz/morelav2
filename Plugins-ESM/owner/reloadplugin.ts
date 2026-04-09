// @ts-nocheck
import fs from 'fs'
import pluginManager from '../_pluginmanager.js'
import { buildFkontak, imagePath, CHANNEL_URL, botName } from '../../Library/utils.js'

const react = (Morela, m, emoji) =>
  Morela.sendMessage(m.chat, { react: { text: emoji, key: m.key } })

const handler = async (m: any, { Morela, args, fkontak }: any) => {

  const send = (text) =>
    Morela.sendMessage(m.chat, {
      text
    }, { quoted: fkontak || m })

  
  const { isMainOwner: _isMO } = await import('../../System/mainowner.js')
  const { getPhoneByLid: _getPBL } = await import('../../Database/db.js')
  const _rawSnd = (m.sender || '')
  let _sndNum = _rawSnd.split('@')[0].split(':')[0].replace(/[^0-9]/g, '')
  if (_rawSnd.endsWith('@lid')) {
    const _res = _getPBL(_sndNum)
    if (_res) _sndNum = _res.replace(/[^0-9]/g, '')
  }
  if (!_isMO(_sndNum)) return send('❌ Fitur ini hanya untuk Main Owner!')
  

  if (!args[0] || args[0].toLowerCase() === 'all') {
    try {
      await react(Morela, m, '⏳')

      const startTime = Date.now()
      const plugins   = pluginManager.listPlugins()
      let success = 0, failed = 0
      const errors = []

      for (const plugin of plugins) {
        try {
          await pluginManager.reloadPlugin(plugin.file)
          success++
        } catch (e) {
          failed++
          errors.push(`\`${plugin.file}\`: ${(e as Error).message}`)
        }
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2)
      await react(Morela, m, '✅')

      return send(
        `╭╌╌⬡「 🔄 *ʀᴇʟᴏᴀᴅ sᴇᴍᴜᴀ* 」\n` +
        `┃\n` +
        `┃ ◦ ✅ Success : *${success} plugin*\n` +
        `┃ ◦ ❌ Failed  : *${failed} plugin*\n` +
        `┃ ◦ ⏱️ Durasi  : *${duration}s*\n` +
        (errors.length > 0
          ? `┃\n┃ *Errors:*\n` + errors.map((e: unknown) => `┃ ◦ ${e}`).join('\n') + '\n'
          : '') +
        `┃\n` +
        `┃ _Semua plugin telah direload!_\n` +
        `╰╌╌⬡\n\n© ${botName}`
      )

    } catch (e) {
      await react(Morela, m, '❌')
      return send(
        `╭╌╌⬡「 ❌ *ʀᴇʟᴏᴀᴅ ɢᴀɢᴀʟ* 」\n` +
        `┃\n` +
        `┃ ◦ ⚠️ Error : *${(e as Error).message}*\n` +
        `┃\n` +
        `╰╌╌⬡\n\n© ${botName}`
      )
    }
  }

  const pluginName = args[0]

  if (!/^[a-zA-Z0-9_-]+$/.test(pluginName)) {
    return send(
      `╭╌╌⬡「 ❌ *ɴᴀᴍᴀ ᴛɪᴅᴀᴋ ᴠᴀʟɪᴅ* 」\n` +
      `┃\n` +
      `┃ Hanya boleh huruf, angka, \`-\` dan \`_\`\n` +
      `┃\n` +
      `╰╌╌⬡\n\n© ${botName}`
    )
  }

  try {
    await react(Morela, m, '⏳')

    const startTime = Date.now()
    await pluginManager.reloadPlugin(pluginName + '.ts')
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    await react(Morela, m, '✅')

    return send(
      `╭╌╌⬡「 🔄 *ᴘʟᴜɢɪɴ ʀᴇʟᴏᴀᴅᴇᴅ* 」\n` +
      `┃\n` +
      `┃ ◦ 📄 Plugin : \`${pluginName}.mjs\`\n` +
      `┃ ◦ ⏱️ Durasi : *${duration}s*\n` +
      `┃\n` +
      `┃ _Plugin berhasil direload tanpa restart!_\n` +
      `╰╌╌⬡\n\n© ${botName}`
    )

  } catch (e) {
    await react(Morela, m, '❌')
    return send(
      `╭╌╌⬡「 ❌ *ʀᴇʟᴏᴀᴅ ɢᴀɢᴀʟ* 」\n` +
      `┃\n` +
      `┃ ◦ 📄 Plugin : \`${pluginName}\`\n` +
      `┃ ◦ ⚠️ Error  : *${(e as Error).message}*\n` +
      `┃\n` +
      `┃ _Pastikan nama plugin benar!_\n` +
      `╰╌╌⬡\n\n© ${botName}`
    )
  }
}

handler.command   = ['reloadplugin', 'reload', 'refreshplugin']
handler.mainOwner = true
handler.noLimit = true
handler.tags    = ['owner']
handler.help    = ['reloadplugin <nama>', 'reloadplugin all']

export default handler