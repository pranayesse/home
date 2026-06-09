# Recon Logger

Collects visitor recon data (IP, approx. location, browser/OS, referrer, page)
from the site's hero "recon" widget into a Google Sheet you own.

The site is static (GitHub Pages), so there is no server to log to. The browser
POSTs the data to a Google Apps Script web app, which appends a row to a Sheet.

**Logging is OFF until you complete the setup below and paste your `/exec` URL
into `js/main.js`.** Out of the box the site collects nothing centrally.

---

## Setup (~5 minutes, free)

1. Create a new Google Sheet (this is where logs land). Name it e.g.
   `portfolio-recon`.
2. In that Sheet: **Extensions → Apps Script**. This opens a *container-bound*
   script tied to the Sheet.
3. Delete the placeholder code, paste the contents of [`Code.gs`](./Code.gs),
   and **Save**.
4. **Deploy → New deployment**:
   - Type: **Web app**
   - Description: `recon-logger`
   - Execute as: **Me**
   - Who has access: **Anyone**  ← required so the browser can POST without login
   - Click **Deploy**, authorize when prompted.
5. Copy the **Web app URL** (ends in `/exec`).
6. Open `js/main.js`, find `RECON_LOG_ENDPOINT = ''`, and paste your URL:
   ```js
   const RECON_LOG_ENDPOINT = 'https://script.google.com/macros/s/XXXX/exec';
   ```
7. Commit & push. Logging is now live; rows append to the `recon` tab.

### Verify
- Visit the `/exec` URL directly → you should see
  `{"ok":true,"service":"recon-logger",...}`.
- Load your site once, then check the Sheet for a new row.

---

## Notes & caveats

- **One row per browser session** (guarded by `sessionStorage`), so reloads and
  page-to-page navigation don't spam duplicate rows.
- **IP & location come from ipapi.co**, read client-side. It reflects the
  visitor's network/ISP egress — often the right city, sometimes the ISP's. It is
  not exact and can be wrong on VPNs/mobile.
- **`mode: 'no-cors'`** means the browser can't read the response — that's fine,
  the write still happens. It also avoids CORS preflight against Apps Script.
- **Free tier**: Apps Script allows generous daily quotas; a personal portfolio
  will not get close.

## Privacy / legal

IP addresses are **personal data** under GDPR and similar laws. If you enable
this, keep [`/privacy.txt`](../privacy.txt) accurate and linked in the footer.
Don't log more than you need, and consider pruning the Sheet periodically.
To disable logging entirely, set `RECON_LOG_ENDPOINT = ''` again and push.
