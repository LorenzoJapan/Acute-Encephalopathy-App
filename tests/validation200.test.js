// Second independent validation: 200 new adult patients, expected results from the Python reference
// in tests/validation-200/build_cases.py. Runs the app's rules on each one and compares the whole result.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const AE = require('../logic.js');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'validation-200', 'cases.json'), 'utf8'));
const asSet = (list) => list.reduce((m, k) => { m[k] = true; return m; }, {});
const FIELDS = ['level', 'levelText', 'phenotype', 'subtype', 'note', 'nextSteps'];

test('Validation set 2: 200 adult patients', () => {
  assert.strictEqual(data.cases.length, 200);
  data.cases.forEach((c) => assert.ok(c.age >= 18, c.id + ' is an adult'));
});

data.cases.forEach((c) => {
  test(c.id + ' (RASS ' + c.rass + ', ' + c.causes.filter((k) => k !== 'unk').length + ' etiologies)', () => {
    const r = AE.evaluate({ acute: c.acute, rass: c.rass, tool: c.tool, feats: c.feats, dem: c.dem, flags: asSet(c.flags), causes: asSet(c.causes) });
    FIELDS.forEach((f) => assert.deepStrictEqual(r[f], c.expected[f], c.id + ' ' + f));
  });
});
