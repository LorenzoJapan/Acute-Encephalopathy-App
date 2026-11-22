"""
Second independent validation set for the Acute Encephalopathy app: 200 new adult patients.

Separate from tests/validation/ (the 400-patient set): a different seed, a different way of drawing
patients (every input drawn on its own, so unusual combinations turn up), and a reference written
again from the README's written rules ("The rules" and "How the chart sentence is worded"). It does
not reuse code from logic.js or from tests/validation/build_cases.py.

Run:   python3 tests/validation-200/build_cases.py     (rewrites tests/validation-200/cases.json)
Check: npm test
"""
import json, os, random

SEED = 20261120
N = 200

# ---- Step 5 causes, by section, with the wording each writes in the Diagnosis -----------
BRAIN = {           # Primary brain related: named in its own right
    'cns': 'Primary CNS infection (meningitis or encephalitis)',
    'stroke': 'Acute ischemic stroke',
    'ich':    'Intracerebral hemorrhage (ICH)',
    'sah':    'Subarachnoid hemorrhage (SAH)',
    'sz': 'Seizure (postictal state or non-convulsive status)',
    'tumor': 'Brain tumor or mass',
    'tbi':    'Traumatic brain injury (TBI)',
    'sdh':    'Subdural hematoma (SDH)',
}
SUBSTANCE = {       # Substance abuse/medication related: named in its own right
    'etohx': 'Alcohol intoxication',
    'drugx': 'Drug intoxication/overdose due to [specify drug]',
    'etohwd': 'Alcohol withdrawal',
    'drugwd': 'Drug withdrawal',
    'toxidrome': 'Toxidrome: [specify toxidrome]',
}
ENCEPH = {          # Encephalopathy related: "<Name> encephalopathy due to [specify etiology]"
    'septic': 'Septic', 'toxic': 'Toxic', 'metabolic': 'Metabolic', 'nutritional': 'Nutritional',
    'vascular': 'Vascular', 'autoimmune': 'Autoimmune',
}
ALL_CAUSES = sorted(list(BRAIN) + list(SUBSTANCE) + list(ENCEPH))

RED_FLAGS = [       # (id, what the next-step line says), in screen order
    ('focal', 'Focal or one-sided signs: urgent CT or MRI.'),
    ('seiz', 'Seizure, twitching or myoclonus: EEG for non-convulsive status.'),
    ('mening', 'Fever with neck stiffness: lumbar puncture.'),
    ('fall', 'Fall or head injury on blood thinners: urgent head CT.'),
]
LABELS = {0: 'Low likelihood', 1: 'Moderate likelihood', 2: 'High likelihood'}


def a_to_z(items):
    return sorted(items, key=lambda t: t.lower())


def upper_first(t):
    return t[:1].upper() + t[1:]


