/**
 * blog-data.js
 * ============
 * Add your blog posts here. Each post needs a corresponding markdown file
 * at posts/<slug>.md
 *
 * Fields:
 *   slug       – URL-safe ID, must match filename in /posts/
 *   title      – Post title (make it keyword-rich for SEO)
 *   date       – Display date, e.g. "Mar 2025"
 *   readTime   – Estimated read time, e.g. "5 min read"
 *   domain     – Primary security domain (used for filtering and domain-map links)
 *                Options:
 *                  Defense:    'detection' | 'threat-hunting' | 'incident-response' |
 *                              'forensics' | 'malware-analysis' | 'iam-pam' |
 *                              'endpoint' | 'network' | 'vulnerability'
 *                  Offense:    'red-team' | 'osint' | 'ctf' | 'web-security' | 'privesc'
 *                  Governance: 'grc' | 'compliance' | 'cloud' | 'architecture'
 *                  Cross-cut:  'automation' | 'general'
 *   type       – Content type (drives type-filter on blog page)
 *                'til'      – Quick thing you learned (under 500 words is fine)
 *                'teardown' – How a tool works + how you use it
 *                'writeup'  – CTF room or challenge walkthrough
 *                'research' – Deep dive or threat analysis
 *   difficulty – Audience level: 'beginner' | 'intermediate' | 'advanced'
 *   tags       – Array of searchable tag strings
 *   excerpt    – 1-2 sentences shown on listing cards and used as meta description
 */

var BLOG_POSTS = [
  {
    slug:       'metadata-as-identity-support-social-engineering',
    title:      'When Support Asks "What Device Are You On?" — That\'s Not Identity Verification',
    date:       'May 2026',
    readTime:   '6 min read',
    domain:     'red-team',
    type:       'research',
    difficulty: 'beginner',
    tags:       ['Social Engineering', 'Account Takeover', 'Canary Tokens', 'Support Channels', 'Identity Verification'],
    excerpt:    'Spotify\'s support flow once let you update a recovery email after verifying device metadata — details that are observable, not secret. A look at why "things you know about the account" is a weaker identity check than it sounds.'
  },
  {
    slug:       'password-reset-identity-problem',
    title:      'Password Resets Are Broken — And It\'s Not the User\'s Fault',
    date:       'May 2026',
    readTime:   '5 min read',
    domain:     'red-team',
    type:       'research',
    difficulty: 'beginner',
    tags:       ['Social Engineering', 'Password Reset', 'Identity Verification', 'Helpdesk Security', 'Authentication'],
    excerpt:    'Most helpdesk password reset flows treat "user provided an email address" as proof of identity. It isn\'t. A breakdown of why the email-as-identity assumption is fundamentally broken and what proper verification actually requires.'
  },
  {
    slug:       'crowdstrike-threat-hunting-queries',
    title:      'Threat Hunting with CrowdStrike: Query Patterns That Actually Find Threats',
    date:       'Feb 2025',
    readTime:   '8 min read',
    domain:     'detection',
    type:       'teardown',
    difficulty: 'intermediate',
    tags:       ['CrowdStrike', 'Threat Hunting', 'EDR', 'Falcon', 'Detection Engineering'],
    excerpt:    'A practical guide to writing effective CrowdStrike Event Search queries for hunting lateral movement, C2 beaconing, and privilege escalation in enterprise environments.'
  },
  {
    slug:       'cyberark-pam-security-monitoring',
    title:      'Monitoring Privileged Access: What CyberArk Alerts You Should Never Ignore',
    date:       'Jan 2025',
    readTime:   '6 min read',
    domain:     'iam-pam',
    type:       'teardown',
    difficulty: 'intermediate',
    tags:       ['CyberArk', 'PAM', 'Incident Response', 'IAM', 'Privileged Access'],
    excerpt:    'Based on real-world SOC experience — the CyberArk PAM alert patterns that signal serious threats and the triage steps to handle them fast.'
  },
  {
    slug:       'python-soc-automation',
    title:      'Automating SOC Workflows with Python: Practical Scripts for Analysts',
    date:       'Nov 2024',
    readTime:   '10 min read',
    domain:     'automation',
    type:       'teardown',
    difficulty: 'beginner',
    tags:       ['Python', 'Automation', 'SOC', 'Power Automate', 'Scripting'],
    excerpt:    'A walkthrough of the automation scripts that halved ticket processing time and reduced manual triage — practical Python patterns any analyst can adapt.'
  },
];
