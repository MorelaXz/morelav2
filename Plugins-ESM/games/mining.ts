// @ts-nocheck


import { getUser, updateUser, setPremium, isRegistered } from '../../Database/db.js'
import { getUserDailyLimit }                              from '../../Database/usagelimit.js'
import { botName }                                        from '../../Library/utils.js'

const COOLDOWN_MS    = 30 * 60 * 1000  
const PREMIUM_LEVEL  = 70              


function getMaxExp(level: unknown) {
    return (level + 1) * 20000
}

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

const DROP_TABLE = [
    
    { expMin: 50,   expMax: 200,  goldMin: 10,  goldMax: 60,   diamondChance: 2,  apelChance: 35, potionChance: 10 },
    
    { expMin: 150,  expMax: 400,  goldMin: 40,  goldMax: 150,  diamondChance: 5,  apelChance: 30, potionChance: 15 },
    
    { expMin: 300,  expMax: 700,  goldMin: 100, goldMax: 300,  diamondChance: 10, apelChance: 25, potionChance: 20 },
    
    { expMin: 600,  expMax: 1200, goldMin: 200, goldMax: 500,  diamondChance: 15, apelChance: 20, potionChance: 25 },
    
    { expMin: 1000, expMax: 2000, goldMin: 350, goldMax: 800,  diamondChance: 22, apelChance: 15, potionChance: 30 },
    
    { expMin: 1800, expMax: 3500, goldMin: 600, goldMax: 1500, diamondChance: 35, apelChance: 10, potionChance: 35 }
]

function randInt(min: unknown, max: unknown) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

function rollChance(pct: number) {
    return Math.random() * 100 < pct
}

function getDrops(level: unknown) {
    const tier  = Math.min(Math.floor(level / 15), DROP_TABLE.length - 1)
    const table = DROP_TABLE[tier]

    const exp     = randInt(table.expMin, table.expMax)
    const gold    = randInt(table.goldMin, table.goldMax)
    const diamond = rollChance(table.diamondChance) ? randInt(1, tier + 1) : 0
    const apel    = rollChance(table.apelChance)    ? randInt(1, 3) : 0
    const potion  = rollChance(table.potionChance)  ? 1 : 0

    return { exp, gold, diamond, apel, potion }
}

function processLevelUp(currentLevel: unknown, currentExp: unknown) {
    let level    = currentLevel
    let exp      = currentExp
    const levels = []  

    while (true) {
        const maxExp = getMaxExp(level)
        if (exp >= maxExp) {
            exp -= maxExp
            level++
            levels.push(level)
        } else {
            break
        }
    }

    return { level, exp, levelUps: levels }
}

function ensureRpgDefaults(data: unknown[]) {
    return {
        level:          data.level          ?? 0,
        exp:            data.exp            ?? 0,
        max_health:     data.max_health     ?? 100,
        health:         data.health         ?? 100,
        balance:        data.balance        ?? 1000,
        bank:           data.bank           ?? 0,
        gold:           data.gold           ?? 0,
        diamond:        data.diamond        ?? 0,
        limit_item:     data.limit_item     ?? 0,
        armor:          data.armor          ?? 'Leather Armor',
        sword:          data.sword          ?? 'Wooden Sword',
        pickaxe:        data.pickaxe        ?? 'Wooden Pickaxe',
        apel:           data.apel           ?? 20,
        potion:         data.potion         ?? 10,
        dungeon_active: data.dungeon_active ?? true,
        mining_active:  data.mining_active  ?? true,
        last_mining:    data.last_mining    ?? 0
    }
}

function formatCooldown(ms: number) {
    const totalSec = Math.ceil(ms / 1000)
    const mnt      = Math.floor(totalSec / 60)
    const det      = totalSec % 60
    if (mnt > 0) return `${mnt} menit ${det} detik`
    return `${det} detik`
}

