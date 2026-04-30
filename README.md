# Morela

---

<p align="center">
  <img src="media/menu.jpg" width="600" />
</p>

---

## Requirements

- Node.js v18+ (v20 recommended)
- tsx v4.7+ (TypeScript executor, installed via npm)
- PM2 (opsional, untuk process management)
- support vps dan panel

---

## Setup

```bash
git clone https://github.com/MorelaXz/morelav2
cd morelav2
npm install
npm start
```

Dev mode (hot-reload penuh via tsx):

```bash
npm run dev
# atau
tsx utama.ts
```

PM2 production (butuh build dulu):

```bash
npm run build
pm2 start ecosystem.config.js --only morela
```

PM2 development (langsung tsx tanpa build):

```bash
pm2 start ecosystem.config.js --only morela-dev
```

Saat pertama jalan, bot otomatis melakukan pairing via kode. Setelah terkoneksi, Main Owner sudah bisa langsung dipakai sesuai yang diset di `config.ts` atau `data/mainowner.json`.

Bot ini default private mode — hanya merespons pesan dari nomor yang terdaftar. Gunakan `.privatmode off` untuk membuka akses publik, atau `.self on` untuk mode self-bot.

---

## Struktur

```
morelav2/
├── utama.ts                    entry point — koneksi WA, Baileys socket, event listener
├── Morela.ts                   message handler & command dispatcher utama
├── config.ts                   konfigurasi global: prefix, owner, thumbnail, botName
├── tgbot.ts                    Telegram bot yang berjalan paralel
├── ecosystem.config.js         konfigurasi PM2 untuk mode prod & dev
├── tsconfig.json               TypeScript compiler options (ES2020, NodeNext)
├── Plugins-ESM/
│   ├── _pluginmanager.ts       plugin manager dengan hot-reload
│   ├── admin/                  group management
│   ├── ai/                     AI tools & agents
│   ├── downloader/             media downloader
│   ├── games/                  game interaktif + soal engine
│   ├── info/                   menu & informasi
│   ├── maker/                  card & image generator
│   ├── owner/                  DevOps & bot management
│   ├── sticker/                sticker tools
│   └── tools/                  utilitas umum
├── Database/
│   ├── db.ts                   core database: users, groups, lidmap
│   ├── sewagrub.ts             manajemen sewa grup berbayar
│   ├── stats.ts                statistik penggunaan command
│   └── usagelimit.ts           rate limit harian per user
├── Library/
│   ├── utils.ts                utility central: buildFkontak, buildCtx, sendCard, bi()
│   ├── handle.ts               bridge antara Morela.ts dan plugin manager
│   ├── system.ts               Case — runtime code editor untuk Morela.ts
│   ├── antiabuse.ts            flood detection & rate limiting real-time
│   ├── messagequeue.ts         antrian pesan agar tidak flood ke server WA
│   ├── jadibotdb.ts            manajemen sesi jadibot berbasis Set + JSON
│   ├── meme.ts                 canvas meme generator dengan Impact font
│   ├── tg_global.ts            konfigurasi Telegram token & chatId
│   ├── canvas-spotify.ts       Spotify card generator
│   ├── canvas-soundcloud.ts    SoundCloud card generator
│   ├── canvas-quran.ts         tampilan ayat Quran berbasis canvas
│   ├── canvas-rpg.ts           profil RPG card dengan stat karakter
│   └── canvas-yts.ts           YouTube search result card
├── System/
│   ├── message.ts              serializer pesan (smsg) & utility functions
│   ├── mainowner.ts            identitas & validasi Main Owner
│   ├── privatemode.ts          toggle private mode (persistent)
│   └── selfmode.ts             toggle self mode (persistent)
├── types/
│   ├── global.d.ts             semua TypeScript type declarations
│   ├── modules.d.ts            re-export semua types dari global.d.ts
│   └── node-globals.d.ts       deklarasi manual Node.js globals untuk tsx
├── data/                       persistent JSON storage (semua state bot)
└── media/                      asset gambar: menu.jpg, fkontak.jpg, register.jpg
```

---

## config.ts

File ini dijalankan pertama kali saat `utama.ts` di-import. Semua nilai di sini disimpan ke `global` sehingga bisa diakses dari mana saja tanpa import ulang.

```typescript
global.owner    = []
global.mainOwner = '628999889149'   // nomor main owner default

global.prefa  = ['', '!', '.', ',', '🐤', '🗿']  // daftar prefix yang dikenali
global.prefix = '.'                               // prefix utama

global.thumbnailUrl = 'https://...'  // URL gambar thumbnail pesan
```

`config.ts` juga memasang `fs.watchFile` pada dirinya sendiri — ketika file ini berubah di disk, bot mencetak notif di console. Tidak auto-restart, hanya notif.

---

## ecosystem.config.js

Dua app PM2 dalam satu file konfigurasi:

- **`morela`** — production mode. Menjalankan `dist/utama.js` (hasil `npm run build`). Memory limit 512MB, max-old-space 400MB, max 15 restart, exponential backoff restart, log ke `logs/`.
- **`morela-dev`** — development mode. Menjalankan `utama.ts` langsung via `tsx` tanpa build. Cocok untuk development aktif.

