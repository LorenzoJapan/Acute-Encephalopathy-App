// Test patients. Run with:  npm test   (or: node --test tests/logic.test.js)
// Each test is one made-up patient and the answer we expect.
const test = require('node:test');
const assert = require('node:assert');
const AE = require('../logic.js');

// CAM positive at RASS 0: Feature 1 (acute change, from step 1) + Feature 2 (inattention) + disorganized thinking.
const all4 = { inatt: true, disorg: true };
const p = (o) => Object.assign({ acute: 'yes', rass: 0, feats: {}, dem: false, flags: {}, causes: {} }, o);

test('Baseline (not new) -> Low, unlikely, even with all features', () => {
  const r = AE.evaluate(p({ acute: 'no', feats: all4 }));
  assert.strictEqual(r.level, 0);
  assert.strictEqual(r.phenotype, 'Acute encephalopathy unlikely');
});

test('RASS -4 -> Stupor/coma, High', () => {
  const r = AE.evaluate(p({ rass: -4 }));
  assert.strictEqual(r.level, 2);
  assert.strictEqual(r.phenotype, 'Stupor/coma');
});

test('RASS -5 -> Coma', () => {
  assert.strictEqual(AE.evaluate(p({ rass: -5 })).phenotype, 'Coma');
});

test('RASS -3 is NOT coma; features still assessed (hypoactive)', () => {
  const r = AE.evaluate(p({ rass: -3, feats: all4 }));
  assert.strictEqual(r.phenotype, 'Delirium');
  assert.strictEqual(r.subtype, 'hypoactive');
});

test('All 4 features, no dementia -> Delirium, High', () => {
  const r = AE.evaluate(p({ feats: all4 }));
  assert.strictEqual(r.level, 2);
  assert.strictEqual(r.phenotype, 'Delirium');
});

test('All 4 features with dementia -> possible delirium on dementia, Moderate', () => {
  const r = AE.evaluate(p({ feats: all4, dem: true }));
  assert.strictEqual(r.level, 1);
  assert.strictEqual(r.phenotype, 'Possible delirium on top of dementia');
});

// CAM / CAM-ICU algorithm: Feature 1 AND Feature 2 AND (disorganized thinking OR altered consciousness).
test('Default tool is the CAM', () => {
  assert.strictEqual(AE.evaluate(p({ feats: all4 })).tool, 'CAM');
});

test('CAM positive through altered consciousness: inattention + RASS -1', () => {
  const r = AE.evaluate(p({ rass: -1, feats: { inatt: true } }));
  assert.strictEqual(r.phenotype, 'Delirium');
  assert.strictEqual(r.level, 2);
});

test('No inattention -> never delirium, even with disorganized thinking and RASS -2', () => {
  const r = AE.evaluate(p({ rass: -2, feats: { disorg: true } }));
  assert.strictEqual(r.phenotype, 'Subsyndromal delirium');
});

test('Inattention alone at RASS 0 -> Subsyndromal, Moderate', () => {
  const r = AE.evaluate(p({ feats: { inatt: true } }));
  assert.strictEqual(r.phenotype, 'Subsyndromal delirium');
  assert.strictEqual(r.level, 1);
});

test('Altered consciousness alone (RASS +1) -> Subsyndromal', () => {
  assert.strictEqual(AE.evaluate(p({ rass: 1 })).phenotype, 'Subsyndromal delirium');
});

test('CAM-ICU gives the same result as the CAM for the same answers', () => {
  [p({ feats: all4 }), p({ rass: -1, feats: { inatt: true } }), p({ feats: { disorg: true } }), p({})].forEach((c) => {
    const cam = AE.evaluate(c);
    const icu = AE.evaluate(Object.assign({}, c, { tool: 'camicu' }));
    assert.strictEqual(icu.phenotype, cam.phenotype);
    assert.strictEqual(icu.tool, 'CAM-ICU');
  });
});

test('Feature numbering follows each tool', () => {
  const lbl = (tool) => AE.evaluate(p({ tool, feats: all4 })).criteria.map((c) => c.label);
  assert.ok(lbl('cam').includes('Feature 3 · Disorganized thinking'));
  assert.ok(lbl('cam').includes('Feature 4 · Altered consciousness'));
  assert.ok(lbl('camicu').includes('Feature 3 · Altered consciousness'));
  assert.ok(lbl('camicu').includes('Feature 4 · Disorganized thinking'));
});

test('Unsure baseline but fluctuating course -> Feature 1 confirmed, no downgrade', () => {
  const r = AE.evaluate(p({ acute: 'unsure', feats: { inatt: true, disorg: true, fluct: true } }));
  assert.strictEqual(r.level, 2);
});

test('No features -> Low', () => {
  const r = AE.evaluate(p({}));
  assert.strictEqual(r.level, 0);
  assert.strictEqual(r.phenotype, 'No delirium features');
});

