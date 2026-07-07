#!/usr/bin/env node
/**
 * fetch-thm-rooms.mjs
 * ===================
 * Fetches completed TryHackMe rooms and rewrites the `completions` array in
 * ctf-data.js (between the THM_AUTO_START / THM_AUTO_END markers).
 *
 * Run by .github/workflows/thm-sync.yml on a schedule. Safe to run locally:
 *   node scripts/fetch-thm-rooms.mjs
 *
 * Config (all optional — falls back to the handle baked into ctf-data.js):
 *   THM_USERNAME   TryHackMe handle (default: read from ctf-data.js)
 *   THM_USER_HASH  Internal user id the API keys off. If unset, the script
 *                  tries to resolve it from the username. Set this as a repo
 *                  variable if resolution ever fails.
 *
 * TryHackMe has no official public API; these endpoints are undocumented and
 * may change. The script never throws on network failure — on any error it
 * logs and exits 0 WITHOUT touching ctf-data.js, so the last good data (and
 * the site) stay intact.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_FILE = path.join(ROOT, 'ctf-data.js');
const START = '/* THM_AUTO_START */';
const END = '/* THM_AUTO_END */';

const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/124.0 Safari/537.36';

function log(...a) { console.log('[thm-sync]', ...a); }

async function getJSON(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    const r = await fetch(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': UA },
      signal: ctrl.signal,
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

function pick(obj, keys) {
  for (const k of keys) {
    const v = obj && obj[k];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return null;
}

function readHandle() {
  if (process.env.THM_USERNAME) return process.env.THM_USERNAME.trim();
  const src = fs.readFileSync(DATA_FILE, 'utf8');
  const m = src.match(/handle:\s*['"]([^'"]+)['"]/);
  return m ? m[1] : null;
}

async function resolveHash(handle) {
  if (process.env.THM_USER_HASH) return process.env.THM_USER_HASH.trim();
  // Best-effort: the public-profile response usually carries the internal id.
  const url = 'https://tryhackme.com/api/v2/public-profile?username=' +
    encodeURIComponent(handle);
  const data = await getJSON(url);
  const d = (data && data.data) ? data.data : data;
  const hash = pick(d || {}, ['userId', '_id', 'id', 'publicId', 'userPublicId', 'hash']);
  if (!hash) throw new Error('could not resolve user hash from username');
  return String(hash);
}

async function fetchRooms(hash) {
  const rooms = [];
  const limit = 50;
  for (let page = 1; page <= 40; page++) {
    const url = 'https://tryhackme.com/api/v2/public-profile/completed-rooms?user=' +
      encodeURIComponent(hash) + '&limit=' + limit + '&page=' + page;
    const data = await getJSON(url);
    const docs = (data && data.data && data.data.docs) ||
      (data && data.docs) || (Array.isArray(data) ? data : []);
    if (!docs || docs.length === 0) break;
    rooms.push(...docs);
    if (docs.length < limit) break;
  }
  return rooms;
}

const DIFFS = ['easy', 'medium', 'hard', 'info', 'insane'];
function normDifficulty(v) {
  const s = String(v || '').toLowerCase().trim();
  if (DIFFS.includes(s)) return s;
  if (['noob', 'beginner'].includes(s)) return 'easy';
  if (s === 'intermediate') return 'medium';
  if (s === 'advanced') return 'hard';
  return 'info';
}

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

function toCategory(room) {
  const tags = room.tags || room.topics;
  if (Array.isArray(tags) && tags.length) {
    const t = tags[0];
    return typeof t === 'string' ? t : (t && (t.name || t.title)) || 'Room';
  }
  return cap(String(pick(room, ['type', 'roomType']) || 'Room'));
}

function toDate(room) {
  const raw = pick(room, ['completedAt', 'dateCompleted', 'finishTime', 'timestamp', 'updatedAt']);
  if (!raw) return '';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function mapRoom(room) {
  const code = pick(room, ['code', 'roomCode', 'roomId']) ||
    (typeof room.url === 'string' ? room.url.split('/').pop() : null);
  if (!code) return null;
  const name = pick(room, ['title', 'name', 'roomName']) || code;
  return {
    platform: 'TryHackMe',
    name: String(name),
    category: toCategory(room),
    difficulty: normDifficulty(pick(room, ['difficulty', 'roomDifficulty'])),
    date: toDate(room),
    url: room.url && String(room.url).startsWith('http')
      ? room.url
      : 'https://tryhackme.com/room/' + code,
    code: String(code),
  };
}

function dedupeSort(entries) {
  const seen = new Set();
  const out = [];
  for (const e of entries) {
    if (!e || seen.has(e.code)) continue;
    seen.add(e.code);
    out.push(e);
  }
  // Sort by date desc when dates are present; otherwise keep API order.
  const dated = out.filter((e) => e.date);
  if (dated.length === out.length) {
    out.sort((a, b) => new Date(b.date) - new Date(a.date));
  }
  return out;
}

function writeEntries(entries) {
  const src = fs.readFileSync(DATA_FILE, 'utf8');
  const body = entries
    .map((e) => '    ' + JSON.stringify(e) + ',')
    .join('\n');
  const block = START + (body ? '\n' + body + '\n    ' : '\n    ') + END;
  const re = new RegExp(
    START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]*?' +
    END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );
  if (!re.test(src)) {
    throw new Error('AUTO markers not found in ctf-data.js');
  }
  const next = src.replace(re, block);
  if (next === src) {
    log('no changes — completions already up to date');
    return false;
  }
  fs.writeFileSync(DATA_FILE, next);
  log('wrote', entries.length, 'completions to ctf-data.js');
  return true;
}

async function main() {
  const handle = readHandle();
  if (!handle) throw new Error('no TryHackMe handle configured');
  log('handle:', handle);

  const hash = await resolveHash(handle);
  log('user hash resolved');

  const raw = await fetchRooms(hash);
  log('fetched', raw.length, 'rooms from API');

  const entries = dedupeSort(raw.map(mapRoom).filter(Boolean));
  if (entries.length === 0) {
    log('0 usable rooms — leaving ctf-data.js untouched');
    return;
  }
  writeEntries(entries);
}

main().catch((err) => {
  log('ERROR:', err.message, '— leaving ctf-data.js untouched');
  process.exit(0); // never fail the workflow / never wipe good data
});