---

## Identity System: Main Owner vs Owner

Morela membedakan dua level akses tertinggi.

**Main Owner** adalah satu akun yang diset via `data/mainowner.json` atau `config.ts`. Hanya Main Owner yang bisa mengakses seluruh fitur DevOps: menulis plugin, menghapus file, backup database, install package, deploy web, dan operasi server lainnya.

Proteksi ini dijalankan dengan **LID-to-Phone resolution** — setiap pesan yang masuk dicek apakah sendernya benar-benar Main Owner meski WA mengirimnya dalam format LID (`@lid`) atau format Multi-Device lain.

```typescript
let senderNum = rawSender.split('@')[0].split(':')[0].replace(/[^0-9]/g, '')
if (rawSender.endsWith('@lid')) {
  const resolved = getPhoneByLid(senderNum)
  if (resolved) senderNum = resolved.replace(/[^0-9]/g, '')
}
if (!isMainOwner(senderNum)) return send('❌ Unauthorized')
```

**Owner** adalah akun tambahan yang bisa di-add via command. Owner mendapat akses ke perintah bot secara umum tapi tidak ke operasi file/server yang sensitif.

LID map disimpan di `data/lidmap.json` dan diupdate otomatis setiap kali bot menerima pesan dari kontak baru.

---

## Access Control

Role system berbasis file JSON di folder `data/`. Ada lima level:

- **Main Owner** — DevOps penuh, satu nomor, diset di `data/mainowner.json`
- **Owner** — akses general, multiple nomor, diset via command
- **Premium** — akses fitur premium, dikelola via `.premium`
- **Registered** — user yang sudah `.register`, tidak dibatasi seperti guest
- **Guest** — tidak terdaftar, dibatasi 15 command/hari (reset tiap 24 jam)

```
.owner add (reply)       tambah role owner
.premium add (reply)     tambah role premium
.sewagrub                kelola sewa grup berbayar
.ceklimit                cek sisa limit user hari ini
.resetdb limit           reset semua limit harian
```

### Saat pertama konek, set Main Owner di `data/mainowner.json`.

Contoh isi `mainowner.json` yang benar

```json
$ cat data/mainowner.json
─────────────────
["628xxxxxxxxxx"]
```

---

### Database/

**`db.ts`** adalah core database. Mengelola tiga entitas utama:

- `data/users.json` — data semua user: nama, status registered, level, exp, premium status, banned flag
- `data/groups.json` — data semua grup: antilink, antigrup, welcome/goodbye, openclose, nsfw, selfmode per grup
- `data/lidmap.json` — mapping LID-to-phone untuk semua kontak yang pernah chat ke bot

Semua write dijadwal dengan debounced async `scheduleWrite()` delay 2 detik — tidak ada race condition saat banyak event masuk bersamaan. Ekspor utama: `initDB`, `getUser`, `saveUser`, `getGroup`, `saveGroup`, `getPhoneByLid`, `updateLidMap`.

**`usagelimit.ts`** mengatur batas pemakaian harian per user. Default 15 command/hari via konstanta `DAILY_LIMIT`. State di-cache in-memory (`Map`) dan di-flush ke `data/usagelimit.json` setiap ada perubahan. Per-user limit bisa di-override via `getUserDailyLimit()`. Reset otomatis setiap 24 jam berdasarkan timestamp `limitHitAt`.

**`sewagrub.ts`** mengelola sistem sewa grup berbayar. Menyimpan `SewaGrubEntry` per grup: `groupId`, `groupName`, `ownerJid`, `startDate`, `expiryDate`, `expiryTimestamp`, dan `addedBy`. Tersimpan di `data/SewaGrub.json` dengan in-memory cache. `getExpiredSewa()` dijalankan saat startup untuk auto-hapus sewa yang sudah expired.

**`stats.ts`** mencatat statistik penggunaan command secara agregat ke `data/stats.json`. Struktur `BotStats` menyimpan: hitungan per-command, per-user, per-jam, per-hari, total command, dan `startedAt`. Write di-debounce 3 detik via `scheduleSave()` untuk efisiensi I/O.

---

### Library/

**`utils.ts`** adalah utility central. Ekspor paling penting:

