# Acute Encephalopathy App

An iPhone-friendly web app that walks a clinician through five bedside questions and returns:

- a **likelihood** (low, moderate or high) of acute encephalopathy,
- the **presentation** (coma, delirium with motor subtype, subsyndromal delirium, or unlikely),
- **red-flag actions** (imaging, EEG, lumbar puncture),
- **diagnostic next steps** (no treatment or management advice; the app is diagnostic only), and
- a **copy-ready chart sentence**: *"Acute encephalopathy due to [cause], manifesting as [presentation]."*

It is based on Slooter et al., *Updated nomenclature of delirium and acute encephalopathy*, Intensive Care Med 2020;46:1020–1022, together with the Confusion Assessment Method (CAM; Inouye 1990), the CAM-ICU (Ely 2001) and the RASS scale.

> **Decision support only.** It does not replace clinical judgement or performing the CAM / CAM-ICU at the bedside. The likelihood is criteria-based, not a validated probability. The app has not yet been validated in patients.

## The five steps

| Step | Question | Shortcut |
|---|---|---|
| 1 Baseline | Is this a new change? (yes / not sure / no), and **Known dementia? (No / Yes)** | "No" goes straight to the result |
| 2 Arousal | RASS level, +4 to −5 | RASS −4 or −5 = coma, which skips step 3 |
| 3 Features | **CAM by default**, or tap **Run CAM-ICU**: fluctuating course, inattention, disorganized thinking. Altered consciousness is filled in from the RASS. | Switching tools clears this step's answers |
| 4 Red flags | Focal signs, seizures, fever with stiff neck, fall on blood thinners | |
| 5 Cause | *What is driving it? (choose all that apply)*; hover or tap a chip lists the underlying causes. **Primary brain related:** CNS infection, ischemic stroke, CNS bleed (ICH or SAH), seizure/postictal/NCSE, brain tumor or mass, head injury or subdural. **Substance abuse/medication related:** alcohol intoxication, drug intoxication, alcohol withdrawal, drug withdrawal, toxidromes. **Encephalopathy related:** Septic, Toxic, Metabolic, Nutritional, Vascular/hemodynamic, Autoimmune/inflammatory. Exactly one brain or substance diagnosis is named on its own; any second diagnosis from any section (Toxic included) gives *Multifactorial …*. Or "not yet known". | |

## The rules

The rules are checked from top to bottom, and the first match decides the result:

1. Not a new change → **Low**, "Acute encephalopathy unlikely"
2. RASS −4 or −5 → **High**, "Stupor/coma" (RASS −4) or "Coma" (RASS −5)
3. CAM / CAM-ICU positive, no dementia doubt → **High**, "Delirium"
4. CAM / CAM-ICU positive with known dementia → **Moderate**, "Possible delirium on top of dementia"
5. Any CAM feature present but the algorithm not met → **Moderate**, "Subsyndromal delirium"
6. None → **Low**, "No delirium features"

**CAM / CAM-ICU positive** means Feature 1 (an acute change or fluctuating course) **and** Feature 2 (inattention) **and** either disorganized thinking or altered consciousness. Both tools use this algorithm. They differ in how inattention and thinking are tested, and in numbering: in the CAM, disorganized thinking is Feature 3 and altered consciousness is Feature 4; in the CAM-ICU these are swapped. Altered consciousness means any RASS other than 0.

Then two adjustments are applied:
- "Not sure" about the baseline lowers the likelihood by one level, unless a fluctuating course confirms Feature 1.
- The motor subtype comes from RASS: above 0 is hyperactive, below 0 is hypoactive, 0 is mixed or undetermined.

### How the chart sentence is worded

A primary brain or substance diagnosis is named as the diagnosis itself, with delirium or coma as how it presents. It is not called "acute encephalopathy".

