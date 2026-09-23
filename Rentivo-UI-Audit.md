# Rentivo UI Audit (UI-first)

**Site:** https://rentivos.netlify.app/  
**Brand:** Rentivo (domain: rentivos) — verified property marketplace for **Ibadan**, Nigerian renters and owners  
**Scope:** Public (logged-out) pages **plus** audited signed-in flows (renter, lister, verification). **Admin UI not accessible** — documented as gated/blocked.  
**Sources:** `phase1-public-notes.md`, `phase2-roles-notes.md` (authoritative for signed-in), `research-marketplace-ui.md`, screenshots `01`–`18` and `20`–`54` in `/workspace/rentivos-audit/screenshots/`  
**Viewport audited:** ~1280 × 656 content area  
**Date:** 21 Sep 2026 (WAT)

---

## Goals & constraints

| Goal | Constraint / keep |
|------|-------------------|
| Feel like a **trusted Nigerian marketplace** (Ibadan), not a SaaS template or payment-app funnel | Keep Plus Jakarta Sans (400–800), navy `#000052`, lilac accents |
| Readable for an **average Nigerian user** — plain English, local words | Keep self-contain, BQ, caretaker, Bodija, General Gas, yearly rent, ₦ |
| **Less clustered**, clearer hierarchy | **Search page fonts/icons are the design system reference** — do not restyle them away; bring checkout and dashboards toward Search, not the reverse |
| Concrete UI changes product can ship | No invented findings; recommendations grounded in Phase 1 + Phase 2 notes + research checklist |
| Money honesty | Receipts, status pills, and emails must match what was actually charged (including ₦0 waiver) |

**Admin:** Not opened. Do not invent admin screens. See Admin gap section.

---

## Design reference: Search page (what to replicate)

**Screenshot:** `02-search-full.png` (also `13`–`16` for empty, location, budget, Bodija; signed-in `21-search-logged-in.png`)

Search is the strongest public **and** signed-in surface. Treat it as the visual DNA for Home, Listing, Auth, Checkout, Renter account, and (where cards exist) Lister.

| Token / pattern | What to copy |
|-----------------|--------------|
| **Font** | Plus Jakarta Sans; navy titles; muted meta (`#5d5d78`-class) |
| **Type icon row** | Thin line icons + short labels (All, Self-Contain, Flat, Duplex, Bungalow, Shop, Office, Warehouse, Land) — same stroke, labeled, not decorative overload |
| **Pills / chips** | Residential/Commercial pills; ₦ budget chips; Verified Only; removable active chips |
| **Cards** | Photo → badge/heart/photo-count → title → rating/location → beds/baths/sqm → **₦… /year** or **/sale** → single primary CTA |
| **Empty state** | Panel + explanation + Reset All Filters + removable chips + Clear all (`13-search-empty.png`) |
| **City honesty** | Ibadan live; Lagos / Abeokuta “coming soon” (`14-search-location-dropdown.png`) |
| **Radius / navy CTA** | ~22–24px cards; navy Search / Request Details buttons |
| **Signed-in header** | Saved, My Requests, List your property, name chip (`21`) — prefer this chrome on account pages too |

**Do not copy from Search as-is:** three overlapping type controls; duplicate “Filter Verified” vs “Verified Only”; budget popover clipping (`15-search-budget-popover.png`); Netlify badge over hearts; unexplained “verified & verified-in-progress”.

**What signed-in surfaces currently do wrong vs Search:** Checkout uses bank/fintech chrome and dual steppers; Lister hub is a dense SaaS table with ASCII `N` prices; Stats invent investor KPIs; three headers make Saved / Requests / Lister feel like different products.

---

## Executive summary

Prioritized themes (P0 = ship first). Phase 1 public issues remain; **bold** items are new or elevated from Phase 2 roles/checkout.

1. **P0 — Invisible navy-on-navy H1s** on `/how-it-works`, `/terms`, `/privacy`, `/access-fee-terms`. Fix to white. (`06`, `08`, `11`, `12`)
2. **P0 — Price language disagreement** on the same plot: home “Per year”, search `/sale`, detail “total” / “DIRECT RENT PRICE” on land. Lister table still uses ASCII **N**. One source of truth: `₦` + `/ year` | `/ sale` | `total`. (`01`, `02`, `04`, `40`)
3. **P0 — Fee / CTA / receipt honesty (elevated):** Listing still says “Checkout” beside “free / no card”. Waiver unlocks at **₦0** (`Claim Launch Waiver… ₦0`) but success email + request card claim **“₦5,000 Paystack successful” / “Payment Verified” / “Fee Paid & Unlocked”**. **Receipt must match charge.** (`03`, `27`, `32`–`37`, `47`, `35`)
4. **P0 — Trust claims vs inventory:** “Authentic Photos Verified” on wheat field / European stock; signup “98 listings verified this month” vs **8** seed listings; **new lister account is already Verified + owns all 8 seeds + 90% setup complete**. (`04`, `09`, `18`, `39`–`40`)
5. **P0 — Production-visible test / placeholder UI:** “Local Test Response: Simulate Available / Simulate Taken” on vacancy wait; phones `+234 800 000 0000` / `wa.me/2348000000000`; “ImageKit” / “quick staging” stock photos. Remove from production. (`30`, `31`, `36`, `43`)
6. **P1 — Unify headers:** Marketing Header A vs Search Header B vs **Lister chrome C**; “Create Account” vs “Sign Up”; Agent vs Lister vs Tenant naming. One nav system. (`01` vs `02` vs `39`, `21` vs `23`)
7. **P1 — Checkout should feel like marketplace, not a bank:** Dual steppers (5 dots + “STAGE 1 OF 3”); “256-Bit Encrypted Secure Checkout” on a free step; Paystack step highlighted during ₦0 waiver; “dossier” language. Align to Search cards + plain fee story. (`28`–`34`)
8. **P1 — Home hero clipping + signup form bugs** (unchanged): LOOKING FOR / map / type menu; phone label over placeholder; terms pre-checked; landlord subtitle still renter fee copy. (`01`, `17`, `09`, `18`, `20`)
9. **P1 — Search density** (unchanged): one type control path; dedupe Verified filter; budget popover + ₦; sync `?area=`. (`02`, `15`, `16`)
10. **P1 — Verified badge spam + meaning gap:** Up to three labels on detail; header **Verified** chip has **no explainer**; names in simultaneous use: Verified, Verified Badge, Green Verified shield, Emerald Badge, Live on Rentivo, Lister Mandate Audited, Physically Verified. Draft preview stamped Verified. (`03`, `04`, `42`, `51`)
11. **P1 — Fake / premature lister analytics:** Stats show ₦4.7M portfolio, +14% vs Ibadan, May–Sep chart, on an account created today; land listed as ₦8.5M **/yr**. Prefer empty “No views yet”. (`49`, `50`)
12. **P1 — Admin access denial UX:** `/admin` and `/admin/listings` redirect signed-in lister to generic `/login` (no `?next=`, no admins-only copy). Document as **gated — not audited**. Recommend clear denial, not silent renter login. (`53`)
13. **P2 — Netlify badge** covers hearts, CTAs, table actions, completeness, inspection CTA sitewide. (`02`, `18`, `27`, `40`, `44`)
14. **P2 — Document titles:** Every route shares `Rentivo — Find a Verified Place in Ibadan`.
15. **P2 — Time promises disagree:** 15–30 min, 30 min, 48 hours, “Avg .24 min” (space after dot). One promise.

