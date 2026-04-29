# Morela v2

---

<p align="center">
  <img src="media/menu.jpg" width="600" style="border-radius:12px" />
</p>

---

![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-339933?style=for-the-badge&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Baileys](https://img.shields.io/badge/Baileys-@itsukichan%20v7.3.2-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)
![PM2](https://img.shields.io/badge/PM2-Process%20Manager-2B037A?style=for-the-badge&logo=pm2&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)
![Version](https://img.shields.io/badge/Version-2.0.0-blue?style=for-the-badge)

---

## Requirements

- Node.js >= 18.0.0 (v20 LTS recommended)
- npm >= 8.0.0
- PM2 (opsional, untuk production process management)
- Library system untuk `node-canvas` (lihat bagian Setup)

---

## Setup

```bash
git clone https://github.com/MorelaXz/morelav2
cd morelav2
npm install
npm run dev
```

> ⚠️ **Catatan `node-canvas`:** Package ini memerlukan library sistem native.
>
> **Ubuntu/Debian:**
> ```bash
> sudo apt-get install build-essential libcairo2-dev libpango1.0-dev \
>   libjpeg-dev libgif-dev librsvg2-dev
> ```
> **CentOS/RHEL:**
> ```bash
> sudo yum install gcc-c++ cairo-devel pango-devel libjpeg-turbo-devel giflib-devel
> ```
> Install library di atas sebelum `npm install` jika ada error di step canvas.

Saat pertama jalan, bot akan menampilkan **8-digit pairing code** di terminal. Masukkan kode tersebut di WhatsApp → Setelan → Perangkat Tertaut → Tautkan dengan nomor telepon.

Sebelum jalan, isi `data/mainowner.json` dengan nomor HP utamamu:

```json
["628xxxxxxxxxx"]
```

---

## Production (PM2)

```bash
# Development dengan hot-reload TypeScript
npm run dev
# atau
npx tsx utama.ts

# Production via PM2 (build dulu)
npm run build
npm run pm2:prod

# Development via PM2
npm run pm2:dev

# Monitor
pm2 logs morela
pm2 monit
pm2 status
```

---

## Struktur

```
morela/
├── utama.ts                    # Entry point — WA connection & event loop
├── Morela.ts                   # Core socket handler & message router
├── config.ts                   # Global config (prefix, owner, thumbnail)
├── tgbot.ts                    # Telegram bot integration & mirror
├── ecosystem.config.js         # PM2 config (prod + dev)
│
├── System/
│   ├── mainowner.ts            # Main Owner identity system (single superuser)
│   ├── message.ts              # Message preprocessing & serializer
│   ├── privatemode.ts          # Private mode handler
│   └── selfmode.ts             # Self mode (bot hanya respon ke diri sendiri)
│
├── Library/
│   ├── utils.ts                # Shared utilities, context builder, constants
│   ├── antiabuse.ts            # Anti-flood & anti-spam rate limiter
│   ├── messagequeue.ts         # Priority async message queue
│   ├── canvas-rpg.ts           # RPG profile card renderer
│   ├── canvas-quran.ts         # Quran verse card renderer
│   ├── canvas-spotify.ts       # Spotify card renderer
│   ├── canvas-soundcloud.ts    # SoundCloud card renderer
│   ├── canvas-yts.ts           # YouTube search result card renderer
│   ├── jadibotdb.ts            # Jadibot session manager
│   ├── meme.ts                 # Meme generator helper
│   ├── handle.ts               # Plugin dispatch bridge
│   ├── system.ts               # Case conversion utilities
│   └── tg_global.ts            # Telegram global config manager
│
├── Database/
│   ├── db.ts                   # Users, Groups, LidMap DB (debounced async write)
│   ├── usagelimit.ts           # Daily usage limit tracker per user
│   ├── stats.ts                # Command usage statistics tracker
│   └── sewagrub.ts             # Group rental management system
│
├── Plugins-ESM/
│   ├── _pluginmanager.ts       # ⚙️ Plugin lifecycle — hot-reload core
│   ├── admin/                  # Group management plugins
│   ├── ai/                     # AI & intelligence plugins
│   ├── downloader/             # Media downloader plugins
│   ├── games/                  # Interactive game plugins
│   ├── info/                   # Information & schedule plugins
│   ├── maker/                  # Content maker & canvas plugins
│   ├── owner/                  # DevOps & admin plugins (Main Owner only)
│   ├── sticker/                # Sticker creator plugins
│   └── tools/                  # Utility & tools plugins
│
├── data/
│   ├── mainowner.json          # Main Owner nomor HP (satu nomor, superuser)
│   ├── Own.json                # Regular owner list
│   ├── users.json              # User database
│   ├── groups.json             # Group database
│   ├── lidmap.json             # LID → Phone number map (Multi-Device)
│   ├── disabled_plugins.json   # Runtime-disabled plugin list
│   ├── usagelimit.json         # Daily usage tracking
│   ├── stats.json              # Command usage statistics
│   ├── SewaGrub.json           # Group rental records
│   └── ...                     # Game soal, configs, session data
│
├── media/
│   ├── menu.jpg                # Bot banner/thumbnail
│   ├── fkontak.jpg             # Quoted contact card image
│   └── register.jpg            # Registration image
│
└── types/
    ├── global.d.ts             # Global type definitions
    ├── modules.d.ts            # Module declarations
    └── node-globals.d.ts       # Node.js global augmentations
```

---

## Identity System: Main Owner vs Owner

Morela memiliki dua level hak akses. Perbedaan ini krusial, terutama saat **Jadibot** aktif — di mana semua command owner biasa diblokir, tapi Main Owner tetap bisa mengontrol penuh.

| Kemampuan | 👑 Main Owner | 👤 Owner |
|---|:---:|:---:|
| Akses semua command | ✅ | ✅ |
| Akses saat Jadibot aktif | ✅ | ❌ |
| Tulis / edit plugin via chat | ✅ | ❌ |
| Hot-reload plugin | ✅ | ❌ |
| Baca source code plugin | ✅ | ❌ |
| Hapus plugin dari server | ✅ | ❌ |
| Install npm package | ✅ | ❌ |
| Eval / Shell execution | ✅ | ❌ |
| Database inspector | ✅ | ❌ |
| Deploy web trigger | ✅ | ❌ |
| LID identity resolution (auto) | ✅ | ❌ |
| Manajemen premium & owner | ✅ | ✅ |
| Backup database | ✅ | ✅ |
| NSFW toggle | ✅ | ✅ |
| Disimpan di | `data/mainowner.json` | `data/Own.json` |
| Jumlah akun | 1 (single) | Multiple |

> **Catatan Teknis:** Main Owner diidentifikasi via **nomor HP unik**, bukan JID. Sistem LID Map di `data/lidmap.json` memastikan hak akses konsisten di semua format JID WhatsApp Multi-Device (`628xxx@s.whatsapp.net`, `xxx@lid`, `628xxx:0@s.whatsapp.net`).

---

## Plugin Manager

Bot ini punya **hot-reload ~300ms**. Drop atau edit file `.ts` di `Plugins-ESM/`, bot otomatis reload tanpa restart dan tanpa disconnect dari WhatsApp.

Ada dua tipe plugin:

**Command Plugin** — dipanggil via prefix command:

```typescript
// Plugins-ESM/tools/helloworld.ts

const handler = async (m: any, { reply, args }: any) => {
  const nama = args[0] || m.pushName || 'World'
  reply(`Hello, ${nama}! 👋`)
}

handler.command   = ['helloworld', 'hw']  // trigger command
handler.tags      = ['tools']             // kategori
handler.help      = ['helloworld <nama>'] // teks help
handler.owner     = false                 // hanya owner?
handler.mainOwner = false                 // hanya main owner?
handler.noLimit   = false                 // bypass daily limit?

export default handler
```

**Passive Plugin** — berjalan di background setiap pesan masuk:

```typescript
// Plugins-ESM/tools/mywatcher.ts

const handler = async (m: any, { reply }: any) => {
  if (m.text?.includes('keyword')) {
    reply('Terdeteksi!')
  }
}

export default {
  tags: ['tools'],
  handler
}
```

**Menambah plugin live dari chat (Main Owner):**

```
.plugin tools/helloworld
const handler = async (m, { reply }) => {
  reply('Hello World!')
}
handler.command = ['hw']
handler.tags = ['tools']
export default handler
```

### Variabel yang tersedia di `handler`

| Variabel | Deskripsi |
|---|---|
| `m` | Serialized message object |
| `Morela` | Baileys socket instance |
| `reply` | Reply ke pesan saat ini |
| `args` | Array argumen setelah command |
| `text` | Full body teks setelah command |
| `command` | Command string yang dipanggil |
| `fkontak` | Quoted contact card message |
| `isOwn` | Sender adalah owner? |
| `isMainOwn` | Sender adalah main owner? |
| `isPrem` | Sender adalah premium user? |

### Manajemen plugin via chat

```
.plugin tools/nama       tulis plugin baru langsung dari chat
.getplugin nama          baca source code plugin
.reloadplugin nama       hot-reload plugin spesifik
.reloadplugin all        reload semua plugin sekaligus
.delplugin tools/nama    hapus plugin dari server
.listplugin              lihat semua plugin + status
.disable nama            nonaktifkan plugin (tanpa hapus file)
.enable nama             aktifkan kembali plugin
```

---

## Anti-Abuse System

`Library/antiabuse.ts` melindungi bot dari flood dan spam command secara otomatis.

| Proteksi | Limit |
|---|---|
| Flood pesan | 15 pesan / 5 detik → mute 60 detik |
| Spam command | 5 command / 30 detik → mute 120 detik |
| Max warnings | 3x sebelum auto-block |

Kategori cooldown command:
- **Heavy** (ytmp3, ig, ai, hdv2, removebg, dll.) → 10 detik
- **Default** → 3 detik
- **Light** (ping, menu, quote, dll.) → 1.5 detik

---

## Message Queue

`Library/messagequeue.ts` mengelola semua pesan keluar dengan priority queue berbasis tier pengguna. Tidak ada pesan yang dikirim langsung — semua antri dulu untuk mencegah rate-limit dari WhatsApp.

| Tier | Delay | Priority |
|---|---|---|
| Owner | 50ms | 3 |
| Premium | 100ms | 2 |
| User biasa | 150ms | 1 |
| Media | 300ms | — |
| System | — | 9 (tertinggi) |

Max queue per JID: 30 pesan. Global throughput: 20 pesan/detik.

---

## Daily Usage Limit

Setiap user punya daily limit 15 command/hari (reset tiap 24 jam). Limit naik sesuai level user:

```
Level 0–14   → 15 command/hari
Level 15–29  → 20 command/hari
Level 30+    → 25 command/hari
```

Plugin dengan `handler.noLimit = true` bypass sistem ini sepenuhnya.

---

## Telegram Integration

`tgbot.ts` menjalankan Telegram bot sebagai **mirror dan remote control** dari Morela. Konfigurasi via:

```
.tgbotset token <BOT_TOKEN>     set token Telegram bot
.tgbotset chatid <CHAT_ID>      set target chat ID
```

Setelah dikonfigurasi, log aktivitas bot bisa dimonitor langsung dari Telegram.

---

## Fitur Unggulan

### 🔧 Live Remote Hot-Fixing
Edit plugin production langsung dari WhatsApp. Tidak perlu SSH, tidak perlu FTP. Main Owner bisa tulis, baca, reload, dan hapus file TypeScript real-time via pesan chat.

### 🆔 LID → Phone Resolution
WhatsApp Multi-Device menggunakan LID (Linked ID) yang berbeda dari nomor HP biasa. Sistem `data/lidmap.json` memetakan setiap LID ke nomor HP uniknya sehingga hak akses selalu konsisten.

### 🤖 Jadibot
Bot bisa berpura-pura menjadi nomor lain. Semua command owner diblokir saat jadibot aktif, kecuali Main Owner yang tetap punya akses penuh.

### 📊 Server Diagnostics
```
.healthcheck    ping semua API endpoint yang dipakai bot
.cekdb users    inspeksi isi database JSON dari chat
.clearcache     bersihkan cache media dan temp files
.backupdb       backup folder data/ ke file ZIP
.stats          statistik penggunaan command
```

### 👀 Read View Once (RVO)
Bot bisa otomatis membuka dan memforward pesan view-once (foto/video sekali lihat) ke Private Message pengirimnya sendiri.

---

## Plugins Bawaan

### 👑 Owner & DevOps

| command | fungsi |
|---|---|
| `.plugin` | tulis plugin baru dari chat |
| `.getplugin` | baca source code plugin |
| `.reloadplugin` | hot-reload plugin |
| `.delplugin` | hapus plugin dari server |
| `.listplugin` | list semua plugin + status |
| `.disable` / `.enable` | toggle plugin runtime |
| `.addpkg` | install npm package ke server |
| `.healthcheck` | cek status semua API endpoint |
| `.cekdb` | database inspector |
| `.backupdb` | backup database ke ZIP |
| `.clearcache` | bersihkan cache |
| `.deployweb` | trigger deploy ke web server |
| `.stats` | statistik command usage |
| `.stopbot` | matikan bot |
| `.self` | toggle self mode |
| `.privatmode` | toggle private mode |
| `.setownertype` | atur tipe owner |
| `.setpp` / `.setppwa` | ganti foto profil bot |
| `.owner` | manajemen owner |
| `.premium` | manajemen user premium |
| `.pay` | manajemen payment |
| `.sewagrub` | manajemen sewa grup |
| `.jadibot` / `.listbot` | jadibot session |
| `.nsfw` | toggle NSFW mode |
| `.remgrup` | keluar dari grup |
| `.resetdb` | reset database |
| `.topchat-cmd` | leaderboard chat aktif |
| `.tgbotset` | konfigurasi Telegram bot |
| `.github` | GitHub integration |
| `.backup` | backup panel |

### 🤖 AI & Intelligence

| command | fungsi |
|---|---|
| `ai` / `aiagent` | AI agent berbasis OpenRouter |
| `autoai` / `autoai2` | auto-reply AI kontekstual |
| `mathgpt` | solver matematika AI |
| `to-ai` | konversi & terjemahan AI |
| `img` / `image` | AI image generation |
| `genmart` | generate gambar via GenMart |
| `faceswap` | AI face swap |
| `zai` / `aiimage` | AI image tools lainnya |

### 📥 Downloader

| command | fungsi |
|---|---|
| `ytmp3` / `ytmp4` | YouTube audio/video |
| `yts` | YouTube search |
| `play` | universal media player |
| `tiktok` / `tt2` | TikTok single |
| `tiktokslide` | TikTok slide/carousel |
| `ig` | Instagram reels/posts |
| `fb` | Facebook video |
| `spotify` | Spotify track info + download |
| `soundcloud` | SoundCloud downloader |
| `pin` | Pinterest downloader |
| `mediafire` | MediaFire direct download |
| `webtoon` | Webtoon chapter downloader |
| `alldownload` | universal downloader |
| `ptv` | PTV downloader |
| `upload` | upload media ke hosting |

### 🎮 Games & Interactive

| command | fungsi |
|---|---|
| `asahotak` | tebak otak-atik |
| `susunkata` | susun kata |
| `tebakkata` | tebak kata |
| `tebakkimia` | tebak unsur kimia |
| `tebakbendera` | tebak bendera negara |
| `tebakgambar` | tebak gambar |
| `tebaksurah` | tebak surah Al-Quran |
| `family100` | family 100 |
| `kerangajaib` | magic conch / bola ajaib |
| `mining` / `listmining` | sistem mining virtual |
| `rpg-profil` | RPG profile card |
| `guildwar` | guild war game |
| `buildml` | build Mobile Legends |
| `truthordare` | truth or dare |
| `quote` | quote generator |

### 🛡️ Admin Grup

| command | fungsi |
|---|---|
| `welcome` | canvas welcome card saat member join |
| `goodbye` | canvas goodbye card saat member keluar |
| `antilink` | auto-delete link di grup |
| `antigrup` | anti-forward dari grup lain |
| `antivirtex` | anti-virtex message |
| `ban` | kick member dari grup |
| `mute` / `unmute` | mute grup |
| `hidetag` | mention semua member silently |
| `openclose` | buka/tutup grup |
| `openclose-schedule` | jadwal auto open/close grup |
| `reactionkick` | kick via emoji reaction |
| `resetlink` | reset link grup |
| `outgc` | keluarkan bot dari grup |
| `htprem` | hide tag premium |

### 🎨 Maker & Canvas

| command | fungsi |
|---|---|
| `carbon` | code screenshot (Carbon-style) |
| `discord` | Discord profile card |
| `fakeml` | fake Mobile Legends screenshot |
| `fakedev` | fake developer message |
| `fakeff` / `fakeffduo` | fake Free Fire screenshot |
| `faketweet` | fake Twitter/X tweet |
| `fakestory` | fake WA story screenshot |
| `iqc` | IQ card generator |
| `musikcard` | music player card |
| `flaming` | flaming text effect |
| `ephoto` | efek foto |
| `toimg` | konversi ke image |

### 🎭 Sticker

| command | fungsi |
|---|---|
| `stiker` | convert gambar/video ke sticker |
| `attp` | animated text-to-picture sticker |
| `ttp` | text-to-picture sticker |
| `brat` | brat-style text sticker |
| `bratoriginal` | brat original style |
| `bratgura` | brat gura style |
| `bratvid` | brat video sticker |
| `brattren` / `bratruromiya` / `bratspongebob` | brat variants |
| `emoji` | emoji sticker |
| `emojimix` | mix dua emoji |
| `qc` | quote card sticker |
| `smeme` | sticker meme |
| `stikerbrat` | stiker brat |
| `stikerline` | stiker Line |
| `stickerpack` | buat sticker pack |
| `stickerwm` | sticker dengan watermark |
| `telestick` | sticker dari Telegram |

### 📊 Info & Utility

| command | fungsi |
|---|---|
| `menu` | menu dengan canvas thumbnail |
| `quran` | Al-Quran dengan audio + tafsir |
| `jadwalbola` | jadwal pertandingan bola |
| `mpl` | jadwal MPL ID |
| `sc` | info server & bot |
| `tm` | info waktu & tanggal |
| `artinama` | arti nama |
| `totalfitur` | ringkasan total fitur bot |
| `listsewa` | list grup yang disewa |

### 🔧 Tools

| command | fungsi |
|---|---|
| `register` | registrasi user |
| `userinfo` | info lengkap user |
| `ping` | cek latency & network |
| `translate` | terjemahkan teks |
| `ocr` | ekstrak teks dari gambar |
| `removebg` | hapus background gambar |
| `removewm` | hapus watermark |
| `hd` / `hdv1` / `hdv2` | upscale gambar HD |
| `to4k` | upscale ke 4K |
| `hdvid` | upscale video |
| `tovidio` | konversi ke video |
| `tempmail` | temporary email enhanced |
| `rvo` / `rvoset` | read view-once settings |
| `tgspy` | Telegram spy mode |
| `report` | laporan ke owner |
| `inspect` | inspeksi raw message |
| `getpp` / `getppgrub` | ambil foto profil |
| `bypass` | bypass link shortener |
| `skiplink` | skip link |
| `Ouo` | bypass Ouo.io |
| `whois` | whois domain |
| `didyoumen` | Did You Mean |
| `stikercmd` | sticker command mapping |
| `stikertiger` | stiker Tiger |
| `jadwal` | cek jadwal |
| `tri` | tools Tri operator |
| `rch` | rch tools |
| `q` | quote message |

---

## Security Warning

Morela bisa **membaca, menulis, dan mengeksekusi file** di server langsung via chat WhatsApp. Ini fitur by design — tapi juga attack surface yang signifikan.

**Wajib dilakukan sebelum deploy:**

1. Tambahkan ke `.gitignore`:
   ```
   auth_info_baileys/
   data/
   logs/
   .env
   ```

2. Jalankan sebagai non-root user:
   ```bash
   sudo adduser morela-bot
   sudo -u morela-bot npm run pm2:prod
   ```

3. Jangan pernah share nomor Main Owner — ini kunci superuser penuh.

4. Audit plugin yang ditambahkan via `.plugin` dari chat sebelum reload ke production.

5. Monitor PM2 logs secara berkala:
   ```bash
   pm2 logs morela --lines 100
   ```

6. Pastikan `data/lidmap.json` akurat — entry LID yang kosong bisa menyebabkan hak akses Main Owner gagal terdeteksi.

---

## Technical Stack

| Komponen | Teknologi | Versi |
|---|---|---|
| Runtime | Node.js | ≥ 18.0.0 |
| Language | TypeScript ESM | ^5.5.0 |
| WA Library | @itsukichan/baileys | ^7.3.2 |
| Dev Runner | tsx | ^4.7.0 |
| Process Manager | PM2 | ecosystem.config.js |
| Canvas | node-canvas | ^2.11.2 |
| HTTP Client | axios | ^1.13.6 |
| Image | sharp + jimp | latest |
| Video | fluent-ffmpeg | ^2.1.2 |
| Automation | Playwright | ^1.59.1 |
| Scheduling | node-cron | ^3.0.3 |
| OCR | Tesseract.js | ^7.0.0 |

Database: File-based JSON dengan **debounced async write (2000ms)** — in-memory cache dengan lazy-load, tidak ada blocking event loop.

Module system: Pure ESM. Semua import pakai `import/export`, tidak ada `require()`.

---

<div align="center">

built by [putraa](https://wa.me/628999889149)

[![WhatsApp Channel](https://img.shields.io/badge/WhatsApp-Channel-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://whatsapp.com/channel/0029VbC6GY50VycJQ7nFgo3v)

© 2026 Morela · all rights reserved · do not resell or redistribute without permission

</div>
