# Wellness Blind Spot Score — Welocity exhibition build

A two-minute educational wellness-awareness assessment. Visitor scans a QR, answers
15 questions, gets a Blind Spot Score, and can open WhatsApp with the result pre-filled.
Every completed run is saved to a Google Sheet so the team can follow up afterwards.

Vanilla HTML/CSS/JS. No framework, no build step, no dependencies. Only external request
is the Google Fonts stylesheet, with a full system-font fallback.

This is the Welocity-branded successor to the Nitro Gym / Breach Candy build. The
assessment logic, scoring and question set are unchanged; what is new is the Welocity
identity, the Google Sheet capture, the optional WhatsApp-number field, and safer
session handling for a shared booth tablet.

---

## 1 · Before the exhibition — what to set

Everything lives in the `CONFIG` block at the top of `script.js`.

```js
const CONFIG = {
  EVENT_LABEL: 'Welocity Life Science  ·  DNAWellCode',   // the line above the headline

  CONTACTS: [
    { key:'mumtaz', label:{ en:'Talk to Mumtaz', hi:'मुमताज़ से बात करें' }, number:'919082374527' },
    { key:'laxman', label:{ en:'Talk to Laxman', hi:'लक्ष्मण से बात करें' }, number:'919326082818' }
  ],

  SHEET_ENDPOINT: 'https://script.google.com/macros/s/.../exec',
  DEFAULT_LANG: 'en',        // 'en' or 'hi' — which language the page opens in
  ...
};
```

**WhatsApp numbers: digits only.** No `+`, no spaces, no brackets, no leading zero.
India is `91`, so a 10-digit mobile becomes 12 digits total. A contact left blank is
not rendered — the page never publishes a dead `wa.me` link.

---

## 1a · Language

The page ships bilingual. A switch in the header toggles **English / हिंदी** at any
point — intro, mid-question or on the result — and the current answer selection
survives the switch.

`DEFAULT_LANG` decides which one a fresh scan opens in. English is the default; set
it to `'hi'` if the crowd is mostly Hindi-speaking and let people switch to English.

**English is canonical.** Whatever the visitor reads, the Google Sheet always
receives English — answers, band, category names, age and goal. That keeps the data
sortable and means the Apps Script needs no language logic. The language a visitor
actually used is recorded in the **Event** column as `Welocity (EN)` or
`Welocity (HI)`, which needed no extra column.

Devanagari needs more vertical room than Latin, so the page adds a `lang-hi` class
that loosens line-height on headings, questions and options. If you edit type sizes,
check both languages.

To reword anything, edit the `UI` dictionary (interface text) or the `QUESTIONS`
array (questions and options) in `script.js`. Every entry is a `{ en, hi }` pair —
keep both filled; a missing `hi` silently falls back to English.

---

## 2 · Wiring up the Google Sheet (about five minutes, once)

1. Create a new Google Sheet. Name it anything — e.g. *Blind Spot Score — Responses*.
2. **Extensions → Apps Script.** Delete the placeholder `myFunction`.
3. Paste the whole of [`apps-script/Code.gs`](apps-script/Code.gs). Save.
4. **Deploy → New deployment → Web app.**
   - *Execute as:* **Me**
   - *Who has access:* **Anyone** ← this must be "Anyone", not "Anyone with Google account"
5. Authorise when Google asks. The "unverified app" warning is expected for your own
   script — *Advanced → Go to (project name)*.
6. Copy the **Web app URL**. It ends in `/exec`.
7. Paste it into `SHEET_ENDPOINT` in `script.js`. Redeploy the page.

**Check it worked:** open the `/exec` URL in a browser. You should see
`{"ok":true,"service":"Welocity Blind Spot collector"}`. Then complete one run on the
live page and confirm a row appears in the `Responses` tab.

> **Updating an already-deployed script.** Save is not enough — the live Web app runs
> the last *deployed version*. Use **Deploy → Manage deployments → ✏️ (edit) →
> Version: New version → Deploy**. This keeps the same `/exec` URL.
>
> Do **not** use "New deployment" for an update — that mints a *different* `/exec` URL
> and the page will keep posting to the old one.

### If the columns changed (e.g. Email was added)

`HEADERS` is only written when the sheet is empty, and rows are appended by position.
So after a column change: redeploy as above, then **delete the whole `Responses` tab**.
The next submission recreates it with the correct headers. Export anything you want
to keep first.

### What lands in the Sheet

**One row per visitor**, 39 columns, keyed on a visitor id so a person is never
duplicated — the row is created, then updated in place.

