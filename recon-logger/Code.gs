/**
 * Recon Logger — Google Apps Script web app
 * Appends visitor recon data (posted from the portfolio's recon widget)
 * to a Google Sheet.
 *
 * CONTAINER-BOUND script: create it from inside the Sheet that should hold
 * the logs (Extensions → Apps Script), paste this in, then deploy as a Web
 * app. See README.md for full steps.
 *
 * Columns are created automatically from the posted JSON keys, so adding new
 * fields on the client side requires no change here — new keys become new
 * columns ("log everything" stays future-proof).
 */

var SHEET_NAME = 'recon';

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // serialize concurrent writes
  } catch (err) {
    return _json({ ok: false, error: 'busy' });
  }

  try {
    var data = JSON.parse(e.postData.contents);

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

    // Read existing header row (if any).
    var headers = sheet.getLastRow() > 0
      ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
      : [];

    // Always keep 'timestamp' as the first column.
    if (headers.length === 0) {
      headers = ['timestamp'];
      sheet.getRange(1, 1, 1, 1).setValues([headers]);
    }

    // Add any new keys from this payload as new columns.
    var added = false;
    Object.keys(data).forEach(function (k) {
      if (k === 'ts') return; // mapped to 'timestamp'
      if (headers.indexOf(k) === -1) { headers.push(k); added = true; }
    });
    if (added) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

    // Build the row in header order.
    var row = headers.map(function (h) {
      if (h === 'timestamp') return data.ts || data.timestamp || new Date().toISOString();
      var v = data[h];
      return (v === undefined || v === null) ? '' : v;
    });
    sheet.appendRow(row);

    return _json({ ok: true });
  } catch (err) {
    return _json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Lets you confirm the deployment is live by visiting the /exec URL.
function doGet() {
  return _json({ ok: true, service: 'recon-logger', sheet: SHEET_NAME });
}

function _json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
