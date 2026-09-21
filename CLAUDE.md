@../../BRAND-SYSTEM.md

# Remittance — AP Supplier Remittance Advice Tool

## What this is

A local, browser-based tool that replaces a legacy Python desktop app
("BC370 - Remittance Advice", internally `Remittance.exe`, built by a
"CS Automation team") used by an Accounts Payable team to send supplier
remittance advice emails after a bank EFT payment run. It runs entirely
on the user's own laptop — never deployed publicly — because it
processes confidential supplier payment data and eventually sends mail
via a real corporate SMTP account.

**Two-stage plan, given directly by the project owner:**
- **Option B (build first):** manual upload of two exported files →
  generate a remittance PDF per supplier → preview → select recipients
  → send via SMTP (credentials pending from IT admin).
- **Option A (later, not in scope yet):** connect directly to the bank
  feed instead of manual file upload. Needs cross-team coordination;
  don't build against it until asked.

Reference material the owner supplied (workflow diagrams, an existing
work-instruction doc, and a real sample export from the legacy tool)
informed everything below. That original source material — including a
real production export with actual supplier names, emails, and payment
amounts — lives outside this project folder (in a scratch/temp
location) and was intentionally **not** copied in here. Never commit
real supplier/payment data to this project; use synthetic fixtures for
dev and tests (see `fixtures/`).

## The existing legacy tool (what we're replacing)