const handler = async (m: any, { Morela, reply, isOwn, isPrem, senderJid, fkontak }: any) => {
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

    const rawData = getUser(userJid) || {}
    const rpg     = ensureRpgDefaults(rawData)

    const now      = Date.now()
    const sisaMs   = COOLDOWN_MS - (now - (rpg.last_mining || 0))
    if (sisaMs > 0 && !isOwn) {
        return reply(
            `╭╌╌⬡「 ⏳ *ᴄᴏᴏʟᴅᴏᴡɴ ᴍɪɴɪɴɢ* 」\n` +
            `┃\n` +
            `┃ ◦ ⛏️ Kamu baru saja mining!\n` +
            `┃ ◦ ⏰ Tunggu: *${formatCooldown(sisaMs)}*\n` +
            `┃\n` +
            `╰╌╌⬡\n\n꒰ © ${botName} ꒱`
        )
    }

    const drops = getDrops(rpg.level)

    const newGold    = rpg.gold    + drops.gold
    const newDiamond = rpg.diamond + drops.diamond
    const newApel    = rpg.apel    + drops.apel
    const newPotion  = rpg.potion  + drops.potion

    const newTotalExp               = rpg.exp + drops.exp
    const { level: newLevel, exp: newExp, levelUps } = processLevelUp(rpg.level, newTotalExp)

    const maxExp     = getMaxExp(newLevel)
    const oldLimit   = getUserDailyLimit(rpg.level)
    const newLimit   = getUserDailyLimit(newLevel)
    const tierUp     = newLimit > oldLimit  
    const gotPremium = !isPrem && !isOwn && newLevel >= PREMIUM_LEVEL && rpg.level < PREMIUM_LEVEL

    const updateData = {
        level:       newLevel,
        exp:         newExp,
        gold:        newGold,
        diamond:     newDiamond,
        apel:        newApel,
        potion:      newPotion,
        last_mining: now
    }

    if (rawData.level === undefined) {
        Object.assign(updateData, {
            max_health:     rpg.max_health,
            health:         rpg.health,
            balance:        rpg.balance,
            bank:           rpg.bank,
            limit_item:     rpg.limit_item,
            armor:          rpg.armor,
            sword:          rpg.sword,
            pickaxe:        rpg.pickaxe,
            dungeon_active: rpg.dungeon_active,
            mining_active:  rpg.mining_active
        })
    }

    updateUser(userJid, updateData)

    if (gotPremium) setPremium(userJid, 1)

    const expFill = Math.min(10, Math.round((newExp / maxExp) * 10))
    const expBar  = '▰'.repeat(expFill) + '▱'.repeat(10 - expFill)

    const itemLines = []
    itemLines.push(`┃ ⚡ ᴇxᴘ     : *+${drops.exp.toLocaleString('id-ID')}*`)
    itemLines.push(`┃ 🪙 ɢᴏʟᴅ    : *+${drops.gold}*`)
    if (drops.diamond > 0) itemLines.push(`┃ 💎 ᴅɪᴀᴍᴏɴᴅ : *+${drops.diamond}* ✨`)
    if (drops.apel    > 0) itemLines.push(`┃ 🍎 ᴀᴘᴇʟ     : *+${drops.apel}*`)
    if (drops.potion  > 0) itemLines.push(`┃ 🥤 ᴘᴏᴛɪᴏɴ   : *+${drops.potion}*`)

    let text =
        `╭╌╌⬡「 ⛏️ *ʜᴀꜱɪʟ ᴍɪɴɪɴɢ* 」\n` +
        `┃\n` +
        `┃ 👤 *${rawData.name || m.pushName || 'User'}*\n` +
        `┃ 🛡️ Role: *${getRole(newLevel)}* | Lv *${newLevel}*\n` +
        `┃\n` +
        `┃ ─── 📦 *Drop* ───\n` +
        itemLines.join('\n') + '\n' +
        `┃\n` +
        `┃ ─── 📊 *EXP* ───\n` +
        `┃ ${expBar}\n` +
        `┃ *${newExp.toLocaleString('id-ID')} / ${maxExp.toLocaleString('id-ID')}*\n` +
        `┃\n` +
        `┃ ⏰ Mining lagi dalam *30 menit*\n` +
        `╰╌╌⬡\n`

    if (levelUps.length > 0) {
        text += `\n🎉 *LEVEL UP!* ${levelUps.map((l: unknown) => `Lv *${l}*`).join(' → ')}\n`
    }

    if (tierUp) {
        text += `\n🎟️ *LIMIT NAIK!* Limit harianmu sekarang *${newLimit}x/hari*\n`
    }

    if (gotPremium) {
        text += `\n👑 *SELAMAT! Kamu sudah Level ${PREMIUM_LEVEL}!*\n💎 Status Premium aktif secara otomatis!\n`
    }

    text += `\n꒰ © ${botName} ꒱`

    await Morela.sendMessage(from, { text }, { quoted: fkontak || m })
}

handler.command  = ['mining', 'tambang']
handler.tags     = ['games', 'rpg']
handler.help     = ['mining', 'tambang']
handler.noLimit  = true   
handler.owner    = false
handler.premium  = false
handler.group    = false
handler.private  = false
handler.admin    = false
handler.botAdmin = false

export default handler
