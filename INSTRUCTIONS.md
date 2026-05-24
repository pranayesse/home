# Site Instructions

A plain-English guide to maintaining pranaymokida.xyz — adding posts, logging CTFs, updating projects, and keeping the SEO layer healthy.

---

## Table of Contents

1. [Writing a blog post](#1-writing-a-blog-post)
2. [Logging a CTF completion](#2-logging-a-ctf-completion)
3. [Adding a project](#3-adding-a-project)
4. [Updating the sitemap](#4-updating-the-sitemap)
5. [File map](#5-file-map)
6. [Running the site locally](#6-running-the-site-locally)
7. [Domain reference](#7-domain-reference)
8. [robots.txt & crawling](#8-robotstxt--crawling)

---

## 1. Writing a blog post

### Step 1 — Add metadata to `blog-data.js`

Open `blog-data.js` and add a new object to the top of the `BLOG_POSTS` array (newest post first).

```js
{
  slug:       'your-post-slug',       // URL-safe, lowercase, hyphens only
  title:      'Your Post Title Here',
  date:       'Jun 2026',
  readTime:   '6 min read',
  domain:     'detection',            // see Domain reference below
  type:       'teardown',             // til | teardown | writeup | research
  difficulty: 'intermediate',         // beginner | intermediate | advanced
  tags:       ['CrowdStrike', 'EDR', 'Threat Hunting'],
  excerpt:    'One or two sentences. This appears on the listing card and becomes the meta description for the post — make it descriptive and keyword-relevant.'
}
```

**Picking a type:**
| Type | Use it when… |
|---|---|
| `til` | Something small you learned today — a config quirk, an edge case, a command flag |
| `teardown` | Breaking down a tool: what it does, key features, how you use it in practice |
| `writeup` | Step-by-step CTF room or challenge walkthrough |
| `research` | Deep dive into an attack technique, threat group, or defensive strategy |

**Picking difficulty:**
| Level | Who it's for |
|---|---|
| `beginner` | Assumes baseline security knowledge only |
| `intermediate` | Assumes familiarity with the tool or concept |
| `advanced` | Assumes hands-on experience in the domain |

### Step 2 — Write the post in Markdown

Create a file at `posts/your-post-slug.md`. Use standard Markdown — the post page fetches and renders it automatically using marked.js.

**Suggested teardown structure:**
```markdown
## What it is
Brief one-paragraph description of the tool.

## How I use it
Real context — what environment, what problem it solves.

## Key queries / commands
\```
actual command or query here
\```

## Things that trip people up
Gotchas, edge cases, common misconfigurations.

## Resources
- [Official docs](https://...)
- [Related technique on MITRE](https://...)
```

**Suggested TIL structure:**
```markdown
## Context
What I was doing when I stumbled onto this.

## The thing I learned
The actual insight, one clear paragraph.

## Why it matters
How this changes how I think about the problem.
```

### Step 3 — Update the sitemap

Open `sitemap.xml` and add an entry for the new post (see [Updating the sitemap](#4-updating-the-sitemap)).

### Step 4 — Commit and push

```bash
cd /path/to/home
git add blog-data.js posts/your-post-slug.md sitemap.xml
git commit -m "post: your post title"
git push
```

GitHub Pages deploys automatically — the post is live in about 60 seconds.

---

## 2. Logging a CTF completion

Open `ctf-data.js` and add an entry to the `completions` array. Put the most recent completion first.

```js
{
  platform:    'TryHackMe',                          // TryHackMe | HackTheBox | PicoCTF | etc.
  name:        'Linux Privilege Escalation',
  category:    'Privilege Escalation',               // room category or your own label
  difficulty:  'medium',                             // easy | medium | hard
  date:        'Jun 2026',
  url:         'https://tryhackme.com/room/linprivesc',
  writeupSlug: 'thm-linux-privesc'                   // optional — only if you wrote a post
}
```

The homepage CTF section shows the 5 most recent entries automatically. If you include a `writeupSlug`, add the matching post to `blog-data.js` and `posts/` too.

**Commit:**
```bash
git add ctf-data.js
git commit -m "ctf: Linux Privilege Escalation (THM)"
git push
```

---

## 3. Adding a project

Open `index.html` and find the `projects-grid` div inside the Projects section. Add a new card inside it, following this pattern:

```html
<div class="project-card reveal">
  <div class="project-header">
    <div class="project-icon">🔍</div>
    <a href="https://github.com/pranayesse/your-repo" target="_blank" rel="noopener" class="project-link">View on GitHub →</a>
  </div>
  <h3 class="project-title">Project Name</h3>
  <p class="project-desc">
    One or two sentences explaining what it does and why it's interesting.
    Be specific — mention the problem it solves, not just the tech it uses.
  </p>
  <div class="project-tags">
    <span class="tag">Python</span>
    <span class="tag">API Name</span>
    <span class="tag">What it does</span>
  </div>
</div>
```

---

## 4. Updating the sitemap

`sitemap.xml` tells search engines which pages exist and when they were last updated. Update it whenever you add a post, add a project card, or make significant changes to index.html.

**Adding a post:**
```xml
<url>
  <loc>https://pranaymokida.xyz/post.html?slug=your-post-slug</loc>
  <lastmod>2026-06-01</lastmod>       <!-- date you published it, YYYY-MM-DD -->
  <changefreq>monthly</changefreq>
  <priority>0.7</priority>
</url>
```

**Priority guide:**
| Page | Priority |
|---|---|
| Homepage (`/`) | 1.0 |
| Blog listing (`/blog.html`) | 0.8 |
| Individual posts | 0.7 |
| Other pages | 0.5 |

After updating the sitemap, also update the `<lastmod>` for the homepage and blog listing if you changed them.

---

## 5. File map

```
/
├── index.html          Main portfolio page
│                         Sections: Hero → About → Domains → Skills → Projects
│                                   → CTF & Learning → Experience → Contact
│
├── blog.html           Blog listing page
│                         Filter by domain group + content type
│                         URL param: ?domain=<slug> (linked from homepage domain tags)
│
├── post.html           Post renderer — reads slug from URL, fetches posts/<slug>.md
│
├── links.html          Personal links / "about me" page
│
├── blog-data.js        Post metadata — add entries here to publish posts
├── ctf-data.js         CTF completion log — add entries here after finishing rooms
│
├── posts/              Markdown files — one per blog post, named <slug>.md
│
├── css/
│   └── style.css       All styles — light + dark theme, every component
│
├── js/
│   └── main.js         Theme toggle, scroll reveal, matrix canvas, terminal easter egg
│
├── sitemap.xml         Sitemap for search engines — update when adding pages
├── robots.txt          Allows all crawlers, references sitemap
├── CNAME               GitHub Pages custom domain → pranaymokida.xyz
│
├── README.md           Developer-facing overview
└── INSTRUCTIONS.md     This file — operational guide
```

---

## 6. Running the site locally

The site is plain HTML — you cannot open `index.html` directly in the browser because `fetch()` (used to load markdown posts) is blocked by browser security on `file://` URLs.

**Option 1 — Python (simplest):**
```bash
cd /path/to/home
python3 -m http.server 8000
# open http://localhost:8000
```

**Option 2 — Node http-server:**
```bash
npx http-server .
# open http://localhost:8080
```

Blog posts won't load on the listing page (the markdown files load fine, but posts need to be in `posts/`) — make sure your `.md` file is there before testing.

---

## 7. Domain reference

Use these slugs in `blog-data.js` (the `domain` field) and in domain tag links in `index.html`.

### Defense
| Slug | Label | Example topics |
|---|---|---|
| `detection` | Detection Engineering | SIEM rules, Sigma, KQL, alert logic |
| `threat-hunting` | Threat Hunting | Hypothesis-driven hunting, IOC pivoting |
| `incident-response` | Incident Response | Triage, containment, post-mortem |
| `forensics` | Digital Forensics | Memory analysis, disk imaging, timeline |
| `malware-analysis` | Malware Analysis | Static/dynamic analysis, sandbox results |
| `iam-pam` | IAM / PAM | CyberArk, SailPoint, AD hardening |
| `endpoint` | Endpoint Security | CrowdStrike, Kaspersky EDR, JAMF |
| `network` | Network Security | Firewall rules, packet analysis, IDS |
| `vulnerability` | Vuln Management | Scanning, CVSS, patching workflows |

### Offense (Learning)
| Slug | Label | Example topics |
|---|---|---|
| `red-team` | Red Team | TTPs, MITRE ATT&CK, adversary simulation |
| `osint` | OSINT | Recon, footprinting, open-source intel |
| `ctf` | CTF | Room walkthroughs, challenge write-ups |
| `web-security` | Web App Security | OWASP Top 10, Burp Suite, SQLi, XSS |
| `privesc` | Privilege Escalation | Linux/Windows privesc techniques |

### Governance
| Slug | Label | Example topics |
|---|---|---|
| `grc` | GRC & Risk | Risk registers, treatment plans, metrics |
| `compliance` | ISO 27001 / Compliance | Audits, control mapping, ISMS |
| `cloud` | Cloud Security | Azure security, cloud misconfigs |
| `architecture` | Security Architecture | Zero trust, defence in depth |

### Cross-cutting
| Slug | Label |
|---|---|
| `automation` | Automation (Python, APIs, scripting) |
| `general` | General security topics |

---

## 8. robots.txt & crawling

`robots.txt` is already configured correctly:
```
User-agent: *
Allow: /
Sitemap: https://pranaymokida.xyz/sitemap.xml
```

This tells every search engine crawler:
- All pages are crawlable
- Where the sitemap lives

**You do not need to change robots.txt.** The only maintenance needed is keeping `sitemap.xml` up to date when you add pages.

To check how Google sees your site: [Google Search Console](https://search.google.com/search-console) → add `pranaymokida.xyz` as a property → submit the sitemap URL.
