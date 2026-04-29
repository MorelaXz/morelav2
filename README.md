# Morela


Requirements
Node.js v18+ (v20 recommended)
tsx (TypeScript executor, installed via npm)
PM2 (opsional, untuk process management)
support vps dan panel

Setup
```
git clone https://github.com/your-repo/morela
cd morela
npm install
npm start / tsx utama.ts
```

Saat pertama jalan, bot otomatis pairing via kode (pairing code mode aktif by default). Setelah terkoneksi, set nomor Main Owner lewat `data/mainowner.json` atau via `config.ts` sebelum menjalankan bot. Main Owner adalah satu-satunya akun yang punya akses penuh ke fitur DevOps.

Bot ini default private mode — hanya merespons pesan dari nomor yang terdaftar. Gunakan `.privatmode off` untuk membuka akses publik, atau `.self on` untuk mode self-bot.

Struktur
```
morela/
├── utama.ts              entry point utama, koneksi WA + event listener
├── Morela.ts             message handler & dispatcher utama
├── config.ts             konfigurasi prefix, mainOwner, thumbnail
├── tgbot.ts              Telegram bot integration (opsional)
├── ecosystem.config.js   konfigurasi PM2 (prod & dev)
├── Plugins-ESM/          semua plugin dalam folder kategori
│   ├── _pluginmanager.ts plugin manager dengan hot-reload
│   ├── admin/            group management
│   ├── ai/               AI tools & agents
│   ├── downloader/       media downloader
│   ├── games/            game interaktif
│   ├── info/             menu & informasi
│   ├── maker/            card & image generator
│   ├── owner/            DevOps & bot management
│   ├── sticker/          sticker tools
│   └── tools/            utilitas umum
├── Database/             database handler berbasis JSON
├── Library/              utility & canvas library
├── System/               core system (message, auth, mode)
├── data/                 persistent JSON storage
├── types/                TypeScript type definitions
└── media/                asset gambar (menu, register, dll)
```

Identity System: Main Owner vs Owner
Morela membedakan dua level akses tertinggi.

**Main Owner** adalah satu akun yang diset via `data/mainowner.json`. Hanya Main Owner yang bisa mengakses seluruh fitur DevOps: menulis plugin, menghapus file, backup database, install package, deploy web, dan operasi server lainnya. Proteksi ini dijalankan dengan **LID-to-Phone resolution** — setiap pesan yang masuk dicek apakah sendernya benar-benar Main Owner meski WA mengirimnya dalam format LID (`@lid`) atau format lain.

**Owner** adalah akun tambahan yang bisa di-add via command. Owner mendapat akses ke perintah bot secara umum tapi tidak ke operasi file/server yang sensitif.

```typescript
// Setiap plugin kritikal menjalankan guard ini:
let senderNum = rawSender.split('@')[0].split(':')[0].replace(/[^0-9]/g, '')
if (rawSender.endsWith('@lid')) {
  const resolved = getPhoneByLid(senderNum)
  if (resolved) senderNum = resolved.replace(/[^0-9]/g, '')
}
if (!isMainOwner(senderNum)) return send('❌ Unauthorized')
```

LID map disimpan di `data/lidmap.json` dan diupdate otomatis saat bot menerima pesan dari kontak baru.

Access Control
Role system berbasis JSON di `data/` folder. Tersedia beberapa level akses:

- **Main Owner** — akses DevOps penuh, satu nomor, diset di `data/mainowner.json`
- **Owner** — akses owner general, multiple nomor, diset via command
- **Premium** — akses fitur premium, dikelola via `.premium`
- **Registered** — user yang sudah register via `.register`
- **Usage Limit** — non-registered dibatasi 15 command/hari (reset tiap 24 jam)

```
.owner add (reply)       tambah role owner
.premium add (reply)     tambah role premium
.sewagrub                kelola sewa grup berbayar
.ceklimit                cek sisa limit user hari ini
.resetdb limit           reset semua limit harian
```

