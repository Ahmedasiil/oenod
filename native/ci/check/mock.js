// Demo server for the in-app button check (runs only inside the CI emulator job). A made-up owner at a made-up cafe.
// /api/* answers with demo data (or "Demo data only"); every other path is fetched from oenod.com so the real
// website pages load inside the app exactly as they do for customers. Nothing is written to oenod.com.
const http = require('http');
const https = require('https');
const sess = { csrf: 'demo', user: { id: 2, name: 'Sam Rivera', email: 'sam@example.test', role: 'owner' },
  company: { id: 1, name: 'Demo Cafe', modules_off: [], timezone: 'America/Edmonton', currency: 'CAD', status: 'active', plan: { name: 'Team' } }, employee: null, notifications: 0, announcements: [] };
const today = new Date().toISOString().slice(0, 10);
const data = {
  '/api/session': sess, '/api/auth/login': sess,
  '/api/dashboard': { sales_today: 1840.5, sales_week: 11230, sales_prev_week: 10400, on_shift: 4, planned: 5, to_approve: 2, overdue_count: 1, series: [1200, 1500, 1320, 1710, 1650, 2010, 1840] },
  '/api/employees': { employees: [{ id: 1, name: 'Lina Haddad', job_title: 'Barista', open_entry: { clock_in: today + ' 14:00:00' } }, { id: 2, name: 'Omar Said', job_title: 'Cook', open_entry: { clock_in: today + ' 13:30:00' } }, { id: 3, name: 'Ana Cruz', job_title: 'Cashier', open_entry: null }] },
  '/api/notifications': { items: [], unread: 0 }, '/api/meetings': { meetings: [] }, '/api/timeoff': { requests: [] }, '/api/schedule': { requests: [], shifts: [] },
  '/api/geo/me': { enabled: false, track: false, consented: true, session: null }, '/api/me/clock': { open: null },
  '/api/markets/watchlist': { symbols: [], ok: true }, '/api/modules': { modules: [] },
};
const UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36';
http.createServer((q, r) => {
  const u = q.url.split('?')[0];
  const j = (o, c = 200) => { r.writeHead(c, { 'content-type': 'application/json' }); r.end(JSON.stringify(o)); };
  if (!u.startsWith('/api/')) {
    console.log('PAGE', q.method, q.url);
    const up = https.request({ host: 'oenod.com', path: q.url, method: 'GET', headers: { 'user-agent': UA, accept: q.headers.accept || '*/*', 'accept-encoding': 'identity' } }, (x) => {
      const h = { ...x.headers }; delete h['content-security-policy']; delete h['strict-transport-security']; delete h['set-cookie'];
      r.writeHead(x.statusCode, h); x.pipe(r);
    });
    up.on('error', (e) => { r.writeHead(502); r.end(String(e)); }); up.end();
    return;
  }
  let b = []; q.on('data', (c) => b.push(c)); q.on('end', () => {
    console.log('API', q.method, q.url);
    if (data[u]) return j(data[u]);
    return j({ error: 'Demo data only' }, 503);
  });
}).listen(8747, () => console.log('mock up'));