- `buildFkontak(Morela)` — membuat fake WA contact card dengan foto profil bot, nama bot dalam font italic Unicode (`bi()`), dan `participant: '0@s.whatsapp.net'`. Inilah yang membuat semua pesan bot terlihat seperti dikutip dari akun WhatsApp resmi (centang biru). Foto profil diambil dari `profilePictureUrl`, fallback ke `media/fkontak.jpg`, lalu `media/menu.jpg` jika tidak ada.
- `buildCtx()` — membuat forwarding context untuk pesan. Menyuntikkan `forwardedNewsletterMessageInfo` dengan JID channel resmi, dan `externalAdReply` dengan thumbnail bot, sehingga pesan tampil dengan banner kanal di atas.
- `sendCard(Morela, jid, footerText, imgBuf, quoted)` — universal interactive message sender. Mengirim `interactiveMessage` dengan header gambar, footer teks, dan tombol `cta_url` ke WA owner. Digunakan oleh menu dan command info.
- `createSend(Morela, m, menuBuf, fkontak)` — shorthand yang membungkus `sendCard` dengan footer `© botName` otomatis, siap pakai di plugin.
- `bi(text)` — mengonversi teks biasa ke karakter bold italic matematika Unicode (𝑨𝒃𝒄). Dipakai di nama bot dalam fkontak dan header card.
- `uploadImage(Morela, buffer)` — mengupload buffer gambar ke server WA via `waUploadToServer` dan mengembalikan `imageMessage` proto yang siap dipakai di `interactiveMessage`.
- `getGreeting()` — mengembalikan salam sesuai jam WIB: pagi/siang/sore/malam.
- `atomicWriteJSON()` / `atomicWriteJSONSync()` — write JSON ke file dengan pembuatan direktori otomatis.
- `menuBuf` — buffer gambar menu yang sudah di-read saat module pertama di-load (lazy load sekali, tidak baca ulang setiap command).
- Konstanta: `CHANNEL_URL`, `OWNER_WA`, `BOT_JID`, `CHANNEL_JID`, `botName`, `botVersion`, `ownerName`.

**`handle.ts`** adalah bridge tipis antara `Morela.ts` (handler utama) dan `_pluginmanager.ts`. Menerima `m`, `command`, dan `HandleData`, lalu meneruskannya ke `handlePluginCommand()`. Jika plugin tidak ditemukan atau gagal, mengembalikan `false` sehingga handler bisa fallback ke logika lain.

**`system.ts`** berisi objek `Case` — runtime code editor yang bekerja langsung pada file `Morela.ts` di disk:

- `Case.get(name)` — membaca blok `case "name": { ... }` dari file dan mengembalikannya sebagai string
- `Case.add(code)` — menyisipkan blok case baru sebelum `default:` di file, dengan validasi: harus ada `case`, `{`, `}`, dan `break`
- `Case.delete(key)` — menghapus blok case dari file berdasarkan key-nya
- `Case.list()` — mengembalikan semua case yang terdaftar di file

Digunakan oleh plugin `casetools` sehingga Main Owner bisa mengedit logika switch-case `Morela.ts` langsung dari chat WA tanpa buka file.

**`antiabuse.ts`** mengelola flood detection dan rate limiting real-time. Tiga kategori cooldown yang ditentukan dari nama command:

- `HEAVY_COMMANDS` — cooldown 10 detik (ytmp3, ytmp4, ig, fb, ai, hd, removebg, stiker, dll)
- `LIGHT_COMMANDS` — cooldown 1.5 detik (ping, menu, runtime, dll)
- default — cooldown 3 detik

Batas flood: 15 pesan dalam 5 detik → mute 60 detik. Spam command: 5 command sama dalam 30 detik → mute 120 detik. Maksimal 3 warning sebelum auto-blacklist. Data warning persistent di `data/antiabuse.json`, di-debounce 2 detik saat tulis. Semua state flood, rate limit, dan mute disimpan in-memory di `Map` terpisah.

**`messagequeue.ts`** mengatur antrian pengiriman pesan ke server WA. Mencegah flood yang bisa memicu disconnect atau temporary ban dari WA.

**`jadibotdb.ts`** mengelola daftar nomor yang sedang aktif sebagai jadibot. Berbasis `Set<string>` in-memory yang di-sync ke `data/jadibot.json`. Ekspor: `isJadibot()`, `addJadibot()`, `removeJadibot()`, `listJadibot()`, `syncWithSessions()` untuk membersihkan entry yang sesinya sudah mati.

**`meme.ts`** adalah canvas meme generator. Menerima buffer gambar + teks atas + teks bawah, lalu menggambar teks dengan font Impact (outline hitam, fill putih) di atas gambar. Mendukung word wrap otomatis. Output PNG buffer.

**`tg_global.ts`** mengelola konfigurasi Telegram bot (token + chatId) yang dipakai oleh fitur tgspy dan Telegram integration. Data tersimpan di `data/tg_global.json` dan di-cache di `global.tgGlobal`. Ekspor: `getTgToken()`, `getTgChatId()`, `setTgToken()`, `setTgChatId()`, `initTgGlobal()`.

**`canvas-*.ts`** — lima canvas renderer khusus:

- `canvas-spotify.ts` — card Spotify dengan cover art, judul, artis, durasi, progress bar
- `canvas-soundcloud.ts` — card SoundCloud dengan waveform style, artwork, dan track info
- `canvas-quran.ts` — tampilan ayat Al-Quran dengan background gradient dan teks Arab + Latin
- `canvas-rpg.ts` — profil karakter RPG dengan avatar, stat bar (HP/ATK/DEF/SPD), level, dan exp
- `canvas-yts.ts` — card hasil pencarian YouTube dengan thumbnail, judul, channel, dan durasi

Semua canvas menggunakan font Poppins dari `data/font/` (Regular, Medium, Bold, Light).

---

### System/

