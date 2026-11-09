'use strict';
const L = window.rdLocal;
const $ = (id) => document.getElementById(id);
const LABEL = { control: ['Use my mouse and keyboard', 'You can pause or stop it at any time'], clip: ['Copy and paste with me', 'Text only'], files: ['Send me files', 'Saved to Downloads, OENOD Remote. Never opened.'] };
let sent = false;
L.on('rd:c:data', (d) => {
  $('av').textContent = String(d.name || '?').split(/\s+/).map((x) => x[0]).join('').slice(0, 2).toUpperCase();
  $('title').textContent = d.name + (d.kind === 'join' ? ' wants to join and watch' : d.kind === 'rights' ? ' asks for more' : ' wants to see your screen');
  $('sub').textContent = d.company || '';
  if (d.hq) { const t = document.createElement('span'); t.className = 'tag'; t.textContent = 'OENOD staff'; $('sub').appendChild(t); }
  $('sf').textContent = d.safety || '···';
  let pick = 0;
  if (d.kind === 'connect' && d.screens.length) {
    $('scrbox').hidden = false;
    d.screens.forEach((s, i) => {
      const b = document.createElement('button'); b.type = 'button'; if (i === 0) b.className = 'on';
      if (s.thumb) { const im = document.createElement('img'); im.src = s.thumb; im.alt = ''; b.appendChild(im); }
      b.appendChild(document.createTextNode(s.name));
      b.onclick = () => { pick = i; [...$('scr').children].forEach((x, j) => x.classList.toggle('on', j === i)); };
      $('scr').appendChild(b);
    });
  }
  const rights = d.rights.filter((r) => LABEL[r] && (r !== 'control' || d.control));
  if (d.kind === 'join' || !rights.length) { $('rbox').hidden = true; }
  if (d.kind === 'connect' && !rights.length) { $('rbox').hidden = false; $('rights').innerHTML = '<div class="row"><span>See my screen<small>Nothing else</small></span></div>'; }
  rights.forEach((r) => {
    const row = document.createElement('label'); row.className = 'row';
    const sp = document.createElement('span'); sp.textContent = LABEL[r][0]; const sm = document.createElement('small'); sm.textContent = LABEL[r][1]; sp.appendChild(sm);
    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.className = 'sw'; cb.checked = true; cb.dataset.r = r; cb.setAttribute('aria-label', LABEL[r][0]);
    row.append(sp, cb); $('rights').appendChild(row);
  });
  if (d.rights.includes('control') && !d.control) { $('note').textContent = 'They asked to use your mouse and keyboard, but this computer does not allow apps to do that, so they can only see and point.'; }
  if (d.kind === 'connect') {
    [15, 30, 60, 120].filter((m) => m <= d.limitMax).forEach((m) => { const o = document.createElement('option'); o.value = m; o.textContent = m + ' minutes'; if (m === 30) o.selected = true; $('lim').appendChild(o); });
  } else $('limbox').remove();
  if (d.kind === 'rights') $('yes').textContent = 'Allow these';
  let n = 30 - d.age;
  const tick = () => { $('bar').style.width = (n / 30 * 100) + '%'; $('cd').textContent = 'Closes on its own in ' + n + ' s if you do nothing'; if (n-- <= 0) answer(false); };
  tick(); setInterval(tick, 1000);
  const answer = (allow) => {
    if (sent) return; sent = true;
    const r = [...document.querySelectorAll('[data-r]')].filter((x) => x.checked).map((x) => x.dataset.r);
    L.send('rd:c:answer', { allow, rights: allow ? r : [], limit: +($('lim')?.value || 30), screen: pick });
  };
  $('no').onclick = () => answer(false);
  $('yes').onclick = () => answer(true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') answer(false); });
  $('no').focus(); // Enter alone never allows
});
