// @ts-nocheck
import path from "path"
import os from 'os';
import { performance } from 'perf_hooks';
import { sizeFormatter } from 'human-readable';
import { createCanvas } from 'canvas';
import axios from 'axios';
import fs from 'fs';
import { execSync } from 'child_process';
import { bi, buildFkontak, sendCard, uploadImage, createSend, menuBuf, CHANNEL_URL, OWNER_WA, BOT_JID, imagePath, botName, botVersion } from '../../Library/utils.js'

const format = sizeFormatter({
  std: 'JEDEC', decimalPlaces: 2, keepTrailingZeroes: false,
  render: (literal: number, symbol: string) => `${literal} ${symbol}B`,
});



function calculatePercentage(used: number, total: number) {
  if (!total || total === 0) return '0.00';
  return ((used / total) * 100).toFixed(2);
}

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

async function getNetworkSpeed() {
  const start = performance.now();
  try {
    await axios.get('https://www.google.com', { timeout: 5000 });
    const ping = (performance.now() - start).toFixed(2);
    return { ping };
  } catch {
    return { ping: 'N/A' };
  }
}

function drawRoundedRect(ctx: unknown, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawIconBox(ctx: unknown, x: number, y: number, letter: string) {
  ctx.fillStyle = 'rgba(100,150,255,0.25)';
  ctx.strokeStyle = 'rgba(100,180,255,0.5)';
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, x, y, 32, 32, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#64B5F6';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(letter, x + 16, y + 16);
}

function drawProgressBar(ctx: unknown, x: number, y: number, w: number, h: number, percentage: number, color: string) {
  
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  drawRoundedRect(ctx, x, y, w, h, h / 2);
  ctx.fill();

  const fillW = Math.max(0, Math.min(w, (parseFloat(percentage) / 100) * w));
  if (fillW > 0) {
    const grad = ctx.createLinearGradient(x, y, x + fillW, y);
    grad.addColorStop(0, color + 'AA');
    grad.addColorStop(1, color);
    ctx.fillStyle = grad;
    drawRoundedRect(ctx, x, y, fillW, h, h / 2);
    ctx.fill();
  }

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${percentage}%`, x + w / 2, y + h / 2);
}

function drawCircularGauge(ctx: unknown, x: number, y: number, radius: number, percentage: number, color: string, label: string) {
  const pct = Math.min(100, Math.max(0, parseFloat(percentage) || 0));
  const startAngle = -Math.PI / 2;
  const endAngle   = startAngle + (pct / 100) * 2 * Math.PI;
  const cx = x + radius, cy = y + radius;

  ctx.beginPath();
  ctx.arc(cx, cy, radius - 8, 0, 2 * Math.PI);
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 10;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, radius - 8, startAngle, endAngle);
  ctx.strokeStyle = color;
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${Math.floor(radius * 0.35)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${pct.toFixed(0)}%`, cx, cy);

  ctx.fillStyle = '#B0C4DE';
  ctx.font = `14px Arial`;
  ctx.fillText(label, cx, cy + radius + 10);
}



