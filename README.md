<div align="center">

<img src="media/menu.jpg" alt="Morela Bot Banner" width="600" style="border-radius:12px"/>

# 🤖 Morela

![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-339933?style=for-the-badge&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Baileys](https://img.shields.io/badge/Baileys-@itsukichan%20v7.3.2-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)
![Version](https://img.shields.io/badge/Version-2.0.0-blue?style=for-the-badge)

</div>

---

## ⚙️ Install

```bash
npm install
```

> Kalau error di `canvas`, install dulu lib-nya:
> ```bash
> sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
> ```
> Lalu `npm install` lagi.

---

## 👑 Setting Main Owner

Edit file `data/mainowner.json` — isi nomor HP kamu (kode negara, tanpa `+`):

```json
["628xxxxxxxxxx"]
```

> Contoh: `628999889149`
> Main Owner punya akses penuh ke semua fitur, termasuk saat **Jadibot** aktif.

---

## 👤 Setting Owner

Edit file `data/Own.json` — bisa lebih dari satu nomor:

```json
["628xxxxxxxxxx", "628yyyyyyyyy"]
```

---

## 🚀 Cara Jalankan

**Development:**
```bash
npm run dev
```

**Production (PM2):**
```bash
npm run build
npm run pm2:prod
```

**Development (PM2):**
```bash
npm run pm2:dev
```

---

## 🔗 Link Bot ke WhatsApp

Setelah bot jalan, akan muncul **8-digit pairing code** di terminal.

Buka WhatsApp → **Setelan → Perangkat Tertaut → Tautkan dengan nomor telepon** → masukkan kode.

---

## 📊 Monitor (PM2)

```bash
pm2 logs morela     # live logs
pm2 status          # status proses
pm2 monit           # dashboard
```

---

<div align="center">

**Built with 🔥 by [putraa](https://wa.me/628999889149)**

[![WhatsApp Channel](https://img.shields.io/badge/WhatsApp-Channel-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://whatsapp.com/channel/0029VbC6GY50VycJQ7nFgo3v)

</div>
