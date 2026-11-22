"""
Independent validation set for the Acute Encephalopathy app.

Builds 400 made-up adult patients from a fixed random seed and works out the expected
result for each one with a reference implementation written here, in Python, from the
written rules (README "The rules" and "How the chart sentence is worded") -- not from logic.js.

Run:   python3 tests/validation/build_cases.py      (rewrites tests/validation/cases.json)
Check: npm test                                      (runs the app on every case and compares)
"""
import json, os, random

SEED = 20261119
N = 400

# ---- Reference tables (from the written rules) -----------------------------------------
# Primary brain diagnoses and substance/medication diagnoses: named as the diagnosis, presenting with <presentation>.
BRAIN = {
    'cns':    'Primary CNS infection (meningitis or encephalitis)',
    'stroke': 'Acute ischemic stroke',
    'ich':    'Intracerebral hemorrhage (ICH)',
    'sah':    'Subarachnoid hemorrhage (SAH)',
    'sz':     'Seizure (postictal state or non-convulsive status)',
    'tumor':  'Brain tumor or mass',
    'tbi':    'Traumatic brain injury (TBI)',
    'sdh':    'Subdural hematoma (SDH)',
}
SUBSTANCE = {
    'etohx':  'Alcohol intoxication',
    'drugx':  'Drug intoxication/overdose due to [specify drug]',
    'etohwd': 'Alcohol withdrawal',
    'drugwd': 'Drug withdrawal',
    'toxidrome': 'Toxidrome: [specify toxidrome]',
}
PRIMARY = dict(BRAIN, **SUBSTANCE)
# Encephalopathy section: written as the named encephalopathy, each asking for the specific cause.
SYSTEMIC = {
    'septic':      'septic encephalopathy due to [specify etiology]',
    'toxic':       'toxic encephalopathy due to [specify etiology]',
    'metabolic':   'metabolic encephalopathy due to [specify etiology]',
    'nutritional': 'nutritional encephalopathy due to [specify etiology]',
    'vascular':    'vascular encephalopathy due to [specify etiology]',
    'autoimmune':  'autoimmune encephalopathy due to [specify etiology]',
}
# Fixed list the random patients are drawn from. Kept in this sequence (not screen order) so moving a chip
# between sections does not reshuffle the 400 patients. The multifactorial list is sorted, so order here has no effect on it.
ORDER = ['cns', 'stroke', 'ich', 'sah', 'sz', 'tumor', 'tbi', 'sdh', 'etohx', 'drugx', 'etohwd', 'drugwd',
         'septic', 'toxic', 'toxidrome', 'metabolic', 'nutritional', 'vascular', 'autoimmune']
assert sorted(ORDER) == sorted(list(PRIMARY) + list(SYSTEMIC))
FLAGS = {
    'focal':  'Focal or one-sided signs: urgent CT or MRI.',
    'seiz':   'Seizure, twitching or myoclonus: EEG for non-convulsive status.',
    'mening': 'Fever with neck stiffness: lumbar puncture.',
    'fall':   'Fall or head injury on blood thinners: urgent head CT.',
}


def cap(t):
    return t[0].upper() + t[1:]


def expected(c):
    """Reference rules. Returns what the app should show for patient c."""
    rass, f = c['rass'], c['feats']
    coma = rass <= -4
    f1 = c['acute'] in ('yes', 'unsure') or f.get('fluct', False)
    loc = rass != 0 and not coma
    inatt, disorg, fluct = f.get('inatt', False), f.get('disorg', False), f.get('fluct', False)
    cam_positive = f1 and inatt and (disorg or loc)
    n = sum([fluct, inatt, disorg, loc])

    # Likelihood and presentation, first match wins
    if c['acute'] == 'no':
        level, phen = 0, 'Acute encephalopathy unlikely'
    elif coma:
        level, phen = 2, ('Coma' if rass == -5 else 'Stupor/coma')
    elif cam_positive and not c['dem']:
        level, phen = 2, 'Delirium'
    elif cam_positive and c['dem']:
        level, phen = 1, 'Possible delirium on top of dementia'
    elif n >= 1:
        level, phen = 1, 'Subsyndromal delirium'
    else:
        level, phen = 0, 'No delirium features'
    # Unknown baseline holds the result one level lower, unless fluctuation confirms Feature 1
    if c['acute'] == 'unsure' and not fluct and level > 0:
        level -= 1

    subtype = ''
    if c['acute'] != 'no' and not coma and n >= 1:
        subtype = 'hyperactive' if rass > 0 else 'hypoactive' if rass < 0 else 'mixed or undetermined'

    if coma:
        presentation = 'coma' if rass == -5 else 'stupor/coma'
    else:
        base = 'subsyndromal delirium' if phen == 'Subsyndromal delirium' else 'delirium'
        presentation = (subtype + ' ' + base) if subtype in ('hyperactive', 'hypoactive') else base
        if phen == 'Possible delirium on top of dementia':
            presentation = 'possible ' + presentation
    # Known dementia with a new change is always named
    if c['dem'] and c['acute'] != 'no':
        presentation += ' with underlying dementia' if coma else ' superimposed on dementia'

    causes = [k for k in ORDER if k in c['causes']]          # 'unk' is never a contributor
    primary = [k for k in causes if k in PRIMARY]
    systemic = [k for k in causes if k in SYSTEMIC]
    named = []
    for k in systemic:
        if SYSTEMIC[k] not in named:
            named.append(SYSTEMIC[k])
    # Primary brain diagnoses first, then encephalopathies, then substance/medication; each group A-Z.
    contributors = (sorted([BRAIN[k] for k in primary if k in BRAIN], key=str.lower)
                    + sorted(named, key=str.lower)
                    + sorted([SUBSTANCE[k] for k in primary if k in SUBSTANCE], key=str.lower))

    if level == 0:
        if not c['dem']:
            note = 'Acute encephalopathy not supported at this time.'
        elif c['acute'] == 'no':
            note = 'Dementia at baseline; acute encephalopathy not supported at this time.'
        else:
            note = 'Acute encephalopathy not supported at this time; known dementia.'
    elif len(contributors) >= 2:
        note = 'Multifactorial ' + presentation + ' due to:\n' + '\n'.join(
            '%d. %s' % (i + 1, cap(t)) for i, t in enumerate(contributors))
    elif primary:
        note = PRIMARY[primary[0]] + ', presenting with ' + presentation + '.'
    elif named:
        note = cap(named[0]) + ', manifesting as ' + presentation + '.'
    else:
        note = cap(presentation) + ', etiology not yet identified.'

    next_steps = [FLAGS[k] for k in ['focal', 'seiz', 'mening', 'fall'] if k in c['flags']]
    if level > 0 and not causes:
        next_steps.append('No cause named yet: consider brain imaging.')

    levels = ['Low likelihood', 'Moderate likelihood', 'High likelihood']
    return {'level': level, 'levelText': levels[level], 'phenotype': phen, 'note': note, 'nextSteps': next_steps}