const handler = async (m: any, { Morela, reply, fkontak }: any) => {
  try {
    await Morela.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });
    const startTime = performance.now();
    const cpus = os.cpus();
    const cpuModel = cpus.length > 0 ? cpus[0].model.trim() : 'Unknown';
    const cpuCount = cpus.length;
    const botUptime = process.uptime();
    const totalMem = os.totalmem(), freeMem = os.freemem(), usedMem = totalMem - freeMem;
    const memPercentage = calculatePercentage(usedMem, totalMem);
    const platform = os.platform(), osType = os.type(), osRelease = os.release();
    const cpuUsage = (() => {
      let totalIdle = 0, totalTick = 0;
      cpus.forEach((cpu: unknown) => { for (const t in cpu.times) totalTick += cpu.times[t]; totalIdle += cpu.times.idle; });
      return (100 - (totalIdle / totalTick * 100)).toFixed(1);
    })();
    let diskTotal = 0, diskUsed = 0, diskFree = 0, diskPercentage = 0;
    try {
      const df = execSync('df -B1 / | tail -1').toString().trim().split(/\s+/);
      diskTotal = parseInt(df[1])||0; diskUsed = parseInt(df[2])||0;
      diskFree = parseInt(df[3])||0; diskPercentage = calculatePercentage(diskUsed, diskTotal);
    } catch {}
    const networkInfo = await getNetworkSpeed();
    const endTime = performance.now();
    const responseTime = (endTime - startTime).toFixed(2);
    await Morela.sendMessage(m.chat, { react: { text: '⚙️', key: m.key } });

    const W = 1200, H = 800;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');
    const bg = ctx.createLinearGradient(0,0,W,H);
    bg.addColorStop(0,'#1A2332'); bg.addColorStop(0.3,'#2D3748'); bg.addColorStop(0.7,'#1A2332'); bg.addColorStop(1,'#0F1419');
    ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
    ctx.strokeStyle='rgba(100,150,200,0.12)'; ctx.lineWidth=0.8;
    for (let x=0;x<=W;x+=50){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for (let y=0;y<=H;y+=50){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    for (let i=0;i<12;i++){
      const x=Math.random()*W,y=Math.random()*H,r=Math.random()*120+40;
      const g=ctx.createRadialGradient(x,y,0,x,y,r);
      g.addColorStop(0,'rgba(100,200,255,0.08)');g.addColorStop(0.5,'rgba(150,180,255,0.04)');g.addColorStop(1,'rgba(100,200,255,0)');
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
    }
    const tg=ctx.createLinearGradient(0,50,W,90);
    tg.addColorStop(0,'#64B5F6');tg.addColorStop(0.5,'#FFFFFF');tg.addColorStop(1,'#81C784');
    ctx.fillStyle=tg;ctx.font='bold 72px Arial';ctx.textAlign='center';
    ctx.shadowColor='rgba(100,200,255,0.6)';ctx.shadowBlur=20;ctx.fillText('SERVER STATUS',W/2,80);ctx.shadowBlur=0;
    ctx.fillStyle='#B0C4DE';ctx.font='22px Arial';
    ctx.fillText(`${osType} | ${platform.toUpperCase()} | Node.js ${process.version}`,W/2,120);
    const pg=ctx.createLinearGradient(40,170,40,470);
    pg.addColorStop(0,'rgba(25,35,55,0.85)');pg.addColorStop(0.5,'rgba(35,45,65,0.9)');pg.addColorStop(1,'rgba(20,30,50,0.85)');
    ctx.fillStyle=pg;drawRoundedRect(ctx,40,170,W-80,300,25);ctx.fill();
    ctx.strokeStyle='rgba(100,180,255,0.4)';ctx.lineWidth=2;drawRoundedRect(ctx,40,170,W-80,300,25);ctx.stroke();
    const c1=90,c2=W/2+40;let rowY=215;const rh=40;
    const drawRow=(x,y,icon,label,val,vc='#FFFFFF')=>{
      drawIconBox(ctx,x,y-15,icon);
      ctx.fillStyle='#B0C4DE';ctx.font='18px Arial';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(label,x+45,y);
      ctx.fillStyle=vc;ctx.font='bold 18px Arial';ctx.shadowColor='rgba(255,255,255,0.2)';ctx.shadowBlur=3;ctx.fillText(val,x+230,y);ctx.shadowBlur=0;
    };
    const sm=cpuModel.length>20?cpuModel.substring(0,17)+'...':cpuModel;
    drawRow(c1,rowY,'C','CPU Model:',sm);rowY+=rh;
    drawRow(c1,rowY,'A','Architecture:',os.arch().toUpperCase());rowY+=rh;
    drawRow(c1,rowY,'P','CPU Cores:',`${cpuCount} cores`);rowY+=rh;
    const clc=parseFloat(cpuUsage)>80?'#FF6B6B':parseFloat(cpuUsage)>60?'#FFD93D':'#6BCF7F';
    drawRow(c1,rowY,'L','CPU Load:',`${cpuUsage}%`,clc);rowY+=rh;
    drawRow(c1,rowY,'U','Bot Uptime:',formatUptime(botUptime),'#6BCF7F');rowY+=rh;
    const rtc=parseFloat(responseTime)>100?'#FF6B6B':parseFloat(responseTime)>50?'#FFD93D':'#6BCF7F';
    drawRow(c1,rowY,'R','Response:',`${responseTime} ms`,rtc);
    rowY=215;
    drawRow(c2,rowY,'M','Memory:',`${format(usedMem)} / ${format(totalMem)}`);rowY+=rh;
    drawRow(c2,rowY,'D','Disk:',`${format(diskUsed)} / ${format(diskTotal)}`);rowY+=rh;
    const sr=osRelease.length>15?osRelease.substring(0,12)+'...':osRelease;
    drawRow(c2,rowY,'S','System:',`${platform} ${sr}`);rowY+=rh;
    drawRow(c2,rowY,'H','Hostname:','morela');rowY+=rh;
    const pc=networkInfo.ping==='N/A'?'#8FA2B7':parseFloat(networkInfo.ping)>100?'#FF6B6B':parseFloat(networkInfo.ping)>50?'#FFD93D':'#6BCF7F';
    drawRow(c2,rowY,'N','Network Ping:',`${networkInfo.ping} ms`,pc);rowY+=rh;
    drawRow(c2,rowY,'W','PID:',`${process.pid}`);
    ctx.fillStyle='#FFFFFF';ctx.font='bold 18px Arial';ctx.textAlign='left';
    ctx.shadowColor='rgba(255,255,255,0.3)';ctx.shadowBlur=5;ctx.fillText('Memory Usage',80,510);ctx.shadowBlur=0;
    const mbc=parseFloat(memPercentage)>80?'#FF6B6B':parseFloat(memPercentage)>60?'#FFD93D':'#6BCF7F';
    drawProgressBar(ctx,80,525,W-160,25,memPercentage,mbc);
    const gs=120,gy=610;
    const g1x=230-gs/2,g2x=W/2-gs/2,g3x=W-230-gs/2;
    const cgc=parseFloat(cpuUsage)>80?'#FF6B6B':parseFloat(cpuUsage)>60?'#FFD93D':'#6BCF7F';
    const mgc=parseFloat(memPercentage)>80?'#FF6B6B':parseFloat(memPercentage)>60?'#FFD93D':'#6BCF7F';
    const dgc=parseFloat(diskPercentage)>80?'#FF6B6B':parseFloat(diskPercentage)>60?'#FFD93D':'#6BCF7F';
    drawCircularGauge(ctx,g1x,gy,gs/2,cpuUsage,cgc,'CPU');
    drawCircularGauge(ctx,g2x,gy,gs/2,memPercentage,mgc,'MEMORY');
    drawCircularGauge(ctx,g3x,gy,gs/2,diskPercentage,dgc,'DISK');
    ctx.fillStyle='#B0C4DE';ctx.font='16px Arial';ctx.textAlign='center';
    ctx.fillText('Ultra Modern Server Dashboard • Powered by Morela',W/2,H-30);
    const buffer = canvas.toBuffer('image/png');

    const lms = parseFloat(networkInfo.ping);
    const ls = networkInfo.ping==='N/A'?'❓ Unknown':lms<100?'🟢 Good':lms<300?'🟡 Medium':'🔴 Poor';
    let loadAvg='-, -, -';
    try{loadAvg=os.loadavg().map((v: unknown) =>v.toFixed(2)).join(', ');}catch{}
    const mem=process.memoryUsage();
    const hu=(mem.heapUsed/1024/1024).toFixed(1),ht=(mem.heapTotal/1024/1024).toFixed(1);
    const rss=(mem.rss/1024/1024).toFixed(1),ext=(mem.external/1024/1024).toFixed(1);
    let netIface='eth0',netRx=0,netTx=0;
    try{
      const nets=os.networkInterfaces();
      netIface=Object.keys(nets).find((k: unknown) =>k!=='lo')||'eth0';
      const rx=execSync(`cat /proc/net/dev | grep ${netIface}`).toString().trim().split(/\s+/);
      netRx=parseInt(rx[1])||0;netTx=parseInt(rx[9])||0;
    }catch{}
    const fb=b=>b>=1073741824?(b/1073741824).toFixed(1)+' GB':b>=1048576?(b/1048576).toFixed(1)+' MB':b>=1024?(b/1024).toFixed(1)+' KB':b+' B';
    const footer = `⚡ *SYSTEM DASHBOARD*

╭╌╌⬡「 🏓 *ʀᴇsᴘᴏɴsᴇ* 」
┃ ◦ Latency: *${networkInfo.ping}ms* ${ls}
┃ ◦ Status: *Online*
╰╌╌⬡

╭╌╌⬡「 🖥️ *sᴇʀᴠᴇʀ* 」
┃ ◦ Hostname: *morela*
┃ ◦ OS: *${osType==='Linux'?'🐧 Linux':osType}*
┃ ◦ Arch: *${os.arch()}*
┃ ◦ Kernel: *${osRelease}*
╰╌╌⬡

╭╌╌⬡「 💻 *ᴄᴘᴜ* 」
┃ ◦ Model: *${cpuModel.length>25?cpuModel.slice(0,23)+'..':cpuModel}*
┃ ◦ Cores: *${cpuCount} cores @ ${Math.round(cpus[0]?.speed||0)} MHz*
┃ ◦ Load: *${cpuUsage}%*
┃ ◦ Load Avg: *${loadAvg}*
╰╌╌⬡

╭╌╌⬡「 🧠 *ᴍᴇᴍᴏʀʏ* 」
┃ ◦ Total: *${format(totalMem)}*
┃ ◦ Used: *${format(usedMem)}* (${memPercentage}%)
┃ ◦ Free: *${format(freeMem)}*
┃ ◦ Heap: *${hu} MB/${ht} MB*
┃ ◦ RSS: *${rss} MB*
╰╌╌⬡

╭╌╌⬡「 💾 *sᴛᴏʀᴀɢᴇ* 」
┃ ◦ Total: *${format(diskTotal)}*
┃ ◦ Used: *${format(diskUsed)}* (${diskPercentage}%)
┃ ◦ Free: *${format(diskFree)}*
╰╌╌⬡

╭╌╌⬡「 📊 *ᴘʀᴏᴄᴇss* 」
┃ ◦ PID: *${process.pid}*
┃ ◦ Node.js: *${process.version}*
┃ ◦ V8: *${process.versions.v8}*
┃ ◦ External: *${ext} MB*
┃ ◦ Handles: *${(process._getActiveHandles?.()||[]).length}*
┃ ◦ Requests: *${(process._getActiveRequests?.()||[]).length}*
╰╌╌⬡

╭╌╌⬡「 🌐 *ɴᴇᴛᴡᴏʀᴋ* 」
┃ ◦ Interface: *${netIface}*
┃ ◦ Download: *${fb(netRx)}*
┃ ◦ Upload: *${fb(netTx)}*
╰╌╌⬡

╭╌╌⬡「 ⏱️ *ᴜᴘᴛɪᴍᴇ* 」
┃ ◦ Bot: *${formatUptime(botUptime)}*
┃ ◦ Server: *${formatUptime(os.uptime())}*
╰╌╌⬡
© ${botName}`;

    await Morela.sendMessage(m.chat, {
      image: buffer, caption: ' ', footer,
      interactiveButtons: [{
        name: "cta_url",
        buttonParamsJson: JSON.stringify({ display_text: "Channel", url: CHANNEL_URL, merchant_url: CHANNEL_URL })
      }],
      hasMediaAttachment: true
    }, { quoted: fkontak || m });
    await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
  } catch (err) {
    console.error('Server status error:', err);
    await reply(`❌ *Error!*\n\n${(err as Error).message}`);
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
  }
};

handler.help     = ['server', 'status', 'ping', 'info'];
handler.tags     = ['info', 'tools', 'system'];
handler.command  = ['server', 'status', 'ping', 'info', 'jaringan', 'tester'];
handler.noLimit  = true;
handler.owner    = false;
handler.premium  = false;
handler.group    = false;
handler.private  = false;
handler.admin    = false;
handler.botAdmin = false;

export default handler;