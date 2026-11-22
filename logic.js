/*
 * Acute Encephalopathy App: the clinical rules.
 * Everything that decides a result lives in this one file, so it can be
 * reviewed and tested on its own (see tests/logic.test.js).
 * Based on Slooter et al., Intensive Care Med 2020, and DSM-5 delirium criteria.
 */
(function (root) {
  'use strict';

  var RASS = [
    { v: 4, t: 'Combative', d: 'Overtly combative or violent' },
    { v: 3, t: 'Very agitated', d: 'Pulls at tubes or lines; aggressive' },
    { v: 2, t: 'Agitated', d: 'Frequent purposeless movement' },
    { v: 1, t: 'Restless', d: 'Anxious, movements not aggressive' },
    { v: 0, t: 'Alert and calm', d: 'Spontaneously pays attention' },
    { v: -1, t: 'Drowsy', d: 'Stays awake to voice, eye contact over 10 s' },
    { v: -2, t: 'Light sedation', d: 'Briefly wakes to voice, eye contact under 10 s' },
    { v: -3, t: 'Moderate sedation', d: 'Moves or opens eyes to voice, no eye contact' },
    { v: -4, t: 'Deep sedation', d: 'No response to voice; moves to touch' },
    { v: -5, t: 'Unarousable', d: 'No response to voice or touch' }
  ];

  var ACUTE = [
    { id: 'yes', t: 'Yes, new or worse', d: 'Collateral confirms a recent change' },
    { id: 'unsure', t: 'Not sure yet', d: 'Baseline unknown; result will be held one level lower' },
    { id: 'no', t: 'No, this is their baseline', d: 'Points toward a chronic cognitive disorder' }
  ];

  var FEATS = [
    { id: 'fluct', t: 'Fluctuating course', d: 'Behavior comes and goes or changes in severity during the day' },
    { id: 'inatt', t: 'Inattention', d: 'Trouble focusing, easily distracted, loses track of what is said' },
    { id: 'disorg', t: 'Disorganized thinking', d: 'Rambling or irrelevant talk, unclear or illogical flow of ideas' }
  ];

  // Delirium screening tool. Both use the same algorithm:
  //   Feature 1 (acute change or fluctuation) AND Feature 2 (inattention)
  //   AND (disorganized thinking OR altered consciousness).
  // Altered consciousness is read from the RASS (anything other than 0), so it is not asked twice.
  // The tools differ in how inattention and thinking are tested, and in which is Feature 3 vs 4.
  var TOOLS = {
    cam: {
      name: 'CAM',
      items: FEATS,
      loc: 'Anything other than alert and calm, read from the RASS',
      order: { loc: 4, disorg: 3 }
    },
    camicu: {
      name: 'CAM-ICU',
      items: [
        { id: 'fluct', t: 'Fluctuating in the past 24 hours', d: 'Change in RASS, GCS or earlier delirium assessment' },
        { id: 'inatt', t: 'Inattention: letters test', d: '“Squeeze when I say A” — SAVEAHAART: more than 2 errors' },
        { id: 'disorg', t: 'Disorganized thinking', d: 'More than 1 error on 4 yes/no questions plus a 2-step command' }
      ],
      loc: 'RASS other than 0',
      order: { loc: 3, disorg: 4 }
    }
  };

  var FLAGS = [
    { id: 'focal', t: 'Focal or one-sided signs', d: 'Weakness, gaze deviation, new aphasia', act: 'urgent CT or MRI' },
    { id: 'seiz', t: 'Seizure, twitching or myoclonus', d: 'Or a prolonged post-seizure state', act: 'EEG for non-convulsive status' },
    { id: 'mening', t: 'Fever with neck stiffness', d: 'Or clinical concern for meningoencephalitis', act: 'lumbar puncture' },
    { id: 'fall', t: 'Fall or head injury on blood thinners', d: 'Risk of bleeding inside the skull', act: 'urgent head CT' }
  ];

  // Acronyms shown on step 5 chips, defined on hover (computer) or tap (iPhone).
  var ABBR = {
    CNS: 'central nervous system',
    NCSE: 'non-convulsive status epilepticus',
    ICH: 'intracerebral hemorrhage',
    SAH: 'subarachnoid hemorrhage',
    TBI: 'traumatic brain injury',
    SDH: 'subdural hematoma'
  };

  // "Seizure/NCSE" -> "NCSE: non-convulsive status epilepticus"; '' when the label has no acronym.
  function define(label) {
    return (label.match(/\b[A-Z]{2,}\b/g) || []).filter(function (a) { return ABBR[a]; })
      .map(function (a) { return a + ': ' + ABBR[a]; }).join(' \u00b7 ');
  }

  // What a step 5 chip shows on hover / tap: its own explanation and/or its acronym definitions.
  function hint(c) {
    return c.tip || define(c.s);
  }

  // group 'primary': a primary brain diagnosis, and group 'substance': a substance or medication diagnosis.
  //   Both are named in their own right (the delirium or coma is how it presents, not "acute encephalopathy").
  // group 'systemic': causes acting on the brain from outside, written as the named encephalopathy
  //   ("Hepatic encephalopathy, manifesting as ..."), grouped by cat.
  var CAUSES = [
    { id: 'cns', group: 'primary', t: 'CNS infection', s: 'CNS infection', tip: 'CNS: central nervous system\nPrimary CNS meningoencephalitis, brain abscess, infectious ventriculitis etc.', dx: 'Primary CNS infection (meningitis or encephalitis)' },
    { id: 'stroke', group: 'primary', t: 'Ischemic stroke', s: 'Ischemic stroke', dx: 'Acute ischemic stroke' },
    { id: 'ich', group: 'primary', t: 'Intracerebral hemorrhage', s: 'ICH', tip: 'Intracerebral hemorrhage', dx: 'Intracerebral hemorrhage (ICH)' },
    { id: 'sah', group: 'primary', t: 'Subarachnoid hemorrhage', s: 'SAH', tip: 'Subarachnoid hemorrhage', dx: 'Subarachnoid hemorrhage (SAH)' },
    { id: 'sz', group: 'primary', t: 'Seizure, postictal or NCSE', s: 'Seizure/NCSE', dx: 'Seizure (postictal state or non-convulsive status)' },
    { id: 'tumor', group: 'primary', t: 'Brain tumor or mass', s: 'Tumor/mass', dx: 'Brain tumor or mass' },
    { id: 'tbi', group: 'primary', t: 'Traumatic brain injury', s: 'TBI', tip: 'Traumatic brain injury', dx: 'Traumatic brain injury (TBI)' },
    { id: 'sdh', group: 'primary', t: 'Subdural hematoma', s: 'SDH', tip: 'Subdural hematoma', dx: 'Subdural hematoma (SDH)' },
    { id: 'etohx', group: 'substance', t: 'Alcohol intoxication', s: 'Alcohol intoxication', dx: 'Alcohol intoxication' },
    { id: 'drugx', group: 'substance', t: 'Drug intoxication/overdose', s: 'Drug intoxication/overdose', tip: 'Opioids\n• Fentanyl and fentanyl analogues, now the most common\n• Heroin\n• Nitazenes (newer, very potent synthetic opioids)\n• Xylazine (“tranq”), a sedative often mixed into fentanyl that doesn’t respond to naloxone\n\nStimulants\n• Methamphetamine and amphetamines\n• Cocaine, including crack\n• MDMA (ecstasy, “molly”)\n• Synthetic cathinones (“bath salts”, e.g. alpha-PVP, “flakka”)\n\nCannabinoids\n• Cannabis, especially high-potency edibles and concentrates\n• Synthetic cannabinoids (“K2”, “Spice”), which cause more severe agitation, psychosis and seizures\n\nDissociatives and hallucinogens\n• PCP\n• Ketamine\n• Dextromethorphan in high doses (over the counter, but misused)\n• LSD, psilocybin\n\nSedative-hypnotics\n• GHB/GBL\n• Non-prescribed or counterfeit benzodiazepines, including “designer” ones like bromazolam\n\nInhalants\n• Solvents and aerosols (toluene, butane), nitrous oxide (“whippets”)', dx: 'Drug intoxication/overdose due to [specify drug]' },
    { id: 'etohwd', group: 'substance', t: 'Alcohol withdrawal', s: 'Alcohol withdrawal', dx: 'Alcohol withdrawal' },
    { id: 'drugwd', group: 'substance', t: 'Drug withdrawal', s: 'Drug withdrawal', tip: 'Alcohol (AWS/DTs), benzodiazepines, baclofen, opioids withdrawal etc.', dx: 'Drug withdrawal' },
    { id: 'toxidrome', group: 'substance', t: 'Toxidromes', s: 'Toxidromes', tip: 'Psychiatric medication toxidrome: a syndrome of altered mental status and neurologic and/or autonomic dysfunction resulting from toxicity, accumulation, overdose, interaction, or adverse reaction to psychotropic medications, producing a recognizable clinical pattern such as serotonin syndrome, anticholinergic toxicity, neuroleptic malignant syndrome, or lithium toxicity.', dx: 'Toxidrome: [specify toxidrome]' },
    // One chip per encephalopathy category; tip = the underlying causes shown on hover / tap.
    { id: 'septic', group: 'systemic', spec: ' due to [specify etiology]', t: 'Septic encephalopathy', s: 'Septic', tip: 'Septic encephalopathy is a global cerebral dysfunction caused by peripheral infection, with no direct CNS extension or cytokine mediated encephalopathy: cytokine storm, HLH, MAS.', doc: 'septic encephalopathy' },
    { id: 'toxic', group: 'systemic', spec: ' due to [specify etiology]', t: 'Toxic encephalopathy', s: 'Toxic', tip: 'Toxic encephalopathy is a global cerebral dysfunction caused by exposure to toxic substances or accumulation of toxic metabolites, resulting in altered cognition, consciousness, behavior, or neurologic function.\n\nEnvironmental and Occupational Toxins\n• Carbon monoxide\n• Lead\n• Mercury\n• Manganese\n• Arsenic\n• Organic solvents (e.g., toluene, benzene, xylene)\n• Methanol\n• Ethylene glycol\n• Hydrogen sulfide\n• Pesticides (especially organophosphates)\n\nPrescription and Therapeutic Agents\n• Lithium\n• Tacrolimus\n• Cyclosporine\n• Ifosfamide\n• Methotrexate\n• Cefepime\n• Metronidazole\n• Acyclovir\n• Baclofen\n• Amiodarone (rarely)\n\nIndustrial and Other Chemical Exposures\n• Ammonia (inhalational exposure)\n• Formaldehyde\n• Carbon disulfide\n• Paint thinners\n• Degreasing agents\n• Heavy-metal mixtures', doc: 'toxic encephalopathy' },
    { id: 'metabolic', group: 'systemic', spec: ' due to [specify etiology]', t: 'Metabolic encephalopathy', s: 'Metabolic', tip: 'Metabolic encephalopathy is a global cerebral dysfunction caused by:\n\nOrgan failure: hepatic encephalopathy; uremic encephalopathy, plus dialysis disequilibrium; pulmonary encephalopathy: hypercapnia (CO₂ narcosis) and hypoxemia; pancreatic encephalopathy\nGlycemic: hypoglycemia, DKA, hyperosmolar hyperglycemic state\nElectrolyte and osmolar: hypo- or hypernatremia; hyper- or hypocalcemia; hyper- or hypomagnesemia; hypophosphatemia; osmotic demyelination after overly rapid sodium correction\nAcid–base: severe acidemia, lactic acidosis\nNon-cirrhotic hyperammonemia: valproate, urea cycle disorders, portosystemic shunts, urease-producing UTI with retention\nEndocrine: myxedema coma, thyroid storm; adrenal crisis, panhypopituitarism\nRare: porphyria', doc: 'metabolic encephalopathy' },
    { id: 'nutritional', group: 'systemic', spec: ' due to [specify etiology]', t: 'Nutritional encephalopathy', s: 'Nutritional', tip: 'Nutritional encephalopathy is a global cerebral dysfunction that can be caused by conditions like:\n\nWernicke’s encephalopathy (thiamine deficiency)\nVitamin B12 deficiency, folate deficiency\nPellagra (niacin deficiency)', doc: 'nutritional encephalopathy' },
    { id: 'vascular', group: 'systemic', spec: ' due to [specify etiology]', t: 'Vascular encephalopathy', s: 'Vascular', tip: 'Vascular encephalopathy is a global cerebral dysfunction that can be caused by conditions like:\n\nDiffuse, not a focal stroke like hypoxic-ischemic (post-anoxic) encephalopathy or a low-flow or hypoperfusion encephalopathy (i.e. cardiogenic shock/severe heart failure).', doc: 'vascular encephalopathy' },
    { id: 'autoimmune', group: 'systemic', spec: ' due to [specify etiology]', t: 'Autoimmune encephalopathy', s: 'Autoimmune', tip: 'Autoimmune encephalopathy is a global cerebral dysfunction that can be caused by conditions like:\n\nSteroid-responsive encephalopathy (Hashimoto’s encephalopathy, also called SREAT)\nAntibody-mediated encephalitis: NMDAR, LGI1, CASPR2, GABA-B, and others\nParaneoplastic encephalitis (intracellular antigens, T-cell mediated, poorer prognosis)\nPost-HSV autoimmune encephalitis\nImmune checkpoint inhibitor encephalitis\nADEM\nPrimary CNS vasculitis\nSystemic disease: neuropsychiatric lupus, neurosarcoidosis, Behçet’s, Susac syndrome', doc: 'autoimmune encephalopathy' },
    { id: 'unk', group: 'unknown', t: 'Not yet known', s: 'Not yet known' }
  ];

  var ORDER = ['home', 'baseline', 'arousal', 'features', 'flags', 'cause', 'result'];

  // RASS -4 or -5 (no response to voice) counts as coma.
  // This is the one number to change if reviewers want RASS -3 included.
  var COMA_CUTOFF = -4;

  var LEVELS = ['Low likelihood', 'Moderate likelihood', 'High likelihood'];

  function isComa(a) {
    return typeof a.rass === 'number' && a.rass <= COMA_CUTOFF;
  }

  // Wording for depressed arousal: RASS -5 is coma, RASS -4 is stupor/coma.
  function arousalTerm(rass) {
    return rass <= -5 ? 'coma' : 'stupor/coma';
  }

  // Which screen comes next (dir = 1) or before (dir = -1), including the two shortcuts.
  function nextScreen(screen, a, dir) {
    var n = ORDER[ORDER.indexOf(screen) + dir];
    if (dir > 0 && screen === 'baseline' && a.acute === 'no') n = 'result';
    if (dir > 0 && screen === 'arousal' && isComa(a)) n = 'flags';
    if (dir < 0 && screen === 'result' && a.acute === 'no') n = 'baseline';
    if (dir < 0 && screen === 'flags' && isComa(a)) n = 'arousal';
    return n || screen;
  }

  // Selecting "Not yet known" clears other causes; picking a real cause clears "Not yet known".
  function toggleCause(causes, id) {
    var m = Object.assign({}, causes);
    m[id] = !m[id];
    if (id === 'unk' && m.unk) m = { unk: true };
    if (id !== 'unk' && m[id]) delete m.unk;
    return m;
  }

  /*
   * a = { acute: 'yes'|'unsure'|'no', rass: number|null,
   *       tool: 'cam' (default) | 'camicu',
   *       feats: {fluct, inatt, disorg}, dem: boolean,
   *       flags: {focal, seiz, mening, fall}, causes: {stroke, ...} }
   */
  function evaluate(a) {
    var f = a.feats || {}, flagsIn = a.flags || {}, causesIn = a.causes || {};
    var coma = isComa(a);
    var tool = TOOLS[a.tool] || TOOLS.cam;
    var f1 = a.acute === 'yes' || a.acute === 'unsure' || !!f.fluct;
    var loc = typeof a.rass === 'number' && a.rass !== 0 && !coma;
    var positive = f1 && !!f.inatt && (!!f.disorg || loc);
    var n = [f.fluct, f.inatt, f.disorg, loc].filter(Boolean).length;
    var level, phenotype, summary;

    // Checked top to bottom; the first match decides.
    if (a.acute === 'no') {
      level = 0; phenotype = 'Acute encephalopathy unlikely';
      summary = 'No acute change from baseline. Consider a chronic neurocognitive disorder instead.';
    } else if (coma) {
      level = 2; phenotype = arousalTerm(a.rass) === 'coma' ? 'Coma' : 'Stupor/coma';
      summary = 'Unresponsive to voice: the most severe level of depressed consciousness.';
    } else if (positive && !a.dem) {
      level = 2; phenotype = 'Delirium';
      summary = tool.name + ' positive: acute change or fluctuation, inattention, and disorganized thinking or altered consciousness.';
    } else if (positive && a.dem) {
      level = 1; phenotype = 'Possible delirium on top of dementia';
      summary = tool.name + ' positive, but known dementia could explain some features. Compare carefully with baseline.';
    } else if (n >= 1) {
      level = 1; phenotype = 'Subsyndromal delirium';
      summary = tool.name + ' negative, but some features are present' + (f.inatt ? '.' : ': inattention, which the ' + tool.name + ' requires, is absent.');
    } else {
      level = 0; phenotype = 'No delirium features';
      summary = 'Acute change reported, but ' + tool.name + ' features are absent. Look for other explanations.';
    }

    // Unknown baseline: hold the result one level lower, unless a fluctuating course confirms Feature 1.
    if (a.acute === 'unsure' && !f.fluct && level > 0) {
      level -= 1;
      summary += ' Held one level lower until baseline is confirmed.';
    }

    // Motor subtype from RASS (not for coma or when no features).
    var subtype = '';
    if (a.acute !== 'no' && !coma && n >= 1) {
      subtype = a.rass > 0 ? 'hyperactive' : (a.rass < 0 ? 'hypoactive' : 'mixed or undetermined');
    }

    var picked = CAUSES.filter(function (c) { return causesIn[c.id] && c.id !== 'unk'; });
    var brain = picked.filter(function (c) { return c.group === 'primary'; });
    var substance = picked.filter(function (c) { return c.group === 'substance'; });
    var primary = brain.concat(substance);  // named in their own right
    var systemic = picked.filter(function (c) { return c.group === 'systemic'; });
    var phenDoc = coma ? arousalTerm(a.rass) : (phenotype === 'Subsyndromal delirium' ? 'subsyndromal delirium' : 'delirium');
    var subDoc = subtype && subtype !== 'mixed or undetermined' ? subtype + ' ' : '';
    var presentation = (phenotype === 'Possible delirium on top of dementia' ? 'possible ' : '') + subDoc + phenDoc;
    // Known dementia with a new change: the Diagnosis always names it.
    if (a.dem && a.acute !== 'no') presentation += coma ? ' with underlying dementia' : ' superimposed on dementia';

    // "<diagnosis>, presenting with <presentation>".
    var primaryDx = primary.map(function (c) { return c.dx; }).join(' and ');
    if (primaryDx) primaryDx = primaryDx.charAt(0).toUpperCase() + primaryDx.slice(1);
    var primaryLine = primaryDx + ', presenting with ' + presentation;
    // Named encephalopathies, each named once (sepsis and infection without sepsis both write septic encephalopathy).
    // Every Encephalopathy-section chip asks for the specific etiology.
    var named = systemic.map(function (c) { return c.doc + (c.spec || ''); })
      .filter(function (d, i, all) { return all.indexOf(d) === i; });
    var cap = function (t) { return t.charAt(0).toUpperCase() + t.slice(1); };

    // Two or more contributing diagnoses: "Multifactorial <presentation> due to:" then a numbered list,
    // primary brain diagnoses first, then encephalopathies, then substance/medication; each group A–Z.
    var az = function (list) { return list.slice().sort(function (x, y) { x = x.toLowerCase(); y = y.toLowerCase(); return x < y ? -1 : x > y ? 1 : 0; }); };
    var dxOf = function (c) { return c.dx; };
    var contributors = az(brain.map(dxOf)).concat(az(named), az(substance.map(dxOf)));

    var note;
    if (level === 0) note = !a.dem ? 'Acute encephalopathy not supported at this time.'
      : a.acute === 'no' ? 'Dementia at baseline; acute encephalopathy not supported at this time.'
      : 'Acute encephalopathy not supported at this time; known dementia.';
    else if (contributors.length >= 2) {
      note = 'Multifactorial ' + presentation + ' due to:\n' +
        contributors.map(function (t, i) { return (i + 1) + '. ' + cap(t); }).join('\n');
    }
    else if (primary.length) note = primaryLine + '.';
    else if (named.length) note = cap(named[0]) + ', manifesting as ' + presentation + '.';
    // No cause named (or "Not yet known"): describe the presentation only; "acute encephalopathy" needs an etiology.
    else note = cap(presentation) + ', etiology not yet identified.';

    // Red flags always show, whatever the likelihood.
    var flags = FLAGS.filter(function (x) { return flagsIn[x.id]; });
    var nextSteps = flags.map(function (x) { return x.t + ': ' + x.act + '.'; });
    if (level > 0 && !picked.length) nextSteps.push('No cause named yet: consider brain imaging.');

    var skip = coma || a.acute === 'no';
    var criteria = [
      { label: 'Acute change', met: a.acute === 'yes', status: a.acute === 'yes' ? 'Yes' : (a.acute === 'unsure' ? 'Unsure' : 'No') },
      { label: 'Arousal (RASS)', met: coma, neutral: !coma, status: typeof a.rass !== 'number' ? 'Not scored' : (a.rass > 0 ? '+' : (a.rass < 0 ? '−' : '')) + Math.abs(a.rass) + (coma ? ' · ' + arousalTerm(a.rass) : '') }
    ];
    var feature = function (num, label, met) {
      return { num: num, label: 'Feature ' + num + ' · ' + label, met: !skip && met, status: skip ? 'Skipped' : (met ? 'Present' : 'Absent') };
    };
    criteria = criteria.concat([
      feature(1, 'Acute change or fluctuation', f1),
      feature(2, 'Inattention', !!f.inatt),
      feature(tool.order.disorg, 'Disorganized thinking', !!f.disorg),
      feature(tool.order.loc, 'Altered consciousness', loc)
    ].sort(function (x, y) { return x.num - y.num; }));

    return {
      tool: tool.name,
      level: level,
      levelText: LEVELS[level],
      phenotype: phenotype,
      subtype: subtype,
      title: subtype && !coma && level > 0 ? phenotype + ' · ' + subtype : phenotype,
      summary: summary,
      primaryDx: level > 0 ? primaryDx : '',
      note: note,
      flags: flags,
      noCause: level > 0 && !picked.length,
      nextSteps: nextSteps,
      criteria: criteria
    };
  }

  var api = {
    RASS: RASS, ACUTE: ACUTE, FEATS: FEATS, TOOLS: TOOLS, FLAGS: FLAGS, CAUSES: CAUSES, ABBR: ABBR, define: define, hint: hint, ORDER: ORDER,
    COMA_CUTOFF: COMA_CUTOFF, isComa: isComa, arousalTerm: arousalTerm, nextScreen: nextScreen, toggleCause: toggleCause, evaluate: evaluate
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AE = api;
})(this);