**`message.ts`** berisi `smsg()` — fungsi serializer yang mengubah raw Baileys `WAMessage` menjadi `MsgObj` yang sudah diperkaya. `MsgObj` punya properti tambahan: `id`, `isBaileys`, `chat`, `fromMe`, `isGroup`, `sender`, `mtype`, `body`, `text`, `mentionedJid`, `quoted`, dan method `reply()`, `download()`, `copy()`, `copyNForward()`, `getQuotedObj()`. Juga berisi utility: `getBuffer()`, `fetchJson()`, `getSizeMedia()`, `sleep()`, `runtime()`.

`utama.ts` juga meng-extend socket Baileys (`ExtSocket`) dengan method tambahan sebelum diserahkan ke handler:

- `decodeJid(jid)` — normalisasi JID ke format bersih
- `getFile(path)` — download dan deteksi tipe file, output `GetFileResult`
- `downloadMediaMessage(message)` — download media dari pesan
- `downloadMedia(message, opts)` — versi dengan retry otomatis
- `sendText(jid, text, quoted, opts)` — kirim teks sederhana
- `sendImageAsSticker(jid, src, quoted, opts)` — kirim gambar sebagai stiker
- `sendVideoAsSticker(jid, src, quoted, opts)` — kirim video sebagai stiker
- `sendMedia(jid, path, caption, quoted, opts)` — kirim media apapun dari path/URL
- `sendPoll(jid, question, options)` — kirim poll WA

**`mainowner.ts`** mengelola identitas Main Owner dengan TTL cache 60 detik — tidak perlu baca `data/mainowner.json` setiap ada pesan masuk. Ekspor: `isMainOwner(num)`, `getMainOwner()`, `setMainOwner(num)`.

**`privatemode.ts`** mengontrol apakah bot hanya merespons user terdaftar atau semua orang. Persistent via `data/privatemode.json`, bisa di-toggle runtime via `.privatmode on/off` tanpa restart.

**`selfmode.ts`** mengontrol apakah bot hanya merespons pesan dari nomor bot sendiri. Persistent via `data/selfmode.json`, bisa di-toggle via `.self on/off`.

---

### types/

**`global.d.ts`** adalah satu-satunya file type declaration utama. Mendefinisikan semua type yang dipakai di seluruh codebase:

- `MsgObj` — Baileys `WAMessage` yang sudah diperkaya dengan properti dan method tambahan. Ini yang masuk sebagai parameter `m` di setiap plugin.
- `ExtSocket` — Baileys `WASocket` yang sudah di-extend dengan semua method tambahan (lihat System/ di atas).
- `FkontakMsg` — struktur object `fkontak` yang dihasilkan `buildFkontak()`. Berisi `key` (participant, fromMe, id, remoteJid) dan `message.contactMessage` (displayName, vcard, jpegThumbnail).
- `HandleData` — semua context yang tersedia di dalam plugin: `Morela`, `conn`, `text`, `args`, `isOwn`, `isPrem`, `isAdmin`, `botAdmin`, `senderJid`, `usedPrefix`, `reply`, `fkontak`, `downloadContentFromMessage`.
- `PluginHandler` — type untuk fungsi plugin beserta properti opsionalnya: `command`, `tags`, `help`, `owner`, `premium`, `group`, `private`, `admin`, `botAdmin`, `noLimit`, `passive`.
- `UserData` — schema data user di database: `id`, `name`, `registered`, `regName`, `regAge`, `regDate`, `level`, `exp`, `premium`, `premiumExpiry`, `banned`.
- `GroupData` — schema data grup: `id`, `subject`, `selfmode`, `antilink`, `antigrup`, `antilinkmode`, `welcome`, `welcomemsg`, `goodbye`, `goodbyemsg`, `openclose`, `nsfw`, `intro`.
- `LimitEntry` — entry limit harian: `count` dan `limitHitAt`.
- `LimitResult` — union type hasil `checkLimit()`: `allowed: true` dengan sisa, atau `allowed: false` dengan `resetAt`.
- `AbuseResult` — union type hasil `checkAbuse()`: allowed, atau denied dengan reason (`muted`, `rate_limit`, `flood`, `spam_command`).
- `AbuseStatus` — status anti-abuse satu user: muted, muteRemaining, warnings, recentMessages.
- `BotStats` — struktur stats: commands, users, hours, days, total, startedAt.
- `GetFileResult` — hasil `getFile()`: buffer, filename, size, ext, mime, cleanup function.
- `Ctx` — context alternatif yang lebih ringkas untuk beberapa helper.

**`modules.d.ts`** hanya meng-re-export semua type dari `global.d.ts`. Dipakai ketika import dari `../types/modules.js`.

**`node-globals.d.ts`** adalah deklarasi manual Node.js globals untuk tsx tanpa `@types/node`. Mendefinisikan: `process`, `Buffer`, `console`, `setTimeout/clearTimeout/setInterval/clearInterval/setImmediate`, `__dirname`, `__filename`, `require`, `URL`, `fetch`, `NodeJS` namespace (Timeout, Timer, EventEmitter, ReadableStream, WritableStream, ErrnoException), serta interface `CanvasRenderingContext2D` dan `CanvasGradient` untuk canvas library. Ini yang membuat seluruh codebase bisa di-typecheck dengan strict mode tanpa install `@types/node`.

---

### data/ (persistent storage)

Semua state bot tersimpan sebagai JSON di folder ini. Tidak ada database eksternal.