test('Unsure baseline drops one level (High -> Moderate)', () => {
  const r = AE.evaluate(p({ acute: 'unsure', feats: all4 }));
  assert.strictEqual(r.level, 1);
  assert.strictEqual(r.phenotype, 'Delirium');
});

test('Unsure baseline never drops below Low', () => {
  assert.strictEqual(AE.evaluate(p({ acute: 'unsure' })).level, 0);
});

test('Subtype: RASS above 0 hyperactive, 0 mixed', () => {
  assert.strictEqual(AE.evaluate(p({ rass: 2, feats: all4 })).subtype, 'hyperactive');
  assert.strictEqual(AE.evaluate(p({ rass: 0, feats: all4 })).subtype, 'mixed or undetermined');
});

test('Chart note names cause and presentation', () => {
  const r = AE.evaluate(p({ rass: -1, feats: all4, causes: { septic: true } }));
  assert.strictEqual(r.note, 'Septic encephalopathy due to [specify etiology], manifesting as hypoactive delirium.');
});

test('Two systemic causes -> multifactorial list', () => {
  const r = AE.evaluate(p({ rass: 1, feats: all4, causes: { metabolic: true, septic: true } }));
  assert.strictEqual(r.note, 'Multifactorial hyperactive delirium:\n1. Metabolic encephalopathy due to [specify etiology]\n2. Septic encephalopathy due to [specify etiology]');
});

// Primary brain or substance diagnoses: named as the diagnosis, not "acute encephalopathy".
test('ICH, SAH, TBI and SDH are separate primary diagnoses, each with its full name on hover', () => {
  const want = { ich: ['Intracerebral hemorrhage', 'Intracerebral hemorrhage (ICH)'], sah: ['Subarachnoid hemorrhage', 'Subarachnoid hemorrhage (SAH)'],
    tbi: ['Traumatic brain injury', 'Traumatic brain injury (TBI)'], sdh: ['Subdural hematoma', 'Subdural hematoma (SDH)'] };
  Object.keys(want).forEach((id) => {
    assert.strictEqual(cat(id).group, 'primary', id);
    assert.strictEqual(AE.hint(cat(id)), want[id][0], id);
    const one = {}; one[id] = true;
    assert.strictEqual(AE.evaluate(p({ rass: -4, causes: one })).note, want[id][1] + ', presenting with stupor/coma.', id);
  });
  ['bleed'].forEach((id) => assert.ok(!cat(id), id + ' is gone'));
  assert.strictEqual(AE.evaluate(p({ rass: -1, feats: all4, causes: { stroke: true, ich: true, sah: true, tbi: true, sdh: true } })).note,
    'Multifactorial hypoactive delirium:\n1. Acute ischemic stroke\n2. Intracerebral hemorrhage (ICH)\n3. Subarachnoid hemorrhage (SAH)\n4. Subdural hematoma (SDH)\n5. Traumatic brain injury (TBI)');
});

test('Primary only: stroke is the diagnosis, delirium the presentation', () => {
  const r = AE.evaluate(p({ rass: -1, feats: all4, causes: { stroke: true } }));
  assert.strictEqual(r.note, 'Acute ischemic stroke, presenting with hypoactive delirium.');
  assert.doesNotMatch(r.note, /encephalopathy/);
  assert.strictEqual(r.primaryDx, 'Acute ischemic stroke');
});

test('Primary only: alcohol intoxication', () => {
  const r = AE.evaluate(p({ rass: -2, feats: all4, causes: { etohx: true } }));
  assert.strictEqual(r.note, 'Alcohol intoxication, presenting with hypoactive delirium.');
});

test('Primary only: alcohol withdrawal', () => {
  const r = AE.evaluate(p({ rass: 3, feats: all4, causes: { etohwd: true } }));
  assert.strictEqual(r.note, 'Alcohol withdrawal, presenting with hyperactive delirium.');
});

test('Primary only: drug withdrawal', () => {
  const r = AE.evaluate(p({ rass: 2, feats: all4, causes: { drugwd: true } }));
  assert.strictEqual(r.note, 'Drug withdrawal, presenting with hyperactive delirium.');
});

test('Alcohol intoxication, alcohol withdrawal and drug withdrawal are separate substance chips; old ones gone', () => {
  ['etohx', 'etohwd', 'drugwd'].forEach((id) => assert.ok(AE.CAUSES.some((c) => c.id === id && c.group === 'substance'), id));
  ['etoh', 'sub'].forEach((id) => assert.ok(!AE.CAUSES.some((c) => c.id === id), id));
  const r = AE.evaluate(p({ rass: 2, feats: all4, causes: { etohwd: true, drugwd: true } }));
  assert.strictEqual(r.note, 'Multifactorial hyperactive delirium:\n1. Alcohol withdrawal\n2. Drug withdrawal');
});

test('Medication chip is gone', () => {
  assert.ok(!AE.CAUSES.some((c) => c.id === 'meds'));
  assert.ok(!AE.CAUSES.some((c) => /medication/i.test(c.s)));
});