**Strongest already:** Search icons/fonts (`02`, `21`); List-property voice (`07`); listing price-column structure; how-it-works calculator; amenities list on new-listing form; forgot-password calmness; unlock contact card *as a product moment* once honesty is fixed (`36`).

---

## Sitemap

### Reachable without login

| URL | Page |
|-----|------|
| `/` | Home — hero search, featured cards, trust modules |
| `/search` (+ `?area=`, `?q=`) | Browse / SERP — **design reference** |
| `/listings/prop-1` … `prop-8` | Listing detail (8 seed listings) |
| `/how-it-works` | ₦5,000 fee explainer + calculator + FAQ |
| `/access-fee-terms` | Fee, refund, comparison |
| `/list-property` | Landlord CTA (`/post-property`, `/for-owners` redirect here) |
| `/terms`, `/privacy` | Legal |
| `/login`, `/signup`, `/forgot-password` | Auth |

### Signed-in (Phase 2 audited)

| URL | Page | Role |
|-----|------|------|
| `/search` | Login success landing (tenant) | Renter |
| `/account/favorites` | Saved / Wishlist | Renter |
| `/account/requests` | My Requests (tabs + unlocked card) | Renter |
| `/account/profile` | Profile (tenant or agent pill) | Both |
| `/listings/:id` → `/listings/:id/request` → `/requests/:id` | Request → vacancy wait → waiver unlock → receipt | Renter |
| `/lister` | My Properties table | Lister |
| `/lister/listings/new` | New listing form (**not published** in audit) | Lister |
| `/lister/requests` | Inquiries + Stats tab (same URL) | Lister |
| `/lister/verification` | Book on-site visit | Lister |
| `/dashboard` | Redirects to `/` (marketing home) | — |

### Auth wall / gated

| Intended | What happens |
|----------|----------------|
| Renter CTAs while logged out | `/login?next=…` |
| Tenant opens `/lister` | `/signup?role=lister` (second account; session replaced) |
| **`/admin`, `/admin/listings`** | Signed-in lister → **generic `/login`** (no `next`, no admins-only copy). **Admin UI not audited.** |

---

## Page-by-page findings — Public

### Home — `/`

**Shots:** `01-home-full.png`, `17-home-looking-for.png`; signed-in lister home via `/dashboard`: `54-dashboard-is-home.png`

#### What’s working
- Headline readable (~38–48px extra-bold navy); micro labels LOCATION / LOOKING FOR / BUDGET clear
- Local listing titles (self-contain, walk to UI); dual owner/renter paths present
- Plus Jakarta + navy/lilac brand coherent with Search

#### Issues
| Issue | Priority | Evidence |
|-------|----------|----------|
| LOOKING FOR truncates to “Homes & comm…” | P0 | `01`, `17` |
| Map labels clip (“Agod”); pins + Netlify fight hero | P1 | `01` |
| Open type menu covers landlord strip → “Own pr…” | P1 | `17` |
| Budget pre-selected ₦400K–₦1.5M may hide cheap/sale if applied | P1 | `01`, `54` |
| Featured land ₦8.5M labeled like yearly rent; hero says “rent your next home” | P0 | `01` |
| Stock photos + Verified story undercut trust | P0 | `01` |
| “Dated checks” reads as “old”; SaaS jargon (“agency inflation”, “silent handoff”) | P1 | Notes |
| Report / Hide / Get support with no listing in context | P2 | `01` |
| Repeated browse / list CTAs — clustered marketing above value | P1 | `01` |

#### Recommended UI changes
1. **P0** Give LOOKING FOR a full line or shorter default label; never clip map area names.
2. **P0** Same rent vs sale label as Search/Detail (e.g. `₦8,500,000 / sale` or `total`, never “Per year” on land).
3. **P1** Do not pre-select a mid budget band; default “Any budget” like Search.
4. **P1** Replace stock field/warehouse/EU interiors or drop Verified on those cards.
5. **P1** Port Search type-icon row into hero (or link straight to `/search` type chips) instead of thin unlabeled pins only.
6. **P2** Move Report/Hide off home or attach to a listing; cut one redundant browse/list CTA.
7. **Copy**  
   - Before: `Dated checks on verified homes` → After: `Visited and dated on the listing`  
   - Before: `Flat access fee after confirm` → After: `₦5,000 only after the owner says it is still vacant`  
   - Before: `zero agency inflation` → After: `No agent markup on the rent`

---

### Search — `/search`

**Shots:** `02-search-full.png`, `13-search-empty.png`, `14-search-location-dropdown.png`, `15-search-budget-popover.png`, `16-search-bodija.png`, logged-in `21-search-logged-in.png`, menu `22-account-menu.png`

#### What’s working
- Type icon row, fonts, chips, 4-col cards, photo-count, hearts — **design reference**
- Empty state is a real panel with reset path (`13`)
- City menu honest about pilot vs coming soon (`14`)
- Bodija deep link shows active chip + 2 cards (`16`)
- Nigerian type vocabulary (self-contain, BQ on duplex card, “off General Gas”)
- Logged-in: name chip + Saved / My Requests; menu is a small white card (`21`, `22`)

#### Issues
| Issue | Priority | Evidence |
|-------|----------|----------|
| Three type controls (TYPE dropdown + Res/Com + icon row) | P1 | `02` |
| “Filter Verified” duplicates “Verified Only” | P1 | `02` |
| Budget popover clips type labels; stray “d” from Land | P0 | `15` |
| “Rental Budget (N)” uses ASCII N not ₦ | P1 | `15` |
| Chips stop at ₦2.5M — ₦4.2M / ₦8.5M outside quick path | P2 | `02` |
| Subcopy “8 verified & verified-in-progress” unexplained | P1 | `02` |
| `?area=Bodija` chip on but area box empty; H1 still “in Ibadan” | P1 | `16` |
| Cards mix `/year` and `/sale` without sale chip | P1 | `02` |
| Ratings with no review count | P2 | `02` |
| Netlify badge covers last card heart | P1 | `02` |
| No map on SERP (home promised one) | P2 | Notes |
| Three filter rows cramped at ~1280×656 | P1 | `02` |
| No login-success toast; account pages drop Search header | P1 | `21` vs `23` |

#### Recommended UI changes
1. **P0** Fix budget popover overflow; label **Rental Budget (₦)**; add sale/for-sale chip or exclude sale from rental budget.
2. **P1** Keep icon row; remove duplicate Filter Verified **or** Verified Only; drop top TYPE dropdown **or** Res/Com — pick two max.
3. **P1** Count line: `8 listings` or explain in-progress once; don’t invent a second status users can’t see.
4. **P1** On `?area=Bodija`, fill area field + heading `Listed properties in Bodija`.
5. **P1** Bottom padding / hide Netlify so hearts and pagination clear.
6. **P1** Keep Search header on `/account/*`; toast “You’re signed in” after login.
7. **P2** Optional “With photos” chip; elevate result count + sort.

**Scan order to enforce on cards (research):** Image → Verified badge → **₦ price + period** → Title → Area → Specs → soft “Checked …” → one CTA.

---

### Listing detail — `/listings/prop-1`, `/listings/prop-8`

**Shots:** `03-listing-prop-1.png`, `04-listing-prop-8.png`, logged-in CTA `27-listing-cta-logged-in.png`

