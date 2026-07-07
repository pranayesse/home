/**
 * ctf-data.js
 * ===========
 * CTF room/challenge completions for the homepage CTF section and blog filter.
 *
 * You no longer log rooms by hand. A scheduled GitHub Action
 * (.github/workflows/thm-sync.yml) fetches your completed TryHackMe rooms and
 * rewrites the `completions` array below, between the AUTO markers. Complete a
 * room on TryHackMe → the next sync run picks it up → the site updates.
 *
 * Two things you CAN still edit by hand:
 *   1. `platforms` below — your handles / profile links.
 *   2. `writeupSlug` on an entry — but since the array is regenerated, add
 *      write-up links via the WRITEUPS map instead (survives regeneration).
 *
 * Entry fields (auto-filled):
 *   platform   – 'TryHackMe'
 *   name       – Room name
 *   category   – Topic/type, e.g. 'Web', 'Privilege Escalation', 'Walkthrough'
 *   difficulty – 'easy' | 'medium' | 'hard' | 'info' | 'insane'
 *   date       – Display date, e.g. 'May 2026' (blank if THM doesn't return one)
 *   url        – Link to the room
 *   code       – THM room code (used to build the URL and match write-ups)
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

  // Optional: map a THM room `code` -> blog-data.js slug to link a write-up.
  // This survives auto-regeneration of `completions`.
  writeups: {
    // 'linuxprivesc': 'thm-linux-privesc',
  },

  completions: [
    /* THM_AUTO_START */
    /* THM_AUTO_END */
  ]

};

// Attach write-up slugs from the WRITEUPS map after the array is (re)built.
if (CTF_DATA.writeups) {
  CTF_DATA.completions.forEach(function (c) {
    if (c && c.code && CTF_DATA.writeups[c.code]) c.writeupSlug = CTF_DATA.writeups[c.code];
  });
}

// Support Node (the sync script) and the browser without touching page behavior.
if (typeof module !== 'undefined' && module.exports) module.exports = CTF_DATA;
