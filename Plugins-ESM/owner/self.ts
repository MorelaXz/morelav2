// @ts-nocheck
import { isSelfMode, setSelfMode } from '../../System/selfmode.js'
import { bi, buildFkontak, menuBuf, CHANNEL_URL, botName } from '../../Library/utils.js'

const handler = async (m: any, { Morela, command, args, fkontak }: any) => {
    const from = m.chat
    let mode   = (args[0] || '').toLowerCase()
    if (command === 'public') mode = 'off'

    const send = async text =>
        Morela.sendMessage(
            from,
            {
                ...(menuBuf
                    ? { image: menuBuf, caption: ' ' }
                    : { text: ' ' }
                ),
                footer: bi(text),
                interactiveButtons: [
                    {
                        name: 'cta_url',
                        buttonParamsJson: JSON.stringify({
                            display_text: 'Channel',
                            url: CHANNEL_URL,
                            merchant_url: CHANNEL_URL
                        })
                    }
                ],
                hasMediaAttachment: !!menuBuf
            },
            { quoted: fkontak || m }
        )

    if (!mode || mode === 'status' || mode === 'cek') {
        const status = isSelfMode(from)
        return send(
            '⚙️ SELF MODE STATUS\n\n' +
            '┌─ Status Grup Ini\n' +
            `│ ${status ? '🟢 ON - Self Mode Aktif' : '🔴 OFF - Public Mode'}\n` +
            '└────────────────\n\n' +
            (
                status
                    ? '🔒 SELF MODE ON:\n' +
                      '┌─────────────────\n' +
                      '│ ✓ Bot HANYA merespon OWNER di grup ini\n' +
                      '│ ✓ User lain TIDAK BISA command\n' +
                      '│ ✓ Grup lain TIDAK terpengaruh\n' +
                      '│ ✓ ANTILINK TETAP JALAN untuk semua\n' +
                      '└─────────────────\n\n'
                    : '🔓 PUBLIC MODE ON:\n' +
                      '┌─────────────────\n' +
                      '│ ✓ Bot merespon SEMUA USER di grup ini\n' +
                      '│ ✓ Semua fitur bisa diakses\n' +
                      '│ ✓ Antilink tetap jalan\n' +
                      '└─────────────────\n\n'
            ) +
            'Commands:\n' +
            '• .self on     — Aktifkan self mode di grup ini\n' +
            '• .self off    — Nonaktifkan self mode di grup ini\n' +
            '• .self status — Cek status grup ini\n' +
            '• .public      — Nonaktifkan self mode (shortcut)\n\n' +
            `© ${botName}`
        )
    }

    if (mode === 'on' || mode === 'aktif' || mode === 'enable') {
        if (isSelfMode(from)) {
            return send('⚠️ Self mode sudah aktif di grup ini!')
        }
        setSelfMode(from, true)
        return send(
            '🔒 SELF MODE DIAKTIFKAN\n\n' +
            '✅ Perubahan di grup ini:\n' +
            '┌─────────────────\n' +
            '│ ✓ Bot mode private untuk grup ini\n' +
            '│ ✓ Hanya OWNER yang bisa pakai command\n' +
            '│ ✓ User lain TIDAK BISA command\n' +
            '│ ✓ Grup lain TIDAK terpengaruh\n' +
            '│ ✓ ANTILINK TETAP JALAN untuk semua\n' +
            '└─────────────────\n\n' +
            'Status: 🟢 ON\n\n' +
            'Bot sekarang hanya merespon owner di grup ini\n\n' +
            `© ${botName}`
        )
    }

    if (mode === 'off' || mode === 'nonaktif' || mode === 'disable') {
        if (!isSelfMode(from)) {
            return send('⚠️ Self mode sudah nonaktif di grup ini!')
        }
        setSelfMode(from, false)
        return send(
            '🔓 PUBLIC MODE DIAKTIFKAN\n\n' +
            '✅ Perubahan di grup ini:\n' +
            '┌─────────────────\n' +
            '│ ✓ Bot mode public untuk grup ini\n' +
            '│ ✓ Semua user bisa pakai fitur bot\n' +
            '│ ✓ Antilink tetap jalan\n' +
            '└─────────────────\n\n' +
            'Status: 🔴 OFF\n\n' +
            'Bot sekarang dalam mode public di grup ini\n\n' +
            `© ${botName}`
        )
    }

    return send(
        '❌ Argument tidak valid!\n\n' +
        'Gunakan:\n' +
        '• .self on     — Aktifkan self mode di grup ini\n' +
        '• .self off    — Nonaktifkan self mode di grup ini\n' +
        '• .self status — Cek status\n' +
        '• .public      — Shortcut nonaktifkan self mode'
    )
}

handler.command = ['self', 'public']
handler.owner   = true
handler.group   = true
handler.noLimit = true
handler.tags    = ['owner']
handler.help    = ['self on/off/status', 'public — nonaktifkan self mode']

export default handler