# ---- Random but realistic case mix -----------------------------------------------------
STATES = [  # (label, weight)
    ('baseline (not acute)', 8), ('coma RASS -5', 6), ('stupor/coma RASS -4', 6),
    ('hypoactive delirium', 18), ('hyperactive delirium', 12), ('mixed delirium (RASS 0)', 6),
    ('subsyndromal', 16), ('no features', 6), ('delirium with dementia', 8), ('unsure baseline', 14),
]


def make_patient(rng, i):
    state = rng.choices([s for s, _ in STATES], weights=[w for _, w in STATES])[0]
    acute, rass, feats, dem = 'yes', 0, {}, False
    if state == 'baseline (not acute)':
        acute, rass = 'no', rng.choice([-2, -1, 0, 0, 1])
        feats = {k: rng.random() < .4 for k in ('fluct', 'inatt', 'disorg')}
    elif state == 'coma RASS -5':
        rass = -5
    elif state == 'stupor/coma RASS -4':
        rass = -4
    elif state == 'hypoactive delirium':
        rass = rng.choice([-1, -2, -3])
        feats = {'inatt': True, 'disorg': rng.random() < .5, 'fluct': rng.random() < .6}
    elif state == 'hyperactive delirium':
        rass = rng.choice([1, 2, 3, 4])
        feats = {'inatt': True, 'disorg': rng.random() < .6, 'fluct': rng.random() < .6}
    elif state == 'mixed delirium (RASS 0)':
        feats = {'inatt': True, 'disorg': True, 'fluct': rng.random() < .5}
    elif state == 'subsyndromal':
        rass = rng.choice([-1, 0, 0, 1])
        feats = {'inatt': False, 'disorg': rng.random() < .5, 'fluct': rng.random() < .5}
        if rass == 0 and not any(feats.values()):
            feats['disorg'] = True
    elif state == 'no features':
        rass = 0
    elif state == 'delirium with dementia':
        rass, dem = rng.choice([-2, -1, 0, 1]), True
        feats = {'inatt': True, 'disorg': True, 'fluct': rng.random() < .5}
    elif state == 'unsure baseline':
        acute, rass = 'unsure', rng.choice([-3, -1, 0, 1, 2, -4])
        feats = {k: rng.random() < .5 for k in ('fluct', 'inatt', 'disorg')}
    if rng.random() < .15 and rass > -4:           # some patients also get "possible dementia"
        dem = True if state != 'mixed delirium (RASS 0)' else dem

    tool = rng.choice(['cam', 'cam', 'camicu'])
    flags = [k for k in FLAGS if rng.random() < .12]

    # Etiologies: none, one, or several (2-4); sometimes "Not yet known"
    k = rng.choices([0, 1, 2, 3, 4], weights=[25, 35, 22, 12, 6])[0]
    if k == 0:
        causes = ['unk'] if rng.random() < .4 else []
    else:
        causes = rng.sample(ORDER, k)
    return {
        'id': 'P%03d' % (i + 1),
        'age': rng.randint(18, 96), 'sex': rng.choice(['F', 'M']), 'state': state,
        'acute': acute, 'rass': rass, 'tool': tool,
        'feats': {key: v for key, v in feats.items() if v}, 'dem': dem,
        'flags': flags, 'causes': causes,
    }


def main():
    rng = random.Random(SEED)
    cases = []
    for i in range(N):
        p = make_patient(rng, i)
        p['expected'] = expected(p)
        cases.append(p)
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cases.json')
    with open(out, 'w') as fh:
        json.dump({'seed': SEED, 'n': N, 'cases': cases}, fh, indent=1, ensure_ascii=False)
    print('wrote', len(cases), 'patients to', out)


if __name__ == '__main__':
    main()
