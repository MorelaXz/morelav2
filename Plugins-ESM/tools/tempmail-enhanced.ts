// @ts-nocheck
import * as cheerio from 'cheerio';
import { createCanvas } from "canvas";



const CONFIG = {
  memory: {
    ttl: 5 * 60 * 1000, 
    maxSize: 1000, 
    cleanupInterval: 60_000 
  },
  
  rateLimit: {
    maxRequests: 5,
    windowMs: 60_000 
  },
  
  api: {
    base: 'https://generator.email/',
    validate: 'check_adres_validation3.php',
    timeout: 15000, 
    maxRetries: 3
  },
  
  canvas: {
    width: 700,
    height: 520,
    colors: {
      background: {
        start: "#0f172a",
        mid: "#1e293b",
        end: "#334155"
      },
      card: "rgba(30, 41, 59, 0.8)",
      success: "#34d399",
      successBg: "rgba(52, 211, 153, 0.15)",
      error: "#ef4444",
      errorBg: "rgba(239, 68, 68, 0.15)",
      info: "#60a5fa",
      infoBg: "rgba(96, 165, 250, 0.15)",
      warning: "#fbbf24",
      warningBg: "rgba(251, 191, 36, 0.15)",
      purple: "#a78bfa",
      purpleBg: "rgba(167, 139, 250, 0.15)",
      text: {
        primary: "#ffffff",
        secondary: "#cbd5e1",
        muted: "#94a3b8"
      }
    },
    fonts: {
      title: "bold 28px Arial",
      subtitle: "20px Arial",
      body: "18px Arial",
      bodyBold: "bold 18px Arial",
      small: "13px Arial",
      large: "bold 36px Arial",
      xlarge: "bold 60px Arial",
      email: "bold 20px 'Courier New'",
      badge: "bold 26px Arial"
    }
  }
};



class MemoryManager {
  constructor(maxSize = CONFIG.memory.maxSize, ttl = CONFIG.memory.ttl) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.startCleanup();
  }

  set(key, value) {
    
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
      console.log(`[MEMORY] Evicted oldest entry: ${firstKey}`);
    }

    this.cache.set(key, {
      data: value,
      expire: Date.now() + this.ttl
    });
    
    console.log(`[MEMORY] Saved: ${key} (expires in ${this.ttl / 1000}s)`);
  }

  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    if (entry.expire < Date.now()) {
      this.cache.delete(key);
      console.log(`[MEMORY] Expired: ${key}`);
      return null;
    }

    return entry.data;
  }

  delete(key) {
    return this.cache.delete(key);
  }

  cleanup() {
    const now = Date.now();
    let deletedCount = 0;

    for (const [key, value] of this.cache) {
      if (value.expire < now) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      console.log(`[CLEANUP] Deleted ${deletedCount} expired entries`);
    }
  }

  startCleanup() {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, CONFIG.memory.cleanupInterval);
  }

  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

const memoryManager = new MemoryManager();



class RateLimiter {
  constructor(maxRequests = CONFIG.rateLimit.maxRequests, windowMs = CONFIG.rateLimit.windowMs) {
    this.limits = new Map();
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  check(userId) {
    const now = Date.now();
    const userLimit = this.limits.get(userId);

    if (!userLimit || now > userLimit.reset) {
      this.limits.set(userId, {
        count: 1,
        reset: now + this.windowMs
      });
      return true;
    }

    if (userLimit.count >= this.maxRequests) {
      return false;
    }

    userLimit.count++;
    return true;
  }

  getRemainingTime(userId) {
    const userLimit = this.limits.get(userId);
    if (!userLimit) return 0;
    
    const remaining = userLimit.reset - Date.now();
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
  }
}

const rateLimiter = new RateLimiter();



function sanitizeText(text: string) {
  if (!text) return '';
  return String(text)
    .replace(/[<>]/g, '')
    .replace(/\\/g, '\\\\')
    .substring(0, 1000);
}

function isValidEmail(email: unknown) {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function parseEmail(email: unknown) {
  if (!email || !email.includes('@')) return null;
  const [username, domain] = email.split('@');
  return { username, domain };
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}



class HttpClient {
  constructor() {
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };
  }

  async fetchWithTimeout(url, options = {}, timeout = CONFIG.api.timeout) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  async fetchWithRetry(url, options = {}, maxRetries = CONFIG.api.maxRetries) {
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await this.fetchWithTimeout(url, options);

        if (options.responseType === 'text') {
          return await response.text();
        }

        const text = await response.text();
        try {
          return JSON.parse(text);
        } catch {
          return text;
        }
      } catch (error) {
        lastError = error;
        console.error(`[HTTP] Attempt ${attempt + 1}/${maxRetries} failed: ${(error as Error).message}`);
        
        if (attempt < maxRetries - 1) {
          
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`[HTTP] Retrying in ${delay}ms...`);
          await sleep(delay);
        }
      }
    }

    throw lastError;
  }
}