Database/
Semua data disimpan sebagai JSON di folder `data/`. Penulisan ke disk menggunakan **debounced async write** dengan delay 2 detik untuk menghindari I/O berlebih saat banyak event masuk bersamaan.

`db.ts` adalah core database — mengelola data user (`users.json`), data grup (`groups.json`), dan LID map (`lidmap.json`). Semua write dijadwal dengan `scheduleWrite()` sehingga tidak ada race condition.

`usagelimit.ts` mengatur batas pemakaian harian per user. Default 15 command/hari, bisa di-override per-user via `getUserDailyLimit()`. State di-cache in-memory dan di-flush ke disk setiap perubahan.

`sewagrub.ts` mengelola sistem sewa grup berbayar dengan tanggal expired otomatis. `stats.ts` mencatat statistik penggunaan command secara agregat.

Library/
Kumpulan utility dan canvas builder yang dipakai plugin di seluruh bot.

`utils.ts` adalah utility central — berisi `buildFkontak` untuk generate fake-kontakt header, `buildCtx` untuk menyiapkan context handler, path helper, dan konstanta global seperti `botName` dan `CHANNEL_URL`.

`canvas-*.ts` adalah library canvas untuk generate gambar: `canvas-spotify.ts` untuk Spotify card, `canvas-soundcloud.ts` untuk SoundCloud card, `canvas-quran.ts` untuk tampilan ayat Quran bergambar, `canvas-yts.ts` untuk YouTube search card, dan `canvas-rpg.ts` untuk profil RPG dengan stat karakter.

`antiabuse.ts` mengelola flood detection dan rate limiting secara real-time. Ada tiga kategori command: heavy (cooldown 10 detik), light (1.5 detik), dan default (3 detik). Jika user spam melewati threshold, akses diblokir sementara dengan sistem warning bertingkat (max 3 warning sebelum temporary mute).

`messagequeue.ts` mengatur antrian pengiriman pesan agar tidak flood ke server WA.

System/
`message.ts` berisi serializer pesan utama (`smsg`) dan kumpulan utility fungsi: `getBuffer`, `fetchJson`, `runtime`, `getSizeMedia`, dan sebagainya. Ini layer yang mengubah raw Baileys message menjadi objek `MsgObj` yang siap dipakai plugin.

`mainowner.ts` mengelola identitas Main Owner dengan TTL cache 60 detik — tidak perlu baca file setiap pesan masuk. Ekspor `isMainOwner()`, `getMainOwner()`, dan `setMainOwner()`.

`privatemode.ts` mengontrol apakah bot hanya merespons user terdaftar atau semua orang. `selfmode.ts` mengontrol apakah bot hanya merespons pesan dari nomor bot sendiri. Keduanya persistent via JSON dan bisa di-toggle runtime tanpa restart.

Plugin Manager
Bot ini punya hot-reload. `_pluginmanager.ts` adalah singleton `PluginManager` yang mengelola lifecycle seluruh plugin dengan:

- **Dynamic import** + cache-busting via timestamp agar module baru selalu di-load ulang
- **Dual registry**: `Map<command, PluginEntry>` untuk command plugin + `PassiveEntry[]` untuk passive handler
- **File watcher** (`fs.watch`) untuk auto-reload saat file berubah di disk
- **Rollback otomatis** jika plugin baru gagal validasi saat load
- **Disable/enable runtime** via `data/disabled_plugins.json` tanpa menyentuh file plugin

```
.reloadplugin all        reload semua plugin sekaligus
.reloadplugin menu       reload plugin spesifik
.disable menu            nonaktifkan plugin tanpa hapus file
.enable menu             aktifkan kembali plugin
.listplugin              lihat semua plugin + status (active/disabled)
```

Struktur plugin minimal (TypeScript ESM):

```typescript
// @ts-nocheck
const handler = async (m, { Morela, fkontak, args, text, sender, pushname }) => {
  await Morela.sendMessage(m.chat, { text: 'halo!' }, { quoted: m })
}

handler.command = /^(ping|p)$/i
handler.help    = ['ping']
handler.tags    = ['tools']
export default handler
```

Context yang tersedia di handler:

| key | isi |
|---|---|
| Morela | socket Baileys yang sudah di-extend |
| m | serialized MsgObj |
| args | array argumen setelah command |
| text | string setelah command |
| sender | JID pengirim |
| pushname | nama WA pengirim |
| fkontak | fake-kontakt header untuk quoted |
| isMainOwner | boolean cek Main Owner |
| isOwner | boolean cek Owner |
| isPremium | boolean cek Premium |

DevOps Suite (Main Owner Only)
Morela punya kemampuan untuk mengoperasikan server langsung dari chat WA tanpa perlu SSH.

```
.plugin tools/namafile   tulis plugin baru via chat (kirim dengan kode di bawahnya)
.getplugin menu          baca source code plugin langsung di WA
.reloadplugin menu       hot-reload plugin tanpa restart (~300ms)
.delplugin tools/file    hapus plugin dari server
.saveplugin              simpan plugin dari pesan reply
.addpkg axios            install npm package baru ke server
.healthcheck             uji semua API endpoint yang dipakai bot
.cekdb users             inspect isi JSON database dari chat
.backupdb                backup seluruh folder data/ ke ZIP
.clearcache              bersihkan file temp dan cache media
.deployweb               trigger deploy ke web server
.stopbot                 matikan proses bot
```

Telegram Integration
Selain WA, Morela juga punya Telegram bot (`tgbot.ts`) yang berjalan paralel. Nomor yang dispy via TG bisa dimonitor real-time. Konfigurasi via `.tgbotset` dari WA. Data TG global tersimpan di `data/tg_global.json`.

Plugins Bawaan

**admin**

| plugin | command | fungsi |
|---|---|---|
| antigrup | antigrup | cegah bot dari join grup random |
| antilink | antilink | auto-delete link di grup |
| antivirtex | antivirtex | filter pesan virtex/crash |
| ban | ban | kick member |
| goodbye | goodbye | canvas goodbye card |
| hidetag | hidetag | tag semua member tersembunyi |
| mute | mute | nonaktifkan respon bot di grup |
| openclose-schedule | jadwal | jadwal buka/tutup grup otomatis |
| outgc | outgc | keluarkan bot dari grup |
| reactionkick | - | kick via reaction emoji |
| welcome | welcome | canvas welcome card |

**ai**

| plugin | command | fungsi |
|---|---|---|
| aiagent | aiagent | AI agent berbasis OpenRouter |
| aiimage | aiimage | AI image generation |
| autoai | autoai | auto-reply AI di grup/PM |
| faceswap | faceswap | AI face swap |
| genmart | genmart | AI art generation |
| mathgpt | mathgpt | solver matematika AI |
| to-ai | to-ai | konversi & analisis berbasis AI |
| zai | zai | AI chat generik |

**downloader**

| plugin | command | fungsi |
|---|---|---|
| alldownload | dl | universal downloader |
| fb | fb | Facebook video |
| ig | ig | Instagram Reels/Posts |
| mediafire | mediafire | MediaFire direct |
| pin | pin | Pinterest |
| play | play | universal media player |
| soundcloud | sc | SoundCloud + canvas card |
| spotify | spotify | Spotify track info |
| tiktok / tt2 | tiktok | TikTok single & slide |
| webtoon | webtoon | Webtoon chapter |
| ytmp3 / ytmp4 | yt | YouTube audio/video |

**games**

| plugin | command | fungsi |
|---|---|---|
| asahotak | asahotak | tebak kata dari definisi |
| family100 | family100 | game family 100 |
| guildwar | guildwar | perang guild antar grup |
| kerangajaib | kerangajaib | si kerang ajaib |
| mining | mining | sistem mining koin |
| rpg-profil | rpg | profil RPG dengan canvas |
| susunkata | susunkata | susun huruf jadi kata |
| tebakbendera | tebakbendera | tebak bendera negara |
| tebakgambar | tebakgambar | tebak gambar |
| tebakkata | tebakkata | tebak kata dari clue |
| tebakkimia | tebakkimia | tebak unsur kimia |
| tebaksurah | tebaksurah | tebak nama surah |