#### What’s working
- Price column hierarchy: big number → bullets → navy CTA (`03`, `27`)
- Green “Physically Verified” + check date on prop-1; named lister
- Comfortable two-column spacing once scrolled; audit checklist icons consistent

#### Issues
| Issue | Priority | Evidence |
|-------|----------|----------|
| Up to **3** verified labels on one screen | P1 | `03`, `04`, `27` |
| prop-8: wheat field + house thumb mismatch; “Authentic Photos Verified” | P0 | `04` |
| “DIRECT RENT PRICE” / rent framing on **sale** plot | P0 | `04` |
| CTA “Continue to Request Details & Checkout” vs “Zero card… now” / “100% Free check” | P0 | `03`, `04`, `27` |
| Logged-out button → login, not request form | P0 | Phase 1 notes |
| Netlify covers **Report inaccuracy** when logged in | P1 | `27` |
| “1 Bedrooms” / “1 Bathrooms” grammar | P1 | `03` |
| Lister initials chip (TO / KE) unfinished | P2 | `03`, `04` |
| Land specs almost empty (sqm only) | P2 | `04` |
| Mandate / unmandated / Tenant Protection Guarantee jargon | P1 | Notes |

#### Recommended UI changes
1. **P0** One verified badge + check date beside it; drop redundant shield pills.
2. **P0** Sale: `₦8,500,000 total` or `/ sale` — never “DIRECT RENT PRICE” / per year.
3. **P0** CTA: `Ask the landlord if it’s free` or `Request the owner’s number — free` (checkout only when money is due).
4. **P0** Real local photos or remove “Authentic Photos Verified”.
5. **P1** Copy:  
   - Before: `Lister Mandate Audited` → After: `We checked this person can rent this place out`  
   - Before: `unmandated roadside agents` → After: `agents who don’t have the owner’s go-ahead`  
   - Before: `Rentivo Tenant Protection Guarantee` → After: `If the place isn’t free, you don’t pay`
6. **P1** Fix pluralization; move Report clear of Netlify.
7. **P2** Small map; fuller land specs; photo of lister or full name instead of raw initials.

---

### How it works — `/how-it-works`

**Shot:** `06-how-it-works.png`

#### What’s working
- Calculator is the most concrete trust content (red/green agent vs ₦5k)
- Step 02 clear (“we never ask for payment”); FAQ accordion usable
- Verification 4-point row structure good once H1 fixed

#### Issues
| Issue | Priority | Evidence |
|-------|----------|----------|
| **H1 navy on navy — invisible** (~91px empty band) | P0 | Notes / `06` |
| Step 04 wraps alone under 3-col row | P1 | `06` |
| “Exploitative”, Unlock, Dossier, operational fee, lister mandate | P1 | Notes |
| Agent % inconsistent with access-fee page (10–20% vs 10–50%) | P1 | Cross-page |
| Tall empty navy hero delays steps | P2 | `06` |
| “SAVE 98%” loud marketing — quieter arithmetic preferred | P2 | `06` |

#### Recommended UI changes
1. **P0** H1 color **white** (same fix pattern as Terms / Privacy / Access fee).
2. **P1** Four steps in one row or full vertical stack — no orphan 04.
3. **P1** Hero one-liner: `Pay ₦5,000 only after the owner says the place is free; then we send the phone number.`
4. **P1** Align agent fee % with `/access-fee-terms`.
5. **P2** Tighten hero so steps enter first viewport; tone down SAVE 98% badge.

---

### Access fee — `/access-fee-terms`

**Shot:** `08-access-fee-terms.png`

#### What’s working
- Body card structure: fee contents, agent comparison, zero-upfront, 24h refund, disclaimers — readable once inside card

#### Issues
| Issue | Priority | Evidence |
|-------|----------|----------|
| Invisible H1 “Access Fee Policy & Guarantees” | P0 | `08` |
| “Direct Contact Dossier”, “SLA window”, “technology-verified” | P1 | Notes |
| Agent % range disagrees with how-it-works | P1 | Notes |

#### Recommended UI changes
1. **P0** White H1.
2. **P1** One-line summary above card: `You pay ₦5,000 only after the owner confirms. Otherwise you pay nothing.`
3. **P1** Replace Dossier → `Phone & WhatsApp of the lister`; SLA → `reply window` / `within X hours`.
4. **P1** Single agent-percent claim across site.

---

### List property — `/list-property`

**Shot:** `07-list-property.png`

#### What’s working
- **Best copy on the site:** phone-in-5-minutes, landmark, yearly rent in naira, 3 phone photos, Nigerian number, caretaker / “I am helping the owner”
- Clear Start listing + I already have an account

#### Issues
| Issue | Priority | Evidence |
|-------|----------|----------|
| Header: For Property Owners **and** List your property both “on” | P1 | `07` |
| “rents out homes 3x faster” unsourced | P1 | Notes |
| Footer still “zero agency inflation” after promising plain English | P2 | Notes |
| “Owner FAQs” footer → same URL as List (no FAQ anchor) | P2 | Notes |
| No sample listing card for owners | P2 | Notes |

#### Recommended UI changes
1. **P1** One owner CTA in header (Search-style lilac “List your property” only).
2. **P1** Drop or source the 3× claim (also repeated as “3.4x” on lister surfaces).
3. **P1** Export this voice to Home, Listing, How-it-works, Checkout (system copy bank).
4. **P2** Footer “Owner FAQs” → `#faq` on this page; show a sample tenant-facing card.

---

### Auth — Login / Signup / Forgot password

**Shots:** `05-login.png`, `09-signup.png`, `18-signup-lister.png`, `10-forgot-password.png`, filled renter `20-signup-renter-filled.png`, admin wall reuse `53-admin-login-wall.png`, lister role wall `38-lister-signup-redirect.png`

#### Login — what’s working
- Split panel; email **or** phone; simple copy; magic link present

#### Login — issues & changes
| Issue | Priority | Fix |
|-------|----------|-----|
| First paint: blank left disk / washed form; heading before fields | P1 | Don’t flash empty shell; reserve illustration space |
| Subtitle always “verified property search” even for `/lister`, request `next`, or **admin** | P0 | Role/`next`-aware subtitle; admin → “Admins only” or clear denial |
| Remember me **pre-checked** (shared phones) | P1 | Default **off** |
| Chip “Avg .24 min response” (space after dot) | P2 | Fix typography; pick one response SLA |
| Magic link jargon | P2 | `Email me a sign-in link` |
| Toast truncated: “free until v…” | P2 | Full: `…until vacancy is confirmed` |

#### Signup — what’s working
- Role toggle (renter / landlord); password strength bars concept; success jumps to `/search` (fast)

#### Signup — issues (**weakest public screen**)
| Issue | Priority | Evidence |
|-------|----------|----------|
| Phone label drawn **on top of** placeholder | P0 | `09`, `20` |
| Landlord: “Agency or business name” smashed into placeholder | P0 | `18` |
| Terms checkbox **pre-checked** | P0 | `09` |
| “98 listings verified this month” vs 8 catalog | P0 | `09`, `18` |
| Landlord mode still talks ₦5k / confirmation (renter frame) | P1 | `18` |
| Left headline clips “List your Ibadan”; Create under Netlify | P1 | `18`, `20` |
| No “You’re in” confirmation — dump to search | P2 | Phase 2 notes |