const httpClient = new HttpClient();



class TempMailClient {
  constructor() {
    this.baseUrl = CONFIG.api.base;
    this.validatePath = CONFIG.api.validate;
  }

  async validateEmail(username, domain) {
    try {
      const result = await httpClient.fetchWithRetry(
        this.baseUrl + this.validatePath,
        {
          method: 'POST',
          headers: {
            ...httpClient.headers,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({ usr: username, dmn: domain })
        }
      );

      return result;
    } catch (error) {
      console.error('[VALIDATE] Error:', (error as Error).message);
      return { error: (error as Error).message };
    }
  }

  async generateEmail() {
    try {
      const html = await httpClient.fetchWithRetry(
        this.baseUrl,
        {
          headers: httpClient.headers,
          cache: 'no-store',
          responseType: 'text'
        }
      );

      const $ = cheerio.load(html);
      const email = $('#email_ch_text').text().trim();

      if (!email) {
        throw new Error('Failed to generate email from page');
      }

      const parsed = parseEmail(email);
      if (!parsed) {
        throw new Error('Invalid email format received');
      }

      const validation = await this.validateEmail(parsed.username, parsed.domain);

      return {
        success: true,
        result: {
          email: sanitizeText(email),
          emailStatus: validation.status || 'unknown',
          uptime: validation.uptime || 0,
          ...(validation.error && { error: validation.error })
        }
      };
    } catch (error) {
      console.error('[GENERATE] Error:', (error as Error).message);
      return {
        success: false,
        result: (error as Error).message
      };
    }
  }

  async checkInbox(email) {
    const parsed = parseEmail(email);
    if (!parsed) {
      return {
        success: false,
        result: 'Invalid email format'
      };
    }

    const { username, domain } = parsed;
    const validation = await this.validateEmail(username, domain);
    const cookie = `surl=${domain}/${username}`;

    try {
      const html = await httpClient.fetchWithRetry(
        this.baseUrl,
        {
          headers: {
            ...httpClient.headers,
            Cookie: cookie
          },
          cache: 'no-store',
          responseType: 'text'
        }
      );

      if (html.includes('Email generator is ready')) {
        return {
          success: true,
          result: {
            email: sanitizeText(email),
            emailStatus: validation.status,
            uptime: validation.uptime,
            inbox: []
          }
        };
      }

      const $ = cheerio.load(html);
      const messageCount = parseInt($('#mess_number').text()) || 0;
      const messages = [];

      if (messageCount === 1) {
        
        const el = $('#email-table .e7m.row');
        const spans = el.find('.e7m.col-md-9 span');

        messages.push({
          from: sanitizeText(spans.eq(3).text().replace(/\(.*?\)/, '').trim()),
          to: sanitizeText(spans.eq(1).text()),
          created: sanitizeText(el.find('.e7m.tooltip').text().replace('Created: ', '')),
          subject: sanitizeText(el.find('h1').text()),
          message: sanitizeText(el.find('.e7m.mess_bodiyy').text().trim())
        });
      } else if (messageCount > 1) {
        
        const links = $('#email-table a')
          .map((_, a) => $(a).attr('href'))
          .get();

        const messagePromises = links.map(async (link) => {
          try {
            const msgHtml = await httpClient.fetchWithRetry(
              this.baseUrl,
              {
                headers: {
                  ...httpClient.headers,
                  Cookie: `surl=${link.replace('/', '')}`
                },
                cache: 'no-store',
                responseType: 'text'
              }
            );

            const m$ = cheerio.load(msgHtml);
            const spans = m$('.e7m.col-md-9 span');

            return {
              from: sanitizeText(spans.eq(3).text().replace(/\(.*?\)/, '').trim()),
              to: sanitizeText(spans.eq(1).text()),
              created: sanitizeText(m$('.e7m.tooltip').text().replace('Created: ', '')),
              subject: sanitizeText(m$('h1').text()),
              message: sanitizeText(m$('.e7m.mess_bodiyy').text().trim())
            };
          } catch (error) {
            console.error(`[INBOX] Failed to fetch message ${link}:`, (error as Error).message);
            return null;
          }
        });

        const results = await Promise.all(messagePromises);
        messages.push(...results.filter((msg: unknown) => msg !== null));
      }

      return {
        success: true,
        result: {
          email: sanitizeText(email),
          emailStatus: validation.status,
          uptime: validation.uptime,
          inbox: messages
        }
      };
    } catch (error) {
      console.error('[INBOX] Error:', (error as Error).message);
      return {
        success: true,
        result: {
          email: sanitizeText(email),
          emailStatus: validation.status,
          uptime: validation.uptime,
          inbox: [],
          error: (error as Error).message
        }
      };
    }
  }

  async validateEmailStatus(email) {
    const parsed = parseEmail(email);
    if (!parsed) {
      return {
        success: false,
        result: 'Invalid email format'
      };
    }

    const { username, domain } = parsed;
    const validation = await this.validateEmail(username, domain);

    return {
      success: true,
      result: {
        email: sanitizeText(email),
        emailStatus: validation.status || 'unknown',
        uptime: validation.uptime || 0,
        ...(validation.error && { error: validation.error })
      }
    };
  }
}

const tempMailClient = new TempMailClient();



function roundRect(ctx: unknown, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function wrapText(ctx: unknown, text: string, x: number, y: number, maxWidth: number, lineHeight: unknown) {
  const words = text.split(' ');
  let line = '';
  const lines = [];

  for (const word of words) {
    const testLine = line + word + ' ';
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && line.length > 0) {
      lines.push(line.trim());
      line = word + ' ';
    } else {
      line = testLine;
    }
  }
  lines.push(line.trim());

  lines.forEach((line, i) => {
    ctx.fillText(line, x, y + (i * lineHeight));
  });

  return lines.length;
}

function createBaseCanvas() {
  const { width, height, colors } = CONFIG.canvas;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, colors.background.start);
  gradient.addColorStop(0.5, colors.background.mid);
  gradient.addColorStop(1, colors.background.end);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  return { canvas, ctx };
}