| Group | Columns |
|---|---|
| Identity | Received At, Last Updated, ID, Event *(carries the language)*, **Status** |
| Visitor | Name, Mobile, Email, Age, Goal |
| Result | Score %, Band, Top Blind Spot 1–3 |
| Breakdown | Nutrition %, Movement %, Sleep %, Stress %, Preventive %, Genetics % |
| Raw answers | Q1–Q15, as the English text the visitor actually chose |
| Follow-up | Questions Answered, Contacted Via, Contacted At |

**Status is the column to work from:**

| Status | Meaning | Worth |
|---|---|---|
| `Started` | Gave their details, did not finish the questions | Still a real lead — call them |
| `Completed` | Finished and saw their score | Full profile, best context for a call |

The row is written **the moment the details form is submitted, before question 1**,
so someone who walks away halfway is still captured. Finishing updates that same
row rather than adding a second one. Tapping a WhatsApp button stamps **Contacted
Via** and **Contacted At** on it.

So the highest-value list is: `Status = Completed` **and** `Contacted Via` empty —
someone who went all the way through, saw a score, and did not reach out.

Mobile numbers are stored with a leading apostrophe so Sheets keeps them as text
instead of mangling them into scientific notation.

**The sheet is opened by ID**, set as `SHEET_ID` at the top of `Code.gs`. This
matters: the obvious `SpreadsheetApp.getActiveSpreadsheet()` returns null in a
standalone script and every write fails silently while the health check still
reports OK. Opening by ID works whether the script is bound to the sheet or not.
If you ever point this at a different sheet, change `SHEET_ID`.

**Checking it works:** open the `/exec` URL in a browser. It reports the
spreadsheet name, tab name, row count and column count — it touches the sheet, so
a success there means the write path is genuinely reachable, not just that the
script is deployed.

---

## 3 · Hosting and the QR code

Any static host works — the page is three files. Point the printed QR at the deployed
HTTPS URL. Test with the **actual printed QR**, not a typed URL: a QR that fails at the
booth is the one failure mode that costs the whole day.

---

## 4 · Running the booth

- The tablet can be handed straight from one visitor to the next. A **finished** run
  never resumes for the next person, and any run older than 20 minutes is discarded —
  both start clean at the intro screen.
- An *interrupted* run does resume in the same tab within that window, so a visitor who
  gets distracted mid-quiz doesn't lose their answers.
- "Retake assessment" and "Clear my answers on this device" both wipe immediately.
- Keyboard: keys `1`–`6` pick an option, Enter advances. Useful on a laptop kiosk.

---

## 5 · What changed from the Nitro Gym build

| | Nitro Gym build | This build |
|---|---|---|
| Questions | Assumed a gym, a trainer and a training programme | Everyday moments anyone recognises |
| Language | English only | English + Hindi, switchable at any point |
| Details | All optional, skippable | Name, mobile and email required; no Skip |
| Brand | DNAWellCode / Nitro Gym, ink-navy | Welocity, indigo-violet + cream + teal/gold |
| Contacts | Preeti, Nishant | Mumtaz, Laxman |
| Data | Nothing left the device | Completed runs saved to a Google Sheet |
| Contact details | None collected | Optional WhatsApp number on the details screen |
| Privacy copy | "Nothing is sent to a server" | Honest description of what is recorded and how to have it removed |
| Session resume | Any stored run resumed | Only an unfinished, recent run resumes |

The optional WhatsApp field was added because a Sheet of names with no phone numbers
cannot be followed up — which is the point of collecting it at all.

The questions were rewritten because the Nitro set was written for people standing
in a gym. At a general exhibition, "how personalised is your training programme?"
excludes most of the room. See §6.

---

## 6 · The question set

Rewritten for a general exhibition audience. The Nitro Gym version assumed a
training programme and a gym membership; roughly half its questions did not
apply to someone who simply eats, sleeps and works. These are built around
moments anyone recognises — the 4 pm slump, feeling heavy after a meal, waking
up tired, a check-up report nobody explained.

The stems still ask about **understanding**, never about health status. "How is
your energy?" would measure the person and drift toward a health test; "do you
know what causes your afternoon dip?" measures the blind spot and keeps the
page clear of medical claims. Every question follows that shape.

