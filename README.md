<div align="center">

<img src="media/menu.jpg" alt="Morela Bot Banner" width="600" style="border-radius:12px"/>

# 🤖 Morela

### *Autonomous DevOps & Server Assistant — Powered by WhatsApp*

> Kelola server, debug kode, dan deploy plugin **langsung dari chat.**  
> Tidak perlu SSH. Tidak perlu restart. Just type and ship.

<br/>

![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-339933?style=for-the-badge&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Baileys](https://img.shields.io/badge/Baileys-@itsukichan%20v7.3.2-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)
![PM2](https://img.shields.io/badge/PM2-Process%20Manager-2B037A?style=for-the-badge&logo=pm2&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)
![ESM](https://img.shields.io/badge/Module-ESM-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Version](https://img.shields.io/badge/Version-2.0.0-blue?style=for-the-badge)

</div>

---

## 📖 Table of Contents

- [What is Morela?](#-what-is-morela)
- [Unique Selling Points](#-unique-selling-points)
- [Feature Categories](#-feature-categories)
- [Technical Stack](#-technical-stack)
- [Project Structure](#-project-structure)
- [Identity System: Main Owner vs Owner](#-identity-system-main-owner-vs-owner)
- [Installation & Setup](#-installation--setup)
- [Plugin Development Guide](#-plugin-development-guide)
- [Security Warning](#️-security-warning)
- [License](#-license)

---

## 🧠 What is Morela?

**Morela** adalah WhatsApp bot berbasis **TypeScript/ESM** yang dirancang bukan hanya sebagai bot fitur biasa — melainkan sebagai **ekstensi kendali server** yang hidup di genggaman tangan.

Dibangun di atas [`@itsukichan/baileys`](https://github.com/itsukichan/baileys), Morela menghadirkan sistem plugin modular yang memungkinkan kamu **menulis, mengedit, dan mereload kode produksi** tanpa pernah menyentuh terminal secara langsung. Ini bukan chatbot — ini adalah **command center berbasis chat**.

```
Developer → WhatsApp Chat → Morela Bot → Server File System
                                       → PM2 Process
                                       → Plugin Runtime
                                       → Database JSON
```

---

## ⚡ Unique Selling Points

### 1. 🔧 Live Remote Hot-Fixing
> *"Edit kode production langsung dari WhatsApp. Tanpa SSH. Tanpa FTP."*

Morela memungkinkan **Main Owner** untuk membaca, menulis, dan menghapus file plugin TypeScript (`.ts`) secara real-time langsung dari pesan WhatsApp. Sistem ini diproteksi berlapis dengan **double security guard** di setiap plugin kritikal.

```
.plugin tools/myplugin       ← Tulis plugin baru via chat
.getplugin menu              ← Baca source code plugin langsung di WA
.reloadplugin menu           ← Hot-reload plugin tanpa restart proses
.delplugin tools/myplugin    ← Hapus plugin dari server
```

Setiap operasi file dilindungi oleh **LID-to-Phone identity resolution** untuk memastikan hanya operator yang sah yang bisa mengeksekusi perintah sensitif ini.

---

### 2. ♻️ Ultra-Fast Hot-Reload (~300ms)
> *"Zero-downtime plugin reload. Tidak ada restart. Tidak ada disconnect."*

`PluginManager` (`Plugins-ESM/_pluginmanager.ts`) adalah jantung dari Morela — sebuah singleton class yang mengelola seluruh lifecycle plugin:

- **Dynamic import** dengan cache-busting berbasis timestamp
- **File watcher** (`fs.watch`) untuk auto-reload saat file berubah
- **Rollback otomatis** jika plugin baru gagal divalidasi
- **Dual registry**: `Map<command, PluginEntry>` untuk command plugins + `PassiveEntry[]` untuk passive handlers
- **Disable/enable plugin** secara runtime tanpa menyentuh file (`data/disabled_plugins.json`)

```
.reloadplugin all    → Reload semua plugin sekaligus
.reloadplugin menu   → Reload plugin spesifik
.disable menu        → Nonaktifkan plugin tanpa hapus file
.enable menu         → Aktifkan kembali plugin
.listplugin          → Lihat semua plugin + status
```

---

### 3. 🆔 Advanced Identity Resolution (LID → Phone Number)
> *"WhatsApp Multi-Device menggunakan LID. Morela tahu cara membacanya."*

WhatsApp Multi-Device memperkenalkan **LID (Linked ID)** — sebuah identifier internal yang berbeda dari nomor HP biasa. Ini menjadi masalah kritis ketika melakukan pengecekan hak akses: apakah pengirim pesan benar-benar **Main Owner**?

Morela menyelesaikan ini dengan sistem **LID Map** (`data/lidmap.json`) yang memetakan setiap LID ke nomor HP uniknya:

```typescript
// Database/db.ts
export function getPhoneByLid(lid: string): string | null

// Contoh flow di setiap plugin kritikal:
let senderNum = rawSender.split('@')[0].split(':')[0].replace(/[^0-9]/g, '')
if (rawSender.endsWith('@lid')) {
  const resolved = getPhoneByLid(senderNum)
  if (resolved) senderNum = resolved.replace(/[^0-9]/g, '')
}
if (!isMainOwner(senderNum)) return send('❌ Unauthorized')
```

**Hasilnya:** Hak akses konsisten meskipun WhatsApp menggunakan berbagai format JID — `628xxx@s.whatsapp.net`, `xxx@lid`, atau `628xxx:0@s.whatsapp.net`.

---

### 4. 🩺 Server-Side Diagnostics
> *"PM2 logs, file structure, API health — semua dari WhatsApp."*

Morela dilengkapi suite diagnostik server yang bisa diakses langsung via chat:

| Command | Fungsi |
|---|---|
| `.healthcheck` | Uji semua API endpoint yang dipakai bot (Deline, Theresav, dll.) |
| `.cekdb` | Inspeksi isi database JSON langsung dari chat |
| `.clearcache` | Bersihkan cache media dan temp files |
| `.backupdb` | Backup seluruh `data/` ke file ZIP |
| `.backup` | Backup panel dengan opsi restore |
| `.deployweb` | Trigger deploy ke web server |
| `.addpkg` | Install npm package baru langsung ke server |

```
.healthcheck → Ping 20+ API endpoints, tampilkan status ✅/❌
.cekdb users → Lihat data users.json via chat
.clearcache  → Bersihkan temp files, free up disk
```

---

## 🗂️ Feature Categories

### 👑 Owner & DevOps
Plugin-plugin yang membentuk "DevOps Suite" dari Morela — semua restricted ke **Main Owner**:

```
plugin       → Tulis plugin baru langsung dari chat
getplugin    → Baca source code plugin
reloadplugin → Hot-reload plugin tanpa restart
delplugin    → Hapus plugin dari server
listplugin   → List semua plugin terdaftar
disable      → Disable plugin runtime
enable       → Enable plugin runtime
addpkg       → Install npm package
healthcheck  → API health monitoring
cekdb        → Database inspector
backupdb     → Backup database
clearcache   → Cache management
deployweb    → Web deployment trigger
```

### 🤖 AI & Intelligence
```
aiagent      → AI agent berbasis OpenRouter (passive + command mode)
aipasive     → Auto-reply AI kontekstual
autoai       → Trigger AI otomatis
to-ai        → Konversi & terjemahan berbasis AI
mathgpt      → Solver matematika AI
faceswap     → AI face swap
image/img    → AI image generation
```

### 📥 Multimedia Downloader
High-speed downloader dengan intelligent text cleaning:
```
ytmp3 / ytmp4   → YouTube Audio/Video
tiktok / tt2    → TikTok (single + slide)
ig              → Instagram Reels/Posts
fb              → Facebook Video
spotify         → Spotify track info + download
soundcloud      → SoundCloud downloader
play            → Universal media player
pin             → Pinterest downloader
mediafire       → MediaFire direct download
webtoon         → Webtoon chapter downloader
alldownload     → Universal downloader
```

### 🎮 Games & Interactive
```
asahotak / susunkata / tebakkata / tebakkimia / tebakbendera
tebakgambar / tebaksurah / family100 / kerangajaib / mining
rpg-profil / guildwar / buildml / truthordare / quote
```

### 🛡️ Admin Group Management
```
welcome / goodbye    → Canvas-based welcome/goodbye cards
antilink / antigrup  → Auto-moderation
ban / mute           → Member management
hidetag              → Mass mention
openclose-schedule   → Auto open/close grup terjadwal
reactionkick         → Kick via emoji reaction
htprem               → Promosi premium
```

### 🎨 Maker & Canvas
```
carbon       → Code screenshot (Carbon-style)
discord      → Discord profile card
fakeml / fakedev / fakeff / faketweet / fakestory
iqc          → IQ Card generator
musikcard    → Music card canvas
```

### 📊 Info & Utility
```
menu         → Dynamic menu dengan canvas thumbnail
mpl          → MPL ID match schedule scraper
jadwalbola   → Jadwal pertandingan bola
quran        → Al-Quran dengan audio + tafsir
totalfitur   → Ringkasan total fitur bot
sc           → Status/info server
```

---

## 🔩 Technical Stack

| Komponen | Teknologi | Versi |
|---|---|---|
| **Runtime** | Node.js | ≥ 18.0.0 |
| **Language** | TypeScript (ESM) | ^5.5.0 |
| **WA Library** | @itsukichan/baileys | ^7.3.2 |
| **Dev Runner** | tsx | ^4.7.0 |
| **Process Manager** | PM2 | ecosystem.config.js |
| **Canvas** | node-canvas | ^2.11.2 |
| **HTTP Client** | axios | ^1.13.6 |
| **Image Processing** | sharp + jimp | latest |
| **Video Processing** | fluent-ffmpeg | ^2.1.2 |
| **Automation** | Playwright | ^1.59.1 |
| **Scheduling** | node-cron | ^3.0.3 |
| **OCR** | Tesseract.js | ^7.0.0 |

**Module System:** Pure ESM — semua import menggunakan `import/export`, tidak ada `require()`.

**Database:** File-based JSON dengan **debounced async write** (2000ms) untuk mencegah blocking event loop. In-memory cache dengan lazy-load pattern.

---

## 📁 Project Structure

```
morela/
├── utama.ts                    # Entry point — inisialisasi WA connection
├── Morela.ts                   # Core socket handler & message router
├── config.ts                   # Global config (prefix, owner, thumbnail)
├── tgbot.ts                    # Telegram bot integration
├── tsconfig.json
├── package.json
├── ecosystem.config.js         # PM2 config (prod + dev)
│
├── System/
│   ├── mainowner.ts            # Main Owner identity system
│   ├── message.ts              # Message preprocessing
│   ├── privatemode.ts          # Private mode handler
│   └── selfmode.ts             # Self mode handler
│
├── Library/
│   ├── utils.ts                # Shared utilities & constants
│   ├── canvas-*.ts             # Canvas rendering engines
│   ├── antiabuse.ts            # Anti-abuse rate limiter
│   ├── messagequeue.ts         # Async message queue
│   └── jadibotdb.ts            # Jadibot session manager
│
├── Database/
│   ├── db.ts                   # Users, Groups, LidMap database
│   ├── usagelimit.ts           # Daily usage limit tracker
│   ├── stats.ts                # Command usage statistics
│   └── sewagrub.ts             # Group rental management
│
├── Plugins-ESM/
│   ├── _pluginmanager.ts       # ⚙️ Plugin lifecycle manager (HOT RELOAD CORE)
│   ├── admin/                  # Group management plugins
│   ├── ai/                     # AI & intelligence plugins
│   ├── downloader/             # Media downloader plugins
│   ├── games/                  # Interactive game plugins
│   ├── info/                   # Information & schedule plugins
│   ├── maker/                  # Content maker plugins
│   ├── owner/                  # DevOps & admin plugins
│   ├── sticker/                # Sticker creator plugins
│   └── tools/                  # Utility plugins
│
├── data/
│   ├── mainowner.json          # Main Owner number (persistent)
│   ├── Own.json                # Regular owner list
│   ├── users.json              # User database
│   ├── groups.json             # Group database
│   ├── lidmap.json             # LID → Phone number map
│   ├── disabled_plugins.json   # Runtime-disabled plugins
│   └── ...                     # Game data, configs, etc.
│
├── media/
│   ├── menu.jpg                # Bot thumbnail/banner
│   ├── fkontak.jpg             # Quoted contact card image
│   └── register.jpg            # Registration image
│
└── types/
    ├── global.d.ts             # Global type definitions
    ├── modules.d.ts            # Module declarations
    └── node-globals.d.ts       # Node.js global augmentations
```

---

## 👑 Identity System: Main Owner vs Owner

Morela memiliki sistem hak akses berlapis yang membedakan **Main Owner** (Superuser) dan **Owner** (Regular Admin). Perbedaan ini krusial terutama saat mode **Jadibot** aktif.

| Kemampuan | 👑 Main Owner | 👤 Owner (Regular) |
|---|:---:|:---:|
| Akses semua command bot | ✅ | ✅ |
| Akses saat Jadibot aktif | ✅ | ❌ |
| Eval / Shell execution | ✅ | ❌ |
| Tulis / edit plugin (`.plugin`) | ✅ | ❌ |
| Hot-reload plugin (`.reload`) | ✅ | ❌ |
| Baca source code (`.getplugin`) | ✅ | ❌ |
| Hapus plugin (`.delplugin`) | ✅ | ❌ |
| Install npm package (`.addpkg`) | ✅ | ❌ |
| Database inspector (`.cekdb`) | ✅ | ❌ |
| Deploy web (`.deployweb`) | ✅ | ❌ |
| Tambah/hapus owner biasa | ✅ | ✅ |
| Manajemen premium user | ✅ | ✅ |
| NSFW toggle | ✅ | ✅ |
| Backup database | ✅ | ✅ |
| LID identity resolution | ✅ (auto) | ❌ |
| Disimpan di file | `data/mainowner.json` | `data/Own.json` |
| Jumlah akun | 1 (single) | Multiple |

> **Catatan Teknis:** Main Owner diidentifikasi via **nomor HP unik**, bukan JID. Sistem LID-to-Phone resolution memastikan konsistensi hak akses di semua format JID WhatsApp Multi-Device.

---

## 🚀 Installation & Setup

### Prerequisites

```bash
node --version   # Harus >= 18.0.0
npm --version    # Harus >= 8.0.0
pm2 --version    # Optional, untuk production
```

### 1. Clone Repository

```bash
git clone https://github.com/youruser/morela.git
cd morela
```

### 2. Install Dependencies

```bash
npm install
```

> ⚠️ **Catatan `node-canvas`:** Package ini membutuhkan library sistem yang dikompilasi secara native.
>
> **Linux (Ubuntu/Debian):**
> ```bash
> sudo apt-get install build-essential libcairo2-dev libpango1.0-dev \
>   libjpeg-dev libgif-dev librsvg2-dev
> ```
> **Linux (CentOS/RHEL/Fedora):**
> ```bash
> sudo yum install gcc-c++ cairo-devel pango-devel libjpeg-turbo-devel giflib-devel
> ```
> **Windows:**
> ```bash
> # Install GTK2 dan libjpeg-turbo via windows-build-tools
> npm install --global windows-build-tools
> # Download GTK2: https://github.com/Automattic/node-canvas/wiki/Installation:-Windows
> ```
> Jika `npm install` gagal di step canvas, install library di atas terlebih dahulu lalu ulangi.

### 3. Konfigurasi Main Owner

Edit file `data/mainowner.json` (buat jika belum ada):

```json
["628xxxxxxxxxx"]
```

> **Gunakan nomor HP lengkap dengan kode negara**, tanpa `+` atau `-`. Contoh: `628xxxxxxxxxx`.

Atau via `config.ts` sebagai fallback:

```typescript
// config.ts
global.mainOwner = '628xxxxxxxxxx'; // fallback jika mainowner.json belum ada
```

### 4. Konfigurasi Owner Biasa

Edit `data/Own.json`:

```json
["628xxxxxxxxxx", "628yyyyyyyyy"]
```

### 5. Konfigurasi Bot (`config.ts`)

```typescript
global.prefa = ['', '!', '.', ',', '🐤', '🗿'];  // Prefix yang diterima
global.prefix = '.';                               // Default prefix
global.thumbnailUrl = 'https://your-thumbnail-url.png';
```

### 6. Jalankan Bot

**Development (tsx — hot TypeScript):**
```bash
npm run dev
# atau
npx tsx utama.ts
```

**Production via PM2:**
```bash
# Build TypeScript dulu
npm run build

# Start via PM2
npm run pm2:prod
# atau
pm2 start ecosystem.config.js --env production
```

**Development via PM2:**
```bash
npm run pm2:dev
# atau
pm2 start ecosystem.config.js --env development
```

### 7. Monitor

```bash
pm2 logs morela          # Lihat live logs
pm2 monit                # Dashboard monitoring
pm2 status               # Status semua proses
```

### 8. Link via Pairing Code

Setelah bot berjalan, bot akan menampilkan **8-digit pairing code** di terminal. Masukkan kode tersebut di WhatsApp:

```
WhatsApp → Setelan → Perangkat Tertaut → Tautkan Perangkat
→ Tautkan dengan nomor telepon → Masukkan kode 8 digit
```

> Pastikan nomor HP yang dimasukkan saat prompt sesuai dengan nomor WA yang ingin digunakan sebagai bot.

---

## 🔌 Plugin Development Guide

Morela menggunakan sistem plugin berbasis **ESM module**. Setiap plugin adalah file TypeScript independen.

### Command Plugin (dipanggil via prefix)

```typescript
// Plugins-ESM/tools/helloworld.ts

const handler = async (m: any, { Morela, reply, args, fkontak }: any) => {
  const name = args[0] || m.pushName || 'World'
  reply(`Hello, ${name}! 👋`)
}

handler.command = ['helloworld', 'hw']  // trigger commands
handler.tags    = ['tools']             // category
handler.help    = ['helloworld <nama>'] // help text
handler.owner   = false                 // hanya owner?
handler.mainOwner = false               // hanya main owner?
handler.noLimit = false                 // bypass usage limit?

export default handler
```

### Passive Plugin (berjalan di background, tanpa trigger command)

```typescript
// Plugins-ESM/tools/mywatcher.ts

const handler = async (m: any, { Morela, reply }: any) => {
  // Berjalan di setiap pesan masuk
  if (m.text?.includes('keyword')) {
    reply('Terdeteksi!')
  }
}

export default {
  tags: ['tools'],          // category
  handler                   // handler function
}
```

### Menambah Plugin via Chat (Live)

```
.plugin tools/helloworld
const handler = async (m, { reply }) => {
  reply('Hello World!')
}
handler.command = ['hw']
handler.tags = ['tools']
export default handler
```

### Struktur Variabel Handler

| Variabel | Tipe | Deskripsi |
|---|---|---|
| `m` | `MsgObj` | Objek pesan lengkap |
| `Morela` | `ExtSocket` | Baileys socket instance |
| `reply` | `Function` | Reply ke pesan saat ini |
| `fkontak` | `WAMessage` | Quoted contact card message |
| `args` | `string[]` | Argumen command |
| `text` | `string` | Body teks setelah command |
| `command` | `string` | Command yang dipanggil |
| `isOwn` | `boolean` | Apakah sender adalah owner |
| `isMainOwn` | `boolean` | Apakah sender adalah main owner |
| `isPrem` | `boolean` | Apakah sender adalah premium user |

---

## ⚠️ Security Warning

> **Baca ini sebelum deploy ke production.**

Morela memiliki kemampuan untuk **membaca, menulis, dan mengeksekusi file** di server secara langsung via chat WhatsApp. Ini adalah fitur by design — tapi juga merupakan **attack surface yang signifikan** jika tidak diamankan dengan benar.

### 🔴 Risiko Kritis

```
❌ Jika nomor Main Owner bocor dan device-mu dihack:
   → Attacker bisa menulis file arbitrary di server
   → Attacker bisa menginstall package berbahaya
   → Attacker bisa membaca semua file database
   → Attacker bisa mengeksekusi kode arbitrary via eval

❌ Jika session WhatsApp (auth credentials) bocor:
   → Attacker bisa berpura-pura jadi Morela
   → Seluruh data grup dan user terekspos
```

### ✅ Mitigasi Wajib

1. **Proteksi folder `auth_info_baileys/`** — jangan pernah commit folder ini ke Git.

   ```bash
   # .gitignore
   auth_info_baileys/
   data/
   logs/
   .env
   ```

2. **Jalankan bot sebagai non-root user** — jangan pernah jalankan dengan `sudo` atau sebagai `root`.

   ```bash
   # Buat user khusus
   sudo adduser morela-bot
   sudo -u morela-bot npm run pm2:prod
   ```

3. **Batasi akses filesystem** — gunakan `chroot` atau containerisasi (Docker) untuk membatasi jangkauan write permission bot.

4. **Aktifkan firewall** — pastikan port server tidak terekspos ke publik yang tidak perlu.

5. **Jangan share nomor Main Owner** — nomor ini adalah kunci superuser. Satu nomor, satu orang.

6. **Monitor PM2 logs** secara berkala untuk mendeteksi aktivitas mencurigakan:

   ```bash
   pm2 logs morela --lines 100
   ```

7. **Audit plugin** secara rutin — terutama plugin yang ditambahkan via `.plugin` dari chat. Review kode sebelum reload ke production.

8. **Double-check LID resolution** — sistem LID Map di `data/lidmap.json` harus akurat. Jika entry LID kosong, hak akses Main Owner bisa gagal terdeteksi atau terlalui.

> **Bottom line:** Morela memberikan kekuatan besar. Gunakan dengan tanggung jawab yang besar.

---

## 🤝 Contributing

Pull requests dipersilakan. Untuk perubahan besar, buka issue terlebih dahulu untuk diskusi.

1. Fork repository ini
2. Buat branch fitur: `git checkout -b feat/nama-fitur`
3. Commit perubahan: `git commit -m 'feat: tambah fitur X'`
4. Push ke branch: `git push origin feat/nama-fitur`
5. Buka Pull Request

---

## 📄 License

```
MIT License

Copyright (c) 2026 Morela Bot — putraa

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

---

<div align="center">

**Built with 🔥 by [putraa](https://wa.me/628xxxxxxxxxx)**

*Morela — Because great bots deserve great infrastructure.*

[![WhatsApp Channel](https://img.shields.io/badge/WhatsApp-Channel-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://whatsapp.com/channel/0029VbC6GY50VycJQ7nFgo3v)

</div>