#### Signup — recommended UI changes
1. **P0** One floating-label pattern; never overlap placeholder.
2. **P0** Terms unchecked by default.
3. **P0** Honest count (`8 listings live in Ibadan`) or remove metric.
4. **P1** Landlord subtitle: `List free. No commission. We verify in person.`
5. **P1** Shorten left rail so primary button clears badge; match Search Sign Up label.
6. **P1** Tenant → Lister: before `/signup?role=lister`, say `This login is a renter account. Create a landlord login to list a house.` (`38`)

#### Forgot password — what’s working
- Calmest auth screen (`10`): “No worries. Let’s get you back in.”

#### Forgot password — changes
- **P2** Note: `Use the email on the account (login also allows phone).`
- **P2** Don’t enable Send with empty email after illustration load.

---

### Legal — Terms / Privacy

**Shots:** `11-terms.png`, `12-privacy.png`

#### What’s working
- Terms card sections 1–6 readable (not a broker, ₦5k, landlord duties, refund, inspection disclaimer, Ibadan mediation)
- Privacy: NDPR rights, subprocessors listed (acceptable on legal page)

#### Issues & changes
| Issue | Priority | Fix |
|-------|----------|-----|
| Invisible H1 both pages | P0 | White H1 |
| `legal@rentivo.ng` plain text | P2 | `mailto:` |
| Privacy Paystack ref wraps `pstk_ ref_ . . .)` | P1 | `word-break` / mono block |
| “Seekers”, “letting mandate proof” on Privacy | P2 | Soften; lead with “Nigeria’s data protection law” then NDPR |
| Vendor names in body don’t help renters | P2 | Keep in subprocessors list only |

---

## Page-by-page findings — Signed-in (Phase 2)

### Renter: Saved / Wishlist — `/account/favorites`

**Shot:** `23-saved-empty.png`

#### What’s working
- Airy empty state; heart icon friendly; “Browse Ibadan Listings” is clear

#### Issues
| Issue | Priority | Evidence |
|-------|----------|----------|
| Header switches to marketing (Browse / For Property Owners) — drops Search DNA | P1 | `23` vs `21` |
| Empty copy talks “verification waiting periods” / “unlock landlord contacts” before any save | P1 | `23` |
| No filled-heart / card grid captured — wishlist doesn’t feel like Search cards yet | P2 | Notes |

#### Recommended UI changes
1. **P1** Keep Search header on account pages.
2. **P1** Before → After empty: `Your Wishlist is Empty.` + fee jargon → `You have not saved any houses yet.`
3. **P1** Button → `/search`; when filled, reuse Search card rhythm (photo → ₦ → title → area).

---

### Renter: My Requests — `/account/requests`

**Shots:** `24-my-requests-empty.png`, unlocked `37-my-requests-unlocked.png`

#### What’s working
- Tab model for request lifecycle; unlocked card has photo, green status, Call / WhatsApp — right local actions (`37`)
- Green pill matches Search “Available” language

#### Issues
| Issue | Priority | Evidence |
|-------|----------|----------|
| Tab labels: “Waiting Period”, “Confirmed Available”, “Unlocked Contacts” + “dossiers” in subhead | P1 | `24` |
| After waiver unlock: Unlocked (1) but **Confirmed Available stays 0** — status model vs tabs disagree | P0 | `37` |
| Card says **“Payment Verified”** after ₦0 waiver; page subhead still says pay ₦5,000 | P0 | `37` |
| Phone placeholder `+234 800 000 0000`; Schedule Inspection did nothing visible | P0 / P1 | `37` |
| Avatar **T** vs listing **TO** — inconsistent initials | P2 | `37` |
| Four long tabs will wrap on phone with no scroll hint | P1 | `24` |

#### Recommended UI changes
1. **P0** If waiver: Before `Payment Verified` → After `Contact opened — launch waiver, ₦0`.
2. **P0** Put this request in Confirmed Available **or** remove that tab; don’t leave it at 0 after vacancy confirm.
3. **P1** Tabs: `All` / `Checking` / `Vacant` / `Contact opened`. Empty: `You have not asked for any landlord number yet.`
4. **P1** Wire Schedule Inspection or hide it; show real listing phone or hide placeholder.
5. **P2** One initials set (match listing lister chip).

---

### Renter: Profile — `/account/profile`

**Shots:** `25-profile-top.png`, `26-profile-lister-cta.png`, lister view `52-lister-profile.png`

#### What’s working
- Centre column comfortable; local area list (Bodija, Akobo & General Gas, Ring Road, UI / Samonda, Oluyole, Jericho GRA)
- Tenant CTA “Own or Manage Property…” → Lister Portal is the right marketplace move (`26`)
- “Email cannot be changed directly” is honest

#### Issues
| Issue | Priority | Evidence |
|-------|----------|----------|
| Phone label “WhatsApp Phone Number (for lister contact)” wrong for tenant | P1 | `25` |
| Agent profile still has renter notification checkbox (“when landlords verify availability…”) | P1 | `52` |
| Role pill says **Agent** while lister chrome says Verified Lister | P1 | `52` vs `39` |
| No change-password | P2 | Notes |

#### Recommended UI changes
1. **P1** Role-specific phone label: `Your WhatsApp`.
2. **P1** Agent notifications: `when a renter asks about your listing`.
3. **P1** Consistent role name: Lister (or Landlord), not Agent vs Lister vs Tenant mix.
4. **P2** Add Change password.

---

### Renter: Listing request → checkout / unlock / receipt

**Constraint:** No real Paystack charge. Vacancy advanced via production-visible **Simulate Available**; unlock used **Claim Launch Waiver (₦0)**. Do not treat the email as a paid receipt.

**Shots:** `27` (listing CTA) → `28`–`29` (request) → `30`–`31` (vacancy) → `32`–`33` (waiver) → `34`–`36` (success + email + contact) → `37` (requests list)

#### Request details — `/listings/prop-1/request`

##### What’s working
- Two-column form + fee summary; move-in / inspection / purpose options usable for Ibadan
- Summary shows rent ₦450,000/year and Due Today ₦0.00 (Pending Check) — correct at this stage
- Amenities-adjacent local framing; Button “Check Vacancy & Proceed (Free)” is closer to honesty than listing CTA

##### Issues
| Issue | Priority | Evidence |
|-------|----------|----------|
| **5-step stepper AND “STAGE 1 OF 3”** — two progress models | P0 | `28` |
| “256-Bit Encrypted Secure Checkout” on a free vacancy step | P1 | `28` |
| Header “Direct Landlord Access Pass · Ibadan” cramped; bank-like | P1 | `28` |
| Step 4 labeled “Paystack ₦5,000” before money is due | P0 | `28` |
| Phone: **+234 (NG) prefix + number already starts with 0** (`080…`) | P0 | `29` |
| Email label “For Official Receipt & Dossier” | P1 | `29` |
| Summary still lists Direct Access Pass ₦5,000 + fake agent saved −₦85,000 while Due Today is ₦0 | P1 | `29` |
| Support WhatsApp `wa.me/2348000000000` | P0 | `29` |

