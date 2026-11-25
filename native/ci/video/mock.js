// Demo server for the Google Play background-location video (runs only inside the CI emulator job).
// A made-up employee at a made-up shop; nothing here talks to oenod.com.
const http = require('http');
let mode = 'none', clocked = null;
const LAT = 53.5444, LNG = -113.4909; // demo shop (downtown Edmonton)
const pad = (n) => String(n).padStart(2, '0');
const sql = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:00`;
const sess = { csrf: 'demo', user: { id: 2, name: 'Lina Haddad', email: 'lina@example.test', role: 'employee' },
  company: { id: 1, name: 'Demo Cafe', modules_off: [], timezone: 'America/Edmonton', currency: 'CAD' }, employee: { id: 7, name: 'Lina Haddad' } };
http.createServer((q, r) => {
  const j = (o, c = 200) => { r.writeHead(c, { 'content-type': 'application/json' }); r.end(JSON.stringify(o)); };
  const u = q.url.split('?')[0];
  if (u === '/__mode') { mode = new URL('http://x' + q.url).searchParams.get('m'); return j({ mode }); }
  let b = []; q.on('data', (c) => b.push(c)); q.on('end', () => {
    console.log(q.method, q.url);
    if (u === '/api/session' || u === '/api/auth/login') return j(sess);
    if (u === '/api/me/arrival') {
      if (mode === 'none') return j({ tz: 'America/Edmonton', today: [], tomorrow: [] });
      const s = new Date(Date.now() + 10 * 60000), e = new Date(Date.now() + 8 * 3600000);
      return j({ tz: 'America/Edmonton', reminder_min: 5, today: [{ shift_id: 501, start: s.toISOString(), end: e.toISOString(), start_hm: '', location: { id: 3, name: 'Demo Cafe', lat: LAT, lng: LNG, radius_m: 150 } }], tomorrow: [] });
    }
    if (u === '/api/me/clock' && q.method === 'GET') return j({ open: clocked });
    if (u === '/api/me/clock' && q.method === 'POST') { clocked = { clock_in: sql(new Date()), location_name: 'Demo Cafe' }; return j({ ok: true, open: clocked }); }
    if (u === '/api/geo/me') return j({ enabled: false, track: false, consented: true, session: null });
    if (u === '/api/notifications') return j({ items: [], unread: 0 });
    return j({ error: 'Demo data only' }, 503);
  });
}).listen(8747, () => console.log('mock up'));
