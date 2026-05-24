# pranaymokida.xyz

Personal portfolio and security knowledge base. Built with vanilla HTML, CSS, and JavaScript — no build step, no framework, no dependencies except marked.js for markdown rendering in blog posts.

Live at **[pranaymokida.xyz](https://pranaymokida.xyz)**

---

## Structure

```
├── index.html          ← Main portfolio page
├── blog.html           ← Blog listing with domain + type filters
├── post.html           ← Individual post renderer (reads markdown)
├── links.html          ← Personal links page
├── blog-data.js        ← Blog post metadata (add entries here)
├── ctf-data.js         ← CTF completion log (add entries here)
├── posts/              ← Markdown files, one per blog post
├── css/style.css       ← All styles
└── js/main.js          ← Theme toggle, scroll effects, terminal easter egg
```

---

## Adding a blog post

**1. Add an entry to `blog-data.js`**

```js
{
  slug:       'my-post-slug',           // must match the .md filename
  title:      'Your Post Title',
  date:       'May 2026',
  readTime:   '5 min read',
  domain:     'detection',              // see domain list below
  type:       'teardown',               // til | teardown | writeup | research
  difficulty: 'intermediate',           // beginner | intermediate | advanced
  tags:       ['CrowdStrike', 'EDR'],
  excerpt:    'One or two sentences shown on the listing card and used as the meta description.'
}
```

**2. Create `posts/my-post-slug.md`**

Write in standard Markdown. The post page fetches and renders it automatically.

**Domains available:**
| Slug | Label |
|---|---|
| `detection` | Detection Engineering |
| `threat-hunting` | Threat Hunting |
| `incident-response` | Incident Response |
| `forensics` | Digital Forensics |
| `malware-analysis` | Malware Analysis |
| `iam-pam` | IAM / PAM |
| `endpoint` | Endpoint Security |
| `network` | Network Security |
| `vulnerability` | Vuln Management |
| `red-team` | Red Team |
| `osint` | OSINT |
| `ctf` | CTF |
| `web-security` | Web App Security |
| `privesc` | Privilege Escalation |
| `grc` | GRC & Risk |
| `compliance` | ISO 27001 / Compliance |
| `cloud` | Cloud Security |
| `architecture` | Security Architecture |
| `automation` | Automation |

**Content type guide:**
- `til` — Something you learned today, under 500 words, no pressure to be comprehensive
- `teardown` — How a tool works, key commands/queries, how you actually use it in practice
- `writeup` — CTF room or challenge walkthrough, step by step
- `research` — Deep dive into a threat technique, attack pattern, or defence strategy

---

## Logging CTF progress

Open `ctf-data.js` and add an entry to the `completions` array:

```js
{
  platform:    'TryHackMe',
  name:        'Linux Privilege Escalation',
  category:    'Privilege Escalation',
  difficulty:  'medium',               // easy | medium | hard
  date:        'May 2026',
  url:         'https://tryhackme.com/room/linprivesc',
  writeupSlug: 'thm-linux-privesc'     // optional — slug of your blog post
}
```

The homepage CTF section pulls from this file automatically. If you wrote a post about the room, add the `writeupSlug` so readers can click through to the write-up.

---

## SEO

Each blog post gets:
- A `<title>` of `{post.title} · Pranay Mokida`
- A `<meta name="description">` from the post `excerpt`
- A `<link rel="canonical">` pointing to the correct post URL
- An `Article` JSON-LD schema block with headline, description, author, keywords, and URL

The blog listing page has a `Blog` JSON-LD schema. The homepage has a `Person` schema.

The domain knowledge map on the homepage links each security domain tag directly to the filtered blog page (`blog.html?domain=detection`), creating internal links that reinforce topic relevance for search engines.

---

## Domain map

The security domains section on the homepage (`index.html#domains`) maps every area to filtered blog content. When you click a domain tag, it goes to `blog.html?domain=<slug>` and pre-filters the listing to posts in that domain. Adding posts to a domain automatically makes the link useful.

---

## Stack

- **HTML / CSS / Vanilla JS** — no build step
- **marked.js** (CDN) — renders markdown in posts
- **GitHub Pages** — hosting via `CNAME` → `pranaymokida.xyz`
- **Formspree** — contact form backend