##### Recommended UI changes
1. **P0** One stepper only — prefer **3 stages**: Ask → Waiting → Contact (pay only if fee applies).
2. **P0** Strip leading 0 when country code present, or label `WhatsApp (080…)` with no extra country box.
3. **P0** Real support number or remove link.
4. **P1** Drop encryption badge until charge; Before `… & Dossier` → After `… & receipt`.
5. **P1** Hide ₦5,000 line until vacancy confirmed **and** fee is due; keep “Due today ₦0” as the only total on free steps.
6. **Marketplace vibe:** Show listing card (Search DNA) in the right rail, not only a fee ledger.

#### Vacancy check — `/requests/:id`

##### What’s working
- Clear “Checking Vacancy with Landlord” intent; clock icon readable

##### Issues
| Issue | Priority | Evidence |
|-------|----------|----------|
| **Dev bar “Local Test Response: Simulate Available / Simulate Taken”** visible to any user; covers Due Today + Netlify | P0 | `30`, `31` |
| **48-hour window and 15–30 minutes** both on the page | P1 | `30` |
| Ops phone `+234 800 736 8486` looks placeholder | P1 | `31` |
| Feels like payment “processing”, not house-hunting | P1 | Notes |

##### Recommended UI changes
1. **P0** Remove Simulate bar from production builds.
2. **P1** One time promise: `We ask the landlord. Most replies within a day.`
3. **P1** Keep Search-like listing summary; avoid bank processing chrome.

#### Waiver checkout — same URL

##### What’s working
- Green CTA clear when fee is waived; “Zero debit card entry required” matches ₦0

##### Issues
| Issue | Priority | Evidence |
|-------|----------|----------|
| Stepper still highlights **Paystack** while body says fee waived | P0 | `32` |
| Two totals: Direct Access Pass ₦5,000 **and** Due Today ₦0.00 | P0 | `32`, `33` |
| Amount typography: **N0** / “₦0. 00 (FREE)” gap — breaks Search ₦ formatting | P0 | `33` |
| “100 waivers left” / First-100 promo — unverified scarcity | P1 | `32` |
| Promo banner louder than listing context | P1 | `32` |

##### Recommended UI changes
1. **P0** One total, written **₦0**. Do not title the step Paystack if no charge.
2. **P0** CTA can stay `Claim Launch Waiver & Unlock Contact (₦0)` — keep that honesty on the **receipt** too.
3. **P1** Before → After step title: `Paystack ₦5,000` → `Unlock contact (no charge)`.
4. **P1** Drop “100 waivers left” unless live inventory of waivers is real.

#### Unlock success + email + contact card

##### What’s working
- Contact card with Call / WhatsApp / landmark / Return to Marketplace is the **product moment** (`36`)
- Email preview UI exists (`35`) — useful if content is honest

##### Issues
| Issue | Priority | Evidence |
|-------|----------|----------|
| **Email body: “Your ₦5,000 access fee payment via Paystack was successful” after ₦0 waiver** | P0 | `35` |
| Stepper still says Paystack ₦5,000; secure-checkout badge remains | P0 | `34` |
| Card titled **VERIFIED LISTER CONTACT DOSSIER**; “unhindered”, “mandated agent” | P1 | `34`, `36` |
| Call **+234 800 000 0000**; landmark is listing blurb not a landmark | P0 / P2 | `36` |
| Request ID is a wrapping UUID; initials TO vs T elsewhere | P2 | `35`, `36` |

##### Recommended UI changes
1. **P0** Receipt / email Before → After:  
   - Before: `Your ₦5,000 access fee payment via Paystack was successful`  
   - After: `No charge. Launch waiver — contact unlocked.`
2. **P0** Show a real phone or `Number not available` — never a fake 800 number.
3. **P1** Rename card: `Landlord’s number` (drop “dossier”).
4. **P1** Short request code, not raw UUID; one initials set.
5. **P1** Stepper complete state: `Contact opened` — not Paystack.

---

### Lister / landlord: hub — `/lister`

**Shots:** `38-lister-signup-redirect.png` (wrong-role wall), `39-lister-dashboard-guide.png`, `40-lister-properties-table.png`, `41-lister-account-menu.png`

#### What’s working
- Table is a legitimate portfolio tool (thumb, title, type, area, REF, price, status, leads, actions)
- Cards view exists (closer to Search — prefer for marketplace vibe when density allows)
- Menu includes Inspection Hub / Browse as Seeker (`41`)

#### Issues
| Issue | Priority | Evidence |
|-------|----------|----------|
| **New account sees all 8 seed listings + Verified badge + “90% / 4 of 4” setup** | P0 | `39`, `40` |
| Prices use ASCII **N** (`N450,000 per year`, `N8,500,000 outright`) while Search uses ₦ | P0 | `40` |
| “1 leads” grammar; “3.4x more access requests” on brand-new account | P1 | `39`, `40` |
| Saved Drafts chip shows 1 but table shows 8 live — draft not in table | P1 | `40` |
| Setup guide overlays table actions; Netlify covers last-row actions; name truncates in packed header | P1 | `39`, `40` |
| Verification column “Live on Rentivo” vs avatar “Verified” | P1 | `40` |
| Tenant “Go to Lister Portal” → second signup with no explanation | P1 | `38` |
| Densest screen in product — three headers problem (Lister chrome ≠ Search) | P1 | `39` vs `21` |

#### Recommended UI changes
1. **P0** New lister starts empty (or clearly marked demos); no Verified until a visit; no “4/4 complete”.
2. **P0** ₦ not N everywhere.
3. **P1** Before `1 leads` → After `1 lead`; move setup guide off the action column; put draft under Drafts filter.
4. **P1** Role wall copy: `This login is a renter account. Create a landlord login to list a house.`
5. **P1** Prefer Cards view as default for marketplace feel; keep Table as power tool.
6. **P2** Don’t put delete/trash on demo seed rows the user doesn’t own.

---

### Lister: New listing — `/lister/listings/new`

**Shots:** `42-list-form-location-price.png`, `43-list-form-photos.png`, `44-list-form-availability.png`  
**Audit note:** Form explored; **not published**. Nothing deleted.

#### What’s working
- Right-rail **preview card is Search DNA** (area pin, beds/baths/sqm, amenity chips, Direct Landlord) — best bridge to marketplace
- Amenities copy strongest local list: Pre-paid Meter (CONLOG), Borehole, Inverter, Generator House, Band A feeder, Fenced & Gated, Watchman, POP, overhead tank
- Title example voice matches List-property (prepaid meter, Off General Gas)
- Mandate choice: Direct Landlord / Title Owner vs Managing Agent / Caretaker — clear

#### Issues
| Issue | Priority | Evidence |
|-------|----------|----------|
| Sticky “50% Complete” on nearly empty form; checklist ticks photos/amenities **done when empty** | P0 | `42`–`44` |
| Preview already **Verified + Available** on “Untitled Property Listing” + European stock photo | P0 | `42` |
| Step pills (1–5) don’t match scroll section numbers; not a real wizard | P1 | `42` |
| Price field `N 850000` no thousands separator; preview formats differently | P0 | `42` |
| “ImageKit Photo Gallery”; photo min rules disagree (2 vs 3 vs checklist); “Quick add sample… staging” | P0 / P1 | `43` |
| Overview prefilled with seed text; “3.4x” / “3.4 higher conversion” claims | P1 | `42`, `44` |
| Netlify covers completeness score | P1 | `44` |