test('Primary only: drug intoxication keeps [specify drug]', () => {
  const r = AE.evaluate(p({ rass: -2, feats: all4, causes: { drugx: true } }));
  assert.strictEqual(r.note, 'Drug intoxication/overdose due to [specify drug], presenting with hypoactive delirium.');
  assert.strictEqual(r.primaryDx, 'Drug intoxication/overdose due to [specify drug]');
});

test('Primary + systemic -> multifactorial list, primary first', () => {
  const r = AE.evaluate(p({ rass: -1, feats: all4, causes: { stroke: true, metabolic: true } }));
  assert.strictEqual(r.note, 'Multifactorial hypoactive delirium:\n1. Acute ischemic stroke\n2. Metabolic encephalopathy due to [specify etiology]');
});

test('Two primaries -> multifactorial list', () => {
  const r = AE.evaluate(p({ rass: -2, feats: all4, causes: { tbi: true, tumor: true } }));
  assert.strictEqual(r.note, 'Multifactorial hypoactive delirium:\n1. Brain tumor or mass\n2. Traumatic brain injury (TBI)');
});

test('Coma from CNS infection', () => {
  const r = AE.evaluate(p({ rass: -5, causes: { cns: true } }));
  assert.strictEqual(r.note, 'Primary CNS infection (meningitis or encephalitis), presenting with coma.');
});

test('Primary named -> no "cause not identified" warning', () => {
  const r = AE.evaluate(p({ feats: all4, causes: { sz: true } }));
  assert.strictEqual(r.noCause, false);
  assert.doesNotMatch(r.note, /not yet identified/);
});

test('Low likelihood note is unchanged even if a primary is ticked', () => {
  const r = AE.evaluate(p({ acute: 'no', causes: { stroke: true } }));
  assert.match(r.note, /^Acute encephalopathy not supported/);
});

test('Diagnostic only: no management or rescreening advice anywhere in the output', () => {
  const cases = [p({ feats: all4 }), p({ feats: all4, causes: { septic: true } }), p({ acute: 'no' }), p({}), p({ rass: -5, flags: { seiz: true } })];
  cases.forEach((c) => {
    const r = AE.evaluate(c);
    const text = [r.note, r.summary].concat(r.nextSteps).join(' ');
    assert.doesNotMatch(text, /delirium care|rescreen|reassess|treat/i);
  });
});

test('No red flags and a cause named -> no diagnostic next steps left', () => {
  assert.deepStrictEqual(AE.evaluate(p({ feats: all4, causes: { septic: true } })).nextSteps, []);
});

test('Every cause belongs to a group: primary, substance, systemic or unknown', () => {
  AE.CAUSES.forEach((c) => assert.ok(['primary', 'substance', 'systemic', 'unknown'].includes(c.group), c.id));
});

test('No cause named -> placeholder and search reminder', () => {
  const r = AE.evaluate(p({ feats: all4 }));
  assert.strictEqual(r.note, 'Delirium, etiology not yet identified.');
  assert.strictEqual(r.noCause, true);
});

test('"Not yet known" clears other causes, and vice versa', () => {
  let c = AE.toggleCause({ stroke: true, septic: true }, 'unk');
  assert.deepStrictEqual(c, { unk: true });
  c = AE.toggleCause(c, 'stroke');
  assert.deepStrictEqual(c, { stroke: true });
});

test('Red flag still shown when likelihood is Low', () => {
  const r = AE.evaluate(p({ flags: { focal: true } }));
  assert.strictEqual(r.level, 0);
  assert.strictEqual(r.flags.length, 1);
  assert.match(r.nextSteps[0], /urgent CT or MRI/);
});

test('Shortcut: baseline "no" jumps straight to result, and back', () => {
  assert.strictEqual(AE.nextScreen('baseline', { acute: 'no' }, 1), 'result');
  assert.strictEqual(AE.nextScreen('result', { acute: 'no' }, -1), 'baseline');
});

test('Shortcut: coma skips features, and back', () => {
  assert.strictEqual(AE.nextScreen('arousal', { rass: -4 }, 1), 'flags');
  assert.strictEqual(AE.nextScreen('flags', { rass: -4 }, -1), 'arousal');
  assert.strictEqual(AE.nextScreen('arousal', { rass: -3 }, 1), 'features');
});

// Systemic causes: one chip per encephalopathy category; hover/tap lists the underlying causes.
const cat = (id) => AE.CAUSES.find((c) => c.id === id);

test('Old specific systemic chips are gone', () => {
  ['sepsis', 'infx', 'hepatic', 'uremic', 'co2', 'lytes', 'wernicke', 'hie', 'cardiac', 'sreat', 'autoimm', 'inf', 'met', 'bed', 'gas']
    .forEach((id) => assert.ok(!cat(id), id));
});

