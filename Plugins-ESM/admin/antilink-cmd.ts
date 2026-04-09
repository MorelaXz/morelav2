
import { getGroup, updateGroup } from '../../Database/db.js'

const handler = async (m: any, { args, reply, fkontak }: any) => {
    const from = m.chat
    const mode = (args[0] || '').toLowerCase()

    const groupData = getGroup(from)
    const current   = groupData?.antilink || false

    if (!mode || mode === 'status' || mode === 'cek') {
        return reply(
            `🔗 *ANTILINK STATUS*\n\n` +
            `Grup ini: ${current ? '🟢 AKTIF' : '🔴 NONAKTIF'}\n\n` +
            `Gunakan:\n` +
            `• .antilink on  — aktifkan\n` +
            `• .antilink off — nonaktifkan`
        )
    }

    if (mode === 'on' || mode === 'aktif') {
        if (current) return reply('⚠️ Antilink sudah aktif di grup ini!')
        updateGroup(from, { antilink: true })
        return reply(
            '✅ *Antilink Diaktifkan!*\n\n' +
            'Semua pesan berisi link akan dihapus otomatis.\n' +
            'Admin & owner dikecualikan.'
        )
    }

    if (mode === 'off' || mode === 'nonaktif') {
        if (!current) return reply('⚠️ Antilink sudah nonaktif di grup ini!')
        updateGroup(from, { antilink: false })
        return reply('✅ *Antilink Dinonaktifkan!*\n\nLink boleh dikirim di grup ini.')
    }

    return reply('❌ Argumen tidak valid!\n\nGunakan: .antilink on / off / status')
}

handler.command  = ['antilink']
handler.group    = true
handler.admin    = true
handler.noLimit  = true
handler.tags     = ['group']
handler.help     = ['antilink on', 'antilink off', 'antilink status']

export default handler