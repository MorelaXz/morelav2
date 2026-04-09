import { botName, buildFkontak } from '../../Library/utils.js'

const handler = async (m: any, { Morela, reply, fkontak }: any) => {
  const _txt = (m.text||'').trim().replace(/[^0-9]/g,'')
  const _inputJid = _txt.length > 5 ? _txt + '@s.whatsapp.net' : null
  const jid = m.quoted?.sender || m.mentionedJid?.[0] || _inputJid || m.sender

  await Morela.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

  try {
    
    let url = null
    try {
      url = await Morela.profilePictureUrl(jid, 'image')
    } catch {
      try {
        url = await Morela.profilePictureUrl(jid, 'preview')
      } catch {
        url = null
      }
    }

    if (!url) throw new Error('No URL')

    const rawNum = jid.split('@')[0]
    let num = rawNum
    if (jid.endsWith('@lid')) {
      try {
        const { getPhoneByLid } = await import('../../Database/db.js')
        num = getPhoneByLid(rawNum) || rawNum
      } catch {}
    }

    await Morela.sendMessage(m.chat, {
      image: { url },
      caption: `╭╌「 🖼️ *Profile Picture* 」\n┃ 📱 *Nomor:* +${num}\n╰╌\n\n© ${botName}`
    }, { quoted: fkontak || m })

    await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

  } catch (e) {
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    reply('❌ Foto profil tidak bisa diakses (private atau tidak ada)')
  }
}

handler.command = ['getpp', 'pp', 'profpic']
handler.tags    = ['tools']
handler.help    = ['getpp — reply/mention/ketik nomor']

export default handler