test('Each category writes its own encephalopathy name', () => {
  const expect = { septic: 'Septic encephalopathy due to [specify etiology]', toxic: 'Toxic encephalopathy due to [specify etiology]', metabolic: 'Metabolic encephalopathy due to [specify etiology]',
    nutritional: 'Nutritional encephalopathy due to [specify etiology]', vascular: 'Vascular encephalopathy due to [specify etiology]', autoimmune: 'Autoimmune encephalopathy due to [specify etiology]' };
  Object.keys(expect).forEach((id) => {
    const c = {}; c[id] = true;
    assert.strictEqual(AE.evaluate(p({ feats: all4, causes: c })).note, expect[id] + ', manifesting as delirium.');
  });
});

test('Each category hover lists its underlying causes', () => {
  assert.match(AE.hint(cat('septic')), /cytokine storm, HLH/);
  assert.match(AE.hint(cat('toxic')), /^Toxic encephalopathy is a global cerebral dysfunction caused by exposure to toxic substances or accumulation of toxic metabolites, resulting in altered cognition, consciousness, behavior, or neurologic function\.\n\nEnvironmental and Occupational Toxins\n/);
  ['Environmental and Occupational Toxins', 'Prescription and Therapeutic Agents', 'Industrial and Other Chemical Exposures', '• Carbon monoxide', '• Amiodarone (rarely)', '• Heavy-metal mixtures']
    .forEach((t) => assert.ok(AE.hint(cat('toxic')).includes(t), t));
  assert.match(AE.hint(cat('metabolic')), /^Metabolic encephalopathy is a global cerebral dysfunction caused by:\n\nOrgan failure: hepatic encephalopathy;/);
  assert.match(AE.hint(cat('metabolic')), /dialysis disequilibrium/);
  assert.match(AE.hint(cat('metabolic')), /Non-cirrhotic hyperammonemia/);
  assert.match(AE.hint(cat('metabolic')), /porphyria/);
  assert.match(AE.hint(cat('nutritional')), /^Nutritional encephalopathy is a global cerebral dysfunction that can be caused by conditions like:\n\nWernicke/);
  assert.match(AE.hint(cat('nutritional')), /Pellagra \(niacin deficiency\)/);
  assert.match(AE.hint(cat('vascular')), /^Vascular encephalopathy is a global cerebral dysfunction that can be caused by conditions like:\n\nDiffuse, not a focal stroke/);
  assert.match(AE.hint(cat('vascular')), /hypoxic-ischemic \(post-anoxic\)/);
  assert.match(AE.hint(cat('vascular')), /low-flow or hypoperfusion/);
  assert.match(AE.hint(cat('autoimmune')), /^Autoimmune encephalopathy is a global cerebral dysfunction that can be caused by conditions like:\n\nSteroid-responsive/);
  assert.match(AE.hint(cat('autoimmune')), /SREAT/);
  assert.match(AE.hint(cat('autoimmune')), /NMDAR, LGI1, CASPR2, GABA-B/);
  assert.match(AE.hint(cat('autoimmune')), /Susac syndrome/);
});

test('Vascular hover leaves out PRES, RCVS, TTP/TMA and DIC', () => {
  assert.doesNotMatch(AE.hint(cat('vascular')), /PRES|RCVS|TTP|thrombotic|DIC|Hypertensive/);
});

test('Septic hover does not contradict the Diagnosis line', () => {
  assert.doesNotMatch(AE.hint(cat('septic')), /secondary to infection/);
});

test('Alcohol or withdrawal + Toxic -> multifactorial (Toxic is never dropped)', () => {
  assert.strictEqual(AE.evaluate(p({ rass: 3, feats: all4, causes: { toxic: true, etohwd: true } })).note,
    'Multifactorial hyperactive delirium:\n1. Toxic encephalopathy due to [specify etiology]\n2. Alcohol withdrawal');
  assert.strictEqual(AE.evaluate(p({ rass: -2, feats: all4, causes: { toxic: true, etohx: true } })).note,
    'Multifactorial hypoactive delirium:\n1. Toxic encephalopathy due to [specify etiology]\n2. Alcohol intoxication');
  assert.strictEqual(AE.evaluate(p({ rass: 2, feats: all4, causes: { toxic: true, drugwd: true, metabolic: true } })).note,
    'Multifactorial hyperactive delirium:\n1. Metabolic encephalopathy due to [specify etiology]\n2. Toxic encephalopathy due to [specify etiology]\n3. Drug withdrawal');
});

test('Toxic alone still writes toxic encephalopathy', () => {
  assert.strictEqual(AE.evaluate(p({ rass: -1, feats: all4, causes: { toxic: true } })).note, 'Toxic encephalopathy due to [specify etiology], manifesting as hypoactive delirium.');
});

test('Every acronym on a step 5 chip has a definition', () => {
  AE.CAUSES.forEach((c) => {
    (c.s.match(/\b[A-Z]{2,}\b/g) || []).forEach((a) => assert.ok(AE.ABBR[a], a + ' on "' + c.s + '" has no definition'));
  });
});