**info**

| plugin | command | fungsi |
|---|---|---|
| artinama | artinama | arti sebuah nama |
| jadwalbola | jadwalbola | jadwal pertandingan bola |
| listsewa | listsewa | list grup sewa aktif |
| menu | menu | menu utama bot |
| mpl | mpl | info MPL esports |
| quran | quran | baca Al-Quran + canvas |
| totalfitur | totalfitur | total plugin aktif |

**maker**

| plugin | command | fungsi |
|---|---|---|
| carbon | carbon | code snippet ke gambar |
| discord | discord | fake Discord message |
| fakedev | fakedev | fake developer mode |
| fakeff | fakeff | fake Free Fire screenshot |
| fakeml | fakeml | fake Mobile Legends screenshot |
| fakestory | fakestory | fake WA story |
| faketweet | faketweet | fake tweet |
| flaming | flaming | teks api |
| musikcard | musikcard | music player card |
| toimg | toimg | konversi stiker ke gambar |

**sticker**

| plugin | command | fungsi |
|---|---|---|
| attp | attp | animated text to sticker |
| brat | brat | brat-style stiker |
| bratgura | bratgura | brat gura variant |
| emojimix | emojimix | mix dua emoji jadi stiker |
| stickerpack | stickerpack | kelola sticker pack |
| stiker | stiker | buat stiker dari gambar/video |
| stikerbrat | stikerbrat | stiker brat dari gambar |
| stikerline | stikerline | stiker LINE style |
| telestick | telestick | kirim stiker via Telegram |
| ttp | ttp | text to picture stiker |

**tools**

| plugin | command | fungsi |
|---|---|---|
| bypass | bypass | bypass shortlink |
| didyoumen | didyoumen | deteksi mention tersembunyi |
| getpp | getpp | ambil foto profil |
| hd / hdv1 / hdv2 | hd | upscale gambar HD |
| ocr | ocr | ekstrak teks dari gambar |
| ping | ping | cek latency bot |
| register | register | daftar sebagai user |
| removebg | removebg | hapus background gambar |
| report | report | kirim laporan ke owner |
| rvo | rvo | reveal view-once message |
| skiplink | skiplink | skip iklan shortlink |
| tempmail | tempmail | temporary email |
| tgspy | tgspy | spy nomor via Telegram |
| to4k | to4k | upscale video ke 4K |
| topchat | topchat | top chat aktif di grup |
| translate | translate | terjemahkan teks |
| userinfo | userinfo | info lengkap user WA |
| whois | whois | whois domain/IP |

**owner**

| plugin | command | fungsi |
|---|---|---|
| plugin | plugin | tulis plugin baru via chat |
| getplugin | getplugin | baca source code plugin |
| reloadplugin | reloadplugin | hot-reload plugin |
| delplugin | delplugin | hapus plugin |
| listplugin | listplugin | list semua plugin |
| disable / enable | disable | toggle plugin runtime |
| addpkg | addpkg | install npm package |
| healthcheck | healthcheck | cek semua API endpoint |
| cekdb | cekdb | inspect database JSON |
| backupdb | backupdb | backup database ke ZIP |
| clearcache | clearcache | bersihkan cache & temp |
| deployweb | deployweb | trigger web deployment |
| jadibot | jadibot | mode jadibot |
| sewagrub | sewagrub | kelola sewa grup |
| stats | stats | statistik penggunaan bot |
| topchat | topchat | monitor chat terbanyak |
| stopbot | stopbot | matikan bot |
| resetdb | resetdb | reset database |
| setmenu | setmenu | ganti gambar menu |
| setpp | setpp | ganti foto profil bot |
| privatmode | privatmode | toggle private mode |
| self | self | toggle self mode |
| owner | owner | kelola daftar owner |
| premium | premium | kelola daftar premium |
| pay | pay | konfirmasi pembayaran |
| tgbotset | tgbotset | konfigurasi Telegram bot |


built by Morela


© 2026 Morela · all rights reserved · do not resell or redistribute without permission
