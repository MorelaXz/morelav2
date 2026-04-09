// @ts-nocheck

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)]

async function getPP(Morela, jid) {
  try {
    const url = await Morela.profilePictureUrl(jid, 'image')
    const res = await fetch(url)
    return Buffer.from(await res.arrayBuffer())
  } catch {
    return null
  }
}

const handler = async (m, { Morela, text, command, reply, fkontak }) => {

  
  let participants = []
  try {
    const meta = await Morela.groupMetadata(m.chat)
    participants = meta.participants || []
  } catch {
    return reply('❌ Gagal ambil data grup.')
  }

  switch (command) {

    case 'bego': case 'goblok': case 'janda': case 'perawan': case 'babi':
    case 'tolol': case 'pekok': case 'jancok': case 'pinter': case 'pintar':
    case 'asu': case 'bodoh': case 'lesby': case 'bajingan': case 'anjing':
    case 'anjg': case 'anjj': case 'anj': case 'ngentod': case 'ngentot':
    case 'monyet': case 'mastah': case 'newbie': case 'bangsat': case 'bangke':
    case 'sange': case 'sangean': case 'dakjal': case 'horny': case 'wibu':
    case 'puki': case 'puqi': case 'peak': case 'pantex': case 'pantek':
    case 'setan': case 'iblis': case 'cacat': case 'yatim': case 'piatu': {
      const member = participants.map(u => u.id).filter(v => v !== Morela.user?.id)
      if (!member.length) return reply('❌ Tidak ada member.')
      const org = pickRandom(member)
      Morela.sendMessage(m.chat, {
        text: `Anak ${command} di sini adalah @${org.split('@')[0]}`,
        mentions: [org]
      }, { quoted: fkontak || m })
      break
    }

    case 'sangecek': case 'ceksange': case 'gaycek':
    case 'cekgay': case 'lesbicek': case 'ceklesbi': {
      if (!text) return reply(`Penggunaan: .${command} Nama\n\nContoh: .${command} Lisaa`)
      const sangeh = ['5','10','15','20','25','30','35','40','45','50','55','60','65','70','75','80','85','90','95','100']
      reply(`Nama : ${text}\nJawaban : *${pickRandom(sangeh)}%*`)
      break
    }

    case 'kapankah': {
      if (!text) return reply(`Penggunaan: .kapankah Pertanyaan\n\nContoh: .kapankah Saya Mati`)
      const kapan = [
        '5 Hari Lagi','10 Hari Lagi','15 Hari Lagi','20 Hari Lagi','25 Hari Lagi',
        '30 Hari Lagi','35 Hari Lagi','40 Hari Lagi','45 Hari Lagi','50 Hari Lagi',
        '1 Bulan Lagi','2 Bulan Lagi','3 Bulan Lagi','6 Bulan Lagi',
        '1 Tahun Lagi','2 Tahun Lagi','3 Tahun Lagi','5 Tahun Lagi',
        'Besok','Lusa',`Abis Command Ini Juga Lu ${text}`
      ]
      reply(`Pertanyaan : ${text}\nJawaban : *${pickRandom(kapan)}*`)
      break
    }

    case 'cp': case 'couple': {
      const member = participants.map(u => u.id)
      if (member.length < 2) return reply('❌ Member kurang dari 2.')
      const orang = pickRandom(member)
      const jodoh = pickRandom(member.filter(v => v !== orang))
      const pp    = await getPP(Morela, orang)
      Morela.sendMessage(m.chat, {
        text: `@${orang.split('@')[0]} ❤️ @${jodoh.split('@')[0]}\nCieeee, What's Going On❤️💖👀`,
        mentions: [orang, jodoh],
        contextInfo: {
          externalAdReply: {
            title: 'semoga kalian beneran jodoh >_<',
            body: 'cieeee ehem',
            thumbnail: pp,
            mediaType: 1,
            renderLargerThumbnail: false,
            showAdAttribution: false,
            sourceUrl: ''
          }
        }
      }, { quoted: fkontak || m })
      break
    }

    case 'gay': {
      const member = participants.map(u => u.id)
      const orang  = pickRandom(member)
      const pp     = await getPP(Morela, orang)
      Morela.sendMessage(m.chat, {
        text: `*@${orang.split('@')[0]} Adalah Orang Paling Gay Di Group Ini*`,
        mentions: [orang],
        contextInfo: {
          externalAdReply: {
            title: 'Pacar Nya Om Andri',
            body: 'Dia Pernah Duaan Di Hotel',
            thumbnail: pp,
            mediaType: 1,
            renderLargerThumbnail: false,
            showAdAttribution: false,
            sourceUrl: ''
          }
        }
      }, { quoted: fkontak || m })
      break
    }

    case 'jodoh': case 'jodohku': {
      const member = participants.map(u => u.id)
      if (member.length < 2) return reply('❌ Member kurang dari 2.')
      const me    = m.sender
      const jodoh = pickRandom(member.filter(v => v !== me))
      const pp    = await getPP(Morela, me)
      Morela.sendMessage(m.chat, {
        text: `jodoh @${me.split('@')[0]} adalah @${jodoh.split('@')[0]}`,
        mentions: [me, jodoh],
        contextInfo: {
          externalAdReply: {
            title: 'semoga kalian beneran jodoh >_<',
            body: 'cieeee ehem',
            thumbnail: pp,
            mediaType: 1,
            renderLargerThumbnail: false,
            showAdAttribution: false,
            sourceUrl: ''
          }
        }
      }, { quoted: fkontak || m })
      break
    }
  }
}

handler.command = [
  'bego', 'goblok', 'janda', 'perawan', 'babi', 'tolol', 'pekok', 'jancok',
  'pinter', 'pintar', 'asu', 'bodoh', 'lesby', 'bajingan', 'anjing',
  'anjg', 'anjj', 'anj', 'ngentod', 'ngentot', 'monyet', 'mastah', 'newbie',
  'bangsat', 'bangke', 'sange', 'sangean', 'dakjal', 'horny', 'wibu', 'puki',
  'puqi', 'peak', 'pantex', 'pantek', 'setan', 'iblis', 'cacat', 'yatim', 'piatu',
  'sangecek', 'ceksange', 'gaycek', 'cekgay', 'lesbicek', 'ceklesbi',
  'kapankah',
  'cp', 'couple', 'gay',
  'jodoh', 'jodohku'
]

handler.tags    = ['fun']
handler.help    = ['kapankah <tanya>', 'jodoh', 'couple', 'cekgay <nama>', 'wibu']
handler.group   = true
handler.noLimit = false

export default handler