| Causes picked | Chart sentence |
|---|---|
| One systemic category | *Metabolic encephalopathy due to [specify etiology], manifesting as hypoactive delirium.* (the six categories add *due to [specify etiology]*) |
| Septic (sepsis, including infection without organ dysfunction) | *Septic encephalopathy due to [specify etiology], manifesting as hypoactive delirium.* |
| One brain or substance diagnosis | *Acute ischemic stroke, presenting with hypoactive delirium.* |
| Drug intoxication or Toxidromes | *Drug intoxication due to [specify drug], presenting with hypoactive delirium.* · *Toxidrome: [specify toxidrome], presenting with hyperactive delirium.* |
| Two or more diagnoses (any mix) | *Multifactorial hypoactive delirium:* then a numbered list: primary brain diagnoses first, then encephalopathies, then substance/medication, each group A–Z: *1. Acute ischemic stroke · 2. Metabolic encephalopathy due to [specify etiology] · 3. Septic encephalopathy due to [specify etiology] · 4. Alcohol withdrawal*. With RASS −4 it reads *Multifactorial stupor/coma:*, with RASS −5 *Multifactorial coma:*. |
| Known dementia (any of the above) | The presentation adds *superimposed on dementia* (stupor/coma: *with underlying dementia*), e.g. *Acute ischemic stroke, presenting with possible hypoactive delirium superimposed on dementia.* ("possible" whenever the headline is *Possible delirium on top of dementia*) At baseline: *Dementia at baseline; acute encephalopathy not supported at this time.* New change but not supported: *…not supported at this time; known dementia.* |
| No cause, or "Not yet known" | *Hypoactive delirium, etiology not yet identified.* ("Acute encephalopathy" is only written once an underlying etiology is named.) |

Note: the 2020 consensus defines acute encephalopathy broadly. It covers any rapidly developing brain process, and DSM-5 includes intoxication and withdrawal as causes of delirium. This app follows the more specific clinical and coding convention: when a primary diagnosis explains the picture, name that diagnosis.

All of the rules live in **`logic.js`**. The coma cut-off is one setting near the top of that file (`COMA_CUTOFF = -4`).

## What's in this folder

| File | What it is |
|---|---|
| `index.html` | The page that opens the app |
| `logic.js` | The clinical rules (the file to review) |
| `app.js` | The screens and buttons |
| `styles.css` | Colors, fonts, sizes and the design tokens |
| `sw.js` | Lets the app open with no signal after the first visit |
| `manifest.webmanifest`, `icon*.png`, `icon.svg` | Home-screen name and icons |
| `tests/logic.test.js` | 93 made-up test patients with the expected answers |
| `tests/validation.test.js`, `tests/validation/` | Independent 400-patient validation (reference rules, cases, comparison) |
| `docs/validation-report.md` | Validation results |
| `tests/validation200.test.js`, `tests/validation-200/` | Second independent 200-patient validation (new reference, new cases) |
| `docs/validation-200-report.md` | Second validation results |
| `docs/implementation-plan.html` | Plain-language plan, mockups and answer flow |
| `docs/understanding-checklist.md` | Learning checklist |

## Put it online with GitHub Pages (free)

1. Upload all the files to your repository, keeping the folders as they are.
2. In the repository, go to **Settings → Pages**.
3. Under "Branch", choose **main** and **/ (root)**, then press **Save**.
4. After a minute or two, the app is live at `https://<your-username>.github.io/<repo-name>/`.
5. On iPhone, open that link in Safari, tap **Share → Add to Home Screen**.

When you change any file later, increase the version in `sw.js` (`ae-v1` → `ae-v2`) so phones pick up the new copy.

## Run the test patients

