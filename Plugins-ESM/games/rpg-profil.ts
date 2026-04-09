// @ts-nocheck


import {
    getUser,
    getUsers,
    updateUser,
    isRegistered
} from '../../Database/db.js'

import { botName } from '../../Library/utils.js'

const ROLES = [
    { name: 'Coal',     minLevel: 0  },
    { name: 'Iron',     minLevel: 10 },
    { name: 'Gold',     minLevel: 25 },
    { name: 'Diamond',  minLevel: 50 },
    { name: 'Emerald',  minLevel: 75 },
    { name: 'Obsidian', minLevel: 100 }
]

const EXP_PER_LEVEL = 20000

function getDefaultRpg() {
    return {
        level:          0,
        exp:            0,
        max_health:     100,
        health:         100,
        balance:        1000,
        bank:           0,
        diamond:        0,
        gold:           0,
        limit_item:     0,
        armor:          'Leather Armor',
        sword:          'Wooden Sword',
        pickaxe:        'Wooden Pickaxe',
        apel:           20,
        potion:         10,
        dungeon_active: true,
        mining_active:  true
    }
}

function getRole(level: unknown) {
    let role = ROLES[0].name
    for (const r of ROLES) {
        if (level >= r.minLevel) role = r.name
    }
    return role
}

function getMaxExp(level: unknown) {
    return (level + 1) * EXP_PER_LEVEL
}

function expBar(exp: unknown, maxExp: unknown, len: unknown = 10) {
    const fill = Math.round((exp / maxExp) * len)
    return '▰'.repeat(fill) + '▱'.repeat(len - fill)
}

function getRankings(userJid: unknown, field: unknown) {
    const all    = Object.values(getUsers())
    const sorted = [...all].sort((a, b) => (b[field] || 0) - (a[field] || 0))
    const rank   = sorted.findIndex(u => u.jid === userJid) + 1
    return { rank: rank || all.length, total: all.length }
}