test('AE.define lists the definitions for a chip label', () => {
  assert.strictEqual(AE.define('Seizure/NCSE'), 'NCSE: non-convulsive status epilepticus');
  assert.strictEqual(AE.define('Ischemic stroke'), '');
});

test('Acronym chips give their definition through hint(); plain chips give none', () => {
  assert.strictEqual(AE.hint(cat('sz')), 'NCSE: non-convulsive status epilepticus');
  assert.strictEqual(AE.hint(cat('stroke')), '');
});

// Two or more contributing diagnoses -> "Multifactorial <presentation>:" with a numbered list.
test('Multifactorial: hypoactive delirium with three diagnoses, primary first, then A–Z', () => {
  const r = AE.evaluate(p({ rass: -1, feats: all4, causes: { stroke: true, metabolic: true, septic: true } }));
  assert.strictEqual(r.note, 'Multifactorial hypoactive delirium:\n1. Acute ischemic stroke\n2. Metabolic encephalopathy due to [specify etiology]\n3. Septic encephalopathy due to [specify etiology]');
});

test('Multifactorial: hyperactive delirium', () => {
  const r = AE.evaluate(p({ rass: 2, feats: all4, causes: { etohwd: true, drugwd: true } }));
  assert.strictEqual(r.note, 'Multifactorial hyperactive delirium:\n1. Alcohol withdrawal\n2. Drug withdrawal');
});

test('Multifactorial: RASS 0 -> plain "delirium"', () => {
  const r = AE.evaluate(p({ rass: 0, feats: all4, causes: { metabolic: true, nutritional: true } }));
  assert.strictEqual(r.note, 'Multifactorial delirium:\n1. Metabolic encephalopathy due to [specify etiology]\n2. Nutritional encephalopathy due to [specify etiology]');
});

test('Multifactorial: RASS -4 -> stupor/coma', () => {
  const r = AE.evaluate(p({ rass: -4, causes: { cns: true, metabolic: true } }));
  assert.strictEqual(r.note, 'Multifactorial stupor/coma:\n1. Primary CNS infection (meningitis or encephalitis)\n2. Metabolic encephalopathy due to [specify etiology]');
});

test('Multifactorial: RASS -5 -> coma', () => {
  const r = AE.evaluate(p({ rass: -5, causes: { tbi: true, vascular: true } }));
  assert.strictEqual(r.note, 'Multifactorial coma:\n1. Traumatic brain injury (TBI)\n2. Vascular encephalopathy due to [specify etiology]');
});

test('Multifactorial: subsyndromal delirium', () => {
  const r = AE.evaluate(p({ rass: 0, feats: { inatt: true }, causes: { toxic: true, autoimmune: true } }));
  assert.strictEqual(r.note, 'Multifactorial subsyndromal delirium:\n1. Autoimmune encephalopathy due to [specify etiology]\n2. Toxic encephalopathy due to [specify etiology]');
});

test('Multifactorial: brain first, then encephalopathy, then substance, each A–Z', () => {
  assert.strictEqual(AE.evaluate(p({ rass: -1, feats: all4, causes: { toxidrome: true, etohwd: true, tumor: true, cns: true, septic: true, metabolic: true } })).note,
    'Multifactorial hypoactive delirium:\n1. Brain tumor or mass\n2. Primary CNS infection (meningitis or encephalitis)\n3. Metabolic encephalopathy due to [specify etiology]\n4. Septic encephalopathy due to [specify etiology]\n5. Alcohol withdrawal\n6. Toxidrome: [specify toxidrome]');
});

test('Multifactorial: drug intoxication is a substance diagnosis, listed after brain and encephalopathy', () => {
  const r = AE.evaluate(p({ rass: -1, feats: all4, causes: { stroke: true, drugx: true, septic: true } }));
  assert.strictEqual(r.note, 'Multifactorial hypoactive delirium:\n1. Acute ischemic stroke\n2. Septic encephalopathy due to [specify etiology]\n3. Drug intoxication/overdose due to [specify drug]');
});

test('Low likelihood stays "not supported" even with several causes ticked', () => {
  assert.strictEqual(AE.evaluate(p({ causes: { stroke: true, metabolic: true } })).note, 'Acute encephalopathy not supported at this time.');
});

test('Step 5 has three sections: primary brain, substance/medication, encephalopathy', () => {
  const row = (g) => AE.CAUSES.filter((c) => c.group === g).map((c) => c.s);
  assert.deepStrictEqual(row('primary'), ['CNS infection', 'Ischemic stroke', 'ICH', 'SAH', 'Seizure/NCSE', 'Tumor/mass', 'TBI', 'SDH']);
  assert.deepStrictEqual(row('substance'), ['Alcohol intoxication', 'Drug intoxication/overdose', 'Alcohol withdrawal', 'Drug withdrawal', 'Toxidromes']);
  assert.deepStrictEqual(row('systemic'), ['Septic', 'Toxic', 'Metabolic', 'Nutritional', 'Vascular', 'Autoimmune']);
});

