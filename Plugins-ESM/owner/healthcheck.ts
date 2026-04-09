// @ts-nocheck


import axios  from 'axios'
import { botName } from '../../Library/utils.js'

const API_ENDPOINTS = [
  
  { name: 'Deline · ATTP/TTP',   plugin: 'attp, ttp, qc, bratvid, stikerbrat',
    url: 'https://api.deline.web.id/maker/attp?text=test',        expect: [200, 400, 422] },
  { name: 'Deline · Brat',       plugin: 'brat, bratoriginal',
    url: 'https://api.deline.web.id/maker/brat?text=test',        expect: [200, 400, 422] },
  { name: 'Deline · Canvas',     plugin: 'welcome, goodbye',
    url: 'https://api.deline.web.id/canvas/goodbye?name=test&group=test&img=https://picsum.photos/100', expect: [200, 400] },
  { name: 'Deline · FakeML',     plugin: 'fakeml',
    url: 'https://api.deline.web.id/maker/fakeml?text=test',      expect: [200, 400, 422] },
  { name: 'Deline · FakeTweet',  plugin: 'faketweet',
    url: 'https://api.deline.web.id/maker/faketweet2?username=test&text=test', expect: [200, 400] },
  { name: 'Deline · FakeStory',  plugin: 'fakestory',
    url: 'https://api.deline.web.id/maker/fakestory',             expect: [200, 400, 405] },
  { name: 'Deline · IQC',        plugin: 'iqc',
    url: 'https://api.deline.web.id/maker/iqc',                   expect: [200, 400, 405] },
  { name: 'Deline · EmojiMix',   plugin: 'emojimix',
    url: 'https://api.deline.web.id/maker/emojimix',              expect: [200, 400, 405] },
  { name: 'Deline · Uploader',   plugin: 'discord',
    url: 'https://api.deline.web.id/uploader',                    expect: [200, 400, 405] },
  { name: 'Deline · IG DL',      plugin: 'ig (fallback)',
    url: 'https://api.deline.web.id/downloader/ig?url=test',      expect: [200, 400] },

  
  { name: 'Kazztzyy · Pinterest', plugin: 'pin',
    url: 'https://kazztzyy.my.id/api/search/pinterest?q=test',    expect: [200] },
  { name: 'Kazztzyy · FakeDev',  plugin: 'fakedev',
    url: 'https://kazztzyy.my.id/api/maker/fakedev2?url=test',    expect: [200, 400] },
  { name: 'Kazztzyy · FakeFF',   plugin: 'fakeff',
    url: 'https://kazztzyy.my.id/api/maker/fakeff',               expect: [200, 400, 405] },
  { name: 'Kazztzyy · BratGura', plugin: 'bratgura',
    url: 'https://kazztzyy.my.id/api/maker/bratgura',             expect: [200, 400, 405] },

  
  { name: 'Theresav · Spotify',  plugin: 'spotify',
    url: 'https://api.theresav.biz.id/search/spotify?q=test',     expect: [200, 400, 401] },
  { name: 'Theresav · GenArt',   plugin: 'genmart',
    url: 'https://api.theresav.biz.id/image/genmyart',            expect: [200, 400, 405] },
  { name: 'Theresav · ML Build', plugin: 'buildml',
    url: 'https://api.theresav.biz.id/game/ml/build',             expect: [200, 400, 405] },

  
  { name: 'Nekolabs · Carbon',   plugin: 'carbon',
    url: 'https://api.nekolabs.web.id/canvas/carbonify',          expect: [200, 400, 405] },

  
  { name: 'Neoxr · LineSticker', plugin: 'stikerline',
    url: 'https://api.neoxr.eu/api/linesticker?url=test',         expect: [200, 400] },
  { name: 'Neoxr · ShortLink',   plugin: 'skiplink',
    url: 'https://api.neoxr.eu/api/shortlink?url=https://google.com', expect: [200, 400] },

  
  { name: 'Cuki · Flaming',      plugin: 'flaming',
    url: 'https://api.cuki.biz.id/api/flaming/flamingtext?apikey=cuki-x&text=test', expect: [200, 400, 404] },

  
  { name: 'Aladhan · Jadwal',    plugin: 'jadwal',
    url: 'https://api.aladhan.com/v1/timingsByCity?city=Jakarta&country=ID&method=11', expect: [200] },

  
  { name: 'Waifu.pics',          plugin: 'nsfw (sfw mode)',
    url: 'https://api.waifu.pics/sfw/waifu',                      expect: [200] },
  { name: 'Rule34',              plugin: 'nsfw',
    url: 'https://rule34.xxx/index.php?page=dapi&s=post&q=index&limit=1&tags=test', expect: [200, 301, 302] },

  
  { name: 'TikWM · Feed Search', plugin: 'ptv',
    url: 'https://tikwm.com/api/feed/search?keywords=test&count=1', expect: [200, 400] },
  { name: 'TikTokDL',            plugin: 'tiktok',
    url: 'https://tiktokdl.app/id',                               expect: [200, 301, 302] },

  
  { name: 'Fdownloader',         plugin: 'fb',
    url: 'https://v3.fdownloader.net/api/ajaxSearch',             expect: [200, 400, 405] },

  
  { name: 'Downr.org',           plugin: 'alldownload',
    url: 'https://downr.org',                                     expect: [200, 301, 302] },

  
  { name: 'SoundCloud API',      plugin: 'soundcloud',
    url: 'https://api-mobi.soundcloud.com/search/tracks?q=test&client_id=KKzJxmw11tYpCs6T24P4uUYhqmjalG6M&limit=1', expect: [200, 401, 403] },

  
  { name: 'Catbox',              plugin: 'upload',
    url: 'https://catbox.moe',                                    expect: [200, 301, 302] },
  { name: 'Tmpfiles',            plugin: 'upload',
    url: 'https://tmpfiles.org',                                  expect: [200, 301, 302] },
  { name: 'Pixhost',             plugin: 'upload',
    url: 'https://api.pixhost.to/images',                         expect: [200, 400, 405] },
  { name: 'ImgBB',               plugin: 'fakedev, fakeml, undress',
    url: 'https://api.imgbb.com',                                 expect: [200, 400] },

  
  { name: 'ILoveIMG',            plugin: 'hdv2',
    url: 'https://api1g.iloveimg.com/v1/upload',                  expect: [200, 400, 401] },
  { name: 'PixelCut · RemoveBG', plugin: 'removebg',
    url: 'https://api2.pixelcut.app/image/matte/v1',              expect: [200, 400, 401, 405] },
  { name: 'PicsArt · Upload',    plugin: 'hdv1, bratoriginal',
    url: 'https://upload.picsart.com/files',                      expect: [200, 400, 401, 405] },
  { name: 'Wink.ai',             plugin: 'hd',
    url: 'https://wink.ai',                                       expect: [200, 301, 302] },
  { name: 'UnblurImage',         plugin: 'hdvid',
    url: 'https://api.unblurimage.ai',                            expect: [200, 301, 302, 404] },

  
  { name: 'Math-GPT',            plugin: 'mathgpt',
    url: 'https://math-gpt.pro',                                  expect: [200, 301, 302] },
  { name: 'Ryuu-Dev AI',         plugin: 'autoai2',
    url: 'https://api.ryuu-dev.offc.my.id/ai/mahiru-ai?text=test', expect: [200, 400] },
  { name: 'Dyysilence AI',       plugin: 'toblack, tobotak, tofigura, removewm, klingai',
    url: 'https://api.dyysilence.biz.id/api',                     expect: [200, 400, 404, 405] },
  { name: 'Live3D AI',           plugin: 'image',
    url: 'https://app.live3d.io/aitools/of/prompt/optimize',      expect: [200, 400, 401, 405] },
  { name: 'HuggingFace · NSFW',  plugin: 'img',
    url: 'https://opparco-wainsfwillustrious-v120.hf.space',      expect: [200, 301, 302] },

  
  { name: 'TempMail Generator',  plugin: 'tempmail',
    url: 'https://generator.email/',                              expect: [200, 301, 302] },
  { name: 'Alterarchive',        plugin: 'undress',
    url: 'https://alterarchive.vercel.app',                       expect: [200, 404, 451] },
  { name: 'Mediafire',           plugin: 'mediafire',
    url: 'https://www.mediafire.com',                             expect: [200, 301, 302] },
  { name: 'Ephoto360',           plugin: 'ephoto',
    url: 'https://en.ephoto360.com/effect/create-image',          expect: [200, 400, 405] },
]

