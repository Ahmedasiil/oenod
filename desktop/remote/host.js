// OENOD Remote: the hidden window that holds the secure links (WebRTC). It has no network access of its own
// and no Node.js; the main process tells it what to do and decides what any message from a helper may do.
'use strict';
const L = window.rdLocal;
const sess = {}; // token -> { cert, fp, stream, sourceId, peers: { id: { pc, ctl, fch, fp, hello } } }
const sdpFp = (sdp) => { const m = /a=fingerprint:sha-256 ([0-9A-Fa-f:]+)/.exec(sdp || ''); return m ? 'sha-256 ' + m[1].toUpperCase() : null; };

async function capture(sourceId) {
  return navigator.mediaDevices.getUserMedia({ audio: false, video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: sourceId, maxWidth: 2560, maxHeight: 1600, maxFrameRate: 15 } } });
}
async function getSess(s) {
  if (!sess[s]) {
    const cert = await RTCPeerConnection.generateCertificate({ name: 'ECDSA', namedCurve: 'P-256' });
    const f = cert.getFingerprints().find((x) => x.algorithm === 'sha-256');
    sess[s] = { cert, fp: 'sha-256 ' + f.value.toUpperCase(), peers: {}, stream: null, sourceId: null };
  }
  return sess[s];
}
function closePeer(se, id) { const p = se.peers[id]; if (!p) return; try { p.pc.close(); } catch { /* */ } delete se.peers[id]; }
function closeSess(s) { const se = sess[s]; if (!se) return; Object.keys(se.peers).forEach((id) => closePeer(se, id)); se.stream && se.stream.getTracks().forEach((t) => t.stop()); delete sess[s]; }

async function peer({ s, p, ice, sourceId, screens, cur, os }) {
  const se = await getSess(s);
  if (se.peers[p.id]) return;
  if (!se.stream || se.sourceId !== sourceId) { if (se.stream) se.stream.getTracks().forEach((t) => t.stop()); se.stream = await capture(sourceId); se.sourceId = sourceId; }
  if (!p.fp) return;
  const pc = new RTCPeerConnection({ iceServers: Array.isArray(ice) ? ice : [], certificates: [se.cert] });
  const ctl = pc.createDataChannel('ctl', { ordered: true });
  const fch = pc.createDataChannel('file', { ordered: true });
  fch.binaryType = 'arraybuffer';
  se.peers[p.id] = { pc, ctl, fch, fp: p.fp };
  se.stream.getTracks().forEach((t) => { t.contentHint = 'detail'; pc.addTrack(t, se.stream); });
  pc.onicecandidate = (e) => { if (e.candidate) L.send('rd:h:out', { s, p: p.id, k: 'ice', d: e.candidate.toJSON() }); };
  ctl.onopen = () => ctl.send(JSON.stringify({ t: 'hello', screens, cur, os }));
  ctl.onmessage = (e) => { if (typeof e.data !== 'string' || e.data.length > 200000) return; let m; try { m = JSON.parse(e.data); } catch { return; } L.send('rd:h:ctl', { s, p: p.id, m }); };
  fch.onmessage = (e) => {
    if (typeof e.data === 'string') { let m; try { m = JSON.parse(e.data); } catch { return; } if (m.t === 'meta') L.send('rd:h:file', { s, p: p.id, kind: 'meta', data: { name: String(m.name || ''), size: +m.size, sha: String(m.sha || '') } }); else if (m.t === 'end') L.send('rd:h:file', { s, p: p.id, kind: 'end' }); }
    else L.send('rd:h:file', { s, p: p.id, kind: 'chunk', data: e.data });
  };
  pc.onconnectionstatechange = () => { if (pc.connectionState === 'failed') closePeer(se, p.id); };
  const o = await pc.createOffer();
  await pc.setLocalDescription(o);
  L.send('rd:h:out', { s, p: p.id, k: 'offer', d: { type: 'offer', sdp: pc.localDescription.sdp } });
}
async function sig({ s, p, k, d }) {
  const pp = sess[s]?.peers[p]; if (!pp) return;
  if (k === 'answer') {
    // The helper's key must be the one the safety code was made from.
    if (sdpFp(d && d.sdp) !== pp.fp) { closeSess(s); L.send('rd:h:secfail', { s }); return; }
    await pp.pc.setRemoteDescription(d);
  } else if (k === 'ice' && d) await pp.pc.addIceCandidate(d).catch(() => {});
}
function send({ s, p, m }) {
  const se = sess[s]; if (!se) return;
  const txt = JSON.stringify(m);
  Object.entries(se.peers).forEach(([id, pp]) => { if ((!p || +id === p) && pp.ctl.readyState === 'open') { try { pp.ctl.send(txt); } catch { /* */ } } });
}
async function switchTo({ s, sourceId }) {
  const se = sess[s]; if (!se) return;
  const st = await capture(sourceId);
  const tr = st.getVideoTracks()[0]; tr.contentHint = 'detail';
  for (const pp of Object.values(se.peers)) { const snd = pp.pc.getSenders().find((x) => x.track && x.track.kind === 'video'); if (snd) await snd.replaceTrack(tr); }
  if (se.stream) se.stream.getTracks().forEach((t) => t.stop());
  se.stream = st; se.sourceId = sourceId;
}
const OPS = {
  sess: async ({ s }) => (await getSess(s)).fp,
  peer, sig, send, switch: switchTo,
  peers: ({ s, ids }) => { const se = sess[s]; if (se) Object.keys(se.peers).forEach((id) => { if (!ids.includes(+id)) closePeer(se, id); }); },
  close: ({ s }) => closeSess(s),
};
L.on('rd:h:cmd', async (c) => {
  try { const res = await (OPS[c.op] || (() => { throw new Error('unknown'); }))(c); L.send('rd:h:reply', { id: c.id, res: res === undefined ? null : res }); }
  catch (e) { console.error('op ' + c.op + ' failed: ' + (e && e.message || e)); L.send('rd:h:reply', { id: c.id, err: String(e && e.message || e) }); }
});