This needs [Node.js](https://nodejs.org) 18 or newer, with nothing else to install:

```
npm test
```

It runs three suites:
- `tests/logic.test.js`: 93 hand-written test patients, one per rule and tricky case.
- `tests/validation.test.js`: an **independent 400-patient validation**. Made-up adults with a random mix of clinical states and zero, one or several etiologies; expected results come from a separate Python reference (`tests/validation/build_cases.py`). Results are in `docs/validation-report.md`.

- `tests/validation200.test.js`: a **second independent validation** of 200 new adults, each input drawn on its own; expected results come from a second Python reference written again from the rules (`tests/validation-200/build_cases.py`). Results are in `docs/validation-200-report.md`.

Every check should say `ok`. When you change a rule on purpose, update both references, run `npm run build-validation`, then make the app pass.

## Display settings

Tap **Aa** (top right on every screen) for **Appearance: Light / Dark** and **Text size: Standard / Large**. The first launch follows the phone's Light/Dark setting. These two choices are remembered on this device only; no answers are ever stored.

## Design tokens

All colours, type sizes, radii and motion come from these CSS variables in `styles.css`. Dark mode overrides the colours; Large text multiplies every type size by 1.15 through `--ae-ts`.

```css
:root {
  color-scheme: light;

  /* Colour: light */
  --ae-ground: #F3F6F5;          /* app background */
  --ae-surface: #FFFFFF;         /* cards, sheets */
  --ae-ink: #1C2321;             /* primary text      16.01:1 on surface */
  --ae-ink-2: #4A5754;           /* secondary text     7.55:1 on surface */
  --ae-ink-3: #5E6B68;           /* muted text         5.56:1 on surface */
  --ae-line: #D6E2DF;            /* hairlines, borders */
  --ae-line-strong: #B9CCC8;     /* empty tick rings, grabber */
  --ae-accent: #1F6B64;          /* teal text, icons, links, focus   5.77:1 on ground */
  --ae-accent-strong: #174F4A;   /* "Present" ticks, step numbers    8.04:1 on tint */
  --ae-accent-fill: #1F6B64;     /* primary button, selected chips   white text 6.28:1 */
  --ae-accent-fill-pressed: #174F4A;
  --ae-on-accent: #FFFFFF;
  --ae-tint: #E4F1EE;            /* teal tint: step numbers, icon tile, low badge */
  --ae-tint-2: #F1F8F6;          /* selected answer row */
  --ae-high-fg: #8F3A16;         /* high likelihood, red flags  6.60:1 on high-bg */
  --ae-high-bg: #FCEDE4;
  --ae-mod-fg: #7A5300;          /* moderate, caution           6.10:1 on mod-bg */
  --ae-mod-bg: #FBF1D9;
  --ae-meter-low: #1F6B64;
  --ae-meter-mod: #B07A00;
  --ae-meter-high: #C2551F;
  --ae-seg-track: #E3E9E7;       /* segmented control */
  --ae-seg-thumb: #FFFFFF;
  --ae-disabled-bg: #C9D6D3;     /* disabled button   5.05:1 */
  --ae-disabled-fg: #4A5754;
  --ae-tip-bg: #FFFFFF;          /* explanation bubble: white with dark text, both themes */
  --ae-tip-fg: #1C2321;          /* 16.01:1 on tip-bg */
  --ae-tip-line: #D6E2DF;
  --ae-nav-bg: rgba(243, 246, 245, .92);
  --ae-scrim: rgba(28, 35, 33, .32);
  --ae-elev-1: 0 1px 2px rgba(28, 35, 33, .06);
  --ae-elev-2: 0 6px 18px rgba(28, 35, 33, .08);
  --ae-elev-sheet: 0 -8px 28px rgba(28, 35, 33, .14);

  /* Type: SF Pro (system), sizes scale with --ae-ts */
  --ae-font: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Helvetica, sans-serif;
  --ae-ts: 1;
  --ae-fs-largetitle: calc(34px * var(--ae-ts));
  --ae-fs-title2: calc(28px * var(--ae-ts));
  --ae-fs-title3: calc(24px * var(--ae-ts));
  --ae-fs-body: calc(17px * var(--ae-ts));
  --ae-fs-callout: calc(15px * var(--ae-ts));
  --ae-fs-sub: calc(14px * var(--ae-ts));
  --ae-fs-footnote: calc(13px * var(--ae-ts));
  --ae-fs-caption: calc(12px * var(--ae-ts));

  /* Shape, motion */
  --ae-r-card: 16px;
  --ae-r-control: 12px;
  --ae-r-button: 14px;
  --ae-r-sheet: 20px;
  --ae-r-pill: 999px;
  --ae-touch: 44px;              /* Apple HIG minimum target */
  --ae-safe-top: env(safe-area-inset-top, 0px);       /* status bar / Dynamic Island */
  --ae-safe-bottom: env(safe-area-inset-bottom, 0px); /* home indicator */
  --ae-desk: #DCE4E1;            /* page behind the iPhone frame on a computer */
  --ae-ease: cubic-bezier(.2, .8, .2, 1);
  --ae-dur: 220ms;
}

html[data-theme="dark"] {
  color-scheme: dark;
  --ae-ground: #0E1413;
  --ae-surface: #172120;
  --ae-ink: #E8EFED;             /* 14.12:1 on surface */
  --ae-ink-2: #AFC0BC;           /*  8.70:1 on surface */
  --ae-ink-3: #98AAA6;           /*  6.77:1 on surface */
  --ae-line: #2C3A38;
  --ae-line-strong: #46585A;
  --ae-accent: #6CC4B9;          /*  9.07:1 on ground */
  --ae-accent-strong: #93D9CF;   /*  7.71:1 on tint */
  --ae-accent-fill: #1D6F67;     /*  white text 5.96:1 */
  --ae-accent-fill-pressed: #175A54;
  --ae-on-accent: #FFFFFF;
  --ae-tint: #173A36;
  --ae-tint-2: #12302C;
  --ae-high-fg: #F4A882;         /*  7.64:1 on high-bg */
  --ae-high-bg: #3A2117;
  --ae-mod-fg: #EAC56A;          /*  8.67:1 on mod-bg */
  --ae-mod-bg: #33290F;
  --ae-meter-low: #6CC4B9;
  --ae-meter-mod: #D9A520;
  --ae-meter-high: #E07A4A;
  --ae-seg-track: #22302E;
  --ae-seg-thumb: #2E3E3B;
  --ae-disabled-bg: #2A3634;
  --ae-disabled-fg: #AFC0BC;
  --ae-tip-bg: #FFFFFF;
  --ae-tip-fg: #1C2321;
  --ae-tip-line: #D6E2DF;
  --ae-nav-bg: rgba(14, 20, 19, .9);
  --ae-scrim: rgba(0, 0, 0, .55);
  --ae-elev-1: 0 1px 2px rgba(0, 0, 0, .4);
  --ae-elev-2: 0 6px 18px rgba(0, 0, 0, .45);
  --ae-elev-sheet: 0 -8px 28px rgba(0, 0, 0, .5);
  --ae-desk: #050807;
}

html[data-text="large"] { --ae-ts: 1.15; }
```

### Contrast (WCAG AA)

| Pairing | Light | Dark |
|---|---|---|
| Body text on cards | 16.01:1 | 14.12:1 |
| Secondary text on cards | 7.55:1 | 8.70:1 |
| Muted text on cards | 5.56:1 | 6.77:1 |
| Teal links / back button on background | 5.77:1 | 9.07:1 |
| White text on primary button / selected chip | 6.28:1 | 5.96:1 |
| Step numbers on teal tint | 8.04:1 | 7.71:1 |
| High likelihood / red-flag text | 6.60:1 | 7.64:1 |
| Moderate / caution text | 6.10:1 | 8.67:1 |
| Explanation bubble (white, both themes) | 16.01:1 | 16.01:1 |
| Disabled button | 5.05:1 | 6.62:1 |
| Meter bars (non-text, needs 3:1) | 3.73–6.28:1 | 5.53–8.03:1 |

### Layout

Built for iPhone 13 Pro Max (428 × 926 pt) and larger. On a phone the app fills the screen. On a computer (mouse or trackpad, or any window 700 pt or wider) it is shown inside an iPhone 13 Pro Max device shell, the same one as the Acute MI Defined app: a 428 × 926 screen in a black bezel with the Dynamic Island, side buttons and home bar, and the real top (47 pt) and bottom (34 pt) safe areas. The whole phone scales down if the window is shorter. Phones and tablets get the edge-to-edge layout. Installed to the home screen, every assessment screen fits without scrolling in Standard text; About scrolls (references) and a few screens scroll slightly in Large text. Every control is at least 44 × 44 pt.

## Definition screen

Tap **Acute encephalopathy definition** on the home screen for the definition (a rapidly developing pathobiological brain process expressed as subsyndromal delirium, delirium, stupor or coma) and five diagnostic criteria.

## About screen

Tap **About** on the home screen for what the app covers, its clinical-education disclaimer, guideline copyright (© MDGadgetz, LLC), privacy, references (Slooter 2020, Inouye 1990 CAM, Ely 2001 CAM-ICU, Sessler 2002 RASS) and version (1.0, November 2026, MDGadgetz LLC).

## Privacy

There are no accounts, no storage and no network calls. Answers stay on the phone and are cleared when you start a new assessment.

## Design

- Muted teal for actions, warm clay and amber only for likelihood and warnings, and charcoal text.
- Every text color passes WCAG AA (4.5:1). The ratios are noted in `styles.css`.
- Touch targets are at least 44 pt. The main button sits in the thumb zone.
- Gentle transitions, all turned off when iOS Reduce Motion is on.
- Built for iPhone 13 Pro Max (428 × 926) and larger, and adapts to smaller screens.