```
data/
├── mainowner.json          nomor main owner
├── Own.json                daftar owner
├── Prem.json               daftar premium
├── users.json              data semua user (registered, level, exp, banned)
├── groups.json             data semua grup (setting per grup)
├── lidmap.json             mapping LID → nomor telepon
├── usagelimit.json         sisa limit harian per user
├── SewaGrub.json           data sewa grup aktif + expiry
├── stats.json              statistik command usage agregat
├── disabled_plugins.json   plugin yang sedang di-disable
├── jadibot.json            daftar nomor yang aktif sebagai jadibot
├── privatemode.json        status private mode (on/off)
├── selfmode.json           status self mode (on/off)
├── sticker_cmd.json        mapping emoji → command (reaction cmd)
├── stickerpack_history.json riwayat sticker pack yang dibuat
├── gc_schedule.json        jadwal buka/tutup grup
├── menuconfig.json         konfigurasi tampilan menu
├── menuimg.json            konfigurasi gambar menu custom
├── payment.json            data konfirmasi pembayaran
├── tg_global.json          token & chatId Telegram bot
├── tgspy.json              data nomor yang dispy via Telegram
├── tgspy_queue.json        antrian pesan spy Telegram
├── rvo_sent.json           riwayat reveal view-once yang sudah dikirim
├── rvo_tg.json             rvo yang diteruskan ke Telegram
├── chatcount.json          hitungan chat per user untuk topchat
├── lastchat_owner.json     timestamp terakhir chat dari owner
├── antiabuse.json          data warning anti-abuse per user
├── nudify_config.json      konfigurasi NSFW module
├── ownertype.json          tipe owner (single/multi mode)
├── ownsalam.json           pesan salam owner greet
├── fkontak_cache.json      cache fkontak build
├── soal_asahotak.json      bank soal asah otak
├── soal_family100.json     bank soal family 100
├── soal_susunkata.json     bank soal susun kata
├── soal_tebakbendera.json  bank soal tebak bendera
├── soal_tebakgambar.json   bank soal tebak gambar
├── soal_tebakkata.json     bank soal tebak kata
├── soal_tebakkimia.json    bank soal tebak kimia
├── asahotak.json           state sesi game asah otak aktif
├── family100.json          state sesi game family 100 aktif
├── susunkata.json          state sesi game susun kata aktif
├── tebakbendera.json       state sesi game tebak bendera aktif
├── tebakgambar.json        state sesi game tebak gambar aktif
├── tebakkata.json          state sesi game tebak kata aktif
├── tebakkimia.json         state sesi game tebak kimia aktif
├── tebaksurah.json         state sesi game tebak surah aktif
└── font/                   font Poppins (Regular, Medium, Bold, Light)
```

---

### media/

```
media/
├── menu.jpg      gambar menu utama, dipakai sebagai header sendCard()
├── fkontak.jpg   fallback gambar untuk buildFkontak() jika foto profil bot tidak tersedia
└── register.jpg  gambar yang dikirim saat user melakukan .register
```

---

## Plugin Manager

Bot ini punya hot-reload. `_pluginmanager.ts` adalah singleton `PluginManager` yang mengelola lifecycle seluruh plugin. Taruh atau ubah file di `Plugins-ESM/`, bot otomatis reload tanpa restart.

Cara kerjanya:
- **Dynamic import + cache-busting** via timestamp query string (`?t=Date.now()`) agar Node tidak cache module lama
- **Dual registry** — `Map<command, PluginEntry>` untuk command plugin yang dipanggil lewat prefix, dan `PassiveEntry[]` untuk passive handler yang berjalan di setiap pesan
- **File watcher** via `fs.watch` yang memonitor semua subfolder `Plugins-ESM/`
- **Rollback otomatis** jika plugin baru gagal validasi atau error saat load
- **Disable/enable runtime** via `data/disabled_plugins.json` tanpa menyentuh file plugin sama sekali

```
.reloadplugin all        reload semua plugin sekaligus
.reloadplugin menu       reload plugin spesifik
.disable menu            nonaktifkan plugin tanpa hapus file
.enable menu             aktifkan kembali plugin
.listplugin              lihat semua plugin + status (active/disabled)
```

### Passive Handler

File dengan suffix `-pasive.ts` (atau `handler.passive = true`) adalah passive handler — berjalan di setiap pesan yang masuk tanpa perlu command prefix. Contoh: `autoai-pasive.ts` mendeteksi pesan ke bot di PM atau grup tertentu dan auto-reply AI. `register-pasive.ts` mendeteksi user baru yang belum terdaftar. `tgspy-pasive.ts` meneruskan pesan dari nomor yang dispy ke Telegram.

Passive handler di-register terpisah dari command handler dan dieksekusi lebih dulu sebelum command matching.

### Struktur plugin minimal (TypeScript ESM):