test('Drug intoxication and Toxidromes hover text', () => {
  ['Opioids\n• Fentanyl and fentanyl analogues, now the most common', 'Stimulants\n', 'Cannabinoids\n', 'Dissociatives and hallucinogens\n', 'Sedative-hypnotics\n', 'Inhalants\n• Solvents and aerosols (toluene, butane), nitrous oxide (“whippets”)']
    .forEach((t) => assert.ok(AE.hint(cat('drugx')).includes(t), t));
  assert.doesNotMatch(AE.hint(cat('drugx')), /alcohol/i);
  assert.strictEqual(AE.hint(cat('toxidrome')), 'Psychiatric medication toxidrome: a syndrome of altered mental status and neurologic and/or autonomic dysfunction resulting from toxicity, accumulation, overdose, interaction, or adverse reaction to psychotropic medications, producing a recognizable clinical pattern such as serotonin syndrome, anticholinergic toxicity, neuroleptic malignant syndrome, or lithium toxicity.');
});

test('Toxidrome writes its own Diagnosis line', () => {
  assert.strictEqual(AE.evaluate(p({ rass: 2, feats: all4, causes: { toxidrome: true } })).note, 'Toxidrome: [specify toxidrome], presenting with hyperactive delirium.');
});

test('Drug intoxication + Toxic encephalopathy -> multifactorial, both listed', () => {
  assert.strictEqual(AE.evaluate(p({ rass: -2, feats: all4, causes: { toxic: true, drugx: true } })).note,
    'Multifactorial hypoactive delirium:\n1. Toxic encephalopathy due to [specify etiology]\n2. Drug intoxication/overdose due to [specify drug]');
  assert.strictEqual(AE.evaluate(p({ rass: -4, causes: { toxic: true, drugx: true } })).note,
    'Multifactorial stupor/coma:\n1. Toxic encephalopathy due to [specify etiology]\n2. Drug intoxication/overdose due to [specify drug]');
  assert.strictEqual(AE.evaluate(p({ rass: -5, causes: { toxic: true, drugx: true, metabolic: true } })).note,
    'Multifactorial coma:\n1. Metabolic encephalopathy due to [specify etiology]\n2. Toxic encephalopathy due to [specify etiology]\n3. Drug intoxication/overdose due to [specify drug]');
});

test('Toxidrome + Toxic or another diagnosis -> multifactorial, brain then encephalopathy then substance', () => {
  assert.strictEqual(AE.evaluate(p({ rass: 2, feats: all4, causes: { toxic: true, toxidrome: true } })).note,
    'Multifactorial hyperactive delirium:\n1. Toxic encephalopathy due to [specify etiology]\n2. Toxidrome: [specify toxidrome]');
  assert.strictEqual(AE.evaluate(p({ rass: 2, feats: all4, causes: { toxic: true, toxidrome: true, metabolic: true } })).note,
    'Multifactorial hyperactive delirium:\n1. Metabolic encephalopathy due to [specify etiology]\n2. Toxic encephalopathy due to [specify etiology]\n3. Toxidrome: [specify toxidrome]');
  assert.strictEqual(AE.evaluate(p({ rass: -5, causes: { toxidrome: true, sz: true } })).note,
    'Multifactorial coma:\n1. Seizure (postictal state or non-convulsive status)\n2. Toxidrome: [specify toxidrome]');
});

test('Exactly one brain or substance diagnosis is named on its own; any second diagnosis -> multifactorial', () => {
  ['cns', 'stroke', 'ich', 'sah', 'sz', 'tumor', 'tbi', 'sdh', 'etohx', 'drugx', 'etohwd', 'drugwd', 'toxidrome'].forEach((id) => {
    const one = {}; one[id] = true;
    assert.match(AE.evaluate(p({ rass: -4, causes: one })).note, /, presenting with stupor\/coma\.$/, id);
    AE.CAUSES.filter((c) => c.id !== id && c.group !== 'unknown').forEach((c) => {
      const two = Object.assign({}, one); two[c.id] = true;
      assert.match(AE.evaluate(p({ rass: -4, causes: two })).note, /^Multifactorial stupor\/coma:\n1\. .+\n2\. /, id + '+' + c.id);
    });
  });
  assert.strictEqual(AE.evaluate(p({ rass: -4, causes: { sz: true } })).note, 'Seizure (postictal state or non-convulsive status), presenting with stupor/coma.');
});

test('Drug withdrawal hover text', () => {
  assert.strictEqual(AE.hint(cat('drugwd')), 'Alcohol (AWS/DTs), benzodiazepines, baclofen, opioids withdrawal etc.');
});

test('CNS infection hover keeps the acronym and adds the list', () => {
  assert.strictEqual(AE.hint(cat('cns')), 'CNS: central nervous system\nPrimary CNS meningoencephalitis, brain abscess, infectious ventriculitis etc.');
});

