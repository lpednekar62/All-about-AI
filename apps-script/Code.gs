/**
 * Wellness Blind Spot Score — Google Sheet collector
 * Welocity Life Science
 *
 * Deploy this as a Web App (Deploy > New deployment > Web app)
 *   Execute as:       Me
 *   Who has access:   Anyone
 * Then paste the resulting /exec URL into CONFIG.SHEET_ENDPOINT in script.js.
 *
 * The page posts as text/plain on purpose — that avoids a CORS preflight,
 * which Apps Script Web Apps do not answer. The body is still JSON.
 *
 * Two message types arrive here:
 *   { type: 'result', ... }         -> appends one row
 *   { type: 'contact_click', ... }  -> stamps the WhatsApp columns on that row
 */

var SHEET_NAME = 'Responses';

var HEADERS = [
  'Received At', 'Submitted At', 'ID', 'Event',
  'Name', 'Mobile', 'Email', 'Age', 'Goal',
  'Score %', 'Band', 'Top Blind Spot 1', 'Top Blind Spot 2', 'Top Blind Spot 3',
  'Nutrition %', 'Fitness %', 'Sleep %', 'Stress %', 'Preventive %', 'Genetics %',
  'Q1 Eating plan', 'Q2 Food response', 'Q3 Supplements',
  'Q4 Training', 'Q5 Plateaus', 'Q6 Recovery',
  'Q7 Energy', 'Q8 Caffeine', 'Q9 Sleep pattern',
  'Q10 Stress effect', 'Q11 Recovery methods',
  'Q12 Family history', 'Q13 Preventive action',
  'Q14 Prior insight', 'Q15 Measured routine',
  'Questions Answered', 'Contacted Via', 'Contacted At'
];

var CAT_KEYS = ['nutrition', 'fitness', 'sleep', 'stress', 'prevent', 'genetics'];
var ID_COL = 3;               // column C
var CONTACT_VIA_COL = 37;     // 'Contacted Via'
var CONTACT_AT_COL  = 38;     // 'Contacted At'

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);

  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sh.getRange(1, 1, 1, HEADERS.length)
      .setFontWeight('bold')
      .setBackground('#1A1440')
      .setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
    sh.setColumnWidth(5, 150);   // Name
    sh.setColumnWidth(6, 130);   // Mobile
    sh.setColumnWidth(7, 210);   // Email
  }
  return sh;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Health check — opening the /exec URL in a browser should show this. */
function doGet() {
  return json_({ ok: true, service: 'Welocity Blind Spot collector' });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return json_({ ok: false, error: 'busy' });
  }

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return json_({ ok: false, error: 'no body' });
    }

    var d;
    try {
      d = JSON.parse(e.postData.contents);
    } catch (err) {
      return json_({ ok: false, error: 'bad json' });
    }

    var sh = getSheet_();

    if (d.type === 'contact_click') {
      return json_(stampContact_(sh, d));
    }

    return json_(appendResult_(sh, d));

  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function appendResult_(sh, d) {
  var cats    = d.categories || {};
  var answers = d.answers    || {};

  var row = [
    new Date(),
    d.submittedAt || '',
    d.id    || '',
    d.event || '',
    d.name  || '',
    // leading apostrophe keeps a mobile number as text so Sheets never
    // reformats 9326082818 into scientific notation or drops a leading zero
    d.phone ? "'" + d.phone : '',
    d.email || '',
    d.age   || '',
    d.goal  || '',
    typeof d.score === 'number' ? d.score : '',
    d.band  || '',
    d.top1  || '', d.top2 || '', d.top3 || ''
  ];

  CAT_KEYS.forEach(function (k) {
    row.push(typeof cats[k] === 'number' ? cats[k] : '');
  });

  for (var i = 1; i <= 15; i++) {
    row.push(answers['q' + i] || '');
  }

  row.push(typeof d.answered === 'number' ? d.answered : '');
  row.push('');   // Contacted Via  — filled in by stampContact_
  row.push('');   // Contacted At

  sh.appendRow(row);
  return { ok: true, saved: true };
}

function stampContact_(sh, d) {
  var id = d.id || '';
  if (!id) return { ok: false, error: 'no id' };

  var last = sh.getLastRow();
  if (last < 2) return { ok: false, error: 'no rows' };

  var ids = sh.getRange(2, ID_COL, last - 1, 1).getValues();

  // search upwards: the matching row is almost always the most recent one
  for (var i = ids.length - 1; i >= 0; i--) {
    if (String(ids[i][0]) === String(id)) {
      var rowNum = i + 2;
      var existing = sh.getRange(rowNum, CONTACT_VIA_COL).getValue();
      // a visitor may tap both buttons — keep a record of each
      var value = existing ? String(existing) + ', ' + (d.contact || 'yes')
                           : (d.contact || 'yes');
      sh.getRange(rowNum, CONTACT_VIA_COL).setValue(value);
      sh.getRange(rowNum, CONTACT_AT_COL).setValue(d.clickedAt || new Date());
      return { ok: true, stamped: rowNum };
    }
  }
  return { ok: false, error: 'id not found' };
}