const handler = async (m: any, { Morela, reply, isOwn, senderJid, fkontak }: any) => {
    const from    = m.chat
    const userJid = senderJid || m.sender || m.key.remoteJid

    if (!isOwn && !isRegistered(userJid)) {
        return reply(
            `╭╌╌⬡「 ❌ *ʙᴇʟᴜᴍ ᴛᴇʀᴅᴀꜰᴛᴀʀ* 」\n` +
            `┃\n` +
            `┃ ◦ Daftar dulu: *.daftar nama.umur*\n` +
            `┃\n` +
            `╰╌╌⬡\n\n꒰ © ${botName} ꒱`
        )
    }

    const data = isOwn
        ? { name: m.pushName || 'Owner', number: userJid.split('@')[0], jid: userJid, is_premium: 1 }
        : getUser(userJid)

    if (!data) return reply(`❌ Data tidak ditemukan.`)

    if (!isOwn && data.level === undefined) {
        const defaults = getDefaultRpg()
        updateUser(userJid, defaults)
        Object.assign(data, defaults)
    }

    const rpg = isOwn ? {
        level:          999,
        exp:            999999,
        max_health:     999,
        health:         999,
        balance:        999999999,
        bank:           999999999,
        diamond:        999999,
        gold:           999999,
        limit_item:     999,
        armor:          '⚡ God Armor',
        sword:          '⚡ God Sword',
        pickaxe:        '⚡ God Pickaxe',
        apel:           999,
        potion:         999,
        dungeon_active: true,
        mining_active:  true
    } : {
        level:          data.level          ?? 0,
        exp:            data.exp            ?? 0,
        max_health:     data.max_health     ?? 100,
        health:         data.health         ?? 100,
        balance:        data.balance        ?? 1000,
        bank:           data.bank           ?? 0,
        diamond:        data.diamond        ?? 0,
        gold:           data.gold           ?? 0,
        limit_item:     data.limit_item     ?? 0,
        armor:          data.armor          ?? 'Leather Armor',
        sword:          data.sword          ?? 'Wooden Sword',
        pickaxe:        data.pickaxe        ?? 'Wooden Pickaxe',
        apel:           data.apel           ?? 20,
        potion:         data.potion         ?? 10,
        dungeon_active: data.dungeon_active ?? true,
        mining_active:  data.mining_active  ?? true
    }

    const role      = isOwn ? '⚡ OP' : getRole(rpg.level)
    const maxExp    = getMaxExp(rpg.level)
    const bar       = isOwn ? '▰'.repeat(10) : expBar(rpg.exp, maxExp)
    const statusStr = isOwn ? '*OP*' : data.is_premium ? '*Premium* 💎' : '*Free*'
    const pushname  = data.name || m.pushName || 'User'
    const tag       = `@${data.number || userJid.split('@')[0]}`

    let rankChip, rankMoney, rankBank, rankLevel, rankDiamond, rankGold, totalUser
    if (isOwn) {
        totalUser   = Object.keys(getUsers()).length
        rankChip    = rankMoney = rankBank = rankLevel = rankDiamond = rankGold = 1
    } else {
        totalUser             = Object.keys(getUsers()).length
        const rChip           = getRankings(userJid, 'gold')
        const rMoney          = getRankings(userJid, 'balance')
        const rBank           = getRankings(userJid, 'bank')
        const rLevel          = getRankings(userJid, 'level')
        const rDiamond        = getRankings(userJid, 'diamond')
        const rGold           = getRankings(userJid, 'gold')
        rankChip    = rChip.rank
        rankMoney   = rMoney.rank
        rankBank    = rBank.rank
        rankLevel   = rLevel.rank
        rankDiamond = rDiamond.rank
        rankGold    = rGold.rank
    }

    const balanceStr = `Rp ${rpg.balance.toLocaleString('id-ID')}`
    const bankStr    = `Rp ${rpg.bank.toLocaleString('id-ID')}`

    const text =
        `╭━━━━━━━━━━━━━━━╮\n` +
        `┃ 👤 *ᴘʀᴏꜰɪʟ ᴘᴇɴɢɢᴜɴᴀ*\n` +
        `╰━━━━━━━━━━━━━━━╯\n\n` +
        `🏷️ Name: *${pushname}*\n` +
        `🆔 Tag: ${tag}\n` +
        `👑 Status: ${statusStr}\n\n` +

        `╭┈┈⬡「 ⚔️ *ʀᴘɢ ꜱᴛᴀᴛꜱ* 」\n` +
        `┃ 🛡️ ʀᴏʟᴇ: *${role}*\n` +
        `┃ 📊 ʟᴇᴠᴇʟ: *${rpg.level}*\n` +
        `┃ 🚄 ᴇxᴘ: *${rpg.exp.toLocaleString('id-ID')} / ${maxExp.toLocaleString('id-ID')}*\n` +
        `┃ ${bar}\n` +
        `┃\n` +
        `┃ ❤️ ʜᴇᴀʟᴛʜ: *${rpg.health} / ${rpg.max_health}*\n` +
        `╰┈┈┈┈┈┈┈┈⬡\n\n` +

        `╭┈┈⬡「 💰 *ᴀꜱꜱᴇᴛꜱ* 」\n` +
        `┃ 🪙 ʙᴀʟᴀɴᴄᴇ: *${balanceStr}*\n` +
        `┃ 🏦 ʙᴀɴᴋ: *${bankStr}*\n` +
        `┃ 🎟️ ʟɪᴍɪᴛ: *${rpg.limit_item}*\n` +
        `╰┈┈┈┈┈┈┈┈⬡\n\n` +

        `╭┈┈⬡「 🏆 *ᴘᴇʀɪɴɢᴋᴀᴛ* 」\n` +
        `┃ ♋ ᴛᴏᴘ ᴄʜɪᴘ : *${rankChip}* ᴅᴀʀɪ *${totalUser}*\n` +
        `┃ 💰 ᴛᴏᴘ ᴍᴏɴᴇʏ : *${rankMoney}* ᴅᴀʀɪ *${totalUser}*\n` +
        `┃ 🏦 ᴛᴏᴘ ʙᴀɴᴋ : *${rankBank}* ᴅᴀʀɪ *${totalUser}*\n` +
        `┃ 📊 ᴛᴏᴘ ʟᴇᴠᴇʟ : *${rankLevel}* ᴅᴀʀɪ *${totalUser}*\n` +
        `┃ 💎 ᴛᴏᴘ ᴅɪᴀᴍᴏɴᴅ : *${rankDiamond}* ᴅᴀʀɪ *${totalUser}*\n` +
        `┃ 🪙 ᴛᴏᴘ ɢᴏʟᴅ : *${rankGold}* ᴅᴀʀɪ *${totalUser}*\n` +
        `╰┈┈┈┈┈┈┈┈⬡\n\n` +

        `╭┈┈⬡「 🧭 *ᴀᴋᴛɪᴠɪᴛᴀꜱ* 」\n` +
        `┃ *✧ ᴅᴜɴɢᴇᴏɴ* : ${rpg.dungeon_active ? '✅' : '❌'}\n` +
        `┃ *✧ ᴍɪɴɪɴɢ*  : ${rpg.mining_active  ? '✅' : '❌'}\n` +
        `╰┈┈┈┈┈┈┈┈⬡\n\n` +

        `╭┈┈⬡「 🧰 *ᴀʟᴀᴛ* 」\n` +
        `┃ *🥼 ᴀʀᴍᴏʀ:* ${rpg.armor}\n` +
        `┃ *⚔️ ꜱᴡᴏʀᴅ:* ${rpg.sword}\n` +
        `┃ *⛏️ ᴘɪᴄᴋᴀxᴇ:* ${rpg.pickaxe}\n` +
        `╰┈┈┈┈┈┈┈┈⬡\n\n` +

        `╭┈┈⬡「 🎒 *ɪᴛᴇᴍ* 」\n` +
        `┃ *🍎 ᴀᴘᴇʟ:* ${rpg.apel}\n` +
        `┃ *🥤 ᴘᴏᴛɪᴏɴ:* ${rpg.potion}\n` +
        `╰┈┈┈┈┈┈┈┈⬡\n\n` +
        `꒰ © ${botName} ꒱`

    await Morela.sendMessage(from, { text }, { quoted: fkontak || m })
}

handler.command  = ['profil', 'profile', 'me']
handler.tags     = ['games', 'rpg']
handler.help     = ['profil', 'me']
handler.noLimit  = true
handler.owner    = false
handler.premium  = false
handler.group    = false
handler.private  = false
handler.admin    = false
handler.botAdmin = false

export default handler