#### Recommended UI changes
1. **P0** Do not stamp Verified/Available on a draft preview; don’t pre-tick completeness.
2. **P0** One photo rule (e.g. min 3); say **Photos**, not ImageKit; drop staging/sample Unsplash as happy path.
3. **P0** ₦ field with `toLocaleString('en-NG')` commas.
4. **P1** Make pills jump to sections or remove them; sticky progress only counts real completion.
5. **P1** Drop multiplier claims; keep caretaker / prepaid-meter voice.

---

### Lister: Requests / Bookings — `/lister/requests`

**Shots:** `47-lister-inquiries.png`, drawer `48-inquiry-drawer.png`

#### What’s working
- Green status chip language; drawer shows renter identity + listing thumb
- Waiver request visible because lister “owns” seed listing — good for testing honesty of status

#### Issues
| Issue | Priority | Evidence |
|-------|----------|----------|
| Status **“Fee Paid & Unlocked”** after ₦0 waiver | P0 | `47` |
| Subhead: confirm within **30 minutes** so renters pay **N5,000** — fights 48h vacancy copy + waiver | P0 | `47` |
| Huge empty table + one row; setup guide covers View Details; UUID wraps | P1 | `47`, `48` |
| Drawer empty below identity — no move-in, purpose, or WhatsApp reply (data was collected on request form) | P1 | `48` |
| Date `9/21/2026, 3:50:58 PM` US format; ASCII N vs ₦ in drawer | P1 | `47`, `48` |
| Header cramped (“Browse as Seeker” wraps) | P1 | `47` |

#### Recommended UI changes
1. **P0** Before `Fee Paid & Unlocked` → After `Contact opened — no fee taken` (when waiver).
2. **P0** Align SLA: `Reply within a day` (or one shared promise with renter vacancy page).
3. **P1** Drawer: move-in date, purpose, WhatsApp button; short ID; ₦; day/month date (`21 Sept 2026`).
4. **P1** Empty-state density when 0–1 rows — don’t stretch a ghost table to 100vh.

---

### Lister: Stats tab — same URL `/lister/requests` (not its own route)

**Shots:** `49-lister-stats-top.png`, `50-lister-stats-table.png`, badge explainer `51-verification-explainer.png`

#### What’s working
- KPI card structure and navy bars could work once numbers are real
- Bottom verification panel attempts to explain badge (`51`) — only in-app explainer besides `/lister/verification`

#### Issues
| Issue | Priority | Evidence |
|-------|----------|----------|
| **Invented live analytics** on day-one account: ₦4.7M portfolio, 75% occupancy, +14% vs Ibadan, May–Sep chart, “+32% vs Last Month” | P0 | `49`, `50` |
| Dollar-sign icon for “Total Portfolio Rent”; land as **₦8,500,000/yr** (sale elsewhere is “outright”) | P0 | `49`, `50` |
| “3 of 4 properties verified” vs header 8 properties vs all rows badged | P0 | `50`, `51` |
| Refresh returns to inquiries — Stats has **no own URL** | P1 | Notes |
| “Emerald shield” vs other badge names; “Instant badge” vs on-site visit | P1 | `51` |
| Netlify on inspection CTA; five KPI cards crush at narrower widths | P1 | `49` |

#### Recommended UI changes
1. **P0** If no history: `No views yet` — never fake benchmarks.
2. **P0** ₦ icon not $; sale vs rent period correct; one property count; one badge name.
3. **P1** Give Stats its own URL (e.g. `/lister/stats`).
4. **P1** Explainer copy: Before `Confirm C of O & landlord mandate` → After `We check the document that shows you can lease this place (C of O) and that you can list it.`

---

### Verification — `/lister/verification` + in-dashboard badge

**Shots:** `45-verification-hero.png`, `46-verification-form.png`, explainer `51-verification-explainer.png`

#### What’s working
- Form is the calmest landlord form: caretaker, gate security, WhatsApp, “call 10 minutes before arrival”
- Free visit framing is the right trust product; time slots 9:00–4:00 useful
- Steps structure (Schedule → Officer → On-Site → Badge) is clear once H1 is readable

#### Issues
| Issue | Priority | Evidence |
|-------|----------|----------|
| Header avatar already **Verified** with **no click-through explainer** | P0 | `39`, Phase 2 notes |
| Many badge names at once (Verified, Emerald Badge, Green Verified shield, Physically Verified, Live on Rentivo, Lister Mandate Audited) | P0 | Cross-surface |
| Property select defaults to land plot **₦8,500,000** with no sale label | P1 | `45` |
| Date field **mm/dd/yyyy** (US); hero H1 easy to miss on navy | P1 | `46`, `45` |
| “3.4× more genuine tenants” again; empty queue is huge | P1 | `45` |
| “Instant badge issued” (stats) contradicts “after an on-site visit” | P1 | `51` vs `45` |

#### Recommended UI changes
1. **P0** No Verified chip until a visit exists (or chip opens explainer: what was checked + date).
2. **P0** One badge name across Search cards, detail, lister avatar, verification — prefer **Physically Verified** + date (matches prop-1).
3. **P1** Day/month date; sale label on price; hide empty queue or place under form.
4. **P1** Before `3.4× more genuine tenants` → After `Free visit, then a badge on your listing`.
5. **P1** Header Verified chip → tooltip/drawer linking to `/lister/verification` and the stats explainer content.

---

### Admin — **NOT accessible** (gap callout)

**Shots:** `53-admin-login-wall.png`, related `54-dashboard-is-home.png`

| Attempt | Result |
|---------|--------|
| `/admin` | Signed-in lister → **generic `/login`** (no `?next=`, no “admins only”) |
| `/admin/listings` | Same wall |
| Account / lister menus | **No admin item** |
| `/dashboard` | Redirects to marketing `/` still signed in — **not** an admin console (`54`) |

**What was not seen:** Any admin listing queue, moderation UI, user table, or Paystack reconciliation screen. **Do not invent.**

#### UI recommendation (access denial)
1. **P1** If signed-in user is not admin: stay on previous page (or show a dedicated denial) — Before silent `/login` → After `You don’t have admin access.`
2. **P1** If logged out and hitting `/admin`: login with `?next=/admin` and subtitle `Admins only` — not “Continue your verified property search”.
3. **P2** When admin UI ships, give it its own document title and denser role rules (out of renter marketplace vibe).

---

## Cross-cutting system recommendations

| Area | Recommendation | Priority |
|------|----------------|----------|
| **Nav consistency** | One header system. Prefer Search chrome (Saved, My Requests, List your property, Sign In/name) on all renter surfaces; Lister chrome only under `/lister*`. Drop duplicate “For Property Owners” vs “List your property”. | P1 |
| **Money honesty** | Charge, status pill, email, and receipt must agree. Waiver → say ₦0 / “no fee taken” everywhere. Never “Paystack succeeded” / “Fee Paid” / “Payment Verified” on waiver. | P0 |
| **₦ formatter** | Always `₦` + `toLocaleString('en-NG')` + period (`/ year`, `/ sale`, `total`). Ban ASCII `N` / `N0`. | P0 |
| **Dev UI** | Strip Simulate Available/Taken, ImageKit labels, staging photo buttons, `+234 800…` placeholders from production. | P0 |
| **Verified meaning** | One name + date; chip opens explainer; never on draft/new account/seed without visit. | P0 |
| **Checkout = marketplace** | Listing card + plain stages Ask → Waiting → Contact; fee ledger only when chargeable; Search fonts/chips. | P0 |
| **Density tokens** | Card gap 16–24px; max **one** primary CTA per card; collapse filter rows on Search; don’t stretch 1-row tables to full viewport. | P1 |
| **Time SLA** | One promise sitewide (suggest: most replies within a day). Fix “Avg .24 min”. | P1 |
| **Netlify badge** | Hide on production, or `padding-bottom` so it never covers hearts/CTAs/checkboxes/table actions. | P1 |
| **Document titles** | Per route, e.g. `Search Ibadan listings — Rentivo`, `My requests — Rentivo`. | P2 |
| **Role switch** | Explain second account before `/signup?role=lister`. | P1 |
| **Copy system** | Adopt List-property plain English as global voice; quarantine mandate/dossier/unlock/SLA/Emerald to footnotes. | P1 |
| **Local words to keep** | self-contain, BQ, caretaker, Bodija, Akobo, General Gas, yearly rent, ₦, C of O (explained) | — |
| **Fake analytics** | Empty states over invented KPIs. | P0 |

