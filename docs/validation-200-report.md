# Validation report 2: 200 new synthetic adult patients

Acute Encephalopathy app · version 1.0 (`ae-v48` rules) · 20 November 2026

## Summary

| Check | Result |
|---|---|
| Patients whose likelihood level, likelihood label, presentation, motor subtype, Diagnosis text and diagnostic next steps all matched the independent reference | **200 / 200 (100%)**, on the first run |
| Deliberately planted rule errors caught by this test | **16 / 16** that can change an output (a 17th planted error had no effect on any patient: see below) |
| Full test suite (`npm test`) | 695 / 695 checks pass (93 rule tests + 401 checks for the 400-patient set + 201 for this set) |

This confirms, a second time and on different patients, that the app **applies its stated rules correctly and consistently**. It does **not** show clinical accuracy against real patients or a reference standard. That needs a clinical study.

## How this set differs from the 400-patient set

| | 400-patient set (`tests/validation/`) | This set (`tests/validation-200/`) |
|---|---|---|
| Seed | 20261119 | 20261120 |
| How patients are drawn | From 10 clinical states (e.g. "hypoactive delirium") | Every input drawn on its own (baseline, RASS, each feature, dementia, tool, each red flag, 0–5 causes), so unusual combinations turn up |
| Reference | Python, written from the README rules | Python, **written again** from the README rules; no code reused from `logic.js` or the first reference |
| Fields compared | 5 | 6 (adds the motor subtype) |

## Method

1. **Patients.** `tests/validation-200/build_cases.py` creates 200 made-up adults (age 18–99, 101 F / 99 M) from a fixed seed, so the set is identical on every run.
2. **Independent reference.** The same file holds a new implementation of the rules: the six rules checked top to bottom, the unsure-baseline adjustment, the motor subtype, and the Diagnosis wording (one brain or substance diagnosis *presenting with*, one encephalopathy *manifesting as*, two or more *Multifactorial* with brain A–Z, then encephalopathy A–Z, then substance A–Z).
3. **Comparison.** `tests/validation200.test.js` runs the app's own rules (`logic.js`) on each patient and compares six fields, the Diagnosis word for word.
4. **Test strength.** 17 deliberate errors were planted, one at a time, in copies of the rules, to confirm the test fails when the rules are wrong.

## Case mix

| Baseline answer | Patients |
|---|---|
| Yes, new or worse | 137 |
| Not sure yet | 33 |
| No, this is their baseline | 30 |

| RASS | +4 | +3 | +2 | +1 | 0 | −1 | −2 | −3 | −4 | −5 |
|---|---|---|---|---|---|---|---|---|---|---|
| Patients | 17 | 18 | 24 | 9 | 37 | 28 | 29 | 17 | 11 | 10 |

| Etiologies per patient | 0 | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|---|
| Patients | 43 (16 with "Not yet known") | 60 | 46 | 32 | 9 | 10 |

Coverage of the rules:
- **Likelihood:** High 72, Moderate 87, Low 41.
- **Presentations:** all seven (Delirium 64, Subsyndromal 63, Unlikely 30, Possible delirium on dementia 19, Coma 10, Stupor/coma 9, No features 5).
- **Motor subtype:** hypoactive 60, hyperactive 57, mixed or undetermined 29, none 54.
- **Diagnosis forms:** multifactorial 78, not supported 41, etiology not yet identified 33, single brain or substance diagnosis 32, single encephalopathy 16.
- **Multifactorial mixes:** brain + encephalopathy + substance 20, encephalopathy + substance 17, brain + encephalopathy 15, brain + substance 12, two or more from one section only 14; 16 different headings.
- **Every step 5 chip** is used (14 to 34 patients each), including the new CNS bleed (18).
- **Toxic with a substance diagnosis** (now always multifactorial): 8 patients.
- **Other inputs:** CAM-ICU 102, any red flag 97, known dementia 50 (all 50 Diagnoses name it), unsure-baseline downgrade 17.

## Planted-error check

| Planted error | Patients flagged |
|---|---|
| Hypo/hyper subtype swapped | 117 |
| Red-flag actions lost | 97 |
| "[specify etiology]" dropped | 90 |
| CAM no longer requires inattention | 57 |
| Substance listed before encephalopathy | 37 |
| Multifactorial needs 3+ diagnoses | 36 |
| "No cause" wording reverts to acute encephalopathy | 33 |
| CAM ignores altered consciousness | 32 |
| No A–Z sorting inside groups | 23 |
| Dementia rule removed | 19 |
| Single substance written as "manifesting as" | 17 |
| Unsure-baseline rule removed | 17 |
| Fluctuation no longer rescues unsure baseline | 14 |
| Coma cut-off moved to RASS −3 | 10 |
| RASS −4 called coma | 9 |
| Toxic dropped when a substance is picked | 8 |
| Septic named twice (no de-duplication) | 0* |

\*No two Encephalopathy chips share a name, so this safeguard cannot change any result. It is not a gap in the test.

The four errors aimed at the newer Diagnosis rules (group order, A–Z sorting, Toxic with a substance, "presenting with") are also caught by the 400-patient set (48, 33, 8 and 30 patients).

## How to re-run

```
npm test                      # rule tests, the 400-patient set and this 200-patient set
npm run build-validation      # rebuilds both cases.json files from their references (only after an intended rule change)
```

If a rule is changed on purpose, update both references (`tests/validation/build_cases.py` and `tests/validation-200/build_cases.py`) first, rebuild, then make the app pass.
