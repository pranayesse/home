/* ============================================================
   Pranay Mokida – main.js
   ============================================================ */

/* ---------- Theme ---------- */
const root = document.documentElement;
const themeKey = 'pm-theme';

function applyTheme(theme) {
  root.setAttribute('data-theme', theme);
  localStorage.setItem(themeKey, theme);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = theme === 'dark' ? '☀ Light' : '⬤ Dark';
}

function initTheme() {
  const saved = localStorage.getItem(themeKey);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved || (prefersDark ? 'dark' : 'light'));
}

window.addEventListener('DOMContentLoaded', () => {
  initTheme();

  const toggle = document.getElementById('theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const cur = root.getAttribute('data-theme');
      applyTheme(cur === 'dark' ? 'light' : 'dark');
    });
  }

  /* ---------- Mobile Nav ---------- */
  const ham = document.getElementById('hamburger');
  const navLinks = document.getElementById('nav-links');
  if (ham && navLinks) {
    ham.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
    navLinks.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => navLinks.classList.remove('open'));
    });
  }

  /* ---------- Active Nav on Scroll ---------- */
  const sections = document.querySelectorAll('section[id]');
  const navAs = document.querySelectorAll('.nav-links a');

  function updateActiveNav() {
    let cur = '';
    sections.forEach(s => {
      if (window.scrollY >= s.offsetTop - 120) cur = s.id;
    });
    navAs.forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === '#' + cur);
    });
  }

  window.addEventListener('scroll', updateActiveNav, { passive: true });
  updateActiveNav();

  /* ---------- Matrix Rain Canvas ---------- */
  const canvas = document.getElementById('matrix-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
    let cols, drops;

    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      cols = Math.floor(canvas.width / 18);
      drops = Array(cols).fill(1);
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas, { passive: true });

    function drawMatrix() {
      const isDark = root.getAttribute('data-theme') === 'dark';
      ctx.fillStyle = isDark ? 'rgba(3,7,18,0.05)' : 'rgba(248,250,252,0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = isDark ? '#10b981' : '#059669';
      ctx.font = '14px JetBrains Mono, monospace';

      drops.forEach((y, i) => {
        const char = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(char, i * 18, y * 18);
        if (y * 18 > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      });
    }

    setInterval(drawMatrix, 60);
  }

  /* ---------- Typewriter ---------- */
  const el = document.getElementById('typewriter');
  if (el) {
    const texts = [
      'Security Analyst',
      'Threat Hunter',
      'Incident Responder',
      'SOC Analyst',
    ];
    let ti = 0, ci = 0, deleting = false;

    function type() {
      const cur = texts[ti];
      if (!deleting) {
        el.textContent = cur.slice(0, ++ci);
        if (ci === cur.length) { deleting = true; setTimeout(type, 1800); return; }
      } else {
        el.textContent = cur.slice(0, --ci);
        if (ci === 0) { deleting = false; ti = (ti + 1) % texts.length; }
      }
      setTimeout(type, deleting ? 60 : 110);
    }

    type();
  }

  /* ---------- Scroll Reveal ---------- */
  const reveals = document.querySelectorAll('.reveal, .timeline-item');
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        revealObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  reveals.forEach(r => revealObs.observe(r));

  /* ---------- Skill Bars ---------- */
  const skillBars = document.querySelectorAll('.skill-bar-fill');
  let scanned = false;

  function runScan() {
    skillBars.forEach(bar => {
      bar.style.width = bar.dataset.pct + '%';
    });
    scanned = true;
    const btn = document.getElementById('scan-btn');
    if (btn) { btn.textContent = '✓ SCAN COMPLETE'; btn.classList.remove('scanning'); }
  }

  const skillsSection = document.getElementById('skills');
  if (skillsSection) {
    const skillObs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !scanned) {
        setTimeout(runScan, 400);
        skillObs.disconnect();
      }
    }, { threshold: 0.3 });
    skillObs.observe(skillsSection);
  }

  const scanBtn = document.getElementById('scan-btn');
  if (scanBtn) {
    scanBtn.addEventListener('click', () => {
      if (scanned) {
        skillBars.forEach(bar => { bar.style.transition = 'none'; bar.style.width = '0'; });
        scanned = false;
        scanBtn.textContent = '⟳ RE-SCAN';
        setTimeout(() => {
          skillBars.forEach(bar => { bar.style.transition = ''; });
          runScan();
        }, 100);
      } else {
        scanBtn.classList.add('scanning');
        scanBtn.textContent = '⬤ SCANNING...';
        setTimeout(runScan, 600);
      }
    });
  }

  /* ---------- Achievements ---------- */
  const achievements = [
    { id: 'skills', icon: '🛡', name: 'Security Skills Unlocked' },
    { id: 'experience', icon: '⚔', name: 'Mission Log Accessed' },
    { id: 'contact', icon: '📡', name: 'Comms Channel Open' },
  ];

  const shown = new Set();
  const toast = document.getElementById('achievement-toast');

  if (toast) {
    const achObs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const id = e.target.id;
          const ach = achievements.find(a => a.id === id);
          if (ach && !shown.has(id)) {
            shown.add(id);
            showAchievement(ach);
            achObs.unobserve(e.target);
          }
        }
      });
    }, { threshold: 0.4 });

    achievements.forEach(a => {
      const el = document.getElementById(a.id);
      if (el) achObs.observe(el);
    });
  }

  function showAchievement({ icon, name }) {
    if (!toast) return;
    toast.querySelector('.achievement-icon').textContent = icon;
    toast.querySelector('.achievement-name').textContent = name;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }

  /* ---------- Terminal Easter Egg ---------- */
  const fab = document.getElementById('terminal-fab');
  const termWin = document.getElementById('terminal-window');
  const termOutput = document.getElementById('term-output');
  const termInput = document.getElementById('term-input');

  const WELCOME = [
    { cls: 'term-line-accent', text: '╔══════════════════════════════════════╗' },
    { cls: 'term-line-accent', text: '║  PM-TERMINAL v1.0  ·  SECURE SHELL  ║' },
    { cls: 'term-line-accent', text: '╚══════════════════════════════════════╝' },
    { cls: 'term-line-muted', text: 'Type "help" for available commands.' },
    { cls: '', text: '' },
  ];

  const COMMANDS = {
    help: () => [
      { cls: 'term-line-cyan', text: 'Available commands:' },
      { cls: '', text: '  whoami        – about me' },
      { cls: '', text: '  ls skills     – list technical skills' },
      { cls: '', text: '  ls experience – work history' },
      { cls: '', text: '  cat contact   – contact info' },
      { cls: '', text: '  nmap          – run a scan ;)' },
      { cls: '', text: '  blog          – open blog' },
      { cls: '', text: '  clear         – clear terminal' },
    ],
    whoami: () => [
      { cls: 'term-line-accent', text: '> Pranay Mokida' },
      { cls: '', text: '  Role       : Risk Tech & Controls Analyst @ JP Morgan Chase' },
      { cls: '', text: '  Exp        : 4+ years in cybersecurity' },
      { cls: '', text: '  Location   : Hyderabad, India' },
      { cls: '', text: '  Focus      : Threat hunting, incident response, GRC' },
    ],
    'ls skills': () => [
      { cls: 'term-line-cyan', text: 'drwxr-xr-x  skills/' },
      { cls: '', text: '  ├── CrowdStrike Falcon  ├── Splunk' },
      { cls: '', text: '  ├── Microsoft Sentinel  ├── CyberArk PAM' },
      { cls: '', text: '  ├── SailPoint IIQ       ├── Python / Bash / SQL' },
      { cls: '', text: '  ├── ISO 27001/27002     ├── CIRT Operations' },
      { cls: '', text: '  └── Azure AD / Intune   └── Web App Pentesting' },
    ],
    'ls experience': () => [
      { cls: 'term-line-cyan', text: '-rw-r--r--  experience.log' },
      { cls: 'term-line-accent', text: '  2025–NOW  JP Morgan Chase  · Risk Tech & Controls Analyst' },
      { cls: '', text: '  2023–2024  Providence India · Security Analyst' },
      { cls: '', text: '  2022       Syfe            · Security Engineer (Intern)' },
      { cls: '', text: '  2021–2022  Tsaaro          · IT Administrator (Intern)' },
    ],
    'cat contact': () => [
      { cls: 'term-line-cyan', text: 'contact.txt' },
      { cls: 'term-line-accent', text: '  Email   : pranay.mokida@protonmail.com' },
      { cls: '', text: '  Location : Hyderabad, India' },
    ],
    nmap: () => [
      { cls: 'term-line-muted', text: 'Starting nmap scan on target: pranaymokida...' },
      { cls: 'term-line-accent', text: 'PORT     STATE  SERVICE' },
      { cls: '', text: '443/tcp  open   https (portfolio)' },
      { cls: '', text: '22/tcp   open   ssh (secured)' },
      { cls: 'term-line-muted', text: '1 host up. All ports filtered. Try the contact form :)' },
    ],
    blog: () => {
      window.open('blog.html', '_blank');
      return [{ cls: 'term-line-accent', text: 'Opening blog...' }];
    },
    clear: () => { clearTerm(); return []; },
  };

  function clearTerm() {
    if (!termOutput) return;
    termOutput.innerHTML = '';
    printLines(WELCOME);
  }

  function printLines(lines) {
    if (!termOutput) return;
    lines.forEach(({ cls, text }) => {
      const div = document.createElement('div');
      div.className = cls || '';
      div.textContent = text;
      termOutput.appendChild(div);
    });
    termOutput.scrollTop = termOutput.scrollHeight;
  }

  function printPrompt(cmd) {
    const div = document.createElement('div');
    div.className = 'term-line-accent';
    div.textContent = '$ ' + cmd;
    termOutput.appendChild(div);
  }

  if (fab && termWin) {
    clearTerm();

    fab.addEventListener('click', () => {
      termWin.classList.toggle('open');
      if (termWin.classList.contains('open')) termInput.focus();
    });

    termInput.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const cmd = termInput.value.trim().toLowerCase();
      termInput.value = '';
      if (!cmd) return;
      printPrompt(cmd);
      const handler = COMMANDS[cmd];
      if (handler) {
        const out = handler();
        if (out.length) printLines(out);
      } else {
        printLines([{ cls: 'term-line-err', text: `Command not found: ${cmd}. Type "help".` }]);
      }
    });
  }

  /* ---------- Contact Form ---------- */
  const form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = form.querySelector('.form-submit');
      const name    = document.getElementById('f-name').value.trim();
      const email   = document.getElementById('f-email').value.trim();
      const subject = document.getElementById('f-subject').value.trim() || 'Message from portfolio';
      const message = document.getElementById('f-message').value.trim();

      const body = encodeURIComponent(
        `Name: ${name}\nEmail: ${email}\n\n${message}`
      );
      window.location.href =
        `mailto:pranay.mokida@protonmail.com?subject=${encodeURIComponent(subject)}&body=${body}`;

      btn.textContent = '↗ Opening email client...';
      setTimeout(() => {
        btn.textContent = '⇒ send_message.sh';
      }, 4000);
    });
  }

  /* ---------- Animated Counter ---------- */
  const counters = document.querySelectorAll('.counter');
  const counterObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = parseInt(el.dataset.target, 10);
      let count = 0;
      const step = Math.ceil(target / 60);
      const timer = setInterval(() => {
        count = Math.min(count + step, target);
        el.textContent = count + (el.dataset.suffix || '');
        if (count >= target) clearInterval(timer);
      }, 25);
      counterObs.unobserve(el);
    });
  }, { threshold: 0.5 });
  counters.forEach(c => counterObs.observe(c));

  /* ---------- Blog page filter ---------- */
  const filters = document.querySelectorAll('.filter-btn');
  const blogCards = document.querySelectorAll('.blog-card-wrap');
  if (filters.length && blogCards.length) {
    filters.forEach(btn => {
      btn.addEventListener('click', () => {
        filters.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const cat = btn.dataset.cat;
        blogCards.forEach(card => {
          card.style.display = (cat === 'all' || card.dataset.cat === cat) ? '' : 'none';
        });
      });
    });
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Scroll Progress Bar ---------- */
  const progress = document.createElement('div');
  progress.id = 'scroll-progress';
  document.body.appendChild(progress);

  function updateProgress() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = 'scaleX(' + (max > 0 ? Math.min(window.scrollY / max, 1) : 0) + ')';
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress, { passive: true });
  updateProgress();

  /* ---------- Cursor Spotlight ---------- */
  if (!reducedMotion && window.matchMedia('(pointer: fine)').matches) {
    const spot = document.createElement('div');
    spot.id = 'cursor-spotlight';
    document.body.appendChild(spot);

    window.addEventListener('pointermove', (e) => {
      spot.style.setProperty('--spot-x', e.clientX + 'px');
      spot.style.setProperty('--spot-y', e.clientY + 'px');
      spot.classList.add('on');
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => spot.classList.remove('on'));
  }

  /* ---------- Section Title Decode Effect ---------- */
  if (!reducedMotion) {
    const DECODE_CHARS = '!<>-_\\/[]{}=+*^?#$%&@01';

    function collectTextNodes(node, out) {
      node.childNodes.forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) {
          if (child.textContent.trim()) out.push(child);
        } else {
          collectTextNodes(child, out);
        }
      });
    }

    function decodeTitle(el) {
      if (el.dataset.decoding) return;
      el.dataset.decoding = '1';
      const nodes = [];
      collectTextNodes(el, nodes);
      const originals = nodes.map(n => n.textContent);
      const duration = 650;
      const start = performance.now();

      function frame(now) {
        const p = Math.min((now - start) / duration, 1);
        nodes.forEach((node, idx) => {
          const text = originals[idx];
          const revealed = Math.floor(p * text.length);
          let out = text.slice(0, revealed);
          for (let i = revealed; i < text.length; i++) {
            out += text[i] === ' ' ? ' ' : DECODE_CHARS[Math.floor(Math.random() * DECODE_CHARS.length)];
          }
          node.textContent = out;
        });
        if (p < 1) {
          requestAnimationFrame(frame);
        } else {
          nodes.forEach((node, idx) => { node.textContent = originals[idx]; });
          delete el.dataset.decoding;
        }
      }
      requestAnimationFrame(frame);
    }

    const titles = document.querySelectorAll('.section-title');
    const titleObs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          decodeTitle(e.target);
          titleObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.6 });
    titles.forEach(t => {
      titleObs.observe(t);
      t.addEventListener('mouseenter', () => decodeTitle(t));
    });
  }

  /* ---------- Cached JSON fetch (sessionStorage, 1h TTL) ---------- */
  async function cachedJSON(key, url) {
    try {
      const cached = sessionStorage.getItem(key);
      if (cached) {
        const { t, data } = JSON.parse(cached);
        if (Date.now() - t < 3600000) return data;
      }
    } catch { /* ignore bad cache */ }
    const res = await fetch(url, { headers: { 'Accept': 'application/vnd.github+json' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    try { sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), data })); } catch { /* quota */ }
    return data;
  }

  function relTime(iso) {
    const days = (Date.now() - new Date(iso).getTime()) / 86400000;
    if (days < 1) return 'today';
    if (days < 2) return 'yesterday';
    if (days < 30) return Math.floor(days) + 'd ago';
    if (days < 365) return Math.floor(days / 30) + 'mo ago';
    return Math.floor(days / 365) + 'y ago';
  }

  /* ---------- Last Updated Badge ---------- */
  const lastUpdated = document.getElementById('last-updated');
  if (lastUpdated) {
    cachedJSON('pm-gh-updated', 'https://api.github.com/repos/pranayesse/home/commits?per_page=1')
      .then(commits => {
        const date = commits && commits[0] && commits[0].commit && commits[0].commit.committer.date;
        if (!date) return;
        lastUpdated.textContent = 'updated ' + relTime(date);
        lastUpdated.hidden = false;
      })
      .catch(() => { /* keep hidden */ });
  }

  /* ---------- Recon Visitor Widget ---------- */
  const recon = document.getElementById('recon-line');
  if (recon) {
    const ua = navigator.userAgent;
    const browser =
      /Edg\//.test(ua) ? 'Edge' :
      /OPR\//.test(ua) ? 'Opera' :
      /Firefox\//.test(ua) ? 'Firefox' :
      /Chrome\//.test(ua) ? 'Chrome' :
      /Safari\//.test(ua) ? 'Safari' : 'unknown agent';
    const os =
      /Windows/.test(ua) ? 'Windows' :
      /Android/.test(ua) ? 'Android' :
      /iPhone|iPad|iPod/.test(ua) ? 'iOS' :
      /Mac OS X/.test(ua) ? 'macOS' :
      /Linux/.test(ua) ? 'Linux' : 'unknown OS';

    function renderRecon(location) {
      recon.textContent = '';
      const tag = document.createElement('span');
      tag.className = 'ok';
      tag.textContent = '[RECON]';
      recon.appendChild(tag);
      recon.appendChild(document.createTextNode(' connection traced → '));

      const parts = [browser, os];
      if (location) parts.push(location);
      parts.forEach((p, i) => {
        if (i > 0) {
          const sep = document.createElement('span');
          sep.className = 'sep';
          sep.textContent = '·';
          recon.appendChild(sep);
        }
        recon.appendChild(document.createTextNode(p));
      });

      const sep = document.createElement('span');
      sep.className = 'sep';
      sep.textContent = '·';
      recon.appendChild(sep);
      recon.appendChild(document.createTextNode('threat level: '));
      const ok = document.createElement('span');
      ok.className = 'ok';
      ok.textContent = 'benign ✓';
      recon.appendChild(ok);

      recon.hidden = false;
      requestAnimationFrame(() => recon.classList.add('on'));
    }

    /* Recon logging — OFF until you paste your deployed endpoint URL below.
       See recon-logger/README.md for the Google Apps Script + Sheet setup.
       Logging visitor IPs is personal data; keep the privacy note in the
       footer (privacy.txt) accurate if you enable this. */
    const RECON_LOG_ENDPOINT = 'https://script.google.com/macros/s/AKfycbxmb7_JlIxvw-FDDItAr9qobGNaxbKuseIxYVG4CG_Huz4ag_9rVRQ33U1e0488EBld5g/exec';

    function logRecon(geo) {
      if (!RECON_LOG_ENDPOINT) return;
      if (sessionStorage.getItem('pm-recon-logged')) return; // once per session
      try {
        const g = geo || {};
        const nav = navigator;
        const scr = window.screen || {};
        const conn = nav.connection || nav.mozConnection || nav.webkitConnection || {};
        const payload = {
          ts: new Date().toISOString(),
          // --- network / geo (ipapi.co) ---
          ip: g.ip || null,
          ip_version: g.version || null,
          city: g.city || null,
          region: g.region || null,
          region_code: g.region_code || null,
          country: g.country_name || null,
          country_code: g.country_code || null,
          continent: g.continent_code || null,
          in_eu: typeof g.in_eu === 'boolean' ? g.in_eu : null,
          postal: g.postal || null,
          latitude: g.latitude || null,
          longitude: g.longitude || null,
          timezone: g.timezone || null,
          utc_offset: g.utc_offset || null,
          calling_code: g.country_calling_code || null,
          currency: g.currency || null,
          asn: g.asn || null,
          org: g.org || null,
          // --- client / device ---
          browser: browser,
          os: os,
          user_agent: ua,
          language: nav.language || null,
          languages: (nav.languages || []).join(',') || null,
          platform: nav.platform || null,
          tz_browser: (Intl.DateTimeFormat().resolvedOptions().timeZone) || null,
          screen: (scr.width || '?') + 'x' + (scr.height || '?'),
          viewport: window.innerWidth + 'x' + window.innerHeight,
          dpr: window.devicePixelRatio || null,
          color_depth: scr.colorDepth || null,
          device_memory: (nav.deviceMemory != null ? nav.deviceMemory : null),
          cpu_cores: (nav.hardwareConcurrency != null ? nav.hardwareConcurrency : null),
          touch: ('ontouchstart' in window) || nav.maxTouchPoints > 0,
          connection: conn.effectiveType || null,
          downlink: (conn.downlink != null ? conn.downlink : null),
          cookies_enabled: nav.cookieEnabled,
          dnt: nav.doNotTrack || null,
          // --- visit ---
          referrer: document.referrer || null,
          page: location.pathname,
          page_url: location.href,
          title: document.title
        };
        fetch(RECON_LOG_ENDPOINT, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
          keepalive: true
        }).catch(() => {});
        sessionStorage.setItem('pm-recon-logged', '1');
      } catch (_) { /* never let logging break the page */ }
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    fetch('https://ipapi.co/json/', { signal: ctrl.signal })
      .then(r => r.ok ? r.json() : null)
      .then(geo => {
        clearTimeout(timer);
        const loc = geo && geo.city && geo.country_code ? geo.city + ', ' + geo.country_code : null;
        renderRecon(loc);
        logRecon(geo);
      })
      .catch(() => { clearTimeout(timer); renderRecon(null); logRecon(null); });
  }
});
