// The welcome screen's light effect ("Constellation"): stars twinkle, points of light spiral in
// and settle into the OENOD logo, a soft bloom and ring flash, then the sharp logo stays with a
// slow breathing glow and a shine that sweeps across it now and then.
// It is drawn on a small canvas page (WebView on phones, an iframe on the web build), so the
// same drawing runs everywhere. If that page can't load, the plain logo shows instead.
import React, { useMemo, useState } from 'react';
import { Platform, View } from 'react-native';
import { Logo, LOGO_D } from './Logo';

let WebView: any = null;
if (Platform.OS !== 'web') {
  try { WebView = require('react-native-webview').WebView; } catch { WebView = null; }
}

function page(logoW: number, still: boolean) {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>html,body{margin:0;height:100%;background:transparent;overflow:hidden;-webkit-user-select:none;user-select:none}canvas{position:fixed;inset:0;width:100%;height:100%}</style></head>
<body><canvas id="c"></canvas><script>
(function(){
var cv=document.getElementById('c'),ctx=cv.getContext('2d'),dpr=Math.min(3,window.devicePixelRatio||1);
var CW=0,CH=0,W=0,H=0,P=[],S=[],t0=0,LW=${logoW},STILL=${still ? 'true' : 'false'};
var path=new Path2D('${LOGO_D}');
var VB={x:13.2,y:15.0,w:2300.2,h:624.7};
function size(){CW=window.innerWidth;CH=window.innerHeight;W=cv.width=Math.round(CW*dpr);H=cv.height=Math.round(CH*dpr);}
function logoBox(){var w=LW*dpr,h=w*VB.h/VB.w;return {x:(W-w)/2,y:(H-h)/2,w:w,h:h,k:w/VB.w};}
function drawLogo(c,fill){var b=logoBox();c.save();c.translate(b.x,b.y);c.scale(b.k,b.k);c.translate(-VB.x,-VB.y);c.fillStyle=fill;c.fill(path,'evenodd');c.restore();}
function build(){
  P=[];S=[];
  var o=document.createElement('canvas');o.width=W;o.height=H;var c=o.getContext('2d');drawLogo(c,'#fff');
  var d=c.getImageData(0,0,W,H).data,st=Math.max(2,Math.round(1.5*dpr));
  for(var y=0;y<H;y+=st)for(var x=0;x<W;x+=st){if(d[(y*W+x)*4+3]>150){var a=Math.random()*6.283,rr=W*.35+Math.random()*W*.55;
    P.push({tx:x,ty:y,ox:Math.cos(a)*rr,oy:Math.sin(a)*rr,del:Math.random()*.4,s:(.7+Math.random()*.9)*dpr*.75,spin:(Math.random()<.5?-1:1)*(1.2+Math.random()*1.2),hot:Math.random()<.08});}}
  var n=Math.round(110*(CW*CH)/(270*250));n=Math.max(60,Math.min(220,n));
  for(var i=0;i<n;i++)S.push({x:Math.random()*W,y:Math.random()*H,s:(.4+Math.random()*1.1)*dpr*.8,tw:Math.random()*6.283});
}
function ease(t){return 1-Math.pow(1-t,4);}
function stars(now){for(var i=0;i<S.length;i++){var s=S[i],a=.2+.3*(.5+.5*Math.sin(now/700+s.tw));
  ctx.fillStyle='rgba(200,210,255,'+a+')';ctx.beginPath();ctx.arc(s.x,s.y,s.s,0,6.283);ctx.fill();
  if(s.s>1.3*dpr*.8&&a>.42){ctx.strokeStyle='rgba(220,228,255,'+(a-.3)+')';ctx.lineWidth=.6*dpr;ctx.beginPath();ctx.moveTo(s.x-4*dpr,s.y);ctx.lineTo(s.x+4*dpr,s.y);ctx.moveTo(s.x,s.y-4*dpr);ctx.lineTo(s.x,s.y+4*dpr);ctx.stroke();}}}
function crisp(alpha,now,t){
  if(alpha<=0)return;var b=logoBox();
  // breathing glow
  var g=.45+.25*Math.sin(now/900);
  ctx.save();ctx.globalAlpha=alpha;ctx.shadowColor='rgba(140,160,255,'+g+')';ctx.shadowBlur=18*dpr;drawLogo(ctx,'#fff');ctx.restore();
  // shine sweep: twice after the logo lands, then every 6 s
  var ph=t<2.4?-1:((t-2.4)%6);var sw=ph>=0&&ph<1.1?ph/1.1:(ph>=1.6&&ph<2.5&&t<10?(ph-1.6)/.9:-1);
  if(sw>=0){ctx.save();ctx.translate(b.x,b.y);ctx.scale(b.k,b.k);ctx.translate(-VB.x,-VB.y);ctx.clip(path,'evenodd');ctx.setTransform(1,0,0,1,0,0);
    var x=b.x-b.w*.6+sw*b.w*2.2,gr=ctx.createLinearGradient(x-b.w*.25,0,x+b.w*.25,b.h*.4);
    gr.addColorStop(0,'rgba(185,196,255,0)');gr.addColorStop(.5,'rgba(255,255,255,'+(.95*alpha)+')');gr.addColorStop(1,'rgba(185,196,255,0)');
    ctx.fillStyle=gr;ctx.fillRect(b.x-10,b.y-10,b.w+20,b.h+20);ctx.restore();}
}
function frame(now){
  if(!t0)t0=now;var t=(now-t0)/1000;ctx.clearRect(0,0,W,H);stars(now);
  var pa=t<1.9?1:t<2.4?1-(t-1.9)/.5:0;
  if(pa>0){ctx.globalCompositeOperation='lighter';
    for(var i=0;i<P.length;i++){var p=P[i],q=Math.max(0,Math.min(1,(t/1.85-p.del)/(1-p.del))),e=ease(q),rem=1-e;
      var ang=p.spin*rem*rem,ca=Math.cos(ang),sa=Math.sin(ang),x=p.tx+(p.ox*ca-p.oy*sa)*rem,y=p.ty+(p.ox*sa+p.oy*ca)*rem;
      if(rem>.02){var r2=rem+.06,a2=p.spin*r2*r2,c2=Math.cos(a2),s2=Math.sin(a2),px=p.tx+(p.ox*c2-p.oy*s2)*r2,py=p.ty+(p.ox*s2+p.oy*c2)*r2;
        ctx.strokeStyle='rgba(150,170,255,'+(.35*pa*rem)+')';ctx.lineWidth=p.s*.9;ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(x,y);ctx.stroke();}
      var al=pa*(.3+.7*e);ctx.fillStyle=p.hot?'rgba(255,255,255,'+al+')':'rgba(215,224,255,'+al+')';var sz=p.s*(p.hot?1.8:1);ctx.fillRect(x-sz/2,y-sz/2,sz,sz);}
    ctx.globalCompositeOperation='source-over';}
  if(t>1.7&&t<2.8){var bl=t<2.0?(t-1.7)/.3:1-(t-2.0)/.8,gr=ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,W*.42);
    gr.addColorStop(0,'rgba(255,255,255,'+(.35*bl)+')');gr.addColorStop(.35,'rgba(150,170,255,'+(.22*bl)+')');gr.addColorStop(1,'rgba(150,170,255,0)');ctx.fillStyle=gr;ctx.fillRect(0,0,W,H);
    var rr=W*.12+(t-1.7)*W*.45;ctx.strokeStyle='rgba(200,210,255,'+(.4*Math.max(0,1-(t-1.7)/1.1))+')';ctx.lineWidth=1.2*dpr;ctx.beginPath();ctx.ellipse(W/2,H/2,rr,rr*.55,0,0,6.283);ctx.stroke();}
  crisp(t<1.9?0:t<2.3?(t-1.9)/.4:1,now,t);
  requestAnimationFrame(frame);
}
function still(now){ctx.clearRect(0,0,W,H);stars(now||0);crisp(1,0,0);}
size();build();
if(STILL){still(0);}else{requestAnimationFrame(frame);}
window.addEventListener('resize',function(){size();build();if(STILL)still(0);});
})();
</script></body></html>`;
}

/** The welcome logo with its light effect. `height` is the stage height; the logo sits in the middle. */
export function LogoBurst({ height = 250, logoWidth = 128, still = false }: { height?: number; logoWidth?: number; still?: boolean }) {
  const html = useMemo(() => page(logoWidth, still), [logoWidth, still]);
  const [failed, setFailed] = useState(false);
  const fallback = (
    <View style={{ height, alignItems: 'center', justifyContent: 'center' }}><Logo width={logoWidth} color="#FFFFFF" /></View>
  );
  if (failed) return fallback;
  if (Platform.OS === 'web') {
    return (
      <View style={{ height, width: '100%' }} pointerEvents="none" accessible accessibilityLabel="OENOD">
        {React.createElement('iframe', { srcDoc: html, title: 'OENOD', style: { border: 0, width: '100%', height: '100%', background: 'transparent' }, 'aria-hidden': true, tabIndex: -1 })}
      </View>
    );
  }
  if (!WebView) return fallback;
  return (
    <View style={{ height, width: '100%' }} pointerEvents="none" accessible accessibilityLabel="OENOD">
      <WebView source={{ html }} originWhitelist={['*']} style={{ backgroundColor: 'transparent', flex: 1 }} containerStyle={{ backgroundColor: 'transparent' }}
        scrollEnabled={false} bounces={false} javaScriptEnabled domStorageEnabled={false} allowFileAccess={false} incognito
        androidLayerType="hardware" setSupportMultipleWindows={false} onShouldStartLoadWithRequest={(r: any) => !/^https?:/i.test(r.url || '')}
        onError={() => setFailed(true)} onHttpError={() => setFailed(true)} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
    </View>
  );
}
