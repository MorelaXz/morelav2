import pluginManager from '../_pluginmanager.js'
import fs from 'fs'
import { buildFkontak, imagePath, botName, CHANNEL_URL } from '../../Library/utils.js'

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
  

  if (!args[0]) {
    return send(
      `╭╌╌⬡「 🗑️ *ᴅᴇʟ ᴘʟᴜɢɪɴ* 」\n` +
      `┃\n` +
      `┃ ❌ Format salah!\n` +
      `┃\n` +
      `┃ 📌 *Format:*\n` +
      `┃  .delplugin nama-plugin\n` +
      `┃\n` +
      `┃ 📌 *Contoh:*\n` +
      `┃  .delplugin test\n` +
      `┃  .delplugin mycommand\n` +
      `┃\n` +
      `╰╌╌⬡\n\n` +
      `_Gunakan nama file tanpa .ts_\n` +
      `© ${botName}`
    )
  }

  const pluginName = args[0]

  if (!/^[a-zA-Z0-9_-]+$/.test(pluginName)) {
    return send(
      `╭╌╌⬡「 ❌ *ɴᴀᴍᴀ ᴛɪᴅᴀᴋ ᴠᴀʟɪᴅ* 」\n` +
      `┃\n` +
      `┃ Hanya boleh huruf, angka, - dan _\n` +
      `┃\n` +
      `╰╌╌⬡\n\n© ${botName}`
    )
  }

  const systemPlugins = ['_pluginmanager', 'menu', 'ping']
  if (systemPlugins.includes(pluginName)) {
    return send(
      `╭╌╌⬡「 🔒 *sʏsᴛᴇᴍ ᴘʟᴜɢɪɴ* 」\n` +
      `┃\n` +
      `┃ ❌ *${pluginName}* adalah plugin system!\n` +
      `┃ Tidak boleh dihapus.\n` +
      `┃\n` +
      `╰╌╌⬡\n\n© ${botName}`
    )
  }

  try {
    pluginManager.deletePlugin(pluginName)
    return send(
      `╭╌╌⬡「 ✅ *ᴘʟᴜɢɪɴ ᴅɪʜᴀᴘᴜs* 」\n` +
      `┃\n` +
      `┃ ◦ 📄 Plugin : *${pluginName}.ts*\n` +
      `┃ ◦ 🗑️ Status : *Deleted*\n` +
      `┃\n` +
      `┃ Plugin telah dihapus dari sistem!\n` +
      `┃\n` +
      `╰╌╌⬡\n\n© ${botName}`
    )
  } catch (e) {
    return send(
      `╭╌╌⬡「 ❌ *ɢᴀɢᴀʟ ᴍᴇɴɢʜᴀᴘᴜs* 」\n` +
      `┃\n` +
      `┃ ◦ 📄 Plugin : *${pluginName}*\n` +
      `┃ ◦ ⚠️ Error  : *${(e as Error).message}*\n` +
      `┃\n` +
      `┃ Pastikan nama plugin benar!\n` +
      `┃\n` +
      `╰╌╌⬡\n\n© ${botName}`
    )
  }
}

handler.command = ['delplugin', 'deleteplugin', 'removeplugin']
handler.mainOwner = true
handler.tags    = ['owner']
handler.help    = ['delplugin <nama>']
handler.noLimit = true

export default handler