---

## Copy bank: ambiguous → plain Nigerian English

Grounded in Phase 1 + Phase 2 notes + research §3. Prefer right column on primary UI.

| Ambiguous (avoid on buttons/cards) | Clear (prefer) |
|------------------------------------|----------------|
| Dated checks / dated verification | Visited on [date] / Check date on the listing |
| zero agency inflation | No agent markup on the rent |
| silent handoff | We connect you; we don’t mark up the rent |
| genuine seekers | People looking to rent |
| Direct Access Fee / Flat ₦5,000 Unlock | ₦5,000 to unlock landlord contact |
| Direct Contact Dossier / VERIFIED LISTER CONTACT DOSSIER | Landlord’s number / Phone & WhatsApp of the lister |
| Lister Mandate Audited / owner mandate | We checked this person can rent this place out |
| unmandated roadside agents | Agents without the owner’s go-ahead |
| Paystack Contact Unlock Fee / Payment Verified (on waiver) | ₦5,000 paid with Paystack after vacancy is confirmed **or** Contact opened — launch waiver, ₦0 |
| Fee Paid & Unlocked (on waiver) | Contact opened — no fee taken |
| Your ₦5,000 … Paystack was successful (after ₦0) | No charge. Launch waiver — contact unlocked. |
| operational fee / SLA window | Reply within [X] hours / Most replies within a day |
| verified & verified-in-progress | 8 listings (or: Verified / Check in progress — explain once) |
| Continue to Request Details & Checkout | Ask the landlord if it’s free / Request the owner’s number — free |
| Rentivo Tenant Protection Guarantee | If the place isn’t free, you don’t pay |
| Exploitative agent fees | High agent fees (10%+) |
| Seekers / Browse as Seeker | Renters / Browse as renter |
| Rental Budget (N) / N450,000 / N0 | Rental budget (₦) / ₦450,000 / ₦0 |
| DIRECT RENT PRICE (on sale land) | Sale price / Total |
| Email me a magic link | Email me a sign-in link |
| 98 listings verified this month | 8 listings live in Ibadan *(honest)* |
| Waiting Period / Unlocked Contacts / dossiers | Checking / Contact opened |
| Emerald Badge / Green Verified shield (many names) | Physically Verified *(one name + date)* |
| ImageKit Photo Gallery | Photos |
| Confirm C of O & landlord mandate | We check the paper that shows you can lease this place |
| Avg .24 min response | Average reply under 30 minutes *(or drop)* |

**Tone:** Short sentences. Money + period always. One idea per CTA. Not US startup slang; not court English on buttons. **Receipts never lie.**

---

## Scorecard vs research checklist

Scores **1–5** (1 = broken/missing, 3 = acceptable, 5 = marketplace-competitive). Evidence from Phase 1 + Phase 2 + screenshots. Admin remains **N/A — gated**.

### P0 — Trust & money hierarchy

| # | Criterion | Home | Search | Detail | How it works | Access fee | List property | Auth | Legal | Checkout/unlock | Renter acct | Lister hub |
|---|-----------|------|--------|--------|--------------|------------|---------------|------|-------|-----------------|-------------|------------|
| 1 | ₦ price prominence + period | 2 | 4 | 3 | 4 (calc) | 4 | — | — | 3 | 2 (N0 / dual totals) | 3 | 2 (ASCII N) |
| 2 | Verification visibility + meaning | 2 | 3 | 2 | 3 | 3 | 3 | 1 (98 claim) | — | 2 | 2 | 1 (sticker on new acct) |
| 3 | Fee clarity (₦0 vs ₦5k) | 3 | — | 2 | 3 | 4 | 4 | 2 | 3 | **1** (receipt lie) | 1 (Payment Verified) | 1 (Fee Paid) |
| 4 | Lister identity before unlock | — | 2 | 3 | — | — | 4 | — | — | 2 (fake phone) | 2 | — |
| 5 | Safety microcopy near contact/pay | 2 | — | 2 | 3 | 4 | — | — | 3 | 2 | 2 | 2 |

**Notes:** Checkout/receipt is the worst money-honesty failure (`35`, `37`, `47`). Search price row still strongest (`02`). Signup trust metric false (`09`/`18`). Lister hub stamps Verified on day one (`39`).

### P1 — Scan & layout

| # | Criterion | Home | Search | Detail | How | List | Auth | Checkout | Renter acct | Lister |
|---|-----------|------|--------|--------|-----|------|------|----------|-------------|--------|
| 6 | Card density / no multi-CTA clutter | 2 | 4 | 4 | 3 | 4 | — | 2 | 3 | 2 (packed bar) |
| 7 | Hierarchy price→title→loc→specs | 2 | 4 | 4 | — | — | — | 2 | 3 | 3 (table) |
| 8 | Whitespace / not clustered | 2 | 3 | 4 | 3 | 4 | 2 (signup) | 2 | 4 (empty) / 3 | 2 |
| 9 | Mobile thumb / sticky CTA | N/A* | N/A* | N/A* | N/A* | N/A* | N/A* | N/A* | N/A* | N/A* |
| 10 | Grid consistency home↔search↔account | 2 | 4 | — | — | — | — | 2 | 2 (header swap) | 2 |

\*Desktop viewport only; sticky patterns exist — score mobile in a later pass.

### P2 — Findability

| # | Criterion | Score | Evidence |
|---|-----------|-------|----------|
| 11 | Filter IA | 3 | Strong chips/icons; too many type controls; no With photos (`02`) |
| 12 | Sort + result count | 4 | Present; count jargon weak (`02`) |
| 13 | Empty / no-match | 4 | Search empty excellent (`13`); Saved/Requests empty weaker (`23`, `24`) |
| 14 | Search entry matches font/icon vibe | 3 | Search = 5; Home thinner (`01`/`17`); Checkout / Lister diverge |

### P3 — Dual-sided marketplace

| # | Criterion | Score | Evidence |
|---|-----------|-------|----------|
| 15 | Renter vs landlord entry | 3 | Present; three headers; role switch = second signup (`38`) |
| 16 | Lister status UX | 2 | Table OK; fake Verified/seeds/stats (`39`–`50`); inquiries status lies (`47`) |
| 17 | Role-appropriate CTAs | 2 | Landlord signup still renter fee copy (`18`); Checkout on free request; Agent pill on profile (`52`) |

### P4 — Detail & unlock flow

