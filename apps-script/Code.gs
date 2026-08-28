/**
 * Wellness Blind Spot Score — Google Sheet collector
 * Welocity Life Science
 *
 * Deploy: Deploy > New deployment > Web app
 *   Execute as:     Me
 *   Who has access: Anyone
 * Updating later: Deploy > Manage deployments > edit > New version > Deploy
 * (that keeps the same /exec URL; "New deployment" would mint a new one).
 *
 * The sheet is opened BY ID, not by getActiveSpreadsheet(), so this works
 * whether the script is bound to the sheet or standalone. getActiveSpreadsheet()
 * returns null in a standalone script and every write fails silently.
 *
 * Three message types arrive here, all keyed on the same visitor id:
 *   { type:'lead' }           -> row appended as soon as details are entered
 *   { type:'result' }         -> that row completed with the score
 *   { type:'contact_click' }  -> that row stamped with who they contacted
 *
 * Because the lead row is written before the questions start, someone who
 * abandons halfway is still captured, with Status left as "Started".
 */

var SHEET_ID   = '18dpX9aRvMs6kDxNUPw2CXr-lj3EdgVtjQfl5gp8qC4I';
var SHEET_NAME = 'Responses';

var HEADERS = [
  'Received At', 'Last Updated', 'ID', 'Event', 'Status',
  'Name', 'Mobile', 'Email', 'Age', 'Goal',
  'Score %', 'Band', 'Top Blind Spot 1', 'Top Blind Spot 2', 'Top Blind Spot 3',
  'Nutrition %', 'Movement %', 'Sleep %', 'Stress %', 'Preventive %', 'Genetics %',
  'Q1 Eating decided', 'Q2 Food response', 'Q3 Supplements',
  'Q4 Movement needed', 'Q5 Stiff or tired',
  'Q6 Afternoon dip', 'Q7 Tea/coffee', 'Q8 Waking tired',
  'Q9 Stress shows up', 'Q10 Switching off',
  'Q11 Family conditions', 'Q12 Check-up numbers', 'Q13 Preventive action',
  'Q14 Prior insight', 'Q15 Measured routine',
  'Questions Answered', 'Contacted Via', 'Contacted At'
];

var CAT_COLS = {
  nutrition:'Nutrition %', fitness:'Movement %', sleep:'Sleep %',
  stress:'Stress %', prevent:'Preventive %', genetics:'Genetics %'
};

/* 1-based column number for a header name. */
function col_(name) { return HEADERS.indexOf(name) + 1; }

/* True when the sheet's first row already matches HEADERS exactly. */
function headersMatch_(sh) {
  var width = sh.getLastColumn();
  if (width < 1) return false;
  var row = sh.getRange(1, 1, 1, width).getValues()[0];
  if (row.length !== HEADERS.length) return false;
  for (var i = 0; i < HEADERS.length; i++) {
    if (String(row[i]).trim() !== HEADERS[i]) return false;
  }
  return true;
}

function getSheet_() {
  var ss;
  try {
    ss = SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  } catch (err) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }
  if (!ss) throw new Error('Cannot open the spreadsheet. Check SHEET_ID.');

  var sh = ss.getSheetByName(SHEET_NAME);

  /* If the tab exists but its header row is a different shape, appending by
     position would silently mislabel every new row — Age landing under Email
     and so on. Rather than ask anyone to remember to delete the tab, archive
     it under a dated name and start a clean one. Nothing is destroyed. */
  if (sh && sh.getLastRow() > 0 && !headersMatch_(sh)) {
    var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HHmm');
    var archived = SHEET_NAME + ' (old ' + stamp + ')';
    try { sh.setName(archived); } catch (err) { sh.setName(archived + ' ' + Math.floor(Math.random() * 999)); }
    sh = null;
  }

  if (!sh) sh = ss.insertSheet(SHEET_NAME);

  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sh.getRange(1, 1, 1, HEADERS.length)
      .setFontWeight('bold').setBackground('#1A1440').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
    sh.setColumnWidth(col_('Name'), 150);
    sh.setColumnWidth(col_('Mobile'), 130);
    sh.setColumnWidth(col_('Email'), 210);
    sh.setColumnWidth(col_('Status'), 90);
  }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* GET does double duty.
 *
 * With no parameters it is a health check that opens the sheet, so a success
 * proves the write path is reachable rather than only that the script deployed.
 *
 * With ?d=<json> it performs the same write as doPost. This exists because
 * Apps Script answers every request with a 302 to googleusercontent.com, and
 * several mobile browsers do not follow that redirect for sendBeacon or, in
 * some configurations, for a cross-origin POST — the request is accepted and
 * then quietly lost. An image GET follows redirects everywhere, so the page
 * sends by both routes. Writes upsert on the visitor id, so a duplicate
 * arriving by the other route is a harmless no-op update.
 */
