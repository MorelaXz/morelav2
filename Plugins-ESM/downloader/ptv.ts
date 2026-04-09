import axios from "axios"

async function tiktokSearchVideo(query: Record<string, unknown>) {
  const res = await axios("https://tikwm.com/api/feed/search", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      cookie: "current_language=en",
      "User-Agent": "Mozilla/5.0"
    },
    data: new URLSearchParams({
      keywords: String(query),
      count: '12',
      cursor: '0',
      web: '1',
      hd: '1'
    }).toString()
  })
  return res.data.data
}

const handler = async (m: any, { Morela, text, command, reply, fkontak }: any) => {
  if (!text) return reply(`Contoh:\n.${command} kucing lucu`)

  const jid = m.chat

  try {
    const search = await tiktokSearchVideo(text)
    if (!search.videos || search.videos.length === 0) {
      return reply("❌ Video tidak ditemukan")
    }

    const v = search.videos[0]

    await Morela.sendMessage(jid, {
      video: { url: `https://tikwm.com${v.play}` },
      mimetype: "video/mp4",
      ptv: true 
    }, { quoted: fkontak || m })

    await Morela.sendMessage(jid, {
      react: { text: "✅", key: m.key }
    })
    
  } catch (e) {
    console.error('[PTV Error]:', e)
    await reply(`❌ Error: ${(e as Error).message}`)
  }
}

handler.command = ["ptv"]
handler.tags = ["downloader"]
handler.help = ["ptv <query>"]

export default handler