/* Acute Encephalopathy App: screens and taps. The clinical rules live in logic.js. */
(function () {
  'use strict';
  var AE = window.AE;

  var ICON = {
    back: '<svg width="12" height="20" viewBox="0 0 12 20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 2 2 10l8 8"/></svg>',
    tick: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5 10 17 19 7"/></svg>',
    yes: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5 10 17 19 7"/></svg>',
    no: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    warn: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4"/><path d="M12 17.5v.01"/></svg>',
    copy: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
    chev: '<svg width="8" height="14" viewBox="0 0 8 14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m1 1 6 6-6 6"/></svg>',
    brain: '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.5 3.5a3 3 0 0 0-3 3v.2A3 3 0 0 0 4 9.6a3 3 0 0 0 .6 4.9A3 3 0 0 0 7 19a2.5 2.5 0 0 0 5 .5V5.5a2 2 0 0 0-2.5-2Z"/><path d="M14.5 3.5a3 3 0 0 1 3 3v.2A3 3 0 0 1 20 9.6a3 3 0 0 1-.6 4.9A3 3 0 0 1 17 19a2.5 2.5 0 0 1-5 .5"/></svg>'
  };

  function fresh() {
    return { screen: 'home', acute: null, rass: null, tool: 'cam', feats: {}, dem: false, flags: {}, causes: {}, copied: false, showCrit: false };
  }
  var s = fresh();

  // Display preferences (Light/Dark, Standard/Large text). Stored on this device only; no answers are stored.
  var prefs = { theme: null, text: 'standard' };
  try { var saved = JSON.parse(localStorage.getItem('ae-display') || '{}'); prefs.theme = saved.theme || null; prefs.text = saved.text || 'standard'; } catch (e) {}
  if (prefs.theme !== 'light' && prefs.theme !== 'dark') {
    prefs.theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function applyPrefs() {
    var el = document.documentElement;
    el.setAttribute('data-theme', prefs.theme);
    el.setAttribute('data-text', prefs.text);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', prefs.theme === 'dark' ? '#0E1413' : '#F3F6F5');
    try { localStorage.setItem('ae-display', JSON.stringify(prefs)); } catch (e) {}
  }
  applyPrefs();

  // On a computer the app shows in an iPhone 13 Pro Max shell (460 x 976 with the bezel); shrink it to fit a shorter window.
  function fitFrame() {
    var scale = Math.min(1, (window.innerHeight - 40) / 976, (window.innerWidth - 40) / 460);
    document.documentElement.style.setProperty('--ae-frame-scale', String(Math.max(scale, 0.4)));
  }
  fitFrame();
  window.addEventListener('resize', fitFrame);
  var settingsOpen = false, sheetWasOpen = false, tipSheetWasOpen = false;

  function esc(t) {
    return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }

  function option(action, value, on, title, detail, score, compact) {
    return '<button type="button" class="opt' + (compact ? ' compact' : '') + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-action="' + action + '" data-value="' + esc(value) + '">' +
      (score !== undefined ? '<span class="score">' + score + '</span>' : '') +
      '<span class="otext"><span class="ot">' + esc(title) + '</span><span class="od">' + esc(detail) + '</span></span>' +
      '<span class="tick" aria-hidden="true">' + ICON.tick + '</span></button>';
  }

  var SETTINGS_BTN = '<button type="button" class="navbtn" aria-label="Display settings" data-action="settings">Aa</button>';

  function home() {
    return '<div class="screen" style="padding-top:28px">' +
      '<div class="homehead"><div class="hero">' + ICON.brain + '</div>' + SETTINGS_BTN + '</div>' +
      '<p class="eyebrow">Bedside decision support</p>' +
      '<h1 class="h1">Acute Encephalopathy</h1>' +
      '<p class="lead">A five-step check that turns what you see at the bedside into a likelihood, a named presentation, and more specific diagnostic framework.</p>' +
      '<div class="card"><ol class="steps">' +
      '<li><span class="num">1</span><span><strong>Baseline.</strong> Is this a new change?</span></li>' +
      '<li><span class="num">2</span><span><strong>Arousal.</strong> How awake is the patient (RASS)?</span></li>' +
      '<li><span class="num">3</span><span><strong>Features.</strong> CAM, or CAM-ICU in the ICU.</span></li>' +
      '<li><span class="num">4</span><span><strong>Red flags.</strong> Signs that need urgent imaging, EEG or LP.</span></li>' +
      '<li><span class="num">5</span><span><strong>Cause.</strong> What is driving it?</span></li>' +
      '</ol></div>' +
      '<p class="micro">Based on Slooter et al., Intensive Care Med 2020, and the CAM / CAM-ICU. Supports clinical judgement; it does not replace it.</p></div>';
  }

  function baseline() {
    return '<div class="screen"><h2 class="h2">Is this an acute change from baseline?</h2>' +
      '<p class="lead">New or worse over hours to days (under four weeks). Check with family, the facility or prior notes.</p>' +
      '<div class="opts">' + AE.ACUTE.map(function (o) { return option('acute', o.id, s.acute === o.id, o.t, o.d); }).join('') + '</div>' +
      '<p class="section" id="dem-label">Known dementia?</p>' +
      '<div class="seg" role="group" aria-labelledby="dem-label">' +
      '<button type="button" class="' + (s.dem ? '' : 'on') + '" aria-pressed="' + !s.dem + '" data-action="dem" data-value="no">No</button>' +
      '<button type="button" class="' + (s.dem ? 'on' : '') + '" aria-pressed="' + s.dem + '" data-action="dem" data-value="yes">Yes</button>' +
      '</div></div>';
  }

  function arousal() {
    var coma = AE.isComa(s);
    return '<div class="screen tight"><h2 class="h2 sm">How awake is the patient?</h2>' +
      '<p class="lead">RASS. Assess off sedation where you can.</p>' +
      '<div class="opts compact">' + AE.RASS.map(function (o) {
        var lbl = (o.v > 0 ? '+' : (o.v < 0 ? '−' : '')) + Math.abs(o.v);
        return option('rass', o.v, s.rass === o.v, o.t, o.d, lbl, true);
      }).join('') + '</div>' +
      (coma ? '<div class="banner sm" role="status">' + ICON.warn + '<span><strong>Unresponsive to voice — ' + AE.arousalTerm(s.rass) + '.</strong> Features skipped; urgent search for the cause.</span></div>' : '') +
      '</div>';
  }

  function features() {
    var tool = AE.TOOLS[s.tool];
    var loc = typeof s.rass === 'number' && s.rass !== 0;
    return '<div class="screen tight"><h2 class="h2">Which features are present?</h2>' +
      '<div class="seg" role="group" aria-label="Screening tool">' +
      '<button type="button" class="' + (s.tool === 'cam' ? 'on' : '') + '" aria-pressed="' + (s.tool === 'cam') + '" data-action="tool" data-value="cam">CAM</button>' +
      '<button type="button" class="' + (s.tool === 'camicu' ? 'on' : '') + '" aria-pressed="' + (s.tool === 'camicu') + '" data-action="tool" data-value="camicu">Run CAM-ICU</button>' +
      '</div>' +
      '<p class="lead">Tap all that apply. Delirium needs an acute change or fluctuation, plus inattention, plus disorganized thinking or altered consciousness.</p>' +
      '<div class="opts">' + tool.items.map(function (o) { return option('feat', o.id, !!s.feats[o.id], o.t, o.d); }).join('') + '</div>' +
      '<div class="card" style="display:flex;align-items:center;gap:12px">' +
      '<span class="otext"><span class="ot" style="font-size:var(--ae-fs-callout)">Altered consciousness</span><span class="od">' + esc(tool.loc) + '</span></span>' +
      '<span class="' + (loc ? 'yes' : 'no') + '" style="font-size:var(--ae-fs-callout)">' + (loc ? ICON.yes + 'Present' : 'Absent') + '</span></div>' +
      '</div>';
  }

  function flags() {
    return '<div class="screen"><h2 class="h2">Any neurological red flags?</h2>' +
      '<p class="lead">These change what you order next. Tap all that apply, or none.</p>' +
      '<div class="opts">' + AE.FLAGS.map(function (o) { return option('flag', o.id, !!s.flags[o.id], o.t, o.d); }).join('') + '</div></div>';
  }

  function chips(group) {
    return '<div class="chips tight">' + AE.CAUSES.filter(function (c) { return c.group === group; }).map(function (c) {
      var on = !!s.causes[c.id], def = AE.hint(c);
      // Acronyms get a dotted underline and a hover definition (computer); a tap shows the bubble (iPhone).
      var label = c.tip ? '<abbr title="' + esc(c.tip) + '">' + esc(c.s) + '</abbr>'
        : esc(c.s).replace(/\b[A-Z]{2,}\b/g, function (a) { return AE.ABBR[a] ? '<abbr title="' + esc(AE.ABBR[a]) + '">' + a + '</abbr>' : a; });
      return '<button type="button" class="chip sm' + (on ? ' on' : '') + '" aria-pressed="' + on + '" aria-label="' + esc(c.t + (def ? ' (' + def + ')' : '')) + '" data-action="cause" data-value="' + c.id + '">' + label + '</button>';
    }).join('') + '</div>';
  }

  function cause() {
    var anyFlag = AE.FLAGS.some(function (x) { return s.flags[x.id]; });
    return '<div class="screen compact"><div class="titlerow"><h2 class="h2 sm">What is driving it?</h2>' + chips('unknown') + '</div>' +
      '<p class="micro">(choose all that apply)</p>' +
      (anyFlag ? '<div class="banner mod sm" role="status">' + ICON.warn + '<span><strong>Red flags noted.</strong> Consider stroke, seizure, <abbr title="' + esc(AE.ABBR.CNS) + '">CNS</abbr> infection or head injury.</span></div>' : '') +
      '<p class="section">Primary brain related</p>' + chips('primary') +
      '<p class="section">Substance abuse/medication related</p>' + chips('substance') +
      '<p class="section">Encephalopathy related</p>' +
      chips('systemic') +
      (tipId ? '<div class="tipbubble" aria-hidden="true">' + esc(AE.hint(AE.CAUSES.filter(function (c) { return c.id === tipId; })[0])) + '</div>' : '') +
      '</div>';
  }

  function result() {
    var r = AE.evaluate(s);
    var met = r.criteria.filter(function (c) { return c.met; }).length;
    return '<div class="screen tight">' +
      '<div class="likely lv-' + r.level + '" aria-live="polite">' +
      '<span class="badge">' + r.levelText + '</span>' +
      (r.primaryDx ? '<p class="micro pdx">Primary diagnosis: ' + esc(r.primaryDx) + '</p>' : '') +
      '<p class="phen">' + esc(r.title) + '</p>' +
      '<div class="meter" aria-hidden="true"><span></span><span></span><span></span></div>' +
      '<p class="micro">' + esc(r.summary) + ' <span style="color:var(--ae-ink-3)">Criteria-based estimate; supports, does not replace, clinical judgement.</span></p></div>' +
      // Red-flag actions and the "no cause yet" step live in one card (red when there are red flags).
      (r.nextSteps.length ? '<div class="card' + (r.flags.length ? ' alert" role="alert' : '') + '">' +
        (r.flags.length ? '<p class="micro" style="color:inherit;font-weight:700;margin-bottom:6px">Red flags present: act on these first</p>' : '') +
        '<ul class="next">' + r.nextSteps.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>' : '') +
      '<button type="button" class="disclosure" aria-expanded="' + s.showCrit + '" aria-controls="crit" data-action="crit">Criteria' +
        '<span class="count">' + met + ' of ' + r.criteria.length + ' met</span><span class="chev">' + ICON.chev + '</span></button>' +
      (s.showCrit ? '<div class="card crit" id="crit">' + r.criteria.map(function (c) {
        return '<div class="row"><span class="lbl">' + esc(c.label) + '</span><span class="' + (c.met ? 'yes' : 'no') + '">' + (c.met ? ICON.yes : (c.neutral ? '' : ICON.no)) + esc(c.status) + '</span></div>';
      }).join('') + '</div>' : '') +
      '<p class="section">Diagnosis</p><div class="diag">' +
      '<div class="doc">' + esc(r.note) + '</div>' +
      '<button type="button" class="copy' + (s.copied ? ' done' : '') + '" data-action="copy">' + ICON.copy + (s.copied ? 'Copied' : 'Copy Diagnostic Framework') + '</button></div>' +
      '</div>';
  }

  function definition() {
    return '<div class="screen about def tight">' +
      '<h2 class="h2 sm">Acute encephalopathy</h2>' +
      '<div class="card"><p class="body">Acute encephalopathy should be used to describe a rapidly developing (in less than 4 weeks) <strong>etio-patho-biological brain process</strong> which is expressed clinically as either sub-syndromal delirium, delirium, stupor or coma and may have additional neurological features, such as seizures or extrapyramidal signs. The term acute encephalopathy is not recommended as a descriptor of clinical features that can be observed at the bedside.</p></div>' +
      '<p class="section">Acute encephalopathy: Diagnostic Criteria</p>' +
      '<div class="card"><ol class="next">' +
      '<li>Altered state of alertness/consciousness</li>' +
      '<li>Global decrease in all intellectual functions</li>' +
      '<li>Presence of abnormal neurological findings suggestive of global dysfunction (asterixis, multi-focal myoclonus, seizures, diffuse UMN findings etc.)</li>' +
      '<li>Variability minute to minute to hour to hour in abnormal neurological findings</li>' +
      '<li>Absence of:<ul class="sub"><li><strong>Structural:</strong> ischemic stroke (including bilateral thalamic or top-of-the-basilar), multifocal emboli, cerebral venous sinus thrombosis, ICH/SAH/subdural, TBI, hydrocephalus/shunt failure, tumor or leptomeningeal disease</li><li><strong>Seizures:</strong> nonconvulsive status epilepticus, postictal state</li><li><strong>Infectious meningoencephalitis:</strong> bacterial, viral (HSV), fungal, and other CNS infection</li><li><strong>Primary neurodegenerative:</strong> prion disease and other rapidly progressive dementias</li></ul></li>' +
      '</ol></div>' +
      '</div>';
  }

  function about() {
    return '<div class="screen about">' +
      '<div><h2 class="h2">About</h2><p class="lead">What this app is based on, and what it is not.</p></div>' +
      '<p class="section">What the app covers</p>' +
      '<div class="card"><p class="ot">Clinical educational tool</p>' +
      '<p class="body">For use by clinicians (physicians, advanced practice providers, and medical students) as an educational aid that assists in diagnosis framing of altered mental status and acute encephalopathy. It does not replace clinical judgment at all times by the primary physicians. Not a validated or regulatory-cleared medical device.</p></div>' +
      '<div class="card"><p class="body">Guideline content © MDGadgetz, LLC. Modification or distribution of guideline content, including within software, requires express permission from the MDGadgetz LLC.</p></div>' +
      '<p class="section">Privacy</p>' +
      '<div class="card"><ul class="next">' +
      '<li>No protected health information (PHI). The app has no text fields and never asks for names, record numbers or other patient identifiers.</li>' +
      '<li>Answers stay on this device, are not saved, and clear when you tap New assessment or close the app.</li>' +
      '<li>Nothing you enter is sent over the internet — no accounts, tracking or analytics. The app is downloaded from its web host; after that, everything runs on your device.</li>' +
      '<li>Copy Diagnostic Framework places text only on this device’s clipboard.</li>' +
      '<li>Designed for HIPAA-conscious use.</li>' +
      '</ul></div>' +
      '<p class="section">References</p>' +
      '<div class="card refs">' +
      '<p class="ot">Acute Encephalopathy Defined</p>' +
      '<p class="body">1. Slooter AJC, Otte WM, Devlin JW, Arora RC, Bleck TP, Claassen J, et al. Updated nomenclature of delirium and acute encephalopathy: statement of ten Societies. Intensive Care Med. 2020;46(5):1020-2. doi:10.1007/s00134-019-05907-4</p>' +
      '<p class="ot">Original CAM</p>' +
      '<p class="body">1. Inouye SK, van Dyck CH, Alessi CA, Balkin S, Siegal AP, Horwitz RI. Clarifying confusion: the confusion assessment method. A new method for detection of delirium. Ann Intern Med. 1990;113(12):941-8.</p>' +
      '<p class="ot">CAM-ICU</p>' +
      '<p class="body">1. Ely EW, Margolin R, Francis J, May L, Truman B, Dittus R, et al. Evaluation of delirium in critically ill patients: validation of the Confusion Assessment Method for the Intensive Care Unit (CAM-ICU). Crit Care Med. 2001;29(7):1370-9. doi:10.1097/00003246-200107000-00012</p>' +
      '<p class="ot">Original RASS</p>' +
      '<p class="body">1. Sessler CN, Gosnell MS, Grap MJ, Brophy GM, O’Neal PV, Keane KA, et al. The Richmond Agitation-Sedation Scale: validity and reliability in adult intensive care unit patients. Am J Respir Crit Care Med. 2002;166(10):1338-44.</p>' +
      '</div>' +
      '<div class="colophon"><p class="micro">Developed by MDGadgetz LLC</p><p class="micro">Acute Encephalopathy app · version 1.0 · November 2026</p></div>' +
      '</div>';
  }

  function segBtn(action, value, label, on) {
    return '<button type="button" class="' + (on ? 'on' : '') + '" aria-pressed="' + on + '" data-action="' + action + '" data-value="' + value + '">' + label + '</button>';
  }

  function settingsSheet() {
    return '<div class="sheet-backdrop"><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">' +
      '<div class="grabber" aria-hidden="true"></div>' +
      '<div class="sheet-head"><h2 id="sheet-title" tabindex="-1">Display</h2><button type="button" class="ghost" data-action="closesettings">Done</button></div>' +
      '<p class="section" id="theme-label">Appearance</p>' +
      '<div class="seg" role="group" aria-labelledby="theme-label">' + segBtn('theme', 'light', 'Light', prefs.theme === 'light') + segBtn('theme', 'dark', 'Dark', prefs.theme === 'dark') + '</div>' +
      '<p class="section" id="text-label">Text size</p>' +
      '<div class="seg" role="group" aria-labelledby="text-label">' + segBtn('textsize', 'standard', 'Standard', prefs.text === 'standard') + segBtn('textsize', 'large', 'Large', prefs.text === 'large') + '</div>' +
      '</div></div>';
  }

  // A hover too tall to fit above or below its chips opens as a sheet from the bottom instead of a bubble.
  function tipSheet(c) {
    return '<div class="sheet-backdrop" data-close="tip"><div class="sheet tipsheet" role="dialog" aria-modal="true" aria-labelledby="tip-title">' +
      '<div class="grabber" aria-hidden="true"></div>' +
      '<div class="sheet-head"><h2 id="tip-title" tabindex="-1">' + esc(c.t) + '</h2><button type="button" class="ghost" data-action="closetip">Done</button></div>' +
      '<div class="tipbody">' + esc(AE.hint(c)) + '</div>' +
      '</div></div>';
  }

  var SCREENS = { definition: definition, about: about, home: home, baseline: baseline, arousal: arousal, features: features, flags: flags, cause: cause, result: result };
  var LABELS = { home: 'Start assessment', cause: 'See result', result: 'New assessment' };

  var root = document.getElementById('app');
  var lastScreen = null;
  var tipId = null;  // which step 5 chip's explanation bubble is showing (stays until the next tap)

  function render() {
    var idx = AE.ORDER.indexOf(s.screen);
    var disabled = (s.screen === 'baseline' && !s.acute) || (s.screen === 'arousal' && s.rass === null);
    var nav = s.screen === 'home' ? '' :
      '<div><div class="nav"><button type="button" class="navbtn" aria-label="Back" data-action="back">' + ICON.back + '</button>' +
      '<h1 class="navtitle">' + (s.screen === 'definition' ? 'Definition' : s.screen === 'about' ? 'About' : s.screen === 'result' ? 'Result' : 'Step ' + idx + ' of 5') + '</h1>' + SETTINGS_BTN + '</div>' +
      (s.screen === 'about' || s.screen === 'definition' ? '' :
      '<div class="progress" role="progressbar" aria-label="Progress" aria-valuemin="0" aria-valuemax="5" aria-valuenow="' + Math.min(idx, 5) + '">' +
      '<div class="bar" style="width:' + Math.min(idx, 5) * 20 + '%"></div></div>') + '</div>';

    var scrollTop = root.querySelector('.scroll') ? root.querySelector('.scroll').scrollTop : 0;
    root.innerHTML = nav +
      '<main class="scroll">' + SCREENS[s.screen]() + '</main>' +
      (s.screen === 'about' || s.screen === 'definition' ? '' :
      '<div class="footer' + (s.screen === 'result' ? ' row' : '') + '">' +
      (s.screen === 'result' ? '<button type="button" class="secondary" data-action="edit">Edit answers</button>' : '') +
      '<button type="button" class="primary" data-action="next"' + (disabled ? ' disabled' : '') + '>' + (LABELS[s.screen] || 'Continue') + '</button>' +
      (s.screen === 'home' ? '<div class="linkrow"><button type="button" class="ghost" data-action="definition">Acute encephalopathy definition</button>' +
        '<button type="button" class="ghost" data-action="about">About</button></div>' : '') + '</div>') +
      (settingsOpen ? settingsSheet() : '');

    // Same screen: keep scroll position and skip the entrance animation.
    var sc = root.querySelector('.scroll');
    if (s.screen === lastScreen) { sc.scrollTop = scrollTop; sc.firstChild.style.animation = 'none'; }
    lastScreen = s.screen;
    // The settings sheet slides up once; later redraws (e.g. switching theme) keep it still.
    if (settingsOpen && sheetWasOpen) root.querySelectorAll('.sheet-backdrop, .sheet').forEach(function (el) { el.style.animation = 'none'; });
    sheetWasOpen = settingsOpen;

    // Place the explanation bubble below its chip's group when it fits on screen, otherwise above; keep it inside the edges.
    var tip = root.querySelector('.tipbubble'), chip = tipId && root.querySelector('[data-action="cause"][data-value="' + tipId + '"]');
    var sheetShown = false;
    if (tip && chip) {
      var w = tip.parentNode.clientWidth, tw = tip.offsetWidth, th = tip.offsetHeight;
      // Clear the chip's whole group, so the bubble never covers a neighbouring chip.
      var group = chip.parentNode, gr = group.getBoundingClientRect(), vr = sc.getBoundingClientRect();
      var fitsBelow = th <= vr.bottom - gr.bottom - 6, fitsAbove = th <= gr.top - vr.top - 6;
      if (!fitsBelow && !fitsAbove) {
        // Too tall for the screen either way: show the whole text in a sheet instead.
        tip.parentNode.removeChild(tip);
        root.insertAdjacentHTML('beforeend', tipSheet(AE.CAUSES.filter(function (c) { return c.id === tipId; })[0]));
        if (tipSheetWasOpen) root.querySelectorAll('.sheet-backdrop, .sheet').forEach(function (el) { el.style.animation = 'none'; });
        sheetShown = true;
      } else {
        var below = fitsBelow;
        tip.style.top = (below ? group.offsetTop + group.offsetHeight + 6 : group.offsetTop - th - 6) + 'px';
        tip.style.left = Math.max(0, Math.min(w - tw, chip.offsetLeft + chip.offsetWidth / 2 - tw / 2)) + 'px';
      }
    }
    tipSheetWasOpen = sheetShown;
  }

  function closeTipSheet() {
    var id = tipId;
    tipId = null;
    render();
    var c = root.querySelector('[data-action="cause"][data-value="' + id + '"]');
    if (c) c.focus({ preventScroll: true });
  }

  function toggle(key, id) {
    var m = Object.assign({}, s[key]);
    m[id] = !m[id];
    s[key] = m;
  }

  function closeSettings() {
    settingsOpen = false;
    render();
    var btn = root.querySelector('[data-action="settings"]');
    if (btn) btn.focus({ preventScroll: true });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (settingsOpen) closeSettings();
    else if (tipSheetWasOpen) closeTipSheet();
  });

  root.addEventListener('click', function (e) {
    if (e.target.classList && e.target.classList.contains('sheet-backdrop')) { if (e.target.getAttribute('data-close') === 'tip') closeTipSheet(); else closeSettings(); return; }
    var b = e.target.closest('[data-action]');
    if (!b) { if (tipId) { tipId = null; render(); } return; }  // a tap anywhere else closes the bubble
    if (b.disabled) return;
    var v = b.getAttribute('data-value');
    if (b.getAttribute('data-action') !== 'cause') tipId = null;
    var focusKey = b.getAttribute('data-action') + ':' + v;
    switch (b.getAttribute('data-action')) {
      case 'acute': s.acute = v; break;
      case 'rass': s.rass = Number(v); break;
      case 'feat': toggle('feats', v); break;
      case 'dem': s.dem = v === 'yes'; break;
      case 'tool': if (s.tool !== v) { s.tool = v; s.feats = {}; } break;
      case 'flag': toggle('flags', v); break;
      case 'cause':
        s.causes = AE.toggleCause(s.causes, v);
        var hasHint = AE.hint(AE.CAUSES.filter(function (c) { return c.id === v; })[0]);
        tipId = hasHint && tipId !== v ? v : null;  // tapping the same chip again closes its bubble
        break;
      case 'back': s.screen = s.screen === 'about' || s.screen === 'definition' ? 'home' : AE.nextScreen(s.screen, s, -1); s.copied = false; break;
      case 'definition': s.screen = 'definition'; break;
      case 'about': s.screen = 'about'; break;
      case 'crit': s.showCrit = !s.showCrit; break;
      case 'settings': settingsOpen = true; render(); var t = root.querySelector('#sheet-title'); if (t) t.focus({ preventScroll: true }); return;
      case 'closesettings': closeSettings(); return;
      case 'closetip': closeTipSheet(); return;
      case 'theme': prefs.theme = v; applyPrefs(); break;
      case 'textsize': prefs.text = v; applyPrefs(); break;
      case 'edit': s.screen = 'baseline'; s.copied = false; break;
      case 'copy':
        try { navigator.clipboard.writeText(AE.evaluate(s).note); } catch (err) { /* clipboard unavailable */ }
        s.copied = true; break;
      case 'next':
        if (s.screen === 'result') s = fresh();
        else s.screen = AE.nextScreen(s.screen, s, 1);
        break;
    }
    var changedScreen = s.screen !== lastScreen;
    render();
    // Keep keyboard / VoiceOver focus on the tapped control when staying on a screen (or on the sheet, if one opened).
    var tipTitle = root.querySelector('#tip-title');
    if (tipTitle) tipTitle.focus({ preventScroll: true });
    else if (!changedScreen) {
      var parts = focusKey.split(':');
      var again = root.querySelector('[data-action="' + parts[0] + '"]' + (parts[1] !== 'null' ? '[data-value="' + parts[1] + '"]' : ''));
      if (again) again.focus({ preventScroll: true });
    } else {
      var h = root.querySelector('.h1, .h2, .phen');
      if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    }
  });

  render();

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
})();