```typescript
// @ts-nocheck
const handler = async (m, { Morela, fkontak, args, text, sender, pushname, isOwn, isPrem }) => {
  await Morela.sendMessage(m.chat, { text: 'halo!' }, { quoted: fkontak })
}

handler.command  = ['ping', 'p']   // array of strings, BUKAN regex
handler.help     = ['ping']
handler.tags     = ['tools']
handler.noLimit  = false   // opsional, jika true tidak kena rate limit
handler.owner    = false   // opsional, jika true hanya owner yang bisa
handler.premium  = false   // opsional, jika true hanya premium
handler.group    = false   // opsional, jika true hanya di grup
handler.private  = false   // opsional, jika true hanya di PM
export default handler
```

> **PENTING** — `handler.command` harus selalu **array of strings**. Plugin manager memanggil `.toLowerCase()` pada setiap item saat registrasi. Kalau diisi regex atau tipe lain, plugin gagal load dengan error `c.toLowerCase is not a function`.

Context yang tersedia di handler:

| key | isi |
|-----|-----|
| `Morela` | `ExtSocket` — socket Baileys yang sudah di-extend dengan semua method tambahan |
| `conn` | alias dari `Morela` |
| `m` | `MsgObj` — serialized message object siap pakai |
| `args` | `string[]` — array argumen setelah command |
| `text` | `string` — semua teks setelah command digabung |
| `sender` | `string` — JID pengirim (sudah di-resolve dari LID jika perlu) |
| `senderJid` | `string` — JID pengirim raw |
| `pushname` | `string` — nama WA pengirim |
| `fkontak` | `FkontakMsg` — object fkontak siap pakai untuk `quoted:` |
| `isOwn` | `boolean` — apakah pengirim adalah owner |
| `isPrem` | `boolean` — apakah pengirim adalah premium |
| `isAdmin` | `boolean` — apakah pengirim adalah admin grup |
| `botAdmin` | `boolean` — apakah bot adalah admin grup |
| `usedPrefix` | `string` — prefix yang dipakai pengirim |
| `reply` | `(msg, opt?) => Promise` — shorthand reply ke chat |
| `downloadContentFromMessage` | Baileys download helper |

---

## DevOps Suite (Main Owner Only)

Morela bisa mengoperasikan server langsung dari chat WA tanpa perlu SSH.

```
.plugin tools/namafile   tulis plugin baru via chat (kirim kode di bawah command)
.getplugin menu          baca source code plugin langsung di WA
.saveplugin              simpan plugin dari pesan reply
.reloadplugin all        reload semua plugin
.reloadplugin menu       reload plugin spesifik (~300ms)
.delplugin tools/file    hapus plugin dari server
.listplugin              list semua plugin + status
.disable menu            nonaktifkan plugin runtime
.enable menu             aktifkan plugin kembali
.addpkg axios            install npm package baru ke server
.healthcheck             uji semua API endpoint yang dipakai bot
.cekdb users             inspect isi JSON database dari chat
.backupdb                backup seluruh folder data/ ke ZIP
.backup-panel            backup ke panel hosting
.clearcache              bersihkan file temp dan cache media
.deployweb               trigger deploy ke web server
.github                  push ke GitHub
.stopbot                 matikan proses bot
.resetdb [target]        reset database spesifik
.cekkey                  cek API key yang terpasang
.get [url]               fetch URL dan tampilkan hasilnya
.remgrup                 kelola daftar grup bot
.setownertype            ubah tipe owner (single/multi)
.deletesmg               hapus pesan bot
```

---

## Telegram Integration

`tgbot.ts` berjalan paralel di samping WA. Fungsinya: meneruskan pesan dari nomor yang dispy via WA ke Telegram real-time, dan menerima command Telegram dari owner.

Konfigurasi via `.tgbotset` dari WA. Token dan chatId tersimpan di `data/tg_global.json` dan di-cache di `global.tgGlobal`. `initTgGlobal()` dipanggil saat startup untuk load config.

Fitur tgspy bekerja lewat dua plugin: `tgspy-cmd.ts` untuk mendaftarkan nomor yang mau dispy, dan `tgspy-pasive.ts` sebagai passive handler yang meneruskan pesan masuk dari nomor terdaftar ke Telegram via HTTP API.

---

## Plugins Bawaan

**admin**

| plugin | command | fungsi |
|--------|---------|--------|
| antigrup | `antigrup` | cegah bot dari join grup random (pasive + cmd) |
| antilink | `antilink` | auto-delete link di grup (pasive + cmd) |
| antivirtex | `antivirtex` | filter pesan virtex/crash di grup (pasive + cmd) |
| ban | `ban` | kick member dari grup |
| goodbye | `goodbye` | canvas goodbye card saat member keluar grup |
| hidetag | `hidetag` | tag semua member tersembunyi tanpa notif |
| htprem | `htprem` | hidetag khusus premium |
| mute | `mute` | nonaktifkan respon bot di grup (pasive + cmd) |
| openclose-schedule | `jadwal` | jadwal buka/tutup grup otomatis via cron |
| openclose | `openclose` | buka/tutup grup manual |
| outgc | `outgc` | keluarkan bot dari grup |
| reactionkick | — | kick member via reaction emoji tertentu |
| resetlink | `resetlink` | reset link grup |
| welcome | `welcome` | canvas welcome card saat member masuk grup |

**ai**

