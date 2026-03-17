// V6完全移植: calcBias200関数
// ロジック変更禁止 - 型注釈のみ追加

export interface Bias200Result {
  bias200Pct:  string
  annualVol:   string
  zScore:      string
  dynWarn:     string
  ma200val:    string
  ma200dir:    string
  signal:      string
  sigColor:    string
  vsWarn:      string
  dataPoints:  number
  ok:          true
}
export interface Bias200Error {
  signal:  string
  detail?: string
  ok?:     false
}
export type Bias200Data = Bias200Result | Bias200Error

// V6のcalcBias200をそのままTypeScript変換（ロジック変更なし）
export function calcBias200(closes: number[], currentPrice: number): Bias200Data {
  try {
    const n = closes.length;
    if (n < 200 || isNaN(currentPrice) || currentPrice <= 0) {
      return { signal:'数据不足', detail:'需要至少200日K线数据' };
    }

    // ① MA200
    const ma200arr = closes.slice(-200);
    const ma200val = ma200arr.reduce((a,b)=>a+b,0) / 200;

    // ② BIAS200 (%)
    const bias200 = (currentPrice - ma200val) / ma200val * 100;

    // ③ 年化波动率σ（日次収益率の標準偏差×√250）
    const retN = Math.min(n, 250);
    const retSlice = closes.slice(-retN);
    const dailyRets: number[] = [];
    for (let i = 1; i < retSlice.length; i++) {
      if (retSlice[i-1] > 0) dailyRets.push((retSlice[i] - retSlice[i-1]) / retSlice[i-1]);
    }
    const mean = dailyRets.reduce((a,b)=>a+b,0) / dailyRets.length;
    const variance = dailyRets.reduce((a,b)=>a+(b-mean)**2, 0) / dailyRets.length;
    const dailyStd = Math.sqrt(variance);
    const annualVol = dailyStd * Math.sqrt(250) * 100;

    // ④ 標準化乖離 Z-Score
    const zScore = annualVol > 0 ? bias200 / annualVol : 0;

    // ⑤ 動的警戒線：過去1年の各日BIAS200の80%分位数
    const dynN = Math.min(n, 250);
    const startIdx = n - dynN;
    const bias200arr: number[] = [];
    for (let i = startIdx; i < n; i++) {
      if (i < 199) continue;
      const sl = closes.slice(i-199, i+1);
      const ma = sl.reduce((a,b)=>a+b,0) / 200;
      const b = (closes[i] - ma) / ma * 100;
      const av = annualVol > 0 ? b / annualVol : 0;
      bias200arr.push(av);
    }
    let dynWarn = 1.85;
    if (bias200arr.length >= 10) {
      const sorted = [...bias200arr].sort((a,b)=>a-b);
      const idx80 = Math.floor(sorted.length * 0.8);
      dynWarn = +sorted[idx80].toFixed(2);
      if (dynWarn <= 0 || dynWarn > 10) dynWarn = 1.85;
    }

    // ⑥ MA200方向（過去5日のMA200の変化）
    let ma200dir = '→';
    if (n >= 205) {
      const ma200_5ago = closes.slice(-205, -5).slice(-200).reduce((a,b)=>a+b,0)/200;
      const diff = ma200val - ma200_5ago;
      ma200dir = diff > ma200val*0.001 ? '↑' : diff < -ma200val*0.001 ? '↓' : '→';
    }

    // ⑦ 信号判定
    let signal: string, sigColor: string;
    const absZ = Math.abs(zScore);
    if (bias200 < 0) {
      signal   = absZ > 2.5 ? '🟢 超跌区间' : absZ > 1.5 ? '🔵 偏低' : '⬜ 正常';
      sigColor = absZ > 2.5 ? 'green' : absZ > 1.5 ? 'cyan' : 'normal';
    } else {
      if      (absZ > 2.5) { signal = '🔴 极端乖离'; sigColor = 'red';    }
      else if (absZ > 2.0) { signal = '🟠 乖离过大'; sigColor = 'orange'; }
      else if (absZ > 1.5) { signal = '🟡 偏高';     sigColor = 'yellow'; }
      else                  { signal = '⬜ 正常区间'; sigColor = 'normal'; }
    }

    // ⑧ 動的警戒線比較コメント
    const vsWarn = zScore > dynWarn
      ? `已超动态警戒(${dynWarn}σ) ⚠️`
      : `低于动态警戒(${dynWarn}σ) ✓`;

    return {
      bias200Pct:  bias200.toFixed(1),
      annualVol:   annualVol.toFixed(1),
      zScore:      zScore.toFixed(2),
      dynWarn:     dynWarn.toFixed(2),
      ma200val:    ma200val.toFixed(2),
      ma200dir,
      signal,
      sigColor,
      vsWarn,
      dataPoints:  n,
      ok: true
    };
  } catch(e) {
    return { signal:'计算错误', detail: (e as Error).message };
  }
}
