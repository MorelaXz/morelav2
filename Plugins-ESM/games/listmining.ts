// @ts-nocheck


import { getUsers } from '../../Database/db.js'
import { botName }  from '../../Library/utils.js'

function getRole(level: unknown) {
    const roles = [
        { min: 0,   name: 'Coal'     },
        { min: 10,  name: 'Iron'     },
        { min: 25,  name: 'Gold'     },
        { min: 50,  name: 'Diamond'  },
        { min: 75,  name: 'Emerald'  },
        { min: 100, name: 'Obsidian' }
    ]
    let role = roles[0].name
    for (const r of roles) {
        if (level >= r.min) role = r.name
    }
    return role
}

function getMaxExp(level: unknown) {
    return (level + 1) * 20000
}

const handler = async (m: any, { reply, fkontak, Morela }: any) => {

    const allUsers = Object.values(getUsers())

    const rpgUsers = allUsers
        .filter((u: unknown) => u.level !== undefined)
        .sort((a, b) => (b.level || 0) - (a.level || 0))

    if (rpgUsers.length === 0) {
        return reply(
            `╭╌╌⬡「 📋 *ʟɪꜱᴛ ᴍɪɴɪɴɢ* 」\n` +
            `┃\n` +
            `┃ ◦ Belum ada user yang mining\n` +
            `┃\n` +
            `╰╌╌⬡\n\n꒰ © ${botName} ꒱`
        )
    }

    const PAGE_SIZE = 10
    const chunks    = []
    for (let i = 0; i < rpgUsers.length; i += PAGE_SIZE) {
        chunks.push(rpgUsers.slice(i, i + PAGE_SIZE))
    }

    for (let ci = 0; ci < chunks.length; ci++) {
        const chunk   = chunks[ci]
        const pageNum = chunks.length > 1 ? ` (${ci + 1}/${chunks.length})` : ''

        let txt =
            `╭╌╌⬡「 ⛏️ *ʟɪꜱᴛ ᴍɪɴɪɴɢ${pageNum}* 」\n` +
            `┃ 📊 Total: *${rpgUsers.length} user*\n` +
            `┃\n`

        chunk.forEach((u, i) => {
            const no      = ci * PAGE_SIZE + i + 1
            const level   = u.level   || 0
            const exp     = u.exp     || 0
            const maxExp  = getMaxExp(level)
            const role    = getRole(level)
            const armor   = u.armor   || 'Leather Armor'
            const sword   = u.sword   || 'Wooden Sword'
            const pickaxe = u.pickaxe || 'Wooden Pickaxe'
            const prem    = u.is_premium ? ' 💎' : ''

            txt +=
                `┃ *${no}.* ${u.name || 'User'}${prem}\n` +
                `┃  📱 +${u.number || u.jid?.replace('@s.whatsapp.net', '')}\n` +
                `┃  🛡️ Role: *${role}* | Lv *${level}*\n` +
                `┃  🚄 EXP: *${exp.toLocaleString('id-ID')} / ${maxExp.toLocaleString('id-ID')}*\n` +
                `┃  🥼 ${armor}\n` +
                `┃  ⚔️ ${sword}\n` +
                `┃  ⛏️ ${pickaxe}\n` +
                `┃\n`
        })

        txt += `╰╌╌⬡\n\n꒰ © ${botName} ꒱`

        await Morela.sendMessage(m.chat, { text: txt }, { quoted: fkontak || m })
        if (ci < chunks.length - 1) await new Promise(r => setTimeout(r, 500))
    }
}

handler.command  = ['listmining', 'lsmining']
handler.tags     = ['games', 'rpg']
handler.help     = ['listmining']
handler.noLimit  = true
handler.owner    = true
handler.premium  = false
handler.group    = false
handler.private  = false
handler.admin    = false
handler.botAdmin = false

export default handler