| plugin | command | fungsi |
|--------|---------|--------|
| aiagent | `aiagent` | AI agent berbasis OpenRouter (pasive + cmd) |
| aiimage | `aiimage` | AI image generation |
| autoai | `autoai` | auto-reply AI di grup/PM — mode 1 (pasive + cmd) |
| autoai2 | `autoai2` | auto-reply AI mode 2, model berbeda (pasive + cmd) |
| faceswap | `faceswap` | AI face swap antar gambar |
| genmart | `genmart` | AI art generation |
| image / img | `image` `img` | AI image generation alternatif |
| mathgpt | `mathgpt` | solver matematika & rumus via AI |
| to-ai | `to-ai` | analisis gambar/dokumen berbasis AI |
| zai | `zai` | AI chat generik |

**downloader**

| plugin | command | fungsi |
|--------|---------|--------|
| alldownload | `dl` | universal downloader multi-platform |
| fb | `fb` | Facebook video downloader |
| ig | `ig` | Instagram Reels/Posts/Stories |
| mediafire | `mediafire` | MediaFire direct download |
| pin | `pin` | Pinterest image/video |
| play | `play` | universal media player |
| ptv | `ptv` | download & kirim sebagai PTV (video bulat) |
| soundcloud | `sc` | SoundCloud + canvas card |
| spotify | `spotify` | Spotify track info + canvas |
| tiktok | `tiktok` | TikTok video single |
| tiktokslide | `tiktokslide` | TikTok slide/carousel |
| tt2 | `tt2` | TikTok downloader alternatif |
| upload | `upload` | upload media ke hosting publik |
| webtoon | `webtoon` | Webtoon chapter downloader |
| ytmp3 | `ytmp3` | YouTube ke audio MP3 |
| ytmp4 | `ytmp4` | YouTube ke video MP4 |
| yts | `yts` | YouTube search + canvas card |

**games**

| plugin | command | fungsi |
|--------|---------|--------|
| asahotak | `asahotak` | tebak kata dari definisi (+ cek jawaban) |
| buildml | `buildml` | build hero Mobile Legends |
| family100 | `family100` | game family 100 (+ cek jawaban) |
| guildwar | `guildwar` | perang guild antar grup |
| kerangajaib | `kerangajaib` | si kerang ajaib |
| listmining | `listmining` | list hasil mining koin |
| mining | `mining` | sistem mining koin |
| quote | `quote` | kirim kata-kata motivasi acak |
| rpg-profil | `rpg` | profil RPG dengan canvas |
| susunkata | `susunkata` | susun huruf jadi kata (+ cek jawaban) |
| tebakbendera | `tebakbendera` | tebak bendera negara (+ cek jawaban) |
| tebakgambar | `tebakgambar` | tebak gambar (+ cek jawaban) |
| tebakkata | `tebakkata` | tebak kata dari clue (+ cek jawaban) |
| tebakkimia | `tebakkimia` | tebak unsur kimia (+ cek jawaban) |
| tebaksurah | `tebaksurah` | tebak nama surah Al-Quran |
| truthordare | `tod` | truth or dare |

**info**

| plugin | command | fungsi |
|--------|---------|--------|
| artinama | `artinama` | arti sebuah nama |
| jadwalbola | `jadwalbola` | jadwal pertandingan bola |
| listsewa | `listsewa` | list grup sewa aktif |
| menu | `menu` | menu utama bot |
| mpl | `mpl` | info MPL esports |
| quran | `quran` | baca Al-Quran + canvas |
| sc | `sc` | info singkat soundcloud |
| tm | `tm` | tempmail via info |
| totalfitur | `totalfitur` | total plugin aktif |

**maker**

| plugin | command | fungsi |
|--------|---------|--------|
| carbon | `carbon` | code snippet ke gambar |
| discord | `discord` | fake Discord message |
| ephoto | `ephoto` | efek foto via ephoto.id |
| fakedev | `fakedev` | fake developer mode |
| fakeff | `fakeff` | fake Free Fire screenshot |
| fakeffduo | `fakeffduo` | fake Free Fire duo screenshot |
| fakeml | `fakeml` | fake Mobile Legends screenshot |
| fakestory | `fakestory` | fake WA story |
| faketweet | `faketweet` | fake tweet |
| flaming | `flaming` | teks api |
| iqc | `iqc` | image quote card |
| musikcard | `musikcard` | music player card |
| toimg | `toimg` | konversi stiker ke gambar |

**sticker**

| plugin | command | fungsi |
|--------|---------|--------|
| attp | `attp` | animated text to sticker |
| brat | `brat` | brat-style stiker |
| bratgura | `bratgura` | brat gura variant |
| bratoriginal | `bratoriginal` | brat original style |
| bratruromiya | `bratruromiya` | brat ruromiya variant |
| bratspongebob | `bratspongebob` | brat spongebob variant |
| brattren | `brattren` | brat tren variant |
| bratvid | `bratvid` | brat video stiker |
| emoji | `emoji` | kirim emoji sebagai gambar |
| emojimix | `emojimix` | mix dua emoji jadi stiker |
| qc | `qc` | quote card ke stiker |
| smeme | `smeme` | stiker meme generator |
| stickerpack | `stickerpack` | kelola sticker pack |
| stikerbrat | `stikerbrat` | stiker brat dari gambar |
| stikerline | `stikerline` | stiker LINE style |
| stiker | `stiker` | buat stiker dari gambar/video |
| stickerwm | `stickerwm` | stiker dengan watermark |
| telestick | `telestick` | kirim stiker via Telegram |
| ttp | `ttp` | text to picture stiker |

