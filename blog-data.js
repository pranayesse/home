/**
 * blog-data.js
 * ============
 * Add your blog posts here. Each post needs a corresponding markdown file
 * at posts/<slug>.md
 *
 * Fields:
 *   slug      – URL-safe ID, must match filename in /posts/
 *   title     – Post title
 *   date      – Display date (e.g. "Mar 2025")
 *   readTime  – Estimated read time (e.g. "5 min read")
 *   category  – One of: threat-analysis | incident-response | tools | grc | ctf
 *   tags      – Array of tag strings
 *   excerpt   – Short summary shown on listing cards (1-2 sentences)
 */

var BLOG_POSTS = [
  {
    slug:     'crowdstrike-threat-hunting-queries',
    title:    'Threat Hunting with CrowdStrike: Query Patterns That Actually Find Threats',
    date:     'Feb 2025',
    readTime: '8 min read',
    category: 'threat-analysis',
    tags:     ['CrowdStrike', 'Threat Hunting', 'EDR', 'Falcon'],
    excerpt:  'A practical guide to writing effective CrowdStrike Event Search queries for hunting lateral movement, C2 beaconing, and privilege escalation in enterprise environments.'
  },
  {
    slug:     'cyberark-pam-security-monitoring',
    title:    'Monitoring Privileged Access: What CyberArk Alerts You Should Never Ignore',
    date:     'Jan 2025',
    readTime: '6 min read',
    category: 'incident-response',
    tags:     ['CyberArk', 'PAM', 'Incident Response', 'IAM'],
    excerpt:  'Based on real-world SOC experience, this post covers the CyberArk PAM alert patterns that signal serious threats — and the triage steps to handle them.'
  },
  {
    slug:     'python-soc-automation',
    title:    'How I Cut SOC Ticket Processing Time by 50% with Python',
    date:     'Nov 2024',
    readTime: '10 min read',
    category: 'tools',
    tags:     ['Python', 'Automation', 'SOC', 'Power Automate'],
    excerpt:  'A behind-the-scenes look at the automation scripts I built at Providence India that halved our ticket processing time and reduced manual intervention by 35%.'
  },
];
