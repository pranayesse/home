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
  applyTheme(saved || 'light');
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
      { cls: '', text: '  Exp        : 2+ years in cybersecurity' },
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
      btn.textContent = '✓ Message Sent';
      btn.style.background = 'var(--accent2)';
      setTimeout(() => {
        btn.textContent = '> send_message.sh';
        btn.style.background = '';
        form.reset();
      }, 3000);
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
});
