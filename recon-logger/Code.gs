/**
 * Recon Logger — Google Apps Script web app
 * Appends visitor recon data (posted from the portfolio's recon widget)
 * to a Google Sheet.
 *
 * This is a CONTAINER-BOUND script: create it from inside the Sheet that
 * should hold the logs (Extensions → Apps Script), paste this in, then
 * deploy as a Web app. See README.md for full steps.
 */

var SHEET_NAME = 'recon';
var HEADERS = [
  'timestamp', 'ip', 'city', 'region', 'country', 'org',
  'browser', 'os', 'lang', 'referrer', 'page', 'user_agent'
];

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
    if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);

    sheet.appendRow([
      data.ts || new Date().toISOString(),
      data.ip, data.city, data.region, data.country, data.org,
      data.browser, data.os, data.lang, data.referrer, data.page, data.ua
    ]);

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