async function checkEndpoint(endpoint: unknown) {
  const start = Date.now()
  try {
    const res = await axios.get(endpoint.url, {
      timeout       : 8000,
      validateStatus: () => true,
      headers       : { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36' },
      maxRedirects  : 3
    })
    const ms = Date.now() - start
    const ok = endpoint.expect.includes(res.status)
    return { name: endpoint.name, plugin: endpoint.plugin, ok, status: res.status, ms }
  } catch (e) {
    const ms = Date.now() - start
    return { name: endpoint.name, plugin: endpoint.plugin, ok: false, status: e.code || 'ERR', ms }
  }
}

const handler = async (m: any, { Morela, reply }: any) => {
  await Morela.sendMessage(m.chat, { react: { text: '🔍', key: m.key } })

  const total   = API_ENDPOINTS.length
  const domains = new Set(API_ENDPOINTS.map((e: unknown) => e.url.split('/')[2])).size
  const eta     = Math.ceil(total * 0.4)

  await Morela.sendMessage(m.chat, {
    text: `⏳ Mengecek *${total} endpoint* dari *${domains} domain*...\nETA ~${eta}s`
  }, { quoted: m })

  const BATCH   = 6
  const results = []
  for (let i = 0; i < API_ENDPOINTS.length; i += BATCH) {
    const batch = API_ENDPOINTS.slice(i, i + BATCH)
    const res   = await Promise.all(batch.map(checkEndpoint))
    results.push(...res)
  }

  const online  = results.filter((r: unknown) => r.ok)
  const offline = results.filter((r: unknown) => !r.ok)
  const avgMs   = Math.round(results.reduce((s, r) => s + r.ms, 0) / results.length)

  let teks = `╭━━━━━━━━━━━━━━━━━━━━╮\n`
  teks    += `┃  🏥 *API HEALTH CHECK*\n`
  teks    += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`

  teks += `📊 *Ringkasan*\n`
  teks += `┌─────────────────────\n`
  teks += `│ ✅ Online  : *${online.length}/${total}*\n`
  teks += `│ ❌ Offline : *${offline.length}/${total}*\n`
  teks += `│ ⚡ Avg Ping : *${avgMs}ms*\n`
  teks += `└─────────────────────\n\n`

  if (offline.length > 0) {
    teks += `❌ *API Bermasalah*\n`
    teks += `┌─────────────────────\n`
    for (const r of offline) {
      teks += `│ • *${r.name}*\n`
      teks += `│   ↳ _${r.plugin}_ — \`${r.status}\` (${r.ms}ms)\n`
    }
    teks += `└─────────────────────\n\n`
  }

  teks += `✅ *API Online (${online.length})*\n`
  teks += `┌─────────────────────\n`
  for (const r of online) {
    const dot = r.ms < 500 ? '🟢' : r.ms < 1500 ? '🟡' : '🔴'
    teks += `│ ${dot} ${r.name} (${r.ms}ms)\n`
  }
  teks += `└─────────────────────\n`
  teks += `\n© ${botName}`

  await Morela.sendMessage(m.chat, { text: teks }, { quoted: m })
  await Morela.sendMessage(m.chat, {
    react: { text: offline.length === 0 ? '✅' : offline.length <= 3 ? '⚠️' : '❌', key: m.key }
  })
}

handler.command = ['healthcheck', 'health', 'apicheck']
handler.owner   = true
handler.tags    = ['owner']
handler.help    = ['healthcheck — cek semua API yang dipakai bot']
handler.noLimit = true

export default handler