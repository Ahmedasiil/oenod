# Finds a UI element by its text in a uiautomator dump and prints its centre ("x y"). Exit 1 if not found.
import re, sys, xml.etree.ElementTree as ET
f, want = sys.argv[1], sys.argv[2].lower()
cls = sys.argv[3] if len(sys.argv) > 3 else None
best = None
for n in ET.parse(f).iter('node'):
    t = (n.get('text') or n.get('content-desc') or '').strip().lower()
    if cls and n.get('class') != cls: continue
    if cls and want != 'x' and t != want: continue
    if not cls and not t: continue
    if cls or t == want or (best is None and want in t):
        m = re.findall(r'\d+', n.get('bounds'))
        x1, y1, x2, y2 = map(int, m)
        if (x2 - x1) * (y2 - y1) == 0: continue
        c = f"{(x1+x2)//2} {(y1+y2)//2}"
        if cls or t == want: print(c); sys.exit(0)
        best = c
if best: print(best); sys.exit(0)
sys.exit(1)