function drawHeader(ctx: unknown, icon: string, title: string, subtitle: unknown) {
  const { colors, fonts } = CONFIG.canvas;

  ctx.fillStyle = colors.card;
  roundRect(ctx, 30, 30, 640, 90, 15);
  ctx.fill();

  const iconGradient = ctx.createRadialGradient(75, 75, 10, 75, 75, 35);
  iconGradient.addColorStop(0, "#60a5fa");
  iconGradient.addColorStop(1, "#3b82f6");
  ctx.fillStyle = iconGradient;
  ctx.beginPath();
  ctx.arc(75, 75, 35, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = colors.text.primary;
  ctx.font = fonts.large;
  ctx.fillText(icon, 57, 88);

  ctx.fillStyle = colors.text.primary;
  ctx.font = fonts.title;
  ctx.fillText(title, 130, 70);

  ctx.fillStyle = colors.text.secondary;
  ctx.font = fonts.subtitle;
  ctx.fillText(subtitle, 130, 100);
}

function drawEmailBox(ctx: unknown, email: unknown, yPosition: unknown = 145) {
  const { colors, fonts } = CONFIG.canvas;

  ctx.fillStyle = colors.infoBg;
  ctx.strokeStyle = colors.info;
  ctx.lineWidth = 2;
  roundRect(ctx, 30, yPosition, 640, 70, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = colors.text.secondary;
  ctx.font = fonts.small;
  ctx.fillText("📧 Your Email Address", 50, yPosition + 25);

  ctx.fillStyle = colors.info;
  ctx.font = fonts.email;
  
  const emailWidth = ctx.measureText(email).width;
  if (emailWidth > 580) {
    ctx.font = "bold 16px 'Courier New'";
  }
  
  ctx.fillText(email, 50, yPosition + 52);
}



async function createGenerateCard(data: unknown[]) {
  const { canvas, ctx } = createBaseCanvas();
  const { colors, fonts } = CONFIG.canvas;

  const headerGradient = ctx.createLinearGradient(0, 0, 700, 150);
  headerGradient.addColorStop(0, "rgba(59, 130, 246, 0.9)");
  headerGradient.addColorStop(1, "rgba(147, 51, 234, 0.8)");
  ctx.fillStyle = headerGradient;
  roundRect(ctx, 0, 0, 700, 150, 0);
  ctx.fill();

  ctx.shadowColor = "rgba(59, 130, 246, 0.5)";
  ctx.shadowBlur = 20;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(75, 75, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = "#3b82f6";
  ctx.font = "bold 45px Arial";
  ctx.fillText("📧", 53, 95);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 32px Arial";
  ctx.fillText("Temp Mail", 140, 65);

  ctx.font = "18px Arial";
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.fillText("✨ Email sementara berhasil dibuat!", 140, 95);

  ctx.shadowColor = "rgba(0, 0, 0, 0.15)";
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 5;
  
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, 30, 170, 640, 100, 15);
  ctx.fill();
  
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.fillStyle = "#64748b";
  ctx.font = "bold 14px Arial";
  ctx.fillText("📧 YOUR EMAIL ADDRESS", 50, 195);

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 24px 'Courier New'";
  
  const emailText = data.email;
  const emailWidth = ctx.measureText(emailText).width;
  if (emailWidth > 580) {
    ctx.font = "bold 20px 'Courier New'";
  }
  
  ctx.fillText(emailText, 50, 230);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "12px Arial";
  ctx.fillText("💡 Tap to copy address", 50, 255);

  const cardY = 300;
  const cardHeight = 120;
  const cardWidth = 200;
  const cardGap = 20;

  const totalWidth = (cardWidth * 3) + (cardGap * 2);
  const startX = (700 - totalWidth) / 2;

  const isGood = data.emailStatus === 'good';
  const statusColor = isGood ? "#10b981" : "#ef4444";
  const statusBg = isGood ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)";

  ctx.fillStyle = statusBg;
  ctx.strokeStyle = statusColor;
  ctx.lineWidth = 2;
  roundRect(ctx, startX, cardY, cardWidth, cardHeight, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = statusColor;
  ctx.font = "bold 40px Arial";
  const statusIcon = isGood ? "✓" : "✗";
  const statusIconWidth = ctx.measureText(statusIcon).width;
  ctx.fillText(statusIcon, startX + (cardWidth / 2) - (statusIconWidth / 2), cardY + 55);

  ctx.fillStyle = "#64748b";
  ctx.font = "12px Arial";
  ctx.fillText("STATUS", startX + (cardWidth / 2) - 25, cardY + 85);

  ctx.fillStyle = statusColor;
  ctx.font = "bold 18px Arial";
  const statusText = (data.emailStatus || "unknown").toUpperCase();
  const statusTextWidth = ctx.measureText(statusText).width;
  ctx.fillText(statusText, startX + (cardWidth / 2) - (statusTextWidth / 2), cardY + 107);

  const card2X = startX + cardWidth + cardGap;
  
  ctx.fillStyle = "rgba(168, 85, 247, 0.1)";
  ctx.strokeStyle = "#a855f7";
  ctx.lineWidth = 2;
  roundRect(ctx, card2X, cardY, cardWidth, cardHeight, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#a855f7";
  ctx.font = "bold 40px Arial";
  ctx.fillText("⏱️", card2X + 80, cardY + 50);

  ctx.fillStyle = "#64748b";
  ctx.font = "12px Arial";
  ctx.fillText("UPTIME", card2X + (cardWidth / 2) - 28, cardY + 85);

  ctx.fillStyle = "#a855f7";
  ctx.font = "bold 18px Arial";
  const uptimeText = `${data.uptime || "0"}s`;
  const uptimeWidth = ctx.measureText(uptimeText).width;
  ctx.fillText(uptimeText, card2X + (cardWidth / 2) - (uptimeWidth / 2), cardY + 107);

  const card3X = startX + (cardWidth * 2) + (cardGap * 2);
  
  ctx.fillStyle = "rgba(234, 179, 8, 0.1)";
  ctx.strokeStyle = "#eab308";
  ctx.lineWidth = 2;
  roundRect(ctx, card3X, cardY, cardWidth, cardHeight, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#eab308";
  ctx.font = "bold 40px Arial";
  ctx.fillText("⏰", card3X + 80, cardY + 50);

  ctx.fillStyle = "#64748b";
  ctx.font = "12px Arial";
  ctx.fillText("ACTIVE FOR", card3X + (cardWidth / 2) - 38, cardY + 85);

  ctx.fillStyle = "#eab308";
  ctx.font = "bold 18px Arial";
  const activeText = "5 min";
  const activeWidth = ctx.measureText(activeText).width;
  ctx.fillText(activeText, card3X + (cardWidth / 2) - (activeWidth / 2), cardY + 107);

  ctx.fillStyle = "rgba(59, 130, 246, 0.1)";
  roundRect(ctx, 30, 450, 640, 50, 10);
  ctx.fill();

  ctx.fillStyle = "#3b82f6";
  ctx.font = "14px Arial";
  ctx.fillText("💡", 50, 481);
  
  ctx.fillStyle = "#475569";
  ctx.font = "14px Arial";
  ctx.fillText("Use", 75, 481);
  
  ctx.fillStyle = "#3b82f6";
  ctx.font = "bold 14px Arial";
  ctx.fillText(".tempmail inbox", 105, 481);
  
  ctx.fillStyle = "#475569";
  ctx.font = "14px Arial";
  ctx.fillText("to check messages without typing email again!", 210, 481);

  return canvas.toBuffer("image/png");
}



async function createInboxCard(data: unknown[]) {
  const { canvas, ctx } = createBaseCanvas();
  const { colors, fonts } = CONFIG.canvas;

  const headerGradient = ctx.createLinearGradient(0, 0, 700, 150);
  headerGradient.addColorStop(0, "rgba(16, 185, 129, 0.9)");
  headerGradient.addColorStop(1, "rgba(5, 150, 105, 0.8)");
  ctx.fillStyle = headerGradient;
  roundRect(ctx, 0, 0, 700, 150, 0);
  ctx.fill();

  ctx.shadowColor = "rgba(16, 185, 129, 0.5)";
  ctx.shadowBlur = 20;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(75, 75, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = "#10b981";
  ctx.font = "bold 45px Arial";
  ctx.fillText("📬", 53, 95);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 32px Arial";
  ctx.fillText("Inbox Mail", 140, 65);

  const messageCount = data.inbox.length;
  ctx.font = "18px Arial";
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.fillText(`📨 ${messageCount} message${messageCount !== 1 ? 's' : ''} received`, 140, 95);

  ctx.shadowColor = "rgba(0, 0, 0, 0.15)";
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 5;
  
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, 30, 170, 640, 80, 15);
  ctx.fill();
  
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.fillStyle = "#64748b";
  ctx.font = "bold 13px Arial";
  ctx.fillText("MONITORING", 50, 192);

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 22px 'Courier New'";
  const emailWidth = ctx.measureText(data.email).width;
  if (emailWidth > 580) {
    ctx.font = "bold 18px 'Courier New'";
  }
  ctx.fillText(data.email, 50, 220);

  const isGood = data.emailStatus === 'good';
  const statusColor = isGood ? "#10b981" : "#ef4444";
  
  ctx.fillStyle = statusColor;
  ctx.beginPath();
  ctx.arc(620, 210, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#94a3b8";
  ctx.font = "11px Arial";
  ctx.fillText("Live", 600, 235);

  const centerY = 330;

  const circleRadius = 70;
  const circleColor = messageCount > 0 ? "#10b981" : "#94a3b8";
  const circleBg = messageCount > 0 ? "rgba(16, 185, 129, 0.1)" : "rgba(148, 163, 184, 0.1)";

  ctx.fillStyle = circleBg;
  ctx.beginPath();
  ctx.arc(350, centerY, circleRadius + 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = circleColor;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(350, centerY, circleRadius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = circleColor;
  ctx.font = "bold 56px Arial";
  const countText = String(messageCount);
  const countWidth = ctx.measureText(countText).width;
  ctx.fillText(countText, 350 - (countWidth / 2), centerY + 20);

  ctx.fillStyle = "#64748b";
  ctx.font = "16px Arial";
  const labelText = messageCount === 1 ? "Message" : "Messages";
  const labelWidth = ctx.measureText(labelText).width;
  ctx.fillText(labelText, 350 - (labelWidth / 2), centerY + 55);

  const infoY = 440;
  const infoHeight = 60;

  ctx.fillStyle = isGood ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)";
  ctx.strokeStyle = statusColor;
  ctx.lineWidth = 2;
  roundRect(ctx, 30, infoY, 200, infoHeight, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#64748b";
  ctx.font = "11px Arial";
  ctx.fillText("STATUS", 50, infoY + 23);

  ctx.fillStyle = statusColor;
  ctx.font = "bold 16px Arial";
  ctx.fillText(data.emailStatus.toUpperCase(), 50, infoY + 45);

  ctx.fillStyle = "rgba(168, 85, 247, 0.1)";
  ctx.strokeStyle = "#a855f7";
  ctx.lineWidth = 2;
  roundRect(ctx, 250, infoY, 200, infoHeight, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#64748b";
  ctx.font = "11px Arial";
  ctx.fillText("UPTIME", 270, infoY + 23);

  ctx.fillStyle = "#a855f7";
  ctx.font = "bold 16px Arial";
  ctx.fillText(`${data.uptime || "0"} seconds`, 270, infoY + 45);

  ctx.fillStyle = "rgba(59, 130, 246, 0.1)";
  ctx.strokeStyle = "#3b82f6";
  ctx.lineWidth = 2;
  roundRect(ctx, 470, infoY, 200, infoHeight, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#64748b";
  ctx.font = "11px Arial";
  ctx.fillText("LAST CHECK", 490, infoY + 23);

  ctx.fillStyle = "#3b82f6";
  ctx.font = "bold 16px Arial";
  ctx.fillText("Just now", 490, infoY + 45);

  return canvas.toBuffer("image/png");
}



async function createValidateCard(data: unknown[]) {
  const { canvas, ctx } = createBaseCanvas();
  const { colors, fonts } = CONFIG.canvas;

  const isGood = data.emailStatus === 'good';

  const headerGradient = ctx.createLinearGradient(0, 0, 700, 150);
  if (isGood) {
    headerGradient.addColorStop(0, "rgba(16, 185, 129, 0.9)");
    headerGradient.addColorStop(1, "rgba(5, 150, 105, 0.8)");
  } else {
    headerGradient.addColorStop(0, "rgba(239, 68, 68, 0.9)");
    headerGradient.addColorStop(1, "rgba(220, 38, 38, 0.8)");
  }
  ctx.fillStyle = headerGradient;
  roundRect(ctx, 0, 0, 700, 150, 0);
  ctx.fill();

  ctx.shadowColor = isGood ? "rgba(16, 185, 129, 0.5)" : "rgba(239, 68, 68, 0.5)";
  ctx.shadowBlur = 20;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(75, 75, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  const iconColor = isGood ? "#10b981" : "#ef4444";
  ctx.fillStyle = iconColor;
  ctx.font = "bold 45px Arial";
  ctx.fillText("🔍", 53, 95);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 32px Arial";
  ctx.fillText("Email Validator", 140, 65);

  ctx.font = "18px Arial";
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.fillText("✓ Validation complete", 140, 95);

  ctx.shadowColor = "rgba(0, 0, 0, 0.15)";
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 5;
  
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, 30, 170, 640, 80, 15);
  ctx.fill();
  
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.fillStyle = "#64748b";
  ctx.font = "bold 13px Arial";
  ctx.fillText("VALIDATING", 50, 192);

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 22px 'Courier New'";
  const emailWidth = ctx.measureText(data.email).width;
  if (emailWidth > 580) {
    ctx.font = "bold 18px 'Courier New'";
  }
  ctx.fillText(data.email, 50, 220);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "11px Arial";
  ctx.fillText(`Checked: ${new Date().toLocaleTimeString()}`, 50, 238);

  const centerY = 340;
  const statusColor = isGood ? "#10b981" : "#ef4444";
  const statusBg = isGood ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)";

  ctx.fillStyle = statusBg;
  ctx.beginPath();
  ctx.arc(350, centerY, 95, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = statusColor;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(350, centerY, 80, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = statusColor;
  ctx.font = "bold 65px Arial";
  const statusIcon = isGood ? "✓" : "✗";
  const iconWidth = ctx.measureText(statusIcon).width;
  ctx.fillText(statusIcon, 350 - (iconWidth / 2), centerY + 23);

  ctx.fillStyle = "#64748b";
  ctx.font = "14px Arial";
  ctx.fillText("EMAIL STATUS", 350 - 52, centerY + 65);

  ctx.fillStyle = statusColor;
  ctx.font = "bold 24px Arial";
  const statusText = (data.emailStatus || "unknown").toUpperCase();
  const statusWidth = ctx.measureText(statusText).width;
  ctx.fillText(statusText, 350 - (statusWidth / 2), centerY + 90);

  const infoY = 450;
  const infoHeight = 60;
  const cardWidth = 310;
  const cardGap = 20;
  const totalWidth = (cardWidth * 2) + cardGap;
  const startX = (700 - totalWidth) / 2;

  ctx.fillStyle = "rgba(168, 85, 247, 0.1)";
  ctx.strokeStyle = "#a855f7";
  ctx.lineWidth = 2;
  roundRect(ctx, startX, infoY, cardWidth, infoHeight, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#64748b";
  ctx.font = "11px Arial";
  ctx.fillText("⏱️  SERVER UPTIME", startX + 20, infoY + 23);

  ctx.fillStyle = "#a855f7";
  ctx.font = "bold 18px Arial";
  ctx.fillText(`${data.uptime || "0"} seconds`, startX + 20, infoY + 45);

  const card2X = startX + cardWidth + cardGap;
  
  ctx.fillStyle = "rgba(59, 130, 246, 0.1)";
  ctx.strokeStyle = "#3b82f6";
  ctx.lineWidth = 2;
  roundRect(ctx, card2X, infoY, cardWidth, infoHeight, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#64748b";
  ctx.font = "11px Arial";
  ctx.fillText("✓  VERIFIED", card2X + 20, infoY + 23);

  ctx.fillStyle = "#3b82f6";
  ctx.font = "bold 18px Arial";
  ctx.fillText("Just now", card2X + 20, infoY + 45);

  return canvas.toBuffer("image/png");
}



async function createTempMailCard(data: unknown[], type: string) {
  try {
    switch (type) {
      case "generate":
        return await createGenerateCard(data);
      case "inbox":
        return await createInboxCard(data);
      case "validate":
        return await createValidateCard(data);
      default:
        return await createGenerateCard(data);
    }
  } catch (error) {
    console.error('[CARD] Error creating card:', error);
    throw error;
  }
}



const handler = async (m: any, { Morela, text, args, reply, fkontak }: any) => {
  const cmd = args[0]?.toLowerCase();
  const userId = m.sender;

  try {
    
    if (!rateLimiter.check(userId)) {
      const remainingTime = rateLimiter.getRemainingTime(userId);
      return reply(
        `⏳ *Rate Limit Exceeded*\n\n` +
        `Terlalu banyak request. Coba lagi dalam ${remainingTime} detik.\n\n` +
        `_Limit: ${CONFIG.rateLimit.maxRequests} request per menit_`
      );
    }

    
    
    if (!cmd || cmd === "gen" || cmd === "generate") {
      
      await Morela.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

      const result = await tempMailClient.generateEmail();

      if (!result.success) {
        await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
        return reply(`❌ ${result.result}`);
      }

      const { email, emailStatus, uptime } = result.result;

      memoryManager.set(userId, { email });

      const cardBuffer = await createTempMailCard({ email, emailStatus, uptime }, "generate");

      await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

      await Morela.sendMessage(m.chat, {
        image: cardBuffer,
        caption:
          `✨ *Email Temporary Berhasil Dibuat!*\n\n` +
          `📧 Email: \`${email}\`\n` +
          `📊 Status: ${emailStatus || "Unknown"}\n` +
          `⏱️ Uptime: ${uptime || "Unknown"} detik\n` +
          `⏰ Aktif: 5 menit\n\n` +
          `💡 _Tips: Gunakan_ \`.tempmail inbox\` _untuk cek inbox tanpa ketik ulang email!_`
      }, { quoted: fkontak || m });

      return;
    }

    
    
    if (cmd === "inbox" || cmd === "cek" || cmd === "check") {
      let email = args.slice(1).join(" ").trim();

      if (!email) {
        const cached = memoryManager.get(userId);

        if (!cached) {
          return reply(
            "❌ *Tidak ada email aktif.*\n\n" +
            "Gunakan `.tempmail` untuk generate email baru.\n\n" +
            "_Email tersimpan selama 5 menit setelah generate_"
          );
        }

        email = cached.email;
        console.log(`[MEMORY] Using cached email for ${userId}: ${email}`);
      }

      if (!isValidEmail(email)) {
        return reply("❌ Format email tidak valid!");
      }

      await Morela.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

      const result = await tempMailClient.checkInbox(email);

      if (!result.success) {
        await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
        return reply(`❌ ${result.result}`);
      }

      const { emailStatus, uptime, inbox } = result.result;
      const cardBuffer = await createTempMailCard({ email, emailStatus, uptime, inbox }, "inbox");

      await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

      let caption = `📬 *Inbox Email*\n\n`;
      caption += `📧 Email: \`${email}\`\n`;
      caption += `📊 Status: ${emailStatus || "Unknown"}\n`;
      caption += `⏱️ Uptime: ${uptime || "Unknown"} detik\n`;
      caption += `📨 Total Pesan: *${inbox.length}*\n\n`;

      if (inbox.length === 0) {
        caption += `_📭 Tidak ada pesan masuk_`;
      } else {
        caption += `━━━━━━━━━━━━━━━\n\n`;

        inbox.slice(0, 5).forEach((msg, i) => {
          caption += `📩 *Pesan #${i + 1}*\n\n`;
          caption += `👤 Dari: ${msg.from}\n`;
          caption += `📧 Ke: ${msg.to}\n`;
          caption += `📅 ${msg.created}\n`;
          caption += `📌 ${msg.subject}\n\n`;
          caption += `💬 ${msg.message.substring(0, 150)}${msg.message.length > 150 ? '...' : ''}\n\n`;
          caption += `━━━━━━━━━━━━━━━\n\n`;
        });

        if (inbox.length > 5) {
          caption += `_+ ${inbox.length - 5} pesan lainnya_\n`;
        }
      }

      await Morela.sendMessage(m.chat, {
        image: cardBuffer,
        caption: caption
      }, { quoted: fkontak || m });

      return;
    }

    
    
    if (cmd === "validate" || cmd === "val") {
      let email = args.slice(1).join(" ").trim();

      if (!email) {
        const cached = memoryManager.get(userId);

        if (!cached) {
          return reply(
            "❌ *Tidak ada email aktif.*\n\n" +
            "Gunakan `.tempmail` untuk generate email baru.\n\n" +
            "_Email tersimpan selama 5 menit setelah generate_"
          );
        }

        email = cached.email;
        console.log(`[MEMORY] Using cached email for validation ${userId}: ${email}`);
      }

      if (!isValidEmail(email)) {
        return reply("❌ Format email tidak valid!");
      }

      await Morela.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

      const result = await tempMailClient.validateEmailStatus(email);

      if (!result.success) {
        await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
        return reply(`❌ ${result.result}`);
      }

      const { emailStatus, uptime } = result.result;
      const cardBuffer = await createTempMailCard({ email, emailStatus, uptime }, "validate");

      await Morela.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

      const statusEmoji = emailStatus === "good" ? "✅" : "❌";

      let caption = `🔍 *Validasi Email*\n\n`;
      caption += `📧 Email: \`${email}\`\n`;
      caption += `${statusEmoji} Status: *${(emailStatus || "Unknown").toUpperCase()}*\n`;
      caption += `⏱️ Uptime: ${uptime || "Unknown"} detik\n\n`;

      if (emailStatus === "good") {
        caption += `✅ Email aktif dan dapat menerima pesan!`;
      } else {
        caption += `❌ Email tidak aktif atau bermasalah.`;
      }

      await Morela.sendMessage(m.chat, {
        image: cardBuffer,
        caption: caption
      }, { quoted: fkontak || m });

      return;
    }

    
    
    reply(
      "📝 *Temp Mail Bot*\n\n" +
      "*Perintah:*\n" +
      "• `.tempmail` - Generate email\n" +
      "• `.tempmail inbox` - Cek inbox (auto)\n" +
      "• `.tempmail inbox <email>` - Cek inbox manual\n" +
      "• `.tempmail validate` - Validasi email (auto)\n" +
      "• `.tempmail validate <email>` - Validasi manual\n\n" +
      "*Contoh:*\n" +
      "• `.tempmail`\n" +
      "• `.tempmail inbox` _(tanpa copy-paste!)_\n" +
      "• `.tempmail inbox test@generator.email`\n\n" +
      "💡 _Email tersimpan 5 menit di memory untuk kemudahan_\n" +
      `⚡ _Rate limit: ${CONFIG.rateLimit.maxRequests} request/menit_`
    );

  } catch (err) {
    console.error("[TEMPMAIL ERROR]", err);
    await Morela.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
    reply(`❌ Error: ${(err as Error).message}`);
  }
};



handler.help = ['tempmail', 'genmail', 'emailtemp'];
handler.tags = ['tools'];
handler.command = ['tempmail', 'genmail', 'emailtemp'];

process.on('SIGINT', () => {
  console.log('\n[SHUTDOWN] Cleaning up...');
  memoryManager.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[SHUTDOWN] Cleaning up...');
  memoryManager.stop();
  process.exit(0);
});

export default handler;