test('Toxic hover no longer lists intoxication, withdrawal or toxidromes', () => {
  assert.doesNotMatch(AE.hint(cat('toxic')), /Intoxication:|Withdrawal:|Toxidromes:/);
});

// Category encephalopathies flag the etiology to be specified; specific diagnoses do not.
test('Single category encephalopathy -> "due to [specify etiology]"', () => {
  assert.strictEqual(AE.evaluate(p({ rass: -1, feats: all4, causes: { metabolic: true } })).note,
    'Metabolic encephalopathy due to [specify etiology], manifesting as hypoactive delirium.');
});

test('Multifactorial list flags each category encephalopathy', () => {
  assert.strictEqual(AE.evaluate(p({ rass: -1, feats: all4, causes: { stroke: true, metabolic: true, septic: true } })).note,
    'Multifactorial hypoactive delirium:\n1. Acute ischemic stroke\n2. Metabolic encephalopathy due to [specify etiology]\n3. Septic encephalopathy due to [specify etiology]');
});

test('All six categories flag the etiology', () => {
  ['septic', 'toxic', 'metabolic', 'nutritional', 'vascular', 'autoimmune'].forEach((id) => {
    const c = {}; c[id] = true;
    assert.match(AE.evaluate(p({ feats: all4, causes: c })).note, /due to \[specify etiology\], manifesting as delirium\.$/, id);
  });
});

test('Specific diagnoses are not flagged', () => {
  ['stroke', 'etohwd', 'drugx'].forEach((id) => {
    const c = {}; c[id] = true;
    assert.doesNotMatch(AE.evaluate(p({ feats: all4, causes: c })).note, /specify etiology/, id);
  });
});

// Depressed arousal wording: RASS -5 coma, RASS -4 stupor/coma.
test('RASS -5 is coma, RASS -4 is stupor/coma, in every Diagnosis form', () => {
  assert.strictEqual(AE.evaluate(p({ rass: -5, causes: { stroke: true } })).note, 'Acute ischemic stroke, presenting with coma.');
  assert.strictEqual(AE.evaluate(p({ rass: -4, causes: { stroke: true } })).note, 'Acute ischemic stroke, presenting with stupor/coma.');
  assert.strictEqual(AE.evaluate(p({ rass: -4, causes: { metabolic: true } })).note, 'Metabolic encephalopathy due to [specify etiology], manifesting as stupor/coma.');
  assert.strictEqual(AE.evaluate(p({ rass: -4 })).note, 'Stupor/coma, etiology not yet identified.');
  assert.strictEqual(AE.evaluate(p({ rass: -5 })).phenotype, 'Coma');
});

test('RASS row in the criteria names the arousal term', () => {
  const row = (rass) => AE.evaluate(p({ rass })).criteria.find((c) => c.label === 'Arousal (RASS)').status;
  assert.strictEqual(row(-5), '−5 · coma');
  assert.strictEqual(row(-4), '−4 · stupor/coma');
});

test('arousalTerm gives the step 2 warning wording', () => {
  assert.strictEqual(AE.arousalTerm(-5), 'coma');
  assert.strictEqual(AE.arousalTerm(-4), 'stupor/coma');
});

test('Septic hover text', () => {
  assert.strictEqual(AE.hint(cat('septic')), 'Septic encephalopathy is a global cerebral dysfunction caused by peripheral infection, with no direct CNS extension or cytokine mediated encephalopathy: cytokine storm, HLH, MAS.');
});

test('Vascular hover names cardiogenic shock / severe heart failure for low-flow', () => {
  assert.match(AE.hint(cat('vascular')), /low-flow or hypoperfusion encephalopathy \(i\.e\. cardiogenic shock\/severe heart failure\)\.$/);
});

test('Every Encephalopathy-section chip asks for the specific cause', () => {
  AE.CAUSES.filter((c) => c.group === 'systemic').forEach((c) => {
    const causes = {}; causes[c.id] = true;
    assert.match(AE.evaluate(p({ feats: all4, causes })).note, /\[specify (etiology|drug|toxidrome)\]/, c.id);
  });
});

test('Multifactorial list flags drug intoxication and toxidrome too', () => {
  assert.strictEqual(AE.evaluate(p({ rass: 2, feats: all4, causes: { drugx: true, toxidrome: true } })).note,
    'Multifactorial hyperactive delirium:\n1. Drug intoxication/overdose due to [specify drug]\n2. Toxidrome: [specify toxidrome]');
});

// "Acute encephalopathy" is only used once an underlying etiology is named.
test('No cause or "Not yet known" -> never labelled acute encephalopathy', () => {
  const cases = [
    p({ rass: -1, feats: all4 }), p({ rass: -1, feats: all4, causes: { unk: true } }),
    p({ rass: 2, feats: all4 }), p({ rass: 0, feats: { inatt: true } }), p({ rass: -4 }), p({ rass: -5, causes: { unk: true } }),
  ];
  cases.forEach((c) => {
    const r = AE.evaluate(c);
    assert.doesNotMatch(r.note, /encephalopathy/i, r.note);
    assert.doesNotMatch(r.summary, /acute encephalopathy/i, r.summary);
    assert.match(r.note, /, etiology not yet identified\.$/);
  });
});

