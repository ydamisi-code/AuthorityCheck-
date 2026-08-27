# AuthorityCheck

Checks every case and statute citation in a document against the official source
it claims to come from: legislation.gov.uk and Find Case Law.

It reports whether a cited authority **exists**. It never reports whether a
cited authority is **correct** for the proposition it supports. That distinction
runs through every label and every string in this codebase. Do not soften it.

## Why this exists

In `R (Ayinde) v London Borough of Haringey; Al-Haroun v Qatar National Bank`
[2025] EWHC 1383 (Admin) (Divisional Court, 6 June 2025), fabricated citations
produced with generative AI were put before the court. The court sat under its
Hamid jurisdiction, referred the lawyers involved to the BSB and SRA, and held
that checking citations against reputable sources is a professional
responsibility. The Upper Tribunal repeated the point in [2025] UKUT 305 (IAC).

## See it work

`public/demo.html` must be served over http from a real local server, and opened in
your own browser. Two ways:

```bash
npx serve      # needs Node, works on Windows and Mac
python3 -m http.server 8000   # Mac and Linux
```

Then open the address it prints and add `/demo.html`.

**It will not work** if you double-click the file (a `file://` page sends a null
origin) or if you open it inside a sandboxed preview pane. Both block the
outbound requests, and every row comes back `unavailable`. If all rows are
`unavailable`, including the legislation ones, the problem is the environment,
not the code: a real CORS block would fail Find Case Law only.

## The full app

Requires Node 18 or later.

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # 15 unit tests on the parser
npm run build    # type-check and production build
```

## What the sample proves

The sample text mixes genuine authorities with broken ones on purpose:

| Citation in the sample | Expected result |
|---|---|
| `[2025] EWHC 1383 (Admin)` | verified, or unavailable if Find Case Law blocks browser requests |
| `section 188 of the Housing Act 1996` | verified against legislation.gov.uk |
| `Legal Services Act 2007, s 12` | verified |
| `Companies Act 2006 s 172` | verified |
| `s.6 of the Human Rights Act 1998` | verified |
| `[2023] EWCA Civ 9999` | not found, court number is impossible |
| `Housing Act 1996, s 1888` | not found, Act exists but section does not |
| `Re X [2019] UKSC` | unreadable, no judgment number |

If the legislation rows come back verified, the API contract works and the
project is real.

## Architecture

No backend, no database, no accounts, no analytics, no cookies. legislation.gov.uk
enables CORS on `/data.xml` and `/data.feed` endpoints, so the browser calls it
directly. Pasted text never leaves the user's machine, so no personal data is
processed and no storage obligations arise.

```
src/
  types.ts                 domain types, single source of vocabulary
  lib/
    citations.ts           regex extractor + neutral citation to URL mapping
    citations.test.ts      15 tests
    legislation.ts         title resolution and section verification
    caselaw.ts             Find Case Law lookup with honest degradation
    verify.ts              orchestrator, 4-way concurrency, cancellable
  components/              DocumentInput, ResultsList, StatusBadge, Placeholder
public/demo.html           standalone smoke test, no build step
```

**No AI anywhere.** Extraction is regex, verification is two official APIs.
A hallucination detector that itself hallucinates would be worthless, and every
check here is deterministic and reproducible.

## Known limits, stated plainly

- **Find Case Law browser access is unconfirmed.** If it blocks cross-origin
  requests, case citations return `unavailable` with a link, never `not found`.
  "We could not check this" and "this does not exist" are different things to
  tell a lawyer. Fix is one stateless serverless proxy that stores nothing.
- **Currency is not checked.** legislation.gov.uk warns that revised text may
  not be fully up to date and lists effects its editorial team has not yet
  applied. Reading those is the next feature.
- **Only neutral citations are read.** Law report citations (`[1932] AC 562`)
  and case names without a neutral citation are not extracted.
- **Only Acts are read.** Statutory instruments are not yet handled.
- **`notFound` does not mean fabricated.** Some real judgments are not published
  on Find Case Law. The copy says so.

## Licensing obligations

| Source | Licence | Obligation |
|---|---|---|
| legislation.gov.uk | Crown copyright, Open Government Licence | Attribution |
| Find Case Law | Open Justice Licence | Attribution. Commercial reuse permitted. **No external indexing.** Bulk or programmatic analysis requires a computational analysis application to The National Archives (no fee). |

Per-citation lookups on user demand are ordinary service use. Caching results or
crawling the corpus is not. Apply for the computational analysis licence before
adding any caching layer.

## Source registry

| Claim relied on | Source | Authority level | Checked |
|---|---|---|---|
| Verification against reputable sources is a professional duty; regulator referral is the likely consequence of citing fabricated authorities | [2025] EWHC 1383 (Admin), judiciary.uk | Primary, Divisional Court | 27 Aug 2026 |
| Same principle applied in the immigration tribunal | [2025] UKUT 305 (IAC) | Primary, Upper Tribunal | 27 Aug 2026 |
| `/data.xml` and `/data.feed` endpoints; CORS enabled only on `/data.*` | legislation.gov.uk data reuse documentation | Official | 27 Aug 2026 |
| Revised legislation may not be fully up to date; unapplied effects listed separately | legislation.gov.uk Help and Changes to Legislation pages | Official | 27 Aug 2026 |
| Open Justice Licence terms; computational analysis application; no external indexing | Find Case Law re-use and terms of use pages | Official | 27 Aug 2026 |
| Six reserved legal activities; general legal advice is unreserved | Legal Services Act 2007 ss 12, 13, 14, Sch 2; Legal Services Board FAQ | Primary and regulator | 27 Aug 2026 |

Nothing goes in this table without a source, a link and a date. If a claim
cannot be sourced, it does not go in the product.

## Portfolio description

> Built a citation verification tool for UK legal writing after the Divisional
> Court's judgment in *R (Ayinde) v Haringey* [2025] EWHC 1383 (Admin) on
> fabricated AI-generated authorities. Parses neutral citations and statutory
> references from free text and resolves each against legislation.gov.uk and the
> National Archives' Find Case Law service. Deliberately uses no language model:
> extraction is deterministic and every result is traceable to a primary source.
> Runs entirely client-side, so drafts are never uploaded. TypeScript, React,
> Vite, unit-tested parser.
