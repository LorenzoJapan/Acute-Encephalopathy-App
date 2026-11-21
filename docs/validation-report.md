# Validation report: 400 synthetic adult patients

Acute Encephalopathy app · version 1.0 (`ae-v44` rules) · 20 November 2026

## Summary

| Check | Result |
|---|---|
| Patients whose likelihood, presentation, Diagnosis text and diagnostic next steps all matched the independent reference | **400 / 400 (100%)** |
| Deliberately planted rule errors caught by this test | **12 / 12** that can change an output (a 13th planted error had no effect on any patient: see below) |
| Full test suite (`npm test`) | 494 / 494 checks pass (93 rule tests + 401 validation checks) |

This confirms the app **applies its stated rules correctly and consistently**. It does **not** show clinical accuracy against real patients or a reference standard. That needs a clinical study.

## Method

1. **Patients.** `tests/validation/build_cases.py` creates 400 made-up adults (age 18–96, 209 F / 191 M) from a fixed random seed (20261119), so the set is identical on every run. Each patient gets a clinical state, CAM or CAM-ICU, a random red-flag pattern, and **zero, one or several etiologies** (sometimes "Not yet known").
2. **Independent reference.** The same file contains a second implementation of the rules, written in Python from the written rules (README "The rules" and "How the chart sentence is worded"), not copied from the app's code. It records the expected result for every patient in `tests/validation/cases.json`.
3. **Comparison.** `tests/validation.test.js` runs the app's own rules (`logic.js`) on each patient and compares five fields: likelihood level, likelihood label, presentation, the Diagnosis text (word for word, including numbering and line breaks), and the diagnostic next steps.
4. **Test strength.** 13 deliberate errors were planted, one at a time, in copies of the rules, to confirm the test fails when the rules are wrong.

## Case mix

| Clinical state | Patients |
|---|---|
| Hypoactive delirium | 68 |
| Subsyndromal | 63 |
| Unsure baseline | 58 |
| Hyperactive delirium | 54 |
| Delirium with dementia | 38 |
| Stupor/coma (RASS −4) | 30 |
| Baseline, not acute | 29 |
| No features | 27 |
| Coma (RASS −5) | 21 |
| Mixed delirium (RASS 0) | 12 |

| Etiologies per patient | 0 | 1 | 2 | 3 | 4 |
|---|---|---|---|---|---|
| Patients | 115 (35 with "Not yet known") | 116 | 90 | 50 | 29 |

Coverage of the rules:
- **Likelihood:** High 183, Moderate 149, Low 68.
- **Presentations:** all seven (Delirium, Subsyndromal, Possible delirium on dementia, Stupor/coma, Coma, No features, Unlikely).
- **Diagnosis forms:** multifactorial 136, etiology not yet identified 97, not supported 68, single brain or substance diagnosis 65, single encephalopathy 34.
- **All 8 multifactorial headings**, including stupor/coma and coma.
- **Every step 5 chip** is used at least once.
- **Special rules:** unsure-baseline downgrade 28.
- **Other inputs:** CAM-ICU 134 patients, any red flag 178, dementia switch 75.

## Planted-error check

| Planted error | Patients flagged |
|---|---|
| Hypo/hyper subtype swapped | 211 |
| Red-flag actions lost | 178 |
| "[specify etiology]" dropped | 158 |
| "No cause" wording reverts to acute encephalopathy | 97 |
| CAM no longer requires inattention | 77 |
| Multifactorial needs 3+ diagnoses | 68 |
| CAM ignores altered consciousness | 65 |
| Dementia rule removed | 57 |
| RASS −4 called coma | 40 |
| Coma cut-off moved to RASS −3 | 32 |
| Fluctuation no longer rescues unsure baseline | 30 |
| Unsure-baseline rule removed | 28 |
| Septic named twice (no de-duplication) | 0* |

\*No two Encephalopathy chips now share a name, so this safeguard cannot change any result. It is not a gap in the test.

## Observations for clinical review

These are not errors; the app follows its rules. They are wording choices worth a second look:

1. **Known dementia is now always named** (*superimposed on dementia* / *with underlying dementia*); all 75 dementia patients in the set mention it and no other patient does. When the headline is *Possible delirium on top of dementia*, the Diagnosis now also says *possible* (all 56 such patients; no others).
2. **An unsure baseline lowers the likelihood but not the Diagnosis wording.** The headline can be Moderate while the Diagnosis states "delirium" without qualification.

## How to re-run

```
npm test                      # runs the 93 rule tests and the 400-patient validation
npm run build-validation      # rebuilds cases.json from the reference (only after an intended rule change)
```

If a rule is changed on purpose, update the reference in `build_cases.py` first, rebuild `cases.json`, then make the app pass.