| # | Category | Question |
|---|---|---|
| 1 | Food & digestion | How did you decide what you eat on a normal day? |
| 2 | Food & digestion | After a heavy meal you feel heavy, sleepy or bloated — do you know which foods do that to you? |
| 3 | Food & digestion | How were the supplements, vitamins or health powders you take chosen? *(has N/A)* |
| 4 | Movement & daily activity | Do you know how much movement your body actually needs in a day — and whether you are getting it? |
| 5 | Movement & daily activity | When your body feels stiff, heavy or tired for a few days, do you usually know why — and what to change? |
| 6 | Sleep & energy | That drop in energy in the afternoon — do you know what causes yours? |
| 7 | Sleep & energy | How well do you know what your tea or coffee actually does to your sleep and energy? *(has N/A)* |
| 8 | Sleep & energy | On mornings when you wake up still tired, do you know what caused it? |
| 9 | Stress & mood | When pressure builds up, do you know how it shows up in your body — appetite, sleep, digestion, temper? |
| 10 | Stress & mood | Do you know what genuinely helps you switch off and feel normal again? |
| 11 | Preventive & family awareness | How well do you know which health conditions run in your family? |
| 12 | Preventive & family awareness | The last time you had a health check-up, did you understand what the numbers actually meant for you? |
| 13 | Preventive & family awareness | Have you turned what you know about your family's health into anything you actually do differently? |
| 14 | Personalisation & genetics | Have you ever had health guidance based on your own body's data rather than general advice? |
| 15 | Personalisation & genetics | How much of what you do for your health is based on something actually measured about you? |

Q7 (tea/coffee) is the signature question — the on-screen twin of the printed
Caffeine Card, so poster, card and page tell one story.

### Scoring

Every option carries a published blind-spot value **0–4**: `0` personalised and
understood, `4` never examined. The two N/A options ("I do not take any", "I do
not drink tea or coffee") are removed from *both* sides of the calculation —
they never penalise, because not doing something is a valid choice, not a gap.

```
Blind Spot Score = (total blind-spot points ÷ maximum applicable points) × 100, rounded
```

| Range | Band |
|---|---|
| 0–24% | Strong personal awareness |
| 25–49% | A few important gaps |
| 50–69% | Several unanswered questions |
| 70–84% | High personalisation blind spot |
| 85–100% | Mostly guesswork |

No band uses "unhealthy", "poor health", "high risk" or implies disease. The
score measures how personalised someone's routine is, never whether they are
healthy — that is what keeps the page clear of medical claims.

Someone with a doctor, a dietitian and recent tests they understood will
legitimately score 10–30%. The scoring is not rigged to clear 70%.

**Note on the Sheet:** the category *keys* were deliberately left unchanged when
the questions were rewritten, so the Apps Script and the existing header row
still work untouched. This means the column headed **Fitness %** now carries the
*Movement & daily activity* score. Rename that one header in the Sheet by hand
if it bothers you — nothing in the code depends on the header text.

## 7 · Privacy and consent

The page now records data, so the posture is different from the Nitro build and the
copy says so plainly rather than promising nothing leaves the device.

- The footer states what is recorded, who holds it, that it is never sold or shared
  outside Welocity, and gives a removal route (WhatsApp or
  `vp.welocitygenetics@gmail.com`).
- Every detail field is optional and labelled optional. Skipping them still gives a
  full result.
- Under-18s are routed to a parent or guardian instead of a consultation — DPDP Act 2023
  requires verifiable parental consent for children's data.
- Answers still live in `sessionStorage` only, and still die with the tab.
- Someone who asks to be removed: delete their row in the Sheet. Match on the **ID**
  column or their WhatsApp number.

If you later add anything that stores data server-side beyond this Sheet, it needs a
fresh review — rate limiting, a stated retention period, and restricted access to the
store.

---

## 8 · Testing

`scratchpad/test.js` in the working session drove a real Chromium through the full
flow. Verified:

- 15-question flow completes and reaches the result
- Score bounds — 0% all-best, 100% all-worst
- N/A answers do not penalise
- Band, blurb, category cards and gauge populate
- Sheet payload: score, band, name, normalised phone, age, goal, all 15 answer texts,
  six category scores, top three, row id — posted exactly once
- WhatsApp click sends the `contact_click` beacon
- Blank number hides its button; configured number builds a digits-only `wa.me` link
- XSS payload in the name field renders inert, injects no nodes
- Under-18 hides the consult route and shows the guardian note
- Finished / stale runs do not resume; interrupted runs do
- No horizontal scroll at 390px, no console errors

Still to do by hand before it goes live:

- [ ] Fill in Mumtaz's WhatsApp number
- [ ] Deploy the Apps Script and paste the `/exec` URL into `SHEET_ENDPOINT`
- [ ] Complete one real run end-to-end and confirm the row lands in the Sheet
- [ ] Send yourself a real WhatsApp message from a phone and confirm it reads correctly
- [ ] Test on a real iPhone and a real Android on the venue's network
- [ ] Test with the actual printed QR code
- [ ] Dummy run + Laxman's explicit permission, per the Welocity testing rule