| # | Criterion | Score | Evidence |
|---|-----------|-------|----------|
| 18 | Photo gallery | 2 | Hero + 2 thumbs; prop-8 mismatch (`04`); staging samples on form (`43`) |
| 19 | Specs completeness | 3 | Good on prop-1; thin on land (`03`/`04`); amenities form strong (`42`) |
| 20 | Unlock funnel steps | 2 | Dual steppers; Simulate bar; Paystack step on ₦0 (`28`–`33`) |
| 21 | Checkout summary before Paystack | 2 | Summary exists but dual totals + false paid email (`29`, `32`, `35`) |

### P5 — Polish vs existing vibe

| # | Criterion | Score | Evidence |
|---|-----------|-------|----------|
| 22 | Font consistency | 4 | Plus Jakarta sitewide; Search best |
| 23 | Icon consistency | 3 | Search type row = reference; Lister $ icon / table chrome diverge (`49`) |
| 24 | Motion restraint | 3 | No competing pulses noted |
| 25 | Copy length on cards | 3 | Titles short; dossier/mandate/Emerald leak; receipt copy harmful |

### Admin

| # | Criterion | Score | Evidence |
|---|-----------|-------|----------|
| — | Admin console usability | **N/A** | Gated — `/admin` → generic login (`53`). Not audited. |

---

## Suggested revamp order (search-aligned; checkout elevated)

Ship in this order so the design system (**Search**) spreads and **checkout feels like the marketplace**, not a bank:

| Order | Surface | Why |
|-------|---------|-----|
| 0 | **Global fixes** | White H1s; Netlify clearance; **₦ formatter** (ban ASCII N); one header system; page titles; strip Simulate / placeholder phones / ImageKit from prod |
| 1 | **Checkout / unlock / receipt** | Highest trust moment. Dual steppers → one Ask→Waiting→Contact flow; listing card in rail (Search DNA); **receipt/email/status match ₦0 or ₦5k**; CTA rename on listing. User priority: marketplace feel. |
| 2 | **My Requests + lister inquiries status** | Same honesty bug (“Payment Verified” / “Fee Paid”) — fix with checkout |
| 3 | **Home** | Stop clipping; align hero to Search icons/fonts; honest featured prices/photos |
| 4 | **Signup** (esp. landlord) + role-switch copy | Broken labels, false 98, pre-checked terms; explain second account (`38`) |
| 5 | **Listing detail** | One badge; rent/sale; CTA rename; photos |
| 6 | **How it works** + Access fee | Visible H1 + plain fee story; feed calculator into Home trust strip |
| 7 | **Search polish** | Dedupe filters; budget popover; area deep-link sync (reference stays stable) |
| 8 | **Lister hub + new listing + verification** | Empty start state; no fake Verified/seeds/stats; preview without Verified stamp; one badge name + header explainer; day/month dates |
| 9 | **Admin access denial** | Clear “no admin access” instead of generic `/login` (`53`) — before building admin UI |
| 10 | **Legal copy pass** | mailto, Paystack wrap, jargon soft-edit |

**Voice rule for all revamps:** If List-property wouldn’t say it, don’t put it on a button. **If money didn’t move, don’t say Paystack succeeded.**

---

## Screenshot index (referenced)

### Phase 1 — public (`01`–`18`)

| File | View |
|------|------|
| `01-home-full.png` | Homepage |
| `17-home-looking-for.png` | Hero type menu truncation |
| `02-search-full.png` | Search — **design reference** |
| `13-search-empty.png` | Empty SERP |
| `14-search-location-dropdown.png` | City menu |
| `15-search-budget-popover.png` | Budget clip |
| `16-search-bodija.png` | Area=Bodija |
| `03-listing-prop-1.png` | Self-contain detail |
| `04-listing-prop-8.png` | Land detail |
| `05-login.png` | Login |
| `09-signup.png` | Signup renter |
| `18-signup-lister.png` | Signup landlord |
| `10-forgot-password.png` | Reset |
| `06-how-it-works.png` | Fee explainer |
| `07-list-property.png` | Owner page |
| `08-access-fee-terms.png` | Fee policy |
| `11-terms.png` | Terms |
| `12-privacy.png` | Privacy |

### Phase 2 — signed-in (`20`–`54`; no `19`)

| File | View |
|------|------|
| `20-signup-renter-filled.png` | Renter signup filled |
| `21-search-logged-in.png` | Search after login — reference + header |
| `22-account-menu.png` | Account menu |
| `23-saved-empty.png` | Wishlist empty |
| `24-my-requests-empty.png` | My Requests empty |
| `25-profile-top.png` | Profile (tenant) |
| `26-profile-lister-cta.png` | Go to Lister Portal banner |
| `27-listing-cta-logged-in.png` | Listing CTA when signed in |
| `28-request-stepper-top.png` | Request stepper / STAGE |
| `29-request-form-summary.png` | Form + fee summary |
| `30-vacancy-check.png` | Vacancy wait + Simulate bar |
| `31-vacancy-check-lower.png` | Vacancy lower / ops phone |
| `32-checkout-waiver-top.png` | Launch waiver top |
| `33-checkout-waiver-cta.png` | Claim Launch Waiver ₦0 |
| `34-unlock-success-top.png` | Unlock success |
| `35-email-preview.png` | Email falsely claims Paystack ₦5k |
| `36-unlock-contact-card.png` | Contact card / dossier |
| `37-my-requests-unlocked.png` | Requests list after unlock |
| `38-lister-signup-redirect.png` | Tenant → lister signup wall |
| `39-lister-dashboard-guide.png` | Lister hub + setup guide |
| `40-lister-properties-table.png` | Properties table (seeds + N prices) |
| `41-lister-account-menu.png` | Lister account menu |
| `42-list-form-location-price.png` | New listing location/price + preview |
| `43-list-form-photos.png` | Photos / ImageKit / staging |
| `44-list-form-availability.png` | Availability / completeness |
| `45-verification-hero.png` | Verification hero |
| `46-verification-form.png` | Book visit form |
| `47-lister-inquiries.png` | Inquiries “Fee Paid” |
| `48-inquiry-drawer.png` | Inquiry drawer |
| `49-lister-stats-top.png` | Stats KPIs |
| `50-lister-stats-table.png` | Stats table |
| `51-verification-explainer.png` | In-dashboard badge explainer |
| `52-lister-profile.png` | Profile as Agent |
| `53-admin-login-wall.png` | Admin → generic login (**gap**) |
| `54-dashboard-is-home.png` | `/dashboard` → marketing home |

---

## Appendix A — Audit accounts (credentials note)

Used for Phase 2 signed-in pass. Passwords omitted from this document.

| Role | Email | Notes |
|------|-------|-------|
| Renter | `rentivos.audit.ui+1@example.com` | Name Audit Renter; phone `08012345678`. Session later replaced by lister login. |
| Lister (left active in audit browser) | `rentivos.audit.ui+lister@example.com` | Name Audit Lister; phone `08087654321`; agency “Audit Properties”. |

Sample request created as renter: `/requests/req-9aca3237-daf1-4f63-9e2f-a88fea9c19f9` (prop-1). Unlock completed via **Simulate Available** + **Claim Launch Waiver (₦0)** — not a real Paystack charge.

**Admin:** No admin credentials used; routes not accessible to these accounts.

---

*End of merged Phase 1 + Phase 2 UI audit. Public + audited signed-in flows complete. Admin explicitly gated/not invented.*
