// Unit checks for OENOD Remote's input keys, file names and safety code. Run: npm run test:remote
const Module = require('module');
const load = Module._load;
Module._load = function (req, ...rest) { return req === 'electron' ? {} : load.call(this, req, ...rest); };
const assert = require('assert');
const { keyName, safeName, safety } = require('../remote.js')._test;
const eq = (a, b) => assert.strictEqual(a, b);
eq(keyName('KeyA'), 'a'); eq(keyName('Digit7'), '7'); eq(keyName('F12'), 'f12'); eq(keyName('F25'), null); eq(keyName('ArrowUp'), 'up');
eq(keyName('Numpad3'), 'numpad_3'); eq(keyName({}), null); eq(keyName('x'.repeat(40)), null); eq(keyName('Enter'), 'enter');
eq(safeName('../../etc/passwd'), 'passwd');
eq(safeName('a<b>:c?.txt'), 'a_b__c_.txt');
eq(safeName('CON.txt'), 'file_CON.txt');
eq(safeName('...'), 'file');
eq(safeName('x\u0000y.exe '), 'x_y.exe');
assert.ok(!/[\\/]/.test(safeName('..\\..\\win.ini')));
eq(safeName('a'.repeat(400)).length, 180);
// Same words as the web page (rd.js) for the same two keys, whatever the order.
eq(safety('sha-256 AA', 'sha-256 BB'), safety('sha-256 BB', 'sha-256 AA'));
assert.match(safety('sha-256 AA', 'sha-256 BB'), /^[a-z]+ · [a-z]+ · [a-z]+ · \d\d$/);
console.log('remote unit checks: all passed');
// rd2: who must read the safety warning and tick both boxes
const { needAgree } = require('../remote.js')._test;
assert.ok(needAgree({ kind: 'connect' })); assert.ok(needAgree({ kind: 'join' }));
assert.ok(needAgree({ kind: 'rights', rights: ['control'] })); assert.ok(!needAgree({ kind: 'rights', rights: ['clip'] })); assert.ok(!needAgree({ kind: 'still' }));
console.log('rd2 checks: all passed');
