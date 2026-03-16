'use client'
import { useEffect, useRef, useState } from 'react'

interface TrendPanelProps {
  code: string
  name: string
  stopLoss: number
  targetPrice: number
}

export function TrendPanel({ code, name, stopLoss, targetPrice }: TrendPanelProps) {
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded]   = useState(false)
  const [errMsg, setErrMsg]   = useState('')
  const scriptInjected = useRef(false)

  useEffect(() => {
    if (scriptInjected.current) return
    scriptInjected.current = true
    if (document.getElementById('v6-chart-fns')) return
    const s = document.createElement('script')
    s.id = 'v6-chart-fns'
    s.textContent = `let _trendCode='';let _trendResults=[];\nfunction canvasSetup(id,H){
  const cv=$(id);if(!cv)return null;
  const dpr=window.devicePixelRatio||1;
  const W=cv.parentElement.clientWidth||800;
  cv.width=W*dpr;cv.height=H*dpr;
  cv.style.width=W+'px';cv.style.height=H+'px';
  const ctx=cv.getContext('2d');ctx.scale(dpr,dpr);
  return{cv,ctx,W,H,dpr};
}

async function loadTrend(){
  const code=($('inp').value||'').trim();
  if(!code||code.length<6){alert('请先输入股票代码');return;}
  _trendCode=code;
  const panel=$('trendPanel');
  panel.style.display='block';
  panel.scrollIntoView({behavior:'smooth',block:'nearest'});
  $('trendLoading').style.display='block';
  $('trendLegend').style.display='none';
  $('trendSummary').style.display='none';
  ['trendChart','priceChart','biasChart','bScoreChart'].forEach(id=>{
    const cv=$(id); if(!cv)return;
    cv.getContext('2d').clearRect(0,0,cv.width,cv.height);
  });
  setTrendMsg('正在拉取K线数据（90天+沪指）...');
  try{
    const [stockK,shK]=await Promise.all([fetchKline(code,160),fetchKline('000001',160,'1')]);
    setTrendMsg('正在计算八维度评分+⑧乖离率曲线...');
    if(!stockK||stockK.length<20) throw new Error('K线数据不足('+( stockK?.length||0)+'条)');
    const klines=stockK.slice(-90);
    const shMap={};
    if(shK) shK.forEach(k=>{shMap[k.date]=k.changePct;});
    const allCloses=stockK.map(k=>k.close);
    const allVols=stockK.map(k=>k.vol);
    const n=stockK.length;
    const results=[];

    klines.forEach((k,idx)=>{
      const ai=n-klines.length+idx;
      const ma=p=>{if(ai<p-1)return null;const sl=allCloses.slice(ai-p+1,ai+1);return sl.reduce((a,b)=>a+b,0)/p;};
      const ma5=ma(5),ma20=ma(20),ma60=ma(60);

      // ① 趋势强度
      let trend=1;
      if(ma5&&ma20&&ma60){let sc=0;if(ma5>ma20)sc++;if(ma20>ma60)sc++;if(k.close>ma5)sc++;if(k.close>ma20)sc++;
        trend=sc===0?1:sc===1?2:sc===2?3:sc===3?4:5;
      }

      // ② 量价健康度
      let vp=3;
      if(ai>0){
        const pc=allCloses[ai-1];
        const up=k.close>pc;
        const baseVols=allVols.slice(Math.max(0,ai-5),ai);
        const avgVol=baseVols.length?baseVols.reduce((a,b)=>a+b,0)/baseVols.length:allVols[ai-1];
        const big=k.vol>avgVol*1.15,sml=k.vol<avgVol*0.85;
        if(up&&big)vp=5;else if(!up&&sml)vp=4;else if(up&&sml)vp=3;else if(!up&&big)vp=1;else vp=3;
      }

      // ③ 相对强弱RS
      let rs=3;
      const sh=shMap[k.date];
      if(sh!==undefined&&Math.abs(sh)>0.01){const r=k.changePct/sh;rs=r>=2?5:r>=1?4:r>=0?3:r>=-1?2:1;}
      else{rs=k.changePct>1.5?5:k.changePct>0.3?4:k.changePct>-0.3?3:k.changePct>-1.5?2:1;}

      const comp=+((trend+vp+rs)/3).toFixed(2);

      // ⑧ 乖离率计算：(当前价 - MA20) / MA20 × 100
      let bias20=0;
      if(ma20&&ma20>0) bias20=+((k.close-ma20)/ma20*100).toFixed(2);

      // 近20日涨幅（相对20日前收盘价）
      let rise20=0;
      if(ai>=20&&allCloses[ai-20]>0) rise20=+((k.close-allCloses[ai-20])/allCloses[ai-20]*100).toFixed(2);

      // 基准B分（含⑧乖离惩罚）
      let rawB=(trend*2+vp+rs)/4;
      if(rise20>35) rawB=0;
      else if(rise20>30) rawB-=0.28;
      else if(rise20>25) rawB-=0.18;
      else if(rise20>20) rawB-=0.08;
      else if(rise20<=10&&rise20>0) rawB+=0.05;
      const bScore=+Math.max(0,Math.min(5.5,rawB)).toFixed(2);

      results.push({
        date:k.date, label:k.date.slice(5),
        close:k.close, changePct:k.changePct,
        open:k.open, high:k.high, low:k.low,
        trend, vp, rs, comp,
        bias20, rise20, bScore,
        ma5:ma5||0, ma20:ma20||0, ma60:ma60||0
      });
    });

    // 平滑处理
    const rollingAvg=(arr,w)=>{
      return arr.map((v,i)=>{
        const sl=arr.slice(Math.max(0,i-w+1),i+1);
        return +(sl.reduce((a,b)=>a+b,0)/sl.length).toFixed(2);
      });
    };
    const trendSmArr =rollingAvg(results.map(r=>r.trend),5);
    const vpSmArr    =rollingAvg(results.map(r=>r.vp),5);
    const rsSmArr    =rollingAvg(results.map(r=>r.rs),10);
    const compSmArr  =rollingAvg(results.map(r=>r.comp),5);
    const bias20SmArr=rollingAvg(results.map(r=>r.bias20),5);
    const bScoreSmArr=rollingAvg(results.map(r=>r.bScore),3);

    // ── 逐日计算盈亏比 (Risk/Reward) ──
    // 止损 = max(近10日最低支撑, 当日价×0.92)
    // 目标 = 近30日最高价 × 1.05 (或 当日价×1.15 取较大)
    // 盈亏比 = (目标-当日价) / (当日价-止损)
    results.forEach((r,i)=>{
      const c=r.close;
      // 近10日最低（支撑）
      const lo10 = Math.min(...results.slice(Math.max(0,i-9),i+1).map(x=>x.low||x.close));
      const stopSupport = lo10 * 0.99;            // 支撑下方1%
      const stopPct     = c * 0.92;               // -8%铁底
      const stop = Math.max(stopSupport, stopPct);// 取较宽止损
      // 近30日最高（压力/目标）
      const hi30 = Math.max(...results.slice(Math.max(0,i-29),i+1).map(x=>x.high||x.close));
      const tgt1 = hi30 * 1.03;                   // 突破近高+3%
      const tgt2 = c * 1.15;                      // +15%目标
      const target = Math.max(tgt1, tgt2);
      // 盈亏比
      const risk   = Math.abs(c - stop);
      const reward = Math.abs(target - c);
      const rr     = risk > 0 ? +(reward/risk).toFixed(2) : 0;
      // ⑧维度修正止损
      let stopAdj = stop;
      if(r.rise20>35)      stopAdj = c * 0.95;  // 过热区：止损收紧到-5%
      else if(r.rise20>25) stopAdj = c * 0.94;  // 警戒区：-6%
      else                 stopAdj = stop;
      const riskAdj   = Math.abs(c - stopAdj);
      const rrAdj     = riskAdj > 0 ? +(reward/riskAdj).toFixed(2) : 0;

      r.stop   = +stop.toFixed(3);
      r.target = +target.toFixed(3);
      r.rr     = rr;
      r.stopAdj= +stopAdj.toFixed(3);
      r.rrAdj  = rrAdj;
      r.stopPct= +((c-stop)/c*100).toFixed(2);
    });

    results.forEach((r,i)=>{
      r.trendSm  =trendSmArr[i];
      r.vpSm     =vpSmArr[i];
      r.rsSm     =rsSmArr[i];
      r.compSmooth=compSmArr[i];
      r.bias20Sm =bias20SmArr[i];
      r.bScoreSm =bScoreSmArr[i];
    });

    $('trendLoading').style.display='none';
    $('trendLegend').style.display='flex';
    $('trendName').textContent=code;
    window._trendResults = results;
    renderTrendCanvas(results);
    renderBiasChart(results);
    renderBScoreChart(results);
    renderRRChart(results);
    renderPriceCanvas(results);
    renderTrendSummary(results);
    window._trendAllCloses = allCloses;
    L('['+code+'] 90天走势✅ 含⑧乖离+B分+盈亏比','ok');
  }catch(e){
    L('['+code+'] 90天走势加载失败','error',e.message+(e.stack?'\\n'+e.stack:''),'trend');
    $('trendLoading').innerHTML='<div style="color:#ff2d55;font-family:var(--m);font-size:12px;padding:24px;text-align:center">❌ '+e.message+'<br><span style="font-size:10px;color:var(--t2);margin-top:6px;display:block">请检查网络 / 股票代码（详情见日志📋）</span></div>';
    $('trendLoading').style.display='block';
  }
}

function setTrendMsg(m){const e=$('trendLoadMsg');if(e)e.textContent=m;}

async function fetchKline(code,limit,mktOvr){
  const mid=mktOvr||(/^(60|68|51|58)/.test(code)?'1':'0');
  const url=\`https://push2his.eastmoney.com/api/qt/stock/kline/get?fields1=f1,f3&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&klt=101&fqt=0&beg=19900101&end=20500101&lmt=${limit||160}&secid=${mid}.${code}&ut=b2884a393a59ad64002292a3e90d46a5&_=${Date.now()}\`;
  const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0'}});
  if(!r.ok){L('[fetchKline] HTTP错误 '+r.status,'error','code='+code,'trend');throw new Error('K线HTTP '+r.status);}
  const raw=await r.text();
  if(!raw.trim().startsWith('{')){L('[fetchKline] 返回非JSON，可能被拦截','error','前80字符:'+raw.slice(0,80),'trend');throw new Error('K线返回非JSON，可能被浏览器拦截');}
  const j=JSON.parse(raw);
  const kl=j?.data?.klines;
  if(!kl||!kl.length)return[];
  return kl.map(k=>{const p=k.split(',');return{date:p[0],open:+p[1],close:+p[2],high:+p[3],low:+p[4],vol:+p[5]||0,changePct:+p[8]||0};});
}

function renderTrendCanvas(data){
  const s=canvasSetup('trendChart',280);if(!s)return;
  const{cv,ctx,W,H,dpr}=s;
  const PAD={t:14,r:18,b:32,l:52};
  const gw=W-PAD.l-PAD.r,gh=H-PAD.t-PAD.b;
  const n=data.length;
  const dark=document.documentElement.getAttribute('data-theme') !== 'light';
  ctx.fillStyle=dark?'#04070f':'#f0f4f8';ctx.fillRect(0,0,W,H);
  // clamp: 1未満・5超のスコアをY軸範囲内に収める
  const yS=v=>PAD.t+gh-(Math.max(1,Math.min(5,v))-1)/4*gh;
  const xS=i=>PAD.l+i*(gw/(n-1));
  // grid
  [1,2,3,4,5].forEach(v=>{
    const y=yS(v);
    ctx.beginPath();ctx.moveTo(PAD.l,y);ctx.lineTo(PAD.l+gw,y);
    ctx.strokeStyle=dark?'rgba(0,207,255,0.07)':'rgba(0,100,180,0.1)';ctx.lineWidth=1;ctx.stroke();
    ctx.fillStyle=dark?'#6a8faa':'#4a6a8a';ctx.font='9px "IBM Plex Mono",monospace';
    ctx.textAlign='right';ctx.fillText(['','弱','偏弱','中','偏强','强'][v],PAD.l-4,y+3.5);
  });
  // 基准线3虚线
  ctx.beginPath();ctx.setLineDash([4,4]);
  ctx.moveTo(PAD.l,yS(3));ctx.lineTo(PAD.l+gw,yS(3));
  ctx.strokeStyle=dark?'rgba(167,139,250,0.35)':'rgba(130,100,200,0.45)';ctx.lineWidth=1.2;ctx.stroke();
  ctx.setLineDash([]);
  // X标签
  ctx.fillStyle=dark?'#6a8faa':'#4a6a8a';ctx.font='9px "IBM Plex Mono",monospace';ctx.textAlign='center';
  data.forEach((d,i)=>{if(i%15===0||i===n-1)ctx.fillText(d.label,xS(i),H-PAD.b+14);});
  // 面积（综合）
  // 面积填充（基于综合平滑值）
  ctx.beginPath();data.forEach((d,i)=>{const x=xS(i),y=yS(d.compSmooth||d.comp);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
  ctx.lineTo(xS(n-1),yS(1));ctx.lineTo(PAD.l,yS(1));ctx.closePath();
  ctx.fillStyle=dark?'rgba(167,139,250,0.09)':'rgba(130,100,200,0.1)';ctx.fill();
  // 四条线
  const dl=(vals,col,lw,dash)=>{
    ctx.beginPath();ctx.setLineDash(dash||[]);
    vals.forEach((v,i)=>{const x=xS(i),y=yS(v);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
    ctx.strokeStyle=col;ctx.lineWidth=lw;ctx.stroke();ctx.setLineDash([]);
  };
  // 所有线使用5日均值平滑版本（原始值在tooltip中显示）
  dl(data.map(d=>d.trendSm||d.trend),   '#00cfff',1.8);
  dl(data.map(d=>d.vpSm||d.vp),         '#ffd23f',1.8);
  dl(data.map(d=>d.rsSm||d.rs),         '#00e87a',1.8);
  dl(data.map(d=>d.compSmooth||d.comp), '#a78bfa',2.8,[5,3]);
  // 末点圆
  [{v:data[n-1].trendSm||data[n-1].trend,c:'#00cfff'},{v:data[n-1].vpSm||data[n-1].vp,c:'#ffd23f'},{v:data[n-1].rsSm||data[n-1].rs,c:'#00e87a'},{v:data[n-1].compSmooth||data[n-1].comp,c:'#a78bfa'}]
    .forEach(({v,c})=>{ctx.beginPath();ctx.arc(xS(n-1),yS(v),3.5,0,Math.PI*2);ctx.fillStyle=c;ctx.fill();});
  // 鼠标交互 — tooltip描画はrenderTrendCanvas再呼び出し後、scaleは一度だけ適用済み
  cv.onmousemove=e=>{
    const rect=cv.getBoundingClientRect();
    const mx=e.clientX-rect.left;
    const idx=Math.round((mx-PAD.l)/gw*(n-1));
    if(idx<0||idx>=n)return;
    // ① ベースを再描画（canvasSetup内でscale済み）
    renderTrendCanvas(data);
    // ② tooltip: 新しいcontextを取得するがscaleしない（renderTrendCanvas内で既にscale済み）
    const ctx2=cv.getContext('2d');
    const d=data[idx],x=xS(idx);
    // 縦線
    ctx2.save();
    ctx2.beginPath();ctx2.moveTo(x,PAD.t);ctx2.lineTo(x,PAD.t+gh);
    ctx2.strokeStyle=dark?'rgba(255,255,255,0.18)':'rgba(0,0,0,0.12)';ctx2.lineWidth=1;ctx2.stroke();
    // tooltip box
    const lv=v=>['','弱','偏弱','中','偏强','强'][Math.round(Math.min(5,Math.max(1,v)))]||'?';
    const lines=[
      d.date,
      '①趋势: '+lv(d.trendSm||d.trend)+' ('+(d.trendSm||d.trend).toFixed(1)+')',
      '②量价: '+lv(d.vpSm||d.vp)+' ('+(d.vpSm||d.vp).toFixed(1)+')',
      '③RS:   '+lv(d.rsSm||d.rs)+' ('+(d.rsSm||d.rs).toFixed(1)+')',
      '综合:  '+(d.compSmooth||d.comp).toFixed(2),
      (d.changePct>=0?'▲+':'▼')+d.changePct.toFixed(2)+'%'
    ];
    const bw=162,bh=lines.length*16+18,bx=x+10<W-bw-PAD.r?x+10:x-bw-10,by=PAD.t+4;
    ctx2.fillStyle=dark?'rgba(7,12,24,0.93)':'rgba(240,244,248,0.96)';
    ctx2.strokeStyle=dark?'rgba(0,207,255,0.4)':'rgba(0,100,180,0.3)';ctx2.lineWidth=1;
    if(ctx2.roundRect){ctx2.beginPath();ctx2.roundRect(bx,by,bw,bh,4);ctx2.fill();ctx2.stroke();}
    else{ctx2.fillRect(bx,by,bw,bh);ctx2.strokeRect(bx,by,bw,bh);}
    ['#cce4f8','#00cfff','#ffd23f','#00e87a','#a78bfa','#888899'].forEach((cl,i)=>{
      ctx2.fillStyle=cl;ctx2.font='10px "IBM Plex Mono",monospace';ctx2.textAlign='left';
      ctx2.fillText(lines[i],bx+8,by+14+i*16);
    });
    ctx2.restore();
  };
  cv.onmouseleave=()=>renderTrendCanvas(data);
}

function renderPriceCanvas(data){
  const s=canvasSetup('priceChart',200);if(!s)return;
  const{cv,ctx,W,H,dpr}=s;
  const PAD={t:14,r:18,b:28,l:62};
  const gw=W-PAD.l-PAD.r,gh=H-PAD.t-PAD.b;
  const n=data.length;
  const dark=document.documentElement.getAttribute('data-theme') !== 'light';
  ctx.fillStyle=dark?'#04070f':'#f0f4f8';ctx.fillRect(0,0,W,H);

  const prices=data.map(d=>d.close);
  const stops =data.map(d=>d.stopAdj||d.stop||0).filter(v=>v>0);
  const tgts  =data.map(d=>d.target||0).filter(v=>v>0);

  const allVals=[...prices,...stops,...tgts].filter(v=>v>0);
  const minP=Math.min(...allVals)*0.97, maxP=Math.max(...allVals)*1.02;
  const logMin=Math.log(minP), logMax=Math.log(maxP);
  const yL=v=>v>0?PAD.t+gh-(Math.log(v)-logMin)/(logMax-logMin)*gh:PAD.t+gh;
  const xS=i=>PAD.l+i*(gw/(n-1));

  // Y刻度
  const rng=maxP-minP;
  const step=rng>500?100:rng>100?20:rng>20?5:rng>5?1:0.5;
  let tk=Math.ceil(minP/step)*step;
  while(tk<=maxP){
    const y=yL(tk);
    if(y>=PAD.t&&y<=PAD.t+gh){
      ctx.beginPath();ctx.moveTo(PAD.l,y);ctx.lineTo(PAD.l+gw,y);
      ctx.strokeStyle=dark?'rgba(0,207,255,0.06)':'rgba(0,100,180,0.08)';ctx.lineWidth=1;ctx.stroke();
      ctx.fillStyle=dark?'#6a8faa':'#4a6a8a';ctx.font='9px "IBM Plex Mono",monospace';ctx.textAlign='right';
      ctx.fillText(tk>=1000?tk.toFixed(0):tk>=100?tk.toFixed(1):tk.toFixed(2),PAD.l-4,y+3.5);
    }
    tk+=step;
  }
  ctx.fillStyle=dark?'rgba(0,207,255,0.5)':'rgba(0,100,180,0.55)';ctx.font='8px "IBM Plex Mono",monospace';
  ctx.textAlign='right';ctx.fillText('LOG ↕',PAD.l-4,PAD.t+10);

  // X标签
  ctx.fillStyle=dark?'#6a8faa':'#4a6a8a';ctx.font='9px "IBM Plex Mono",monospace';ctx.textAlign='center';
  data.forEach((d,i)=>{if(i%15===0||i===n-1)ctx.fillText(d.label,xS(i),H-PAD.b+14);});

  // 目标价线（绿色虚线带）
  if(data.some(d=>d.target)){
    ctx.beginPath();ctx.setLineDash([6,4]);
    data.forEach((d,i)=>{if(!d.target)return;const x=xS(i),y=yL(d.target);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
    ctx.strokeStyle=dark?'rgba(0,232,122,0.45)':'rgba(0,140,70,.4)';ctx.lineWidth=1.2;ctx.stroke();ctx.setLineDash([]);
  }

  // 止损线（红色虚线带）
  if(data.some(d=>d.stopAdj||d.stop)){
    ctx.beginPath();ctx.setLineDash([4,4]);
    data.forEach((d,i)=>{const sv=d.stopAdj||d.stop||0;if(!sv)return;const x=xS(i),y=yL(sv);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
    ctx.strokeStyle=dark?'rgba(255,45,85,0.5)':'rgba(200,0,40,.4)';ctx.lineWidth=1.2;ctx.stroke();ctx.setLineDash([]);
  }

  // 价格面积填充
  ctx.beginPath();data.forEach((d,i)=>{const x=xS(i),y=yL(d.close);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
  ctx.lineTo(xS(n-1),PAD.t+gh);ctx.lineTo(PAD.l,PAD.t+gh);ctx.closePath();
  const g=ctx.createLinearGradient(0,PAD.t,0,PAD.t+gh);
  g.addColorStop(0,dark?'rgba(0,207,255,0.12)':'rgba(0,100,180,0.08)');
  g.addColorStop(1,dark?'rgba(0,207,255,0.01)':'rgba(0,100,180,0.01)');
  ctx.fillStyle=g;ctx.fill();

  // 价格折线（分段着色）
  for(let i=1;i<n;i++){
    const x1=xS(i-1),y1=yL(data[i-1].close),x2=xS(i),y2=yL(data[i].close);
    ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);
    ctx.strokeStyle=data[i].changePct>=0?'#00e87a':'#ff2d55';ctx.lineWidth=1.5;ctx.stroke();
  }

  // 末点止损/目标标注
  const ld=data[n-1];
  if(ld.stopAdj||ld.stop){
    const sv=ld.stopAdj||ld.stop;
    ctx.font='8px "IBM Plex Mono",monospace';ctx.textAlign='left';ctx.fillStyle='#ff2d55';
    ctx.fillText('止损'+sv.toFixed(2),xS(n-1)+4,yL(sv)-3);
  }
  if(ld.target){
    ctx.font='8px "IBM Plex Mono",monospace';ctx.textAlign='left';ctx.fillStyle='#00e87a';
    ctx.fillText('目标'+ld.target.toFixed(2),xS(n-1)+4,yL(ld.target)+10);
  }

  // hover tooltip
  cv.onmousemove=e=>{
    const rect=cv.getBoundingClientRect();
    const idx=Math.round((e.clientX-rect.left-PAD.l)/gw*(n-1));
    if(idx<0||idx>=n)return;
    const d=data[idx];
    renderPriceCanvas(data);
    const ctx2=cv.getContext('2d');
    ctx2.save();
    const x=xS(idx),y=yL(d.close);
    ctx2.beginPath();ctx2.moveTo(x,PAD.t);ctx2.lineTo(x,PAD.t+gh);
    ctx2.strokeStyle=dark?'rgba(255,255,255,.12)':'rgba(0,0,0,.1)';ctx2.lineWidth=1;ctx2.stroke();
    ctx2.beginPath();ctx2.arc(x,y,4,0,Math.PI*2);
    ctx2.fillStyle=d.changePct>=0?'#00e87a':'#ff2d55';ctx2.fill();
    const sv=d.stopAdj||d.stop||0;
    const tv=d.target||0;
    const rr=d.rrAdj||d.rr||0;
    const lines=[
      d.date+'  '+d.close.toFixed(2)+'元',
      (d.changePct>=0?'+':'')+d.changePct.toFixed(2)+'%',
      '止损:'+sv.toFixed(2)+'  目标:'+tv.toFixed(2),
      '盈亏比 1:'+rr.toFixed(1),
    ];
    const bw=160,bh=62;
    const bx=x+8<W-bw-PAD.r?x+8:x-bw-8,by=PAD.t+4;
    ctx2.fillStyle=dark?'rgba(7,12,24,.93)':'rgba(240,244,248,.96)';
    ctx2.strokeStyle=d.changePct>=0?'rgba(0,232,122,0.35)':'rgba(255,45,85,0.35)';ctx2.lineWidth=1;
    ctx2.fillRect(bx,by,bw,bh);ctx2.strokeRect(bx,by,bw,bh);
    const cols=[dark?'#cce4f8':'#1a2a3a',d.changePct>=0?'#00e87a':'#ff2d55','#8aabcc',rr>=2?'#00e87a':rr>=1?'#ffd23f':'#ff2d55'];
    lines.forEach((l,li)=>{
      ctx2.fillStyle=cols[li];ctx2.font='9px "IBM Plex Mono",monospace';ctx2.textAlign='left';
      ctx2.fillText(l,bx+6,by+13+li*14);
    });
    ctx2.restore();
  };
  cv.onmouseleave=()=>renderPriceCanvas(data);
}

function renderTrendSummary(data){
  const comps=data.map(d=>d.comp),trs=data.map(d=>d.trend),rss=data.map(d=>d.rs);
  const n=data.length;
  const avg=(arr,from)=>{const sl=arr.slice(from);return(sl.reduce((a,b)=>a+b,0)/sl.length).toFixed(2);};
  const r15=comps.slice(-15).reduce((a,b)=>a+b,0)/Math.min(15,n);
  const p15=comps.slice(-30,-15);const p15a=p15.length?p15.reduce((a,b)=>a+b,0)/p15.length:r15;
  const dir=r15>p15a+0.15?'📈 上升':r15<p15a-0.15?'📉 下降':'➡️ 横盘';
  const dc=r15>p15a+0.15?'#00e87a':r15<p15a-0.15?'#ff2d55':'#ffd23f';
  let rsStrk=0;for(let i=n-1;i>=0;i--){if(rss[i]>=3)rsStrk++;else break;}
  const av=comps.reduce((a,b)=>a+b,0)/n;
  const gr=av>=4?'⭐⭐⭐ 强势':av>=3.3?'⭐⭐ 中强':av>=2.7?'⭐ 中性':'⚠️ 偏弱';
  const gc=av>=4?'#00e87a':av>=3.3?'#00cfff':av>=2.7?'#ffd23f':'#ff2d55';
  const el=$('trendSummary');
  el.style.display='grid';
  el.style.gridTemplateColumns='repeat(auto-fit,minmax(130px,1fr))';
  el.style.gap='8px';
  el.style.marginBottom='10px';
  el.innerHTML=[
    sBox('90日综合评级',gr,gc),
    sBox('趋势方向',dir,dc),
    sBox('近30日均强度',avg(comps,Math.max(0,n-30)),'#00cfff'),
    sBox('连续RS≥3天',rsStrk+'天',rsStrk>=10?'#00e87a':rsStrk>=5?'#ffd23f':'#ff2d55'),
    // ⑧ 乖离率最新值
    (()=>{
      const lv=data[n-1]?.bias20Sm||data[n-1]?.bias20||0;
      const lc=lv>35?'#ff2d55':lv>20?'#ff8c35':lv>10?'#ffd23f':'#00e87a';
      const lt=lv>35?'⛔禁建仓':lv>20?'⚠限仓60%':lv>10?'⚡正常-8%':'★最佳入场';
      return sBox('⑧乖离(近20日)',(lv>=0?'+':'')+lv.toFixed(1)+'%  '+lt,lc);
    })(),
    // 当前B分
    (()=>{
      const bv=data[n-1]?.bScoreSm||0;
      const bc=bv>=4.5?'#00e87a':bv>=4.0?'#00cfff':bv>=3.5?'#ffd23f':'#ff2d55';
      const bt=bv>=4.5?'强力':bv>=4.0?'可操作':bv>=3.5?'观望':'止损';
      return sBox('B分(含⑧)',bv.toFixed(2)+' '+bt,bc);
    })(),
    // 当前盈亏比
    (()=>{
      const rv=data[n-1]?.rrAdj||data[n-1]?.rr||0;
      const sv=data[n-1]?.stopAdj||data[n-1]?.stop||0;
      const tv=data[n-1]?.target||0;
      const rc=rv>=3?'#00e87a':rv>=2?'#00cfff':rv>=1?'#ffd23f':'#ff2d55';
      const rt=rv>=3?'极佳时机':rv>=2?'可操作':rv>=1?'偏低':' R:R不足';
      return sBox('盈亏比 R:R','1:'+rv.toFixed(1)+'  '+rt,rc);
    })(),
    // 当前止损价
    (()=>{
      const sv=data[n-1]?.stopAdj||data[n-1]?.stop||0;
      const pv=data[n-1]?.close||0;
      const pct=pv>0?((sv-pv)/pv*100).toFixed(1):'—';
      return sBox('当前止损价',sv>0?sv.toFixed(2)+'元('+pct+'%)':'—','#ff3a6e');
    })(),
  ].join('');
}

function renderBiasChart(data){
  const s=canvasSetup('biasChart',120);if(!s)return;
  const{cv,ctx,W,H}=s;
  const PAD={t:12,r:18,b:24,l:52};
  const gw=W-PAD.l-PAD.r,gh=H-PAD.t-PAD.b;
  const n=data.length;
  const dark=document.documentElement.getAttribute('data-theme') !== 'light';

  ctx.fillStyle=dark?'#04070f':'#f0f4f8';ctx.fillRect(0,0,W,H);

  const vals=data.map(d=>d.bias20Sm||d.bias20||0);
  const mn=Math.min(-5,Math.min(...vals)-2);
  const mx=Math.max(40,Math.max(...vals)+2);
  const yS=v=>PAD.t+gh-(v-mn)/(mx-mn)*gh;
  const xS=i=>PAD.l+i*(gw/(n-1));

  // 危险区域背景（乖离>20%红色背景，10~20%黄色）
  const y20=yS(20),y10=yS(10),y35=yS(35);
  ctx.fillStyle=dark?'rgba(255,45,85,0.08)':'rgba(255,45,85,0.06)';
  ctx.fillRect(PAD.l,Math.min(y35,PAD.t),gw,Math.max(0,yS(20)-Math.min(y35,PAD.t)));
  ctx.fillStyle=dark?'rgba(255,210,63,0.07)':'rgba(255,210,63,0.06)';
  ctx.fillRect(PAD.l,y20,gw,Math.max(0,y10-y20));
  ctx.fillStyle=dark?'rgba(0,232,122,0.06)':'rgba(0,232,122,0.05)';
  ctx.fillRect(PAD.l,y10,gw,Math.max(0,yS(0)-y10));

  // 网格线（0%, 10%, 20%, 35%）
  [[0,'⬜0%','#5a7a9a'],[10,'⚡10%','#ffd23f'],[20,'⚠20%','#ff8c35'],[35,'⛔35%','#ff2d55']].forEach(([v,lbl,col])=>{
    const y=yS(v);
    if(y<PAD.t||y>PAD.t+gh) return;
    ctx.beginPath();ctx.setLineDash([4,4]);ctx.moveTo(PAD.l,y);ctx.lineTo(PAD.l+gw,y);
    ctx.strokeStyle=col+'55';ctx.lineWidth=1;ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle=col;ctx.font='8px "IBM Plex Mono",monospace';ctx.textAlign='right';
    ctx.fillText(lbl,PAD.l-3,y+3);
  });

  // X标签
  ctx.fillStyle=dark?'#6a8faa':'#4a6a8a';ctx.font='8px "IBM Plex Mono",monospace';ctx.textAlign='center';
  data.forEach((d,i)=>{if(i%15===0||i===n-1)ctx.fillText(d.label,xS(i),H-PAD.b+12);});

  // 面积填充（乖离>20%红色，10~20%黄色，<10%绿色）
  data.forEach((d,i)=>{
    if(i===0) return;
    const v=d.bias20Sm||0;
    const pv=(data[i-1].bias20Sm||0);
    const x1=xS(i-1),x2=xS(i);
    const y1=yS(Math.max(0,pv)),y2=yS(Math.max(0,v));
    const y0=yS(0);
    ctx.beginPath();
    ctx.moveTo(x1,y0);ctx.lineTo(x1,y1);ctx.lineTo(x2,y2);ctx.lineTo(x2,y0);ctx.closePath();
    const avgV=(v+pv)/2;
    ctx.fillStyle=avgV>35?'rgba(255,45,85,0.25)':avgV>20?'rgba(255,140,53,0.2)':avgV>10?'rgba(255,210,63,0.15)':'rgba(0,232,122,0.12)';
    ctx.fill();
  });

  // 乖离率主线（分段着色）
  for(let i=1;i<n;i++){
    const v=data[i].bias20Sm||0;
    ctx.beginPath();ctx.moveTo(xS(i-1),yS(data[i-1].bias20Sm||0));ctx.lineTo(xS(i),yS(v));
    ctx.strokeStyle=v>35?'#ff2d55':v>20?'#ff8c35':v>10?'#ffd23f':'#00e87a';
    ctx.lineWidth=1.8;ctx.stroke();
  }

  // 末点
  const last=data[n-1];
  const lv=last.bias20Sm||0;
  ctx.beginPath();ctx.arc(xS(n-1),yS(lv),4,0,Math.PI*2);
  ctx.fillStyle=lv>35?'#ff2d55':lv>20?'#ff8c35':lv>10?'#ffd23f':'#00e87a';ctx.fill();

  // 最新值标注
  ctx.font='bold 9px "IBM Plex Mono",monospace';ctx.textAlign='left';
  const lc=lv>35?'#ff2d55':lv>20?'#ff8c35':lv>10?'#ffd23f':'#00e87a';
  ctx.fillStyle=lc;
  const lx=xS(n-1)+6,ly=yS(lv);
  ctx.fillText((lv>=0?'+':'')+lv.toFixed(1)+'%',Math.min(lx,W-55),Math.max(PAD.t+10,Math.min(ly,PAD.t+gh-4)));

  // hover tooltip
  cv.onmousemove=e=>{
    const rect=cv.getBoundingClientRect();
    const idx=Math.round((e.clientX-rect.left-PAD.l)/gw*(n-1));
    if(idx<0||idx>=n) return;
    renderBiasChart(data);
    const ctx2=cv.getContext('2d');
    const d=data[idx],x=xS(idx),v2=d.bias20Sm||0;
    ctx2.save();
    ctx2.beginPath();ctx2.moveTo(x,PAD.t);ctx2.lineTo(x,PAD.t+gh);
    ctx2.strokeStyle=dark?'rgba(255,255,255,.15)':'rgba(0,0,0,.1)';ctx2.lineWidth=1;ctx2.stroke();
    const sig=v2>35?'⛔禁止建仓':v2>25?'⚠高危30%试仓':v2>20?'⚡60%限仓':v2>10?'✓正常-8%':'★最佳入场';
    const lines=[d.date, '乖离率: '+(v2>=0?'+':'')+v2.toFixed(1)+'%', sig];
    const bw=140,bh=52,bx=x+8<W-bw-PAD.r?x+8:x-bw-8;
    ctx2.fillStyle=dark?'rgba(7,12,24,.93)':'rgba(240,244,248,.96)';
    ctx2.strokeStyle=dark?'rgba(255,140,53,.4)':'rgba(200,100,0,.3)';ctx2.lineWidth=1;
    ctx2.fillRect(bx,PAD.t+2,bw,bh);ctx2.strokeRect(bx,PAD.t+2,bw,bh);
    const cols=[dark?'#cce4f8':'#1a2a3a','#ff8c35',v2>35?'#ff2d55':v2>20?'#ff8c35':v2>10?'#ffd23f':'#00e87a'];
    lines.forEach((l,i)=>{ctx2.fillStyle=cols[i];ctx2.font=(i===2?'bold ':'')+' 9px "IBM Plex Mono",monospace';ctx2.textAlign='left';ctx2.fillText(l,bx+6,PAD.t+13+i*16);});
    ctx2.restore();
  };
  cv.onmouseleave=()=>renderBiasChart(data);
}

// ══ 基准B分走势图（100px高）══

function renderBScoreChart(data){
  const s=canvasSetup('bScoreChart',100);if(!s)return;
  const{cv,ctx,W,H}=s;
  const PAD={t:10,r:18,b:22,l:52};
  const gw=W-PAD.l-PAD.r,gh=H-PAD.t-PAD.b;
  const n=data.length;
  const dark=document.documentElement.getAttribute('data-theme') !== 'light';

  ctx.fillStyle=dark?'#04070f':'#f0f4f8';ctx.fillRect(0,0,W,H);

  const yS=v=>PAD.t+gh-(Math.max(0,Math.min(5.5,v))/5.5)*gh;
  const xS=i=>PAD.l+i*(gw/(n-1));

  // 阈值背景区域
  ctx.fillStyle=dark?'rgba(0,232,122,0.06)':'rgba(0,232,122,0.05)';
  ctx.fillRect(PAD.l,PAD.t,gw,Math.max(0,yS(4.5)-PAD.t));
  ctx.fillStyle=dark?'rgba(0,207,255,0.05)':'rgba(0,207,255,0.04)';
  ctx.fillRect(PAD.l,yS(4.5),gw,Math.max(0,yS(4.0)-yS(4.5)));

  // 阈值线
  [[4.5,'≥4.5强','#00e87a'],[4.0,'≥4.0可','#00cfff'],[3.5,'3.5观望','#ffd23f']].forEach(([v,lbl,col])=>{
    const y=yS(v);
    ctx.beginPath();ctx.setLineDash([3,3]);ctx.moveTo(PAD.l,y);ctx.lineTo(PAD.l+gw,y);
    ctx.strokeStyle=col+'66';ctx.lineWidth=1;ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle=col;ctx.font='8px "IBM Plex Mono",monospace';ctx.textAlign='right';
    ctx.fillText(lbl,PAD.l-3,y+3);
  });

  // X标签
  ctx.fillStyle=dark?'#6a8faa':'#4a6a8a';ctx.font='8px "IBM Plex Mono",monospace';ctx.textAlign='center';
  data.forEach((d,i)=>{if(i%15===0||i===n-1)ctx.fillText(d.label,xS(i),H-PAD.b+12);});

  // B分面积
  ctx.beginPath();
  data.forEach((d,i)=>{const x=xS(i),y=yS(d.bScoreSm||0);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
  ctx.lineTo(xS(n-1),PAD.t+gh);ctx.lineTo(PAD.l,PAD.t+gh);ctx.closePath();
  ctx.fillStyle=dark?'rgba(0,229,200,0.08)':'rgba(0,180,160,0.07)';ctx.fill();

  // B分线（分段颜色）
  for(let i=1;i<n;i++){
    const v=data[i].bScoreSm||0;
    ctx.beginPath();ctx.moveTo(xS(i-1),yS(data[i-1].bScoreSm||0));ctx.lineTo(xS(i),yS(v));
    ctx.strokeStyle=v>=4.5?'#00e87a':v>=4.0?'#00cfff':v>=3.5?'#ffd23f':'#ff2d55';
    ctx.lineWidth=2;ctx.stroke();
  }

  // 末点+标注
  const lv=data[n-1].bScoreSm||0;
  const lc=lv>=4.5?'#00e87a':lv>=4.0?'#00cfff':lv>=3.5?'#ffd23f':'#ff2d55';
  ctx.beginPath();ctx.arc(xS(n-1),yS(lv),4,0,Math.PI*2);ctx.fillStyle=lc;ctx.fill();
  ctx.font='bold 9px "IBM Plex Mono",monospace';ctx.textAlign='left';ctx.fillStyle=lc;
  ctx.fillText('B='+lv.toFixed(2),Math.min(xS(n-1)+6,W-52),Math.max(PAD.t+10,Math.min(yS(lv),PAD.t+gh-4)));

  // hover
  cv.onmousemove=e=>{
    const rect=cv.getBoundingClientRect();
    const idx=Math.round((e.clientX-rect.left-PAD.l)/gw*(n-1));
    if(idx<0||idx>=n) return;
    renderBScoreChart(data);
    const ctx2=cv.getContext('2d');
    const d=data[idx],x=xS(idx),v2=d.bScoreSm||0;
    ctx2.save();
    ctx2.beginPath();ctx2.moveTo(x,PAD.t);ctx2.lineTo(x,PAD.t+gh);
    ctx2.strokeStyle=dark?'rgba(255,255,255,.12)':'rgba(0,0,0,.08)';ctx2.lineWidth=1;ctx2.stroke();
    const sig=v2>=4.5?'强力信号':v2>=4.0?'可操作':v2>=3.5?'观望':'止损出场';
    const lines=[d.date,'B = '+v2.toFixed(2)+' · '+sig];
    const bw=130,bh=38,bx=x+8<W-bw-PAD.r?x+8:x-bw-8;
    ctx2.fillStyle=dark?'rgba(7,12,24,.93)':'rgba(240,244,248,.96)';
    ctx2.strokeStyle=dark?'rgba(0,229,200,.4)':'rgba(0,180,160,.3)';ctx2.lineWidth=1;
    ctx2.fillRect(bx,PAD.t+2,bw,bh);ctx2.strokeRect(bx,PAD.t+2,bw,bh);
    const vc=v2>=4.5?'#00e87a':v2>=4.0?'#00cfff':v2>=3.5?'#ffd23f':'#ff2d55';
    ctx2.font='9px "IBM Plex Mono",monospace';ctx2.textAlign='left';
    ctx2.fillStyle=dark?'#cce4f8':'#1a2a3a';ctx2.fillText(lines[0],bx+6,PAD.t+13);
    ctx2.fillStyle=vc;ctx2.font='bold 9px "IBM Plex Mono",monospace';ctx2.fillText(lines[1],bx+6,PAD.t+26);
    ctx2.restore();
  };
  cv.onmouseleave=()=>renderBScoreChart(data);
}

// ══ 盈亏比走势图（110px）NEW ══

function renderRRChart(data){
  const s=canvasSetup('rrChart',110);if(!s)return;
  const{cv,ctx,W,H}=s;
  const PAD={t:12,r:18,b:22,l:52};
  const gw=W-PAD.l-PAD.r, gh=H-PAD.t-PAD.b;
  const n=data.length;
  const dark=document.documentElement.getAttribute('data-theme') !== 'light';

  ctx.fillStyle=dark?'#04070f':'#f0f4f8'; ctx.fillRect(0,0,W,H);

  // Y轴范围：0~5，1:2标线和1:3标线
  const yS=v=>PAD.t+gh-(Math.min(v,5)/5)*gh;
  const xS=i=>PAD.l+i*(gw/(n-1));

  // 背景区域：RR≥2绿，1~2黄，<1红
  const y2=yS(2), y1=yS(1);
  ctx.fillStyle=dark?'rgba(0,240,144,.06)':'rgba(0,180,80,.04)';
  ctx.fillRect(PAD.l,PAD.t,gw,Math.max(0,y2-PAD.t));
  ctx.fillStyle=dark?'rgba(255,210,63,.06)':'rgba(200,160,0,.04)';
  ctx.fillRect(PAD.l,y2,gw,Math.max(0,y1-y2));
  ctx.fillStyle=dark?'rgba(255,45,85,.06)':'rgba(200,0,40,.04)';
  ctx.fillRect(PAD.l,y1,gw,Math.max(0,PAD.t+gh-y1));

  // 阈值线
  [[2,'1:2','#00e87a'],[1,'1:1','#ff3a6e'],[3,'1:3','#00cfff']].forEach(([v,lbl,col])=>{
    const y=yS(v);
    ctx.beginPath();ctx.setLineDash([4,4]);ctx.moveTo(PAD.l,y);ctx.lineTo(PAD.l+gw,y);
    ctx.strokeStyle=col+'55';ctx.lineWidth=1;ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle=col;ctx.font='8px "IBM Plex Mono",monospace';ctx.textAlign='right';
    ctx.fillText(lbl,PAD.l-3,y+3);
  });

  // X标签
  ctx.fillStyle=dark?'#6a8faa':'#4a6a8a';ctx.font='8px "IBM Plex Mono",monospace';ctx.textAlign='center';
  data.forEach((d,i)=>{if(i%15===0||i===n-1)ctx.fillText(d.label,xS(i),H-PAD.b+12);});

  // RR面积（⑧维度调整后）
  ctx.beginPath();
  data.forEach((d,i)=>{const x=xS(i),y=yS(Math.min(d.rrAdj||d.rr||0,5));i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
  ctx.lineTo(xS(n-1),PAD.t+gh);ctx.lineTo(PAD.l,PAD.t+gh);ctx.closePath();
  ctx.fillStyle=dark?'rgba(200,122,255,.07)':'rgba(160,80,220,.05)';ctx.fill();

  // RR线（分段着色）
  for(let i=1;i<n;i++){
    const v=Math.min(data[i].rrAdj||data[i].rr||0,5);
    ctx.beginPath();ctx.moveTo(xS(i-1),yS(Math.min(data[i-1].rrAdj||data[i-1].rr||0,5)));ctx.lineTo(xS(i),yS(v));
    ctx.strokeStyle=v>=2?'#00e87a':v>=1?'#ffd23f':'#ff2d55';
    ctx.lineWidth=1.8;ctx.stroke();
  }

  // 末点
  const lv=Math.min(data[n-1].rrAdj||data[n-1].rr||0,5);
  const lc=lv>=2?'#00e87a':lv>=1?'#ffd23f':'#ff2d55';
  ctx.beginPath();ctx.arc(xS(n-1),yS(lv),4,0,Math.PI*2);ctx.fillStyle=lc;ctx.fill();
  ctx.font='bold 9px "IBM Plex Mono",monospace';ctx.textAlign='left';ctx.fillStyle=lc;
  const rrDisp=(data[n-1].rrAdj||data[n-1].rr||0);
  ctx.fillText('1:'+(rrDisp.toFixed(1)),Math.min(xS(n-1)+6,W-50),Math.max(PAD.t+10,Math.min(yS(lv),PAD.t+gh-4)));

  // hover tooltip
  cv.onmousemove=e=>{
    const rect=cv.getBoundingClientRect();
    const idx=Math.round((e.clientX-rect.left-PAD.l)/gw*(n-1));
    if(idx<0||idx>=n) return;
    renderRRChart(data);
    const ctx2=cv.getContext('2d');
    const d=data[idx],x=xS(idx);
    const v2=d.rrAdj||d.rr||0;
    ctx2.save();
    ctx2.beginPath();ctx2.moveTo(x,PAD.t);ctx2.lineTo(x,PAD.t+gh);
    ctx2.strokeStyle=dark?'rgba(255,255,255,.12)':'rgba(0,0,0,.08)';ctx2.lineWidth=1;ctx2.stroke();
    const sig=v2>=3?'极佳建仓时机':v2>=2?'可操作':v2>=1?'偏低谨慎':'盈亏比不足';
    const lines=[
      d.date,
      '盈亏比: 1:'+(v2.toFixed(1))+' · '+sig,
      '止损: '+((d.stopAdj||d.stop||0).toFixed(2))+'元',
      '目标: '+((d.target||0).toFixed(2))+'元',
    ];
    const bw=155,bh=64,bx=x+8<W-bw-PAD.r?x+8:x-bw-8;
    const vc=v2>=2?'#00e87a':v2>=1?'#ffd23f':'#ff2d55';
    ctx2.fillStyle=dark?'rgba(7,12,24,.93)':'rgba(240,244,248,.96)';
    ctx2.strokeStyle=vc+'66';ctx2.lineWidth=1;
    ctx2.fillRect(bx,PAD.t+2,bw,bh);ctx2.strokeRect(bx,PAD.t+2,bw,bh);
    lines.forEach((l,li)=>{
      ctx2.fillStyle=li===0?(dark?'#cce4f8':'#1a2a3a'):li===1?vc:(dark?'#8a9ab0':'#4a6a8a');
      ctx2.font=(li===1?'bold ':'')+'9px "IBM Plex Mono",monospace';
      ctx2.textAlign='left';ctx2.fillText(l,bx+6,PAD.t+13+li*14);
    });
    ctx2.restore();
  };
  cv.onmouseleave=()=>renderRRChart(data);
}

// 主题切换后重绘所有趋势图

function _redrawAllTrendCharts(){
  const rd=window._trendResults;
  if(!rd||!rd.length) return;
  try{renderTrendCanvas(rd);}catch(e){}
  try{renderBiasChart(rd);}catch(e){}
  try{renderBScoreChart(rd);}catch(e){}
  try{renderRRChart(rd);}catch(e){}
  try{renderPriceCanvas(rd);}catch(e){}
  try{renderTrendSummary(rd);}catch(e){}
}\n`
    document.head.appendChild(s)
  }, [])

  async function handleLoad() {
    setLoading(true); setErrMsg('')
    try {
      const mid = /^(60|68|51|58)/.test(code) ? '1' : '0'
      const url = `https://push2his.eastmoney.com/api/qt/stock/kline/get?fields1=f1,f3&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&klt=101&fqt=0&beg=19900101&end=20500101&lmt=160&secid=${mid}.${code}&ut=b2884a393a59ad64002292a3e90d46a5&_=${Date.now()}`
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
      if (!r.ok) throw new Error('HTTP ' + r.status)
      const json = await r.json()
      const klines: string[] = json?.data?.klines
      if (!klines?.length) throw new Error('暂无K线数据')
      const results = klines.map((line: string) => {
        const [date,,close,high,low,vol,,,,chgAmt] = line.split(',')
        const closeN = parseFloat(close)
        const chg = parseFloat(chgAmt)
        return { date, close: closeN, high: parseFloat(high), low: parseFloat(low),
                 vol: parseFloat(vol), chg,
                 stop: stopLoss, target: targetPrice,
                 trend: 3, rs: 3, comp: 3, bias20: 0, ma20: closeN }
      })
      ;(window as any)._trendResults = results
      setLoaded(true)
      setTimeout(() => {
        const w = window as any
        try { w.renderTrendCanvas(results) } catch(e) {}
        try { w.renderPriceCanvas(results) } catch(e) {}
        try { w.renderBiasChart(results) } catch(e) {}
        try { w.renderBScoreChart(results) } catch(e) {}
        try { w.renderTrendSummary(results) } catch(e) {}
      }, 100)
    } catch(e: any) {
      setErrMsg(e.message)
    } finally {
      setLoading(false)
    }
  }

  const S = {
    card: { backgroundColor: 'var(--bg2)', border: '1px solid var(--bd)',
            borderRadius: 12, marginTop: 8, overflow: 'hidden' as const },
    hdr:  { padding: '10px 16px', borderBottom: '1px solid var(--bd)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    lbl:  { fontFamily: 'IBM Plex Mono', fontSize: 8, color: 'var(--t3)',
            letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 4 },
    btn:  { fontFamily: 'IBM Plex Mono', fontSize: 10, padding: '4px 12px',
            border: '1px solid rgba(56,200,255,0.3)', borderRadius: 4,
            cursor: 'pointer' as const, color: 'var(--c)', backgroundColor: 'transparent' },
  }

  return (
    <div style={S.card}>
      <div style={S.hdr}>
        <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: 'var(--t3)',
          letterSpacing: '0.12em' }}>
          📈 90天动态走势 · 三维度强度曲线
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {errMsg && <span style={{ fontSize: 10, color: 'var(--r)' }}>{errMsg}</span>}
          <button onClick={handleLoad} disabled={loading} style={S.btn}>
            {loading ? '⟳ 加载中…' : loaded ? '↻ 刷新' : '📈 载入走势图'}
          </button>
        </div>
      </div>

      {loaded && (
        <div style={{ padding: '12px 16px' }}>
          <div style={{ marginBottom: 10 }}>
            <div style={S.lbl}>TREND · 综合强度</div>
            <div style={{ width: '100%', height: 120 }}>
              <canvas id='trendChart' style={{ width: '100%', height: '100%' }} />
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={S.lbl}>
              PRICE · 价格走势 ·
              <span style={{ color: 'var(--r)' }}> ── 止损</span> ·
              <span style={{ color: 'var(--g)' }}> ── 目标</span>
            </div>
            <div style={{ width: '100%', height: 100 }}>
              <canvas id='priceChart' style={{ width: '100%', height: '100%' }} />
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={S.lbl}>B-SCORE · B分推移</div>
            <div style={{ width: '100%', height: 80 }}>
              <canvas id='bScoreChart' style={{ width: '100%', height: '100%' }} />
            </div>
          </div>
          <div id='trendSummary' />
        </div>
      )}
    </div>
  )
}