**tools**

| plugin | command | fungsi |
|--------|---------|--------|
| Ouo | `ouo` | shorten link via ouo.io |
| bratv2 | `bratv2` | brat generator v2 |
| bypass | `bypass` | bypass shortlink |
| didyoumen | `didyoumen` | deteksi mention tersembunyi |
| getpp | `getpp` | ambil foto profil |
| getppgrub | `getppgrub` | ambil foto profil grup |
| hd | `hd` | upscale gambar HD |
| hdv1 | `hdv1` | upscale HD versi 1 |
| hdv2 | `hdv2` | upscale HD versi 2 |
| hdvid | `hdvid` | upscale video HD |
| inspect | `inspect` | inspect raw pesan |
| jadwal | `jadwal` | cek jadwal (tools variant) |
| ocr | `ocr` | ekstrak teks dari gambar |
| ping | `ping` | cek latency bot |
| q | `q` | quote pesan |
| rch | `rch` | random chat |
| register | `register` | daftar sebagai user (pasive + cmd) |
| removebg | `removebg` | hapus background gambar |
| removewm | `removewm` | hapus watermark dari gambar |
| report | `report` | kirim laporan ke owner |
| rvo | `rvo` | reveal view-once message |
| rvoreset | `rvoreset` | reset data rvo |
| rvoset | `rvoset` | konfigurasi rvo |
| skiplink | `skiplink` | skip iklan shortlink |
| stikercmd | `stikercmd` | bikin command dari stiker |
| stikertiger | `stikertiger` | stiker tiger effect |
| tempmail-enhanced | `tempmail` | temporary email enhanced |
| tgspy | `tgspy` | spy nomor via Telegram (pasive + cmd) |
| to4k | `to4k` | upscale video ke 4K |
| topchat | `topchat` | top chat aktif di grup (pasive + cmd) |
| tovidio | `tovidio` | konversi ke format video |
| translate | `translate` | terjemahkan teks |
| tri | `tri` | tools ringan misc |
| userinfo | `userinfo` | info lengkap user WA |
| whois | `whois` | whois domain/IP |

**owner**

| plugin | command | fungsi |
|--------|---------|--------|
| addpkg | `addpkg` | install npm package baru ke server |
| backup-panel | `backup-panel` | backup ke panel hosting |
| backupdb | `backupdb` | backup seluruh folder data/ ke ZIP |
| casetools | `casetools` | edit switch-case Morela.ts dari chat |
| cekdb | `cekdb` | inspect isi JSON database dari chat |
| cekkey | `cekkey` | cek API key yang terpasang |
| ceklimit | `ceklimit` | cek sisa limit user hari ini |
| clearcache | `clearcache` | bersihkan file temp dan cache media |
| deletesmg | `deletesmg` | hapus pesan bot |
| delplugin | `delplugin` | hapus plugin dari server |
| deployweb | `deployweb` | trigger deploy ke web server |
| disable / enable | `disable` `enable` | toggle plugin runtime tanpa hapus file |
| get | `get` | fetch URL dari chat |
| getplugin | `getplugin` | baca source code plugin dari chat |
| github | `github` | push ke GitHub dari chat |
| healthcheck | `healthcheck` | uji semua API endpoint bot |
| jadibot | `jadibot` | aktifkan/nonaktifkan mode jadibot |
| listbot | `listbot` | list bot yang sedang aktif |
| listplugin | `listplugin` | list semua plugin + status active/disabled |
| nsfw | `nsfw` | konfigurasi NSFW module |
| owner | `owner` | kelola daftar owner |
| ownergreet | — | greet owner saat mereka chat (pasive) |
| pay | `pay` | konfirmasi pembayaran sewa |
| plugin | `plugin` | tulis plugin baru via chat |
| premium | `premium` | kelola daftar premium |
| privatmode | `privatmode` | toggle private mode |
| reloadplugin | `reloadplugin` | hot-reload plugin |
| remgrup | `remgrup` | kelola daftar grup bot |
| resetdb | `resetdb` | reset database spesifik |
| saveplugin | `saveplugin` | simpan plugin dari pesan reply |
| self | `self` | toggle self mode |
| setmenu | `setmenu` | ganti gambar menu |
| setownertype | `setownertype` | ubah tipe owner |
| setpp | `setpp` | ganti foto profil bot |
| setppwa | `setppwa` | ganti foto profil WA |
| sewagrub | `sewagrub` | kelola sewa grup berbayar |
| stats | `stats` | statistik penggunaan bot |
| stopbot | `stopbot` | matikan proses bot |
| tgbotset | `tgbotset` | konfigurasi Telegram bot |
| topchat-cmd | `topchat` | monitor chat terbanyak (owner cmd) |

---

<div align="center">

built by [Morela](https://github.com/MorelaXz)

© 2026 Morela · all rights reserved · do not resell or redistribute without permission

</div>