function doGet(e) {
  try {
    if (e && e.parameter && e.parameter.d) {
      return handle_(e.parameter.d);
    }
    var sh = getSheet_();
    return json_({
      ok: true,
      service: 'Welocity Blind Spot collector',
      spreadsheet: sh.getParent().getName(),
      sheet: sh.getName(),
      rows: Math.max(0, sh.getLastRow() - 1),
      columns: HEADERS.length,
      headersReady: headersMatch_(sh)
    });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/* Shared by both transports. */
function handle_(raw) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(25000); }
  catch (err) { return json_({ ok:false, error:'busy' }); }

  try {
    var d;
    try { d = JSON.parse(raw); }
    catch (err) { return json_({ ok:false, error:'bad json' }); }

    if (!d || !d.id) return json_({ ok:false, error:'no id' });

    var sh = getSheet_();
    if (d.type === 'contact_click') return json_(stampContact_(sh, d));
    if (d.type === 'result')        return json_(saveResult_(sh, d));
    return json_(saveLead_(sh, d));

  } catch (err) {
    return json_({ ok:false, error:String(err) });
  } finally {
    lock.releaseLock();
  }
}

function doPost(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return json_({ ok:false, error:'no body' });
  }
  return handle_(e.postData.contents);
}

/* Row number for a visitor id, or 0. Searched newest-first: the row we want
   is almost always the most recent one. */
function findRow_(sh, id) {
  var last = sh.getLastRow();
  if (last < 2) return 0;
  var ids = sh.getRange(2, col_('ID'), last - 1, 1).getValues();
  for (var i = ids.length - 1; i >= 0; i--) {
    if (String(ids[i][0]) === String(id)) return i + 2;
  }
  return 0;
}

/* Apply {headerName: value} to a row in one read and one write. Creates the
   row if the id has not been seen yet, so a result whose lead never arrived
   is still captured rather than lost. */
function upsert_(sh, id, values) {
  var rowNum = findRow_(sh, id);
  var isNew  = false;

  if (!rowNum) {
    isNew  = true;
    rowNum = sh.getLastRow() + 1;
    if (rowNum < 2) rowNum = 2;
    var blank = [];
    for (var i = 0; i < HEADERS.length; i++) blank.push('');
    sh.getRange(rowNum, 1, 1, HEADERS.length).setValues([blank]);
    values['Received At'] = new Date();
    values['ID'] = id;
  }

  values['Last Updated'] = new Date();

  var range = sh.getRange(rowNum, 1, 1, HEADERS.length);
  var row   = range.getValues()[0];
  Object.keys(values).forEach(function (name) {
    var c = HEADERS.indexOf(name);
    if (c > -1) row[c] = values[name];
  });
  range.setValues([row]);

  return { rowNum: rowNum, isNew: isNew };
}

/* Written the moment the visitor submits their details, before question 1.
   This is what makes a half-finished visit still worth something. */
function saveLead_(sh, d) {
  var v = {
    'Event':  d.event || '',
    'Status': 'Started',
    'Name':   d.name  || '',
    // leading apostrophe keeps the number as text so Sheets never reformats
    // it into scientific notation or drops a leading zero
    'Mobile': d.phone ? "'" + d.phone : '',
    'Email':  d.email || '',
    'Age':    d.age   || '',
    'Goal':   d.goal  || ''
  };
  var r = upsert_(sh, d.id, v);
  return { ok:true, saved:'lead', row:r.rowNum };
}

function saveResult_(sh, d) {
  var cats    = d.categories || {};
  var answers = d.answers    || {};

  var v = {
    'Event':  d.event || '',
    'Status': 'Completed',
    'Name':   d.name  || '',
    'Mobile': d.phone ? "'" + d.phone : '',
    'Email':  d.email || '',
    'Age':    d.age   || '',
    'Goal':   d.goal  || '',
    'Score %': (typeof d.score === 'number') ? d.score : '',
    'Band':    d.band || '',
    'Top Blind Spot 1': d.top1 || '',
    'Top Blind Spot 2': d.top2 || '',
    'Top Blind Spot 3': d.top3 || '',
    'Questions Answered': (typeof d.answered === 'number') ? d.answered : ''
  };

  Object.keys(CAT_COLS).forEach(function (k) {
    v[CAT_COLS[k]] = (typeof cats[k] === 'number') ? cats[k] : '';
  });

  for (var i = 1; i <= 15; i++) {
    var header = HEADERS[col_('Q1 Eating decided') - 1 + (i - 1)];
    v[header] = answers['q' + i] || '';
  }

  var r = upsert_(sh, d.id, v);
  return { ok:true, saved:'result', row:r.rowNum };
}

function stampContact_(sh, d) {
  var rowNum = findRow_(sh, d.id);
  if (!rowNum) return { ok:false, error:'id not found' };

  var viaCol   = col_('Contacted Via');
  var existing = sh.getRange(rowNum, viaCol).getValue();
  // a visitor may tap both buttons — keep a record of each
  var value = existing ? String(existing) + ', ' + (d.contact || 'yes') : (d.contact || 'yes');

  sh.getRange(rowNum, viaCol).setValue(value);
  sh.getRange(rowNum, col_('Contacted At')).setValue(d.clickedAt || new Date());
  sh.getRange(rowNum, col_('Last Updated')).setValue(new Date());
  return { ok:true, stamped:rowNum };
}
