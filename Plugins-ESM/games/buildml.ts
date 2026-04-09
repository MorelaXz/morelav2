// @ts-nocheck
import axios from 'axios'
import fs    from 'fs'
import path  from 'path'

const API    = 'https://api.theresav.biz.id/game/ml/build'
const CANVAS = 'https://api.theresav.biz.id/canvas/ml/build'

const API_KEY = 'Fid6P'

const imagePath = path.join(process.cwd(), 'media/menu.jpg')
const botName   = global.botName || 'Morela'

async function getBuild(hero: unknown) {
    const { data } = await axios.get(
        `${API}?apikey=${API_KEY}&hero=${encodeURIComponent(hero)}`,
        { timeout: 15000 }
    )
    if (!data?.status) throw new Error('Hero tidak ditemukan')
    return data
}

const handler = async (m: any, { Morela, text, usedPrefix, command, reply, fkontak }: any) => {

    if (!text) return reply(
`╭──「 ⚔️ *ML Build Finder* 」
│
│  Masukkan nama hero!
│
│  📌 *Contoh:*
│  ${usedPrefix}${command} Gusion
│  ${usedPrefix}${command} Lancelot
│
╰─────────────────────`
    )

    if (text.includes('|')) {
        const [hero, id] = text.split('|').map((s: unknown) => s.trim())
        if (!hero || !id) return reply('❌ Format tidak valid')

        await Morela.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

        try {
            const imgUrl = `${CANVAS}?hero=${encodeURIComponent(hero)}&id=${id}&apikey=${API_KEY}`
            const imgRes = await axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 20000 })
            const buf    = Buffer.from(imgRes.data)

            await Morela.sendMessage(m.chat, {
                image:   buf,
                caption:
                    `⚔️ *Mobile Legends Build*\n` +
                    `Hero: *${hero}*\n\n` +
                    `© ${botName}`
            }, { quoted: fkontak || m })

            await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

        } catch (e) {
            console.error('[MLBUILD CANVAS ERROR]', (e as Error).message)
            await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
            reply('❌ Gagal memuat gambar build. Coba lagi!')
        }
        return
    }

    await Morela.sendMessage(m.chat, { react: { text: '🔍', key: m.key } })

    try {
        const res    = await getBuild(text) as Record<string, any>
        const hero   = res.hero.name
        const builds = res.builds

        if (!builds || !builds.length) {
            await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
            return reply(`❌ Tidak ada build tersedia untuk *${hero}*`)
        }

        const rows = builds.slice(0, 10).map((b, i) => ({
            title:       `Build ${i + 1} — ${(b.title || 'ML Build').slice(0, 30)}`,
            description: `👤 ${b.author?.username || 'Unknown'}`,
            id:          `${usedPrefix}${command} ${hero}|${b.id}`
        }))

        const menuBuffer = fs.existsSync(imagePath) ? fs.readFileSync(imagePath) : null

        const footer =
`╭──「 ⚔️ *ML Build Finder* 」
│
│  🦸 Hero  » *${hero}*
│  🏷️ Role  » ${res.hero.roles?.join(', ') || '-'}
│  📦 Build » *${res.total_builds} tersedia*
│
╰─────────────────────
_Pilih build untuk melihat item_ 👇
© ${botName}`

        await Morela.sendMessage(m.chat, {
            ...(menuBuffer
                ? { image: menuBuffer, caption: ' ' }
                : { text: ' ' }
            ),
            footer,
            interactiveButtons: [
                {
                    name: 'single_select',
                    buttonParamsJson: JSON.stringify({
                        title: '⚔️ Pilih Build Hero',
                        sections: [{
                            title: `${hero} — ${res.hero.roles?.[0] || 'ML'}`,
                            rows
                        }]
                    })
                }
            ],
            hasMediaAttachment: !!menuBuffer
        }, { quoted: fkontak || m })

        await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

    } catch (e) {
        console.error('[MLBUILD ERROR]', (e as Error).message)
        await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        reply(`❌ ${(e as Error).message || 'Gagal mencari build hero'}`)
    }
}

handler.help    = ['mlbuild <hero>']
handler.tags    = ['game']
handler.command = ['mlbuild', 'ml']

export default handler