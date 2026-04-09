// @ts-nocheck
import { disablePlugin, enablePlugin, getDisabledPlugins, isPluginDisabled } from '../_pluginmanager.js'
import { botName } from '../../Library/utils.js'

const send = (Morela, chat, fkontak, text) =>
  Morela.sendMessage(chat, { text }, { quoted: fkontak })

const handler = async (m: any, { Morela, command, text, args, reply, fkontak, isOwn }: any) => {

  const _send = (txt) => send(Morela, m.chat, fkontak, txt)

  
  const { isMainOwner: _isMO } = await import('../../System/mainowner.js')
  const { getPhoneByLid: _getPBL } = await import('../../Database/db.js')
  const _rawSnd = (m.sender || '')
  let _sndNum = _rawSnd.split('@')[0].split(':')[0].replace(/[^0-9]/g, '')
  if (_rawSnd.endsWith('@lid')) {
    const _res = _getPBL(_sndNum)
    if (_res) _sndNum = _res.replace(/[^0-9]/g, '')
  }
  if (!_isMO(_sndNum)) return _send('❌ Fitur ini hanya untuk Main Owner!')
  

  
  if (command === 'disable') {
    if (!args.length) return send(Morela, m.chat, fkontak,
      `╭╌╌⬡「 🔧 *ᴅɪꜱᴀʙʟᴇ ᴘʟᴜɢɪɴ* 」\n` +
      `┃ ❌ Sebutin command-nya!\n` +
      `┃\n` +
      `┃ Format:\n` +
      `┃ .disable <command>\n` +
      `┃ .disable <command> <alasan>\n` +
      `┃\n` +
      `┃ Contoh:\n` +
      `┃ .disable bratgura API kazztzyy mati\n` +
      `┃ .disable fakeff\n` +
      `╰╌╌⬡\n\n© ${botName}`
    )

    const cmd    = args[0].toLowerCase().replace(/^\./, '')
    const reason = args.slice(1).join(' ') || 'API sedang bermasalah'

    const already = isPluginDisabled(cmd)
    if (already) return send(Morela, m.chat, fkontak,
      `╭╌╌⬡「 🔧 *ᴅɪꜱᴀʙʟᴇ ᴘʟᴜɢɪɴ* 」\n` +
      `┃ ⚠️ *.${cmd}* sudah di-disable!\n` +
      `┃\n` +
      `┃ Alasan : ${already.reason}\n` +
      `┃\n` +
      `┃ Gunakan *.enable ${cmd}* untuk aktifkan lagi.\n` +
      `╰╌╌⬡\n\n© ${botName}`
    )

    disablePlugin(cmd, reason)

    await Morela.sendMessage(m.chat, { react: { text: '🔧', key: m.key } })
    return send(Morela, m.chat, fkontak,
      `╭╌╌⬡「 🔧 *ᴅɪꜱᴀʙʟᴇ ᴘʟᴜɢɪɴ* 」\n` +
      `┃ ✅ Berhasil di-disable!\n` +
      `┃\n` +
      `┃ Command : *.${cmd}*\n` +
      `┃ Alasan  : ${reason}\n` +
      `┃\n` +
      `┃ User yang pakai akan dapat notif:\n` +
      `┃ "Fitur sedang dalam perbaikan"\n` +
      `┃\n` +
      `┃ Gunakan *.enable ${cmd}* kalau udah bener.\n` +
      `╰╌╌⬡\n\n© ${botName}`
    )
  }

  
  if (command === 'enable') {
    if (!args.length) return send(Morela, m.chat, fkontak,
      `╭╌╌⬡「 ✅ *ᴇɴᴀʙʟᴇ ᴘʟᴜɢɪɴ* 」\n` +
      `┃ ❌ Sebutin command-nya!\n` +
      `┃\n` +
      `┃ Format: .enable <command>\n` +
      `┃ Contoh: .enable bratgura\n` +
      `╰╌╌⬡\n\n© ${botName}`
    )

    const cmd = args[0].toLowerCase().replace(/^\./, '')

    const info = isPluginDisabled(cmd)
    if (!info) return send(Morela, m.chat, fkontak,
      `╭╌╌⬡「 ✅ *ᴇɴᴀʙʟᴇ ᴘʟᴜɢɪɴ* 」\n` +
      `┃ ⚠️ *.${cmd}* tidak sedang di-disable.\n` +
      `┃ Command ini sudah aktif!\n` +
      `╰╌╌⬡\n\n© ${botName}`
    )

    enablePlugin(cmd)

    await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
    return send(Morela, m.chat, fkontak,
      `╭╌╌⬡「 ✅ *ᴇɴᴀʙʟᴇ ᴘʟᴜɢɪɴ* 」\n` +
      `┃ ✅ Berhasil di-enable!\n` +
      `┃\n` +
      `┃ Command : *.${cmd}*\n` +
      `┃ Status  : Aktif kembali ✅\n` +
      `┃\n` +
      `┃ User sekarang bisa pakai fitur ini lagi.\n` +
      `╰╌╌⬡\n\n© ${botName}`
    )
  }

  
  if (command === 'listdisable' || command === 'disablelist') {
    const all = getDisabledPlugins()
    const keys = Object.keys(all)

    if (!keys.length) return send(Morela, m.chat, fkontak,
      `╭╌╌⬡「 📋 *ʟɪꜱᴛ ᴅɪꜱᴀʙʟᴇ* 」\n` +
      `┃ ✅ Tidak ada plugin yang di-disable.\n` +
      `┃ Semua fitur aktif normal!\n` +
      `╰╌╌⬡\n\n© ${botName}`
    )

    let txt = `╭╌╌⬡「 📋 *ʟɪꜱᴛ ᴅɪꜱᴀʙʟᴇ* 」\n`
    txt    += `┃ Total disabled: *${keys.length}* command\n`
    txt    += `┃\n`

    for (const [cmd, info] of Object.entries(all)) {
      const tgl = new Date((info as any).disabledAt).toLocaleDateString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta'
      })
      txt += `┃ 🔧 *.${cmd}*\n`
      txt += `┃    ↳ ${(info as any).reason}\n`
      txt += `┃    ↳ _Sejak ${tgl}_\n`
      txt += `┃\n`
    }

    txt += `┃ Gunakan *.enable <cmd>* untuk aktifkan.\n`
    txt += `╰╌╌⬡\n\n© ${botName}`

    return send(Morela, m.chat, fkontak, txt)
  }
}

handler.command = ['disable', 'enable', 'listdisable', 'disablelist']
handler.mainOwner = true
handler.noLimit   = true
handler.tags      = ['owner']
handler.help      = [
  'disable <command> [alasan] — nonaktifkan fitur sementara',
  'enable <command> — aktifkan kembali fitur',
  'listdisable — lihat semua fitur yang sedang dinonaktifkan',
]

export default handler