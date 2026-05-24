/**
 * ctf-data.js
 * ===========
 * Log your CTF room/challenge completions here.
 * The homepage CTF section and the blog filter both read from this file.
 *
 * Workflow: complete a room → add an entry below → commit → site updates.
 *
 * Fields:
 *   platform   – 'TryHackMe' | 'HackTheBox' | 'PicoCTF' | etc.
 *   name       – Room or challenge name
 *   category   – e.g. 'Privilege Escalation', 'Web', 'Forensics', 'OSINT', 'Crypto'
 *   difficulty – 'easy' | 'medium' | 'hard'
 *   date       – Display date, e.g. 'May 2026'
 *   url        – Link to room/challenge (optional)
 *   writeupSlug – Matching slug in blog-data.js if you wrote a post (optional)
 */

var CTF_DATA = {

  platforms: [
    {
      name:       'TryHackMe',
      handle:     'pranaymokida',
      profileUrl: 'https://tryhackme.com/p/pranaymokida',
      badgeUrl:   'https://tryhackme-badges.s3.amazonaws.com/pranaymokida.png',
    }
  ],

  completions: [
    // Add entries here as you complete rooms. Most recent first.
    // Example:
    // {
    //   platform:    'TryHackMe',
    //   name:        'Linux Privilege Escalation',
    //   category:    'Privilege Escalation',
    //   difficulty:  'medium',
    //   date:        'May 2026',
    //   url:         'https://tryhackme.com/room/linprivesc',
    //   writeupSlug: 'thm-linux-privesc'   // optional — leave out if no write-up
    // },
  ]

};
