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

## 1 · Before the exhibition — the three things to set

Everything lives in the `CONFIG` block at the top of `script.js`.

```js
const CONFIG = {
  EVENT_LABEL: 'Welocity Life Science  ·  DNAWellCode',   // 1. the line above the headline

  CONTACTS: [
    { key: 'mumtaz', label: 'Talk to Mumtaz', number: '' },              // 2. Mumtaz's number
    { key: 'laxman', label: 'Talk to Laxman', number: '919326082818' }
  ],

  SHEET_ENDPOINT: '',                                     // 3. Apps Script /exec URL
  ...
};
```

**WhatsApp numbers: digits only.** No `+`, no spaces, no brackets, no leading zero.
India is `91`, so a 10-digit mobile becomes 12 digits total.

A contact left blank is simply not rendered — the page never publishes a dead
`wa.me` link. If *both* are blank, a red setup notice appears instead of the buttons.

> **Still outstanding:** Mumtaz's WhatsApp number. Until it is filled in, only the
> "Talk to Laxman" button appears.

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

> If you ever edit `Code.gs`, you must **Deploy → Manage deployments → edit → New version**
> for the change to take effect. Saving alone does not update the live Web app.

### What lands in the Sheet

One row per completed assessment, 37 columns:

| Group | Columns |
|---|---|
| Identity | Received At, Submitted At, ID, Event |
| Visitor | Name, WhatsApp, Age, Goal |
| Result | Score %, Band, Top Blind Spot 1–3 |
| Breakdown | Nutrition %, Fitness %, Sleep %, Stress %, Preventive %, Genetics % |
| Raw answers | Q1–Q15, as the text the visitor actually chose |
| Follow-up | Questions Answered, **Contacted Via**, **Contacted At** |

The last two are the useful ones for working the list afterwards: when someone taps a
WhatsApp button, a second tiny beacon stamps *which* person they contacted and when.
So a row with a score but a blank **Contacted Via** is a warm lead who did **not**
reach out — exactly the list worth calling.

Numbers are stored with a leading apostrophe so Sheets keeps them as text rather than
mangling them into scientific notation.

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
| Brand | DNAWellCode / Nitro Gym, ink-navy | Welocity, indigo-violet + cream + teal/gold |
| Contacts | Preeti, Nishant | Mumtaz, Laxman |
| Data | Nothing left the device | Completed runs saved to a Google Sheet |
| Contact details | None collected | Optional WhatsApp number on the details screen |
| Privacy copy | "Nothing is sent to a server" | Honest description of what is recorded and how to have it removed |
| Session resume | Any stored run resumed | Only an unfinished, recent run resumes |

The optional WhatsApp field was added because a Sheet of names with no phone numbers
cannot be followed up — which is the point of collecting it at all.

---

## 6 · Scoring (unchanged from the original build)

15 questions across 6 categories. Every option carries a published blind-spot value
**0–4**: `0` personalised and understood, `4` never examined. Some questions offer an
**N/A** option ("I don't take supplements", "I don't consume caffeine") which is removed
from *both* sides of the calculation — it never penalises.

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

No band uses "unhealthy", "poor health", "high risk" or implies disease. The score
measures how personalised someone's routine is, never whether they are healthy — that
is what keeps the page clear of medical claims.

A visitor with a real trainer, a dietitian and prior testing will legitimately score
10–30%. The scoring is not rigged to clear 70%.

---

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
