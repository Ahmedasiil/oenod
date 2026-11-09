'use strict';
const L = window.rdLocal;
const $ = (id) => document.getElementById(id);
let st = null, open = false, unread = 0, skew = 0;
const fmt = (s) => { s = Math.max(0, Math.floor(s)); const m = Math.floor(s / 60); return (m >= 60 ? Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0') : m) + ':' + String(s % 60).padStart(2, '0'); };
const RL = { control: 'mouse and keyboard', clip: 'copy and paste', files: 'files' };
function paint() {
  if (!st) return;
  const names = [...new Set(st.sessions.flatMap((s) => s.names))];
  $('who').textContent = (names.join(', ') || 'Someone') + (names.length > 1 ? ' can see your screen' : ' can see your screen');
  const s0 = st.sessions[0] || {};
  const now = Date.now() / 1000 + skew;
  const rights = [...new Set(st.sessions.flatMap((s) => s.rights))].filter((r) => RL[r]);
  const ctl = rights.includes('control') && st.control;
  $('info').textContent = ['Screen' + (rights.length ? ', ' + rights.map((r) => RL[r]).join(', ') : ''), s0.ends ? fmt(s0.ends - now) + ' left' : '', st.paused ? 'control paused' : (ctl && s0.controller ? s0.controller + ' has control' : '')].filter(Boolean).join(' · ');
  $('pause').hidden = !ctl;
  $('pause').textContent = st.paused ? 'Give control back' : 'Pause control';
  $('pause').classList.toggle('on', st.paused);
  $('acc').hidden = !(ctl && !st.access);
}
function add(who, text, cls) {
  const d = document.createElement('div'); if (cls) d.className = cls;
  d.textContent = who ? who + ': ' + text : text; $('msgs').appendChild(d); $('msgs').scrollTop = 1e9;
  if (!open && cls !== 'me') { unread++; $('n').hidden = false; $('n').textContent = unread; }
}
L.on('rd:b:state', (x) => { st = x; skew = x.now - Date.now() / 1000; paint(); });
L.on('rd:b:chat', (x) => add(x.who, x.text));
L.on('rd:b:file', (x) => add('', 'Received ' + x.name + ' in Downloads, OENOD Remote', 'sys'));
setInterval(paint, 1000);
$('stop').onclick = () => L.send('rd:b:stop');
$('pause').onclick = () => L.send('rd:b:pause', !(st && st.paused));
$('acc').onclick = () => L.send('rd:b:access');
$('chat').onclick = () => { open = !open; $('cbox').hidden = !open; L.send('rd:b:size', open ? 330 : 64); if (open) { unread = 0; $('n').hidden = true; $('ci').focus(); } };
$('cf').onsubmit = (e) => { e.preventDefault(); const t = $('ci').value.trim(); if (!t) return; L.send('rd:b:chat', t); add('You', t, 'me'); $('ci').value = ''; };
