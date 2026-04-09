// @ts-nocheck
import axios from 'axios'
import * as cheerio from 'cheerio'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36'

async function ephoto(url: string, text: string) {
  const getPage = await axios.get(url, {
    headers: { 'user-agent': UA },
    timeout: 20000
  })

  const $ = cheerio.load(getPage.data)
  const token           = $('input[name=token]').val()
  const build_server    = $('input[name=build_server]').val()
  const build_server_id = $('input[name=build_server_id]').val()

  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2)

  const formData = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="text[]"',
    '',
    text,
    `--${boundary}`,
    'Content-Disposition: form-data; name="token"',
    '',
    token,
    `--${boundary}`,
    'Content-Disposition: form-data; name="build_server"',
    '',
    build_server,
    `--${boundary}`,
    'Content-Disposition: form-data; name="build_server_id"',
    '',
    build_server_id,
    `--${boundary}--`,
    ''
  ].join('\r\n')

  const post = await axios({
    url,
    method: 'POST',
    data: formData,
    headers: {
      Accept: '*/*',
      'user-agent': UA,
      cookie: getPage.headers['set-cookie']?.join('; '),
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    },
    timeout: 20000
  })

  const $$ = cheerio.load(post.data)
  const json = JSON.parse($$('input[name=form_value_input]').val())
  json['text[]'] = json.text
  delete json.text

  const { data } = await axios.post(
    'https://en.ephoto360.com/effect/create-image',
    new URLSearchParams(json),
    {
      headers: {
        'user-agent': UA,
        cookie: getPage.headers['set-cookie']?.join('; ')
      },
      timeout: 30000
    }
  )

  return build_server + data.image
}

const URLS = {
  glitchtext:           'https://en.ephoto360.com/create-digital-glitch-text-effects-online-767.html',
  writetext:            'https://en.ephoto360.com/write-text-on-wet-glass-online-589.html',
  advancedglow:         'https://en.ephoto360.com/advanced-glow-effects-74.html',
  typographytext:       'https://en.ephoto360.com/create-typography-text-effect-on-pavement-online-774.html',
  pixelglitch:          'https://en.ephoto360.com/create-pixel-glitch-text-effect-online-769.html',
  neonglitch:           'https://en.ephoto360.com/create-impressive-neon-glitch-text-effects-online-768.html',
  flagtext:             'https://en.ephoto360.com/nigeria-3d-flag-text-effect-online-free-753.html',
  flag3dtext:           'https://en.ephoto360.com/free-online-american-flag-3d-text-effect-generator-725.html',
  deletingtext:         'https://en.ephoto360.com/create-eraser-deleting-text-effect-online-717.html',
  blackpinkstyle:       'https://en.ephoto360.com/online-blackpink-style-logo-maker-effect-711.html',
  glowingtext:          'https://en.ephoto360.com/create-glowing-text-effects-online-706.html',
  underwatertext:       'https://en.ephoto360.com/3d-underwater-text-effect-online-682.html',
  logomaker:            'https://en.ephoto360.com/free-bear-logo-maker-online-673.html',
  cartoonstyle:         'https://en.ephoto360.com/create-a-cartoon-style-graffiti-text-effect-online-668.html',
  papercutstyle:        'https://en.ephoto360.com/multicolor-3d-paper-cut-style-text-effect-658.html',
  watercolortext:       'https://en.ephoto360.com/create-a-watercolor-text-effect-online-655.html',
  effectclouds:         'https://en.ephoto360.com/write-text-effect-clouds-in-the-sky-online-619.html',
  blackpinklogo:        'https://en.ephoto360.com/create-blackpink-logo-online-free-607.html',
  gradienttext:         'https://en.ephoto360.com/create-3d-gradient-text-effect-online-600.html',
  summerbeach:          'https://en.ephoto360.com/write-in-sand-summer-beach-online-free-595.html',
  luxurygold:           'https://en.ephoto360.com/create-a-luxury-gold-text-effect-online-594.html',
  multicoloyellowneon:  'https://en.ephoto360.com/create-multicoloyellow-neon-light-signatures-591.html',
  sandsummer:           'https://en.ephoto360.com/write-in-sand-summer-beach-online-576.html',
  galaxywallpaper:      'https://en.ephoto360.com/create-galaxy-wallpaper-mobile-online-528.html',
  '1917style':          'https://en.ephoto360.com/1917-style-text-effect-523.html',
  makingneon:           'https://en.ephoto360.com/making-neon-light-text-effect-with-galaxy-style-521.html',
  royaltext:            'https://en.ephoto360.com/royal-text-effect-online-free-471.html',
  freecreate:           'https://en.ephoto360.com/free-create-a-3d-hologram-text-effect-441.html',
  galaxystyle:          'https://en.ephoto360.com/create-galaxy-style-free-name-logo-438.html',
  lighteffects:         'https://en.ephoto360.com/create-light-effects-green-neon-online-429.html'
}

const handler = async (m: any, { Morela, command, text, reply, usedPrefix, fkontak }: any) => {
  if (!text) return reply(
`╭──「 🎨 *Text Effect* 」
│
│  Masukkan teks untuk diproses!
│
│  📌 *Cara pakai:*
│  ${usedPrefix}${command} <teks>
│
│  📝 *Contoh:*
│  ${usedPrefix}${command} Morela Bot
│
╰─────────────────────`
  )

  const url = URLS[command]
  if (!url) return reply('❌ Command tidak dikenali.')

  await Morela.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

  try {
    const imageUrl = await ephoto(url, text)

    await Morela.sendMessage(
      m.chat,
      { image: { url: imageUrl }, caption: `✅ *${command}* » _${text}_` },
      { quoted: fkontak || m }
    )

    await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

  } catch (err) {
    console.error('[EPHOTO ERROR]', (err as Error).message)
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    reply('❌ Gagal memproses efek. Coba lagi nanti.')
  }
}

handler.help = [
  'glitchtext', 'writetext', 'advancedglow', 'typographytext',
  'pixelglitch', 'neonglitch', 'flagtext', 'flag3dtext',
  'deletingtext', 'blackpinkstyle', 'glowingtext', 'underwatertext',
  'logomaker', 'cartoonstyle', 'papercutstyle', 'watercolortext',
  'effectclouds', 'blackpinklogo', 'gradienttext', 'summerbeach',
  'luxurygold', 'multicoloyellowneon', 'sandsummer', 'galaxywallpaper',
  '1917style', 'makingneon', 'royaltext', 'freecreate',
  'galaxystyle', 'lighteffects'
]

handler.tags = ['maker']

handler.command = [
  'glitchtext', 'writetext', 'advancedglow', 'typographytext',
  'pixelglitch', 'neonglitch', 'flagtext', 'flag3dtext',
  'deletingtext', 'blackpinkstyle', 'glowingtext', 'underwatertext',
  'logomaker', 'cartoonstyle', 'papercutstyle', 'watercolortext',
  'effectclouds', 'blackpinklogo', 'gradienttext', 'summerbeach',
  'luxurygold', 'multicoloyellowneon', 'sandsummer', 'galaxywallpaper',
  '1917style', 'makingneon', 'royaltext', 'freecreate',
  'galaxystyle', 'lighteffects'
]

export default handler