# Validation report 2: 200 new synthetic adult patients

Acute Encephalopathy app · version 1.0 (`ae-v64` rules) · 20 November 2026

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

1. **Patients.** `tests/validation-200/build_cases.py` creates 200 made-up adults (age 18–99, 104 F / 96 M) from a fixed seed, so the set is identical on every run.
2. **Independent reference.** The same file holds a new implementation of the rules: the six rules checked top to bottom, the unsure-baseline adjustment, the motor subtype, and the Diagnosis wording (one brain or substance diagnosis *presenting with*, one encephalopathy *manifesting as*, two or more *Multifactorial* with brain A–Z, then encephalopathy A–Z, then substance A–Z).
3. **Comparison.** `tests/validation200.test.js` runs the app's own rules (`logic.js`) on each patient and compares six fields, the Diagnosis word for word.
4. **Test strength.** 17 deliberate errors were planted, one at a time, in copies of the rules, to confirm the test fails when the rules are wrong.

## Case mix

| Baseline answer | Patients |
|---|---|
| Yes, new or worse | 129 |
| Not sure yet | 46 |
| No, this is their baseline | 25 |

| RASS | +4 | +3 | +2 | +1 | 0 | −1 | −2 | −3 | −4 | −5 |
|---|---|---|---|---|---|---|---|---|---|---|
| Patients | 17 | 11 | 22 | 11 | 37 | 34 | 29 | 18 | 8 | 13 |

| Etiologies per patient | 0 | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|---|
| Patients | 33 (11 with "Not yet known") | 65 | 42 | 33 | 14 | 13 |

Coverage of the rules:
- **Likelihood:** High 77, Moderate 86, Low 37.
- **Presentations:** all seven (Delirium 72, Subsyndromal 66, Unlikely 25, Possible delirium on dementia 16, Coma 10, Stupor/coma 8, No features 3).
- **Motor subtype:** hypoactive 69, hyperactive 54, mixed or undetermined 31, none 46.
- **Diagnosis forms:** multifactorial 83, single brain or substance diagnosis 39, not supported 37, etiology not yet identified 28, single encephalopathy 13.
- **Multifactorial mixes:** brain + encephalopathy + substance 22, brain + substance 20, brain + encephalopathy 18, encephalopathy + substance 12, two or more from one section only 11; 14 different headings.
- **Every step 5 chip** is used (12 to 28 patients each), including the new ICH (17), SAH (12), TBI (19) and SDH (19).
- **Toxic with a substance diagnosis** (now always multifactorial): 9 patients.
- **Other inputs:** CAM-ICU 103, any red flag 94, known dementia 35 (all 35 Diagnoses name it), unsure-baseline downgrade 22.

## Planted-error check

| Planted error | Patients flagged |
|---|---|
| Hypo/hyper subtype swapped | 123 |
| Red-flag actions lost | 94 |
| "[specify etiology]" dropped | 86 |
| CAM no longer requires inattention | 56 |
| Substance listed before encephalopathy | 34 |
| Multifactorial needs 3+ diagnoses | 32 |
| CAM ignores altered consciousness | 30 |
| "No cause" wording reverts to acute encephalopathy | 28 |
| No A–Z sorting inside groups | 23 |
| Fluctuation no longer rescues unsure baseline | 22 |
| Unsure-baseline rule removed | 22 |
| Dementia rule removed | 16 |
| Single substance written as "manifesting as" | 14 |
| Coma cut-off moved to RASS −3 | 11 |
| Toxic dropped when a substance is picked | 9 |
| RASS −4 called coma | 8 |
| Septic named twice (no de-duplication) | 0* |

\*No two Encephalopathy chips share a name, so this safeguard cannot change any result. It is not a gap in the test.

The four errors aimed at the newer Diagnosis rules (group order, A–Z sorting, Toxic with a substance, "presenting with") are also caught by the 400-patient set (32, 37, 7 and 25 patients).

## How to re-run

```
npm test                      # rule tests, the 400-patient set and this 200-patient set
npm run build-validation      # rebuilds both cases.json files from their references (only after an intended rule change)
```

If a rule is changed on purpose, update both references (`tests/validation/build_cases.py` and `tests/validation-200/build_cases.py`) first, rebuild, then make the app pass.