test('Etiology-not-identified wording follows the presentation', () => {
  assert.strictEqual(AE.evaluate(p({ rass: -1, feats: all4, causes: { unk: true } })).note, 'Hypoactive delirium, etiology not yet identified.');
  assert.strictEqual(AE.evaluate(p({ rass: 2, feats: all4 })).note, 'Hyperactive delirium, etiology not yet identified.');
  assert.strictEqual(AE.evaluate(p({ rass: 0, feats: { inatt: true } })).note, 'Subsyndromal delirium, etiology not yet identified.');
  assert.strictEqual(AE.evaluate(p({ rass: -5 })).note, 'Coma, etiology not yet identified.');
});

// Known dementia: the Diagnosis always names it.
const d = (o) => p(Object.assign({ dem: true }, o));
test('Dementia + one primary cause', () => {
  assert.strictEqual(AE.evaluate(d({ rass: -1, feats: { inatt: true }, causes: { stroke: true } })).note,
    'Acute ischemic stroke, presenting with possible hypoactive delirium superimposed on dementia.');
});
test('Dementia + several causes -> multifactorial heading names dementia', () => {
  assert.strictEqual(AE.evaluate(d({ rass: -1, feats: { inatt: true }, causes: { stroke: true, septic: true } })).note,
    'Multifactorial possible hypoactive delirium superimposed on dementia:\n1. Acute ischemic stroke\n2. Septic encephalopathy due to [specify etiology]');
});
test('Dementia + no cause', () => {
  assert.strictEqual(AE.evaluate(d({ rass: -1, feats: { inatt: true } })).note,
    'Possible hypoactive delirium superimposed on dementia, etiology not yet identified.');
});
test('Dementia + one encephalopathy, drug intoxication, subsyndromal', () => {
  assert.strictEqual(AE.evaluate(d({ rass: 2, feats: { inatt: true }, causes: { metabolic: true } })).note,
    'Metabolic encephalopathy due to [specify etiology], manifesting as possible hyperactive delirium superimposed on dementia.');
  assert.strictEqual(AE.evaluate(d({ rass: -1, feats: { inatt: true }, causes: { drugx: true } })).note,
    'Drug intoxication/overdose due to [specify drug], presenting with possible hypoactive delirium superimposed on dementia.');
  assert.strictEqual(AE.evaluate(d({ rass: 0, feats: { disorg: true } })).note,
    'Subsyndromal delirium superimposed on dementia, etiology not yet identified.');
});
test('Dementia + stupor/coma -> "with underlying dementia"', () => {
  assert.strictEqual(AE.evaluate(d({ rass: -4, causes: { septic: true } })).note,
    'Septic encephalopathy due to [specify etiology], manifesting as stupor/coma with underlying dementia.');
  assert.strictEqual(AE.evaluate(d({ rass: -5, causes: { tbi: true, vascular: true } })).note,
    'Multifactorial coma with underlying dementia:\n1. Traumatic brain injury (TBI)\n2. Vascular encephalopathy due to [specify etiology]');
});
test('Dementia at baseline (not a new change)', () => {
  assert.strictEqual(AE.evaluate(d({ acute: 'no' })).note, 'Dementia at baseline; acute encephalopathy not supported at this time.');
});
test('Dementia, new change but not supported -> "; known dementia."', () => {
  assert.strictEqual(AE.evaluate(d({ rass: 0 })).note, 'Acute encephalopathy not supported at this time; known dementia.');
});
test('Without dementia, wording is unchanged', () => {
  assert.strictEqual(AE.evaluate(p({ rass: -1, feats: all4, causes: { stroke: true } })).note, 'Acute ischemic stroke, presenting with hypoactive delirium.');
  assert.doesNotMatch(AE.evaluate(p({ rass: -1, feats: all4, causes: { stroke: true, septic: true } })).note, /dementia/);
});
test('Every dementia patient\'s Diagnosis mentions dementia', () => {
  [d({ acute: 'no' }), d({}), d({ rass: -5 }), d({ rass: -4 }), d({ feats: all4 }), d({ acute: 'unsure', feats: all4, causes: { septic: true, etohwd: true } })]
    .forEach((c) => assert.match(AE.evaluate(c).note, /dementia/i));
});

test('"Possible delirium on top of dementia" keeps "possible" in the Diagnosis', () => {
  const r = AE.evaluate(d({ rass: 0, feats: all4 }));
  assert.strictEqual(r.phenotype, 'Possible delirium on top of dementia');
  assert.strictEqual(r.note, 'Possible delirium superimposed on dementia, etiology not yet identified.');
});
test('Subsyndromal delirium with dementia is not called "possible"', () => {
  assert.doesNotMatch(AE.evaluate(d({ rass: 0, feats: { disorg: true } })).note, /ossible/);
});
