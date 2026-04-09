// @ts-nocheck
import axios from 'axios'

const handler = async (m: any, { Morela, reply, fkontak }: any) => {
  await Morela.sendMessage(m.chat, { react: { text: "📖", key: m.key } })

  try {
    const { data } = await axios.get(
      "https://raw.githubusercontent.com/codexsharing/botfitur/refs/heads/main/QUOTES.json",
      { timeout: 15000 }
    )

    if (!Array.isArray(data) || !data.length) throw new Error("Data quotes kosong")

    const r = data[Math.floor(Math.random() * data.length)]

    const quote    = r.quote    || '-'
    const author   = r.author   || 'Unknown'
    const category = r.category || 'General'

    const wrappedQuote = quote.length > 80
      ? quote.match(/.{1,75}(\s|$)/g).map((l: unknown) => `│  ${l.trim()}`).join('\n')
      : `│  ${quote}`

    const teks =
`╭──「 ✨ *Random Quote* 」
│
${wrappedQuote}
│
├──「 📋 *Info* 」
│
│  ✍️ *Penulis*   » ${author}
│  📂 *Kategori* » ${category}
│
╰─────────────────────
_© Morela Bot_`

    await Morela.sendMessage(m.chat, { text: teks }, { quoted: fkontak || m })
    await Morela.sendMessage(m.chat, { react: { text: "✅", key: m.key } })

  } catch (err) {
    console.error('[QUOTE ERROR]', (err as Error).message)
    await Morela.sendMessage(m.chat, { react: { text: "❌", key: m.key } })
    return reply(
`╭──「 ❌ *Gagal Mengambil Quote* 」
│
│  ${(err as Error).message}
╰─────────────────────`
    )
  }
}

handler.help    = ['quote']
handler.tags    = ['fun']
handler.command = ['quote', 'quotes', 'randomquote']

export default handler