A Python desktop UI ("CS Automation team 1.0", labelled "BC370 -
Remittance Advice", project #1123) with four fields — Lookup File
(.xlsx), Input file (.txt), Template File (.docx), Output Folder — and
two buttons: **Generate Report** and **Send Mail**. No preview step, no
per-recipient selection visible in its UI. This project's job is to
rebuild that same pipeline as a browser UI with the preview/selection
step the owner explicitly asked for, not to reinvent the underlying
data format or matching logic, which is fixed by the two source files
below.

## The two input files (fixed formats — do not redesign)

**1. Bank EFT remittance detail export (`.txt`)** — e.g.
`36. 806959 AUD EFT WEEKLY PAYMENT 16SEP26.txt`. This is a paginated,
fixed-width **UTF-16LE** text report (SAP-style "Direct Debit Advice"),
*not* CSV. Structure:
- A constant company header block repeated on every page (`Cmp 370 Div
  A10`, ABN, address, phone/fax, "Direct Debit Advice" title).
- Per-supplier blocks: `<Supplier Name> Supplier no : <no>`, address
  lines, `Date : dd/mm/yy`, then a table with columns `Inv.Date |
  Inv.Ref.No. | Amount | Deductions | Nett Amount`.
- Long supplier blocks paginate: the block repeats the header and
  continues the invoice table across multiple "pages" (each ending
  `Continued next page`) until the block finally ends with `Total this
  Debit : <amount>` — that line is the only reliable "this supplier's
  block is done" marker. A block can be a single page or many.
- Group by `Supplier no`, concatenate invoice rows across all
  continuation pages for that supplier in order, stop at `Total this
  Debit`. Multiple *separate* supplier blocks can share the same
  supplier number if it appears again later non-contiguously — treat
  each contiguous run independently rather than merging by number
  globally, since that's how the source report is laid out.
- **Negative amounts use a trailing minus, not a leading one** —
  `"680780.74-"`, not `"-680780.74"` (a mainframe/COBOL/SAP
  convention, for credit/reversal lines). `parseFloat` alone silently
  drops a trailing `-` and reads the value as positive; caught this in
  real production data (supplier 10043 had a `-$680,780.74` reversal
  read as `+$680,780.74`, inflating that supplier's total by 2x the
  reversal — off by ~$1.43M, visible as the ⚠ total-mismatch warning).
  Both the invoice-row amount and the `Total this Debit` amount need
  this handling — see `parseSignedAmount` in `bankParser.ts`, and
  `fixtures/sample-bank-export.txt`'s supplier 90005 for the regression
  test. Verified the fix against the real 194-supplier file: zero
  mismatches, zero warnings, every computed total matches the file's
  own stated total to the cent.

**2. Supplier email lookup (`.xlsx`)** — e.g. `36. Supplier Remittance
Email Address_AU_16Sep26_LATEST.xlsx` (internally called "the Movex
file" by the owner; exported from Movex/SAP). One header row, columns:
`IDSUNO` (blank spacer column), `IDSUNO.1` (**supplier number as
text — the join key**, matches "Supplier no" from file 1), `IDSUTY`,
`IDSUNM` (supplier name), `IDSTAT`, `IDCSCD` (country, `AU`/`NZ`),
`IDPHNO` (phone), `CBEMAL` (**email address**), `Status` (`Valid` /
`Empty`). ~3,400 rows. Join file-1 supplier blocks to this by
`IDSUNO.1`. A supplier with `Status != 'Valid'` or a blank `CBEMAL`
has no usable email — surface that clearly in the UI (don't silently
drop them; the owner needs to see who can't be emailed and decide).

Only AU-currency sample data was provided. The lookup file's `IDCSCD`
column suggests NZ is a real future case (the legacy WI doc's title
literally says "AU & NZ") but no NZ sample exists yet — don't build
NZ-specific branching blind; keep the parser currency-agnostic where
it's free to do so, and treat true NZ support as a follow-up once a
real NZ sample shows up.

## Output: the remittance PDF

One PDF per supplier, replicating the existing Cummins South Pacific
Pty Ltd letterhead template (`Template_1123.docx`/`.pdf` in the owner's
reference material — not copied into this repo; ask the owner to
re-share it, or work from the description here + their feedback on
generated output):
- Letterhead: Cummins South Pacific logo (red "Cummins" wordmark + "South
  Pacific"), company name/ABN/address/phone/fax, inside a rounded-corner
  bordered box, with "Supplier no: <no>" and "Date: <dd/mm/yy>" plus the
  supplier's own name/address underneath.
- A dashed-border promo box inviting suppliers to register for email
  remittance advice, contact address **`cbs.ap.au@cummins.com`** (this
  is the current template's address — an older sample PDF the owner
  provided showed a different address, `CBSfinanceSP@Cummins.com`;
  flagged as an open discrepancy, go with the current template's
  address unless the owner corrects it).
- Invoice table: `Invoice Date | Invoice Number | Description | Nett
  Amount` (4 columns — narrower than the 5-column source data;
  `Description` has no source field and is intentionally left blank,
  `Invoice Number` maps from the source's `Inv.Ref.No.`), followed by a
  bold `Total this Debit : <sum>` line matching the source file's own
  total (use it to validate the parser — computed sum should equal the
  source's stated total; mismatch means a parsing bug, surface it,
  don't silently trust either number).

Generated with `@react-pdf/renderer` (React-component PDF generation,
no headless-browser dependency) rather than trying to mail-merge into
the legacy `.docx` template — this needs Word/LibreOffice installed and
is fragile to automate. Verified against synthetic fixtures side by
side with the real `Template_1123.pdf`/sample output the owner
provided (layout, letterhead box, dashed promo box, table, total line
all match); not yet checked against a real production batch — flag to
the owner for a look once the first real run happens. The letterhead
logo (`public/cummins-logo.png`) is the wide "Cummins South Pacific"
lockup pulled from the real `Template_1123.docx`'s embedded image, not
the tall standalone `logo.png` that was also in the reference
material — that one is a different (portrait) crop that doesn't fit
the header's aspect ratio.

## Stack & architecture decisions

Flagging these as the calls made during Stage 1 analysis (per the root
`CLAUDE.md` discipline) rather than asking and blocking — reasonable
defaults, correctable if wrong:

- **Next.js (App Router, TypeScript)**, run locally via `npm run dev`
  and opened at `localhost` — never deployed to a public host. Matches
  the org's usual stack (per the root `CLAUDE.md`) and, unlike the
  house's simpler single-file-HTML pattern (see `tk-dashboard`), this
  app genuinely needs a server: SMTP sending and reading SMTP
  credentials can't safely happen in client-side JS, and matching/PDF
  generation is easier to get right server-side than in-browser.
- **File upload**: both source files uploaded via the browser (`<input
  type=file>`) to a Next.js API route that does the parsing — files
  never need to leave the laptop beyond that local server process.
- **Email sending**: `nodemailer`. SMTP credentials are entered and
  tested from the app itself — **Settings → SMTP**
  (`app/settings/page.tsx`, `components/SmtpSettings.tsx`) has a form
  (host/port/user/pass/from) plus a "Test connection" button
  (`nodemailer`'s `.verify()`, via `app/api/settings/smtp/test`, no
  email actually sent) and a Save button. Saved settings are written to
  `~/.r3u-remittance/smtp-config.json` — **deliberately outside this
  project folder**, because this folder lives under OneDrive (see the
  root `CLAUDE.md`) and anything saved inside it gets swept into cloud
  sync; a mailbox password has no business leaving the laptop. See
  `lib/smtpConfig.ts`. `.env.local`'s `SMTP_*` vars still work as a
  fallback (useful for scripting/CI) but the saved-settings file takes
  precedence when both exist. Until either is configured, the send
  endpoint runs in **dry-run mode** (validates recipients/attachments,
  logs what *would* be sent, sends nothing) — same code path as real
  sending, so configuring credentials later is not a rebuild. The New
  Run page shows a banner linking to Settings whenever nothing is
  configured yet.
- **Audit log / send history**: kept locally as a plain JSON file
  (`data/audit-log.json`, one entry per supplier per run: run id,
  supplier no, email, amount, sent/failed/dry-run, timestamp) — not a
  real database. Originally tried `better-sqlite3`, but it needs a
  native C++ build toolchain (`node-gyp`/Visual Studio Build Tools)
  that isn't installed here and shouldn't be a prerequisite for a
  non-technical AP user to `npm install` this. A JSON file is plenty
  for a single local user's run history. Mirrors the `sendMail` column
  the legacy tool already tracks in its own `Email_logs.xlsx` — same
  idea, just queryable instead of a spreadsheet that gets overwritten.
- **No auth** — single local user on their own laptop, nothing
  multi-tenant here.
- **UI**: plain CSS (no Tailwind) adapted directly from
  `Projects/tk-dashboard`'s design system — same CSS custom-property
  tokens, sidebar/topbar shell, glass panels/cards, `.btn`/`.tag`/table
  styles — per the owner's explicit instruction to reuse that app's
  look. See `app/globals.css` (trimmed to what this module needs) and
  `components/Shell.tsx`.
- **Appearance settings**: also ported from `tk-dashboard` — the full
  20-theme accent picker (swatches) and light/dark/OLED mode toggle,
  on **Settings → Appearance** (`components/Appearance.tsx`). Persisted
  to `localStorage` only (`remittance-theme`/`remittance-mode`), same
  as the reference app — this is a per-viewer display preference, not
  app data, so it isn't part of the SMTP settings file. A small inline
  script in `app/layout.tsx`'s `<head>` applies the saved values before
  first paint to avoid a flash back to the crimson/light default (the
  `<html>` tag has `suppressHydrationWarning` for this reason — React
  otherwise flags the intentional server/client attribute mismatch).
- **Sidebar collapse**: also ported from `tk-dashboard` — the ❯/❮
  floating button that shrinks the sidebar to icon-only on desktop
  (`body.collapsed`, `#collapseBtn` in `globals.css`, wired in
  `components/Shell.tsx`). Persisted to `localStorage`
  (`remittance-sidebar-collapsed`); the reference app resets it on every
  login instead, but this app has no login step to reset on, so
  persisting is the closer equivalent.
- **Clock**: `components/Clock.tsx`, ticking every second in the
  topbar, same `en-US` time/date format as `tk-dashboard`. Renders `—`
  until the first client-side tick (avoids a hydration mismatch, since
  the server has no wall-clock time to render from).
- **Brand name**: this module reads "**MJ Remittance**", not "R3U
  Remittance" — an explicit, deliberate deviation from the shared
  `BRAND-SYSTEM.md` convention (every other module is "R3U
  &lt;Module&gt;"), per the project owner's direct instruction. Don't
  "fix" this back to the R3U pattern without asking first.
- **Cross-page state**: uploaded files, parsed suppliers, selections,
  and send results all live in `components/RunProvider.tsx`, a React
  Context mounted once in the root layout (`app/layout.tsx`) — not in
  `app/page.tsx`'s own state. Next.js's App Router keeps the root
  layout mounted across client-side navigation between routes, so
  anything in this context survives a trip to Send History or Settings
  and back, whereas page-local `useState` would have been wiped on
  unmount. It does **not** survive a full page reload (Context only
  lives in memory) — that's an accepted limit, not a bug; a reload is a
  deliberate "start over" action.
- **File inputs are fully custom-rendered** (`.file-input-wrap` in
  `globals.css`, used by `UploadForm.tsx`'s `FileField`) rather than
  showing the browser's native "Choose File / no file chosen" text.
  This isn't just styling — it's required for the persistence above to
  actually look correct: a native `<input type=file>`'s own displayed
  filename always resets to empty on remount (browsers won't let
  anything, React included, redisplay a chosen filename after the
  fact, for security reasons), even though the underlying `File` object
  in `RunProvider` is still perfectly intact. Without this, navigating
  away and back made it look like the upload was lost even though it
  wasn't. The native `<input>` is still there and functional — just
  made invisible and stretched over a custom-styled display driven
  entirely by our own persisted `file` state.
- **One button, two jobs**: the Process Remittance page has a single primary
  button, not two. `RunProvider`'s `phase` state machine
  (`idle → parsing → matched → sending → idle`) drives both its label
  ("Match & generate" / "Parsing…" / "Confirm & send (N)" / "Sending…")
  and whether the file inputs are locked — locked from the moment
  you've matched a batch until the send finishes, so you can't swap
  files out from under a batch you're mid-review-or-send on. Sending
  completes back to `idle` and clears the chosen files (ready for next
  week's pair), but does **not** clear the suppliers table or send
  results — those persist until the next successful match overwrites
  them.
- **Per-row send + bulk send share one code path**: both go through
  `RunProvider`'s `sendItems()` → `POST /api/send` with a
  **single-item** array, called once per supplier rather than one
  batched call for the whole selection. This was the simplest way to
  get real per-supplier progress (the bulk send shows a live "Sending N
  of M — &lt;name&gt;" progress bar) without building a streaming
  endpoint — each response updates the bar and appends to the results
  list before starting the next one.
- **"Download .eml" — a zero-SMTP escape hatch**: next to
  "Confirm & send (N)" is a "Download .eml (N)" button
  (`app/api/download-eml`, `lib/eml.ts`) that packages the selected
  suppliers' emails as standard RFC822 `.eml` files — one raw `.eml`
  for a single selection, a `.zip` of them (via `jszip`) for multiple —
  each with the PDF as a real MIME attachment. Opens directly in
  Outlook/Thunderbird/Apple Mail for manual review-and-send. Subject
  and body come from the same `lib/emailTemplate.ts` used by the real
  send and the on-screen preview, so it can never drift out of sync.
  Needs no SMTP configuration at all — this works today regardless of
  what's eventually decided about hosting/sending (see below).
- **Select-all checkbox only selects sendable rows** — rows with no
  valid email (no lookup match, or a blank/invalid one) are never
  auto-selected, deliberately: there's nowhere to send them. It's a
  real controlled checkbox (checked when every sendable row is
  checked, indeterminate — the dash state — when only some are) rather
  than the earlier uncontrolled one, whose visual state didn't track
  actual selection and made clicking it look broken.
- **Gotcha for anyone touching `RunProvider`**: don't nest a `setX`
  call inside a `setY(current => ...)` updater just to read `Y`'s
  latest value. React's Strict Mode (dev only) double-invokes updater
  functions specifically to catch side effects like that — `toggleAllValid`
  had exactly this bug (nested `setSelected` inside a `setSuppliers`
  updater), and the double-invocation made two toggles cancel out into
  a net no-op. Read state via the closure (put it in the `useCallback`
  dependency array) instead.

## Deployment (undecided as of this writing)

The project owner wants this live/public rather than local-only, which
conflicts with the "never deployed publicly" design above — that
conversation is still open. Key facts already established, so a future
session doesn't have to re-derive them:
- Plain GitHub Pages can't run this app — it's static-only, no server
  code, and SMTP sending needs a real server (browsers can't open raw
  SMTP sockets).
- The `tk-dashboard` pattern (GitHub Pages + Google Apps Script
  backend) doesn't cover real SMTP sending either — Apps Script has no
  raw socket support, so it can only send via Gmail's own sending
  infrastructure (`MailApp`/`GmailApp`), never an arbitrary third-party
  SMTP host like `smtp.cummins.com`. Whether that's acceptable depends
  entirely on **whether Cummins runs Google Workspace for corporate
  mail** — still unconfirmed. If they're on Microsoft 365/Exchange (as
  most companies this size are), GAS can only ever be a parse/preview
  layer, not a real sender.
- "Hide the code" (disabling right-click/devtools, "encrypting" the
  JS) was requested and explicitly declined — anything that runs in a
  browser is downloadable and readable by that browser's user, full
  stop; obfuscation only inconveniences honest users, not anyone who
  actually wants the source. Don't attempt this if asked again without
  re-explaining why.
- The "Download .eml" feature above is a legitimate, already-shipped
  alternative that sidesteps the whole question for manual sending.

## Workflow (matches the owner's diagram)

1. **Upload** — bank `.txt` export + supplier email `.xlsx` lookup.
2. **Match & generate** — parse both, join by supplier number, generate
   one PDF per supplier; suppliers with no valid email are shown but
   flagged as unsendable.
3. **Preview** — PDF preview and a rendered email preview (subject,
   body, PDF attached) per recipient.
4. **Select recipients** — checkbox per supplier, plus "select all
   valid".
5. **Confirm & send** — sends (or dry-runs) via SMTP, writes the audit
   log, shows a per-recipient result summary.

A second page, **Send History** (`app/history`), lists every past
send/dry-run attempt from the local audit log.

## Dev

```bash
npm install
npm run dev
```

Or via the root orchestrator's `.claude/launch.json` entry `remittance`
(port 3000).

No `.env` committed. Copy `.env.example` → `.env.local` and fill in
SMTP vars once IT provides them; until then the app runs fine in
dry-run mode with no env vars set at all.

`npm test` runs the parser/matcher unit tests against `fixtures/`
(synthetic data covering: a single-page block, a block that spans a
continuation page, a supplier with no valid email, and a supplier
missing from the lookup entirely).

## Data hygiene

Never commit real exported bank files, real supplier lookup files, or
real send logs to this folder. `fixtures/` holds small, fully
fabricated sample data (fake supplier names/numbers/emails/amounts) in
the same shape as the two real formats, used for dev and tests.