def reference(p):
    """What the app should show for patient p, worked out from the written rules."""
    acute, rass, feats, dementia = p['acute'], p['rass'], set(p['feats']), p['dem']
    coma = rass in (-4, -5)                       # coma cut-off: RASS -4 or -5
    altered = rass != 0 and not coma              # altered consciousness = any RASS other than 0
    feature1 = acute in ('yes', 'unsure') or 'fluct' in feats
    cam_pos = feature1 and 'inatt' in feats and ('disorg' in feats or altered)
    any_feature = bool(feats & {'fluct', 'inatt', 'disorg'}) or altered

    # The rules, top to bottom; the first match decides.
    if acute == 'no':
        level, headline = 0, 'Acute encephalopathy unlikely'
    elif coma:
        level, headline = 2, 'Coma' if rass == -5 else 'Stupor/coma'
    elif cam_pos and not dementia:
        level, headline = 2, 'Delirium'
    elif cam_pos:
        level, headline = 1, 'Possible delirium on top of dementia'
    elif any_feature:
        level, headline = 1, 'Subsyndromal delirium'
    else:
        level, headline = 0, 'No delirium features'
    # "Not sure" about the baseline lowers the likelihood one level, unless a fluctuating course confirms Feature 1.
    if acute == 'unsure' and 'fluct' not in feats and level > 0:
        level -= 1

    # Motor subtype from RASS (not for coma, a baseline answer, or no features).
    subtype = ''
    if acute != 'no' and not coma and any_feature:
        subtype = 'hyperactive' if rass > 0 else 'hypoactive' if rass < 0 else 'mixed or undetermined'

    # How the presentation is written in the Diagnosis.
    if coma:
        shown = 'coma' if rass == -5 else 'stupor/coma'
    else:
        shown = 'subsyndromal delirium' if headline == 'Subsyndromal delirium' else 'delirium'
        if subtype in ('hyperactive', 'hypoactive'):
            shown = subtype + ' ' + shown
        if headline == 'Possible delirium on top of dementia':
            shown = 'possible ' + shown
    if dementia and acute != 'no':
        shown += ' with underlying dementia' if coma else ' superimposed on dementia'

    picked = [k for k in p['causes'] if k != 'unk']
    brain = a_to_z(BRAIN[k] for k in picked if k in BRAIN)
    enceph = a_to_z(ENCEPH[k] + ' encephalopathy due to [specify etiology]' for k in picked if k in ENCEPH)
    substance = a_to_z(SUBSTANCE[k] for k in picked if k in SUBSTANCE)
    listed = brain + enceph + substance            # brain A-Z, then encephalopathy A-Z, then substance A-Z

    if level == 0:
        if not dementia:
            note = 'Acute encephalopathy not supported at this time.'
        elif acute == 'no':
            note = 'Dementia at baseline; acute encephalopathy not supported at this time.'
        else:
            note = 'Acute encephalopathy not supported at this time; known dementia.'
    elif len(listed) >= 2:
        note = 'Multifactorial ' + shown + ' due to:\n' + '\n'.join(str(i + 1) + '. ' + t for i, t in enumerate(listed))
    elif brain or substance:
        note = (brain + substance)[0] + ', presenting with ' + shown + '.'
    elif enceph:
        note = enceph[0] + ', manifesting as ' + shown + '.'
    else:
        note = upper_first(shown) + ', etiology not yet identified.'

    steps = [text for fid, text in RED_FLAGS if fid in p['flags']]
    if level > 0 and not picked:
        steps.append('No cause named yet: consider brain imaging.')

    return {'level': level, 'levelText': LABELS[level], 'phenotype': headline,
            'subtype': subtype, 'note': note, 'nextSteps': steps}


def draw_patient(rng, i):
    """Every input drawn on its own, so unusual combinations turn up."""
    acute = rng.choices(['yes', 'unsure', 'no'], weights=[60, 25, 15])[0]
    rass = rng.choice([4, 3, 2, 1, 0, 0, -1, -1, -2, -2, -3, -4, -5])
    feats = sorted(k for k in ('fluct', 'inatt', 'disorg') if rng.random() < .55)
    if rass in (-4, -5):
        feats = []                                 # the app skips the feature questions in coma
    dem = rng.random() < .22
    tool = rng.choice(['cam', 'camicu'])
    flags = [fid for fid, _ in RED_FLAGS if rng.random() < .15]
    n = rng.choices([0, 1, 2, 3, 4, 5], weights=[18, 34, 22, 14, 8, 4])[0]
    causes = (['unk'] if rng.random() < .4 else []) if n == 0 else sorted(rng.sample(ALL_CAUSES, n))
    return {'id': 'V%03d' % (i + 1), 'age': rng.randint(18, 99), 'sex': rng.choice(['F', 'M']),
            'acute': acute, 'rass': rass, 'tool': tool, 'feats': {k: True for k in feats},
            'dem': dem, 'flags': flags, 'causes': causes}


def main():
    rng = random.Random(SEED)
    cases = []
    for i in range(N):
        p = draw_patient(rng, i)
        p['expected'] = reference(p)
        cases.append(p)
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cases.json')
    with open(out, 'w') as fh:
        json.dump({'seed': SEED, 'n': N, 'cases': cases}, fh, indent=1, ensure_ascii=False)
    print('wrote', len(cases), 'patients to', out)


if __name__ == '__main__':
    main()
