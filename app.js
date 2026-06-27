// ===================================================
// 競合分析DB - app.js v2
// スクレイピング + グラフ + AIスコア手動調整
// ===================================================
 
const STORE_KEY = 'rival_db_stores_v2';
const MY_KEY    = 'rival_db_mystore_v2';
const APIKEY_KEY = 'rival_db_apikey';
 
function loadStores() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || getDefaultStores(); }
  catch { return getDefaultStores(); }
}
function saveStores(list) { localStorage.setItem(STORE_KEY, JSON.stringify(list)); }
function loadMyStore() {
  try { return JSON.parse(localStorage.getItem(MY_KEY)) || getDefaultMyStore(); }
  catch { return getDefaultMyStore(); }
}
function saveMySt(obj) { localStorage.setItem(MY_KEY, JSON.stringify(obj)); }
function loadApiKey() { return localStorage.getItem(APIKEY_KEY) || ''; }
function saveApiKey(k) { localStorage.setItem(APIKEY_KEY, k); }
 
// ---------- デフォルトデータ ----------
function getDefaultStores() {
  return [{
    id: 's001',
    name: '神戸デリヘル クリスタル',
    type: 'deli',
    tel: '078-777-6435',
    url: 'https://www.cityheaven.net/hyogo/A2802/A280201/kobe_crystal/',
    castCount: 116,
    price60: 19800, price60new: 17600, price90: 21100, price120: 32100,
    shimei: 2200, specialShimei: 1100, entryFee: 1100, totalReviews: 520,
    scores: { hp: 82, profile: 76, reviews: 85, price: 68, cast: 90 },
    aiTags: [
      { text: '在籍116名・規模最大', type: 'good' },
      { text: '口コミ実績豊富', type: 'good' },
      { text: 'ポイントカード導入済', type: 'good' },
      { text: '価格やや高め', type: 'warn' },
      { text: 'HP情報密度が過多', type: 'warn' },
    ],
    aiSummary: '三宮エリア最大規模の在籍数を誇る老舗デリヘル。口コミ・ランキング機能が充実しており集客基盤は強固。一方で60分19,800円（クーポン後17,600円）と価格帯はやや高く、新規顧客の初回ハードルになり得る。HP情報量が多く一見でわかりにくい面もある。',
  }];
}
function getDefaultMyStore() {
  return { name: '（自店 新規オープン予定）', type: 'hybrid', price60: null, price60new: null, shimei: null, specialShimei: null };
}
 
// ---------- 状態 ----------
let stores = loadStores();
let myStore = loadMyStore();
let currentFilter = 'all';
 
// ---------- ユーティリティ ----------
function calcTotal(scores) {
  if (!scores) return null;
  const vals = Object.values(scores);
  return Math.round(vals.reduce((a,b)=>a+b,0)/vals.length);
}
function scoreClass(n) {
  if (n===null) return 'score-none';
  if (n>=75) return 'score-high';
  if (n>=55) return 'score-mid';
  return 'score-low';
}
function barColor(key) {
  return { hp:'#7c6af7', profile:'#34d399', reviews:'#f59e0b', price:'#22d3ee', cast:'#f472b6' }[key]||'#7c6af7';
}
function formatYen(n) {
  if (n===null||n===undefined) return '—';
  return n.toLocaleString('ja-JP')+'円';
}
function uid() { return 's'+Date.now()+Math.random().toString(36).slice(2,6); }
 
// ---------- KPI ----------
function renderKPI() {
  const real = stores.filter(s=>s.scores);
  const prices = stores.filter(s=>s.price60new).map(s=>s.price60new);
  const minPrice = prices.length ? Math.min(...prices) : null;
  const avgScore = real.length ? Math.round(real.reduce((a,s)=>a+calcTotal(s.scores),0)/real.length) : '—';
  const shimeiVals = stores.filter(s=>s.shimei).map(s=>s.shimei).sort((a,b)=>a-b);
  const medShimei = shimeiVals.length ? shimeiVals[Math.floor(shimeiVals.length/2)] : null;
  document.getElementById('kpi-row').innerHTML = `
    <div class="kpi-card"><div class="kpi-num">${stores.length}</div><div class="kpi-label">登録店舗</div></div>
    <div class="kpi-card"><div class="kpi-num">${minPrice?minPrice.toLocaleString():'—'}</div><div class="kpi-label">最安値 60分（円）</div></div>
    <div class="kpi-card"><div class="kpi-num">${medShimei?medShimei.toLocaleString():'—'}</div><div class="kpi-label">指名料 中央値</div></div>
    <div class="kpi-card"><div class="kpi-num">${avgScore}</div><div class="kpi-label">平均 AIスコア</div></div>
  `;
}
 
// ---------- 店舗カード ----------
function renderStores() {
  const sortVal = document.getElementById('sort-select').value;
  let list = [...stores];
  if (currentFilter!=='all') list = list.filter(s=>s.type===currentFilter);
  list.sort((a,b)=>{
    if (sortVal==='score') return (calcTotal(b.scores)??-1)-(calcTotal(a.scores)??-1);
    if (sortVal==='price_asc') return (a.price60new??99999)-(b.price60new??99999);
    if (sortVal==='price_desc') return (b.price60new??0)-(a.price60new??0);
    if (sortVal==='cast') return (b.castCount??0)-(a.castCount??0);
    if (sortVal==='reviews') return (b.totalReviews??0)-(a.totalReviews??0);
    return 0;
  });
  const grid = document.getElementById('store-grid');
  if (!list.length) {
    grid.innerHTML = `<div class="empty-card"><div>該当する店舗がありません</div></div>`;
    return;
  }
  grid.innerHTML = list.map(s=>renderCard(s)).join('');
}
 
function renderCard(s) {
  const total = calcTotal(s.scores);
  const sc = scoreClass(total);
  const typeLabels = { deli:'デリヘル', hotel:'ホテヘル', hybrid:'ハイブリッド' };
  const backEst = s.price60new ? Math.round(s.price60new*0.6) : null;
  const barsHtml = s.scores ? `
    <div class="score-bars">
      ${Object.entries({hp:'HP作り込み',profile:'プロフ品質',reviews:'口コミ数',price:'価格競争力',cast:'在籍・多様性'}).map(([k,label])=>`
        <div class="bar-row">
          <span class="bar-name">${label}</span>
          <div class="bar-bg"><div class="bar-fill" style="width:${s.scores[k]}%;background:${barColor(k)}"></div></div>
          <span class="bar-num">${s.scores[k]}</span>
        </div>`).join('')}
    </div>` : `<div style="font-size:12px;color:var(--text3);padding:12px 0;text-align:center">未解析 — クリックして解析実行</div>`;
  const tagsHtml = s.aiTags&&s.aiTags.length ? `<div class="ai-tags">${s.aiTags.map(t=>`<span class="ai-tag tag-${t.type}">${t.text}</span>`).join('')}</div>` : '';
  return `
    <div class="store-card" onclick="openDetail('${s.id}')">
      <div class="card-top">
        <div>
          <div class="card-name">${s.name}</div>
          <div class="card-meta">
            <span class="type-badge type-${s.type}">${typeLabels[s.type]}</span>
            ${s.tel&&s.tel!=='—'?`<span class="card-tel">${s.tel}</span>`:''}
            ${s.castCount?`<span class="card-tel">在籍 ${s.castCount}名</span>`:''}
          </div>
        </div>
        <div class="score-circle ${sc}">
          <div class="score-num">${total??'—'}</div>
          <div class="score-label">総合</div>
        </div>
      </div>
      <div class="metrics">
        <div class="metric"><div class="metric-label">新規最安値</div><div class="metric-val">${formatYen(s.price60new)}</div><div class="metric-sub">60分</div></div>
        <div class="metric"><div class="metric-label">指名料</div><div class="metric-val">${formatYen(s.shimei)}</div><div class="metric-sub">特別 +${formatYen(s.specialShimei)}</div></div>
        <div class="metric"><div class="metric-label">女子バック目安</div><div class="metric-val">${formatYen(backEst)}</div><div class="metric-sub">60分×60%試算</div></div>
      </div>
      ${barsHtml}
      ${tagsHtml}
    </div>`;
}
 
// ---------- 比較テーブル ----------
function renderCompareTable() {
  const my = myStore;
  const rows = [
    { isMy:true, cells:[`<strong>${my.name}</strong>`,'—',formatYen(my.price60),formatYen(my.price60new),formatYen(my.shimei),formatYen(my.specialShimei),'—','—','—'] },
    ...stores.map(s=>{
      const backEst = s.price60new?Math.round(s.price60new*0.6):null;
      let cls='';
      if (my.price60new&&s.price60new) cls = s.price60new<my.price60new?'pricier':s.price60new>my.price60new?'cheaper':'same';
      return { isMy:false, cells:[
        s.name,
        {deli:'デリヘル',hotel:'ホテヘル',hybrid:'ハイブリッド'}[s.type],
        `<span class="num-cell">${formatYen(s.price60)}</span>`,
        `<span class="num-cell ${cls}">${formatYen(s.price60new)}</span>`,
        `<span class="num-cell">${formatYen(s.shimei)}</span>`,
        `<span class="num-cell">${formatYen(s.specialShimei)}</span>`,
        `<span class="num-cell">${formatYen(s.entryFee)}</span>`,
        `<span class="num-cell">${formatYen(backEst)}</span>`,
        `<span class="num-cell">${s.totalReviews??'—'}</span>`,
      ]};
    })
  ];
  document.getElementById('compare-table').innerHTML = `
    <thead><tr>${['店舗名','業態','60分通常','新規最安値','指名料','特別指名','入会金','女子バック目安','口コミ総数'].map(c=>`<th>${c}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r=>`<tr class="${r.isMy?'mystore-row':''}">${r.cells.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>`;
}
 
// ---------- チャート描画 ----------
let chartInstance = null;
function renderChart() {
  const canvas = document.getElementById('chart-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
 
  const scored = stores.filter(s=>s.scores);
  if (!scored.length) {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#60606e';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('スコアデータがありません', canvas.width/2, canvas.height/2);
    return;
  }
 
  const labels = ['HP作り込み','プロフ品質','口コミ数','価格競争力','在籍・多様性'];
  const colors = ['#7c6af7','#34d399','#f59e0b','#22d3ee','#f472b6'];
 
  chartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels,
      datasets: scored.map((s,i)=>({
        label: s.name,
        data: [s.scores.hp, s.scores.profile, s.scores.reviews, s.scores.price, s.scores.cast],
        borderColor: colors[i % colors.length],
        backgroundColor: colors[i % colors.length]+'22',
        pointBackgroundColor: colors[i % colors.length],
        borderWidth: 2,
        pointRadius: 4,
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          min: 0, max: 100,
          ticks: { stepSize: 25, color: '#60606e', font: { size: 10 } },
          grid: { color: 'rgba(255,255,255,0.07)' },
          angleLines: { color: 'rgba(255,255,255,0.07)' },
          pointLabels: { color: '#9898a8', font: { size: 11 } },
        }
      },
      plugins: {
        legend: { labels: { color: '#9898a8', font: { size: 12 }, boxWidth: 12 } }
      }
    }
  });
 
  // 価格棒グラフ
  const barCanvas = document.getElementById('bar-canvas');
  if (!barCanvas) return;
  const barCtx = barCanvas.getContext('2d');
  const priced = stores.filter(s=>s.price60new);
  new Chart(barCtx, {
    type: 'bar',
    data: {
      labels: priced.map(s=>s.name.length>8?s.name.slice(0,8)+'…':s.name),
      datasets: [
        { label:'新規最安値', data: priced.map(s=>s.price60new), backgroundColor:'#7c6af7aa', borderRadius:4 },
        { label:'通常価格',   data: priced.map(s=>s.price60||0),  backgroundColor:'#3b3b4f', borderRadius:4 },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        x: { ticks: { color:'#9898a8', font:{size:11} }, grid: { color:'rgba(255,255,255,0.05)' } },
        y: { ticks: { color:'#9898a8', font:{size:11}, callback: v=>v.toLocaleString()+'円' }, grid: { color:'rgba(255,255,255,0.07)' } }
      },
      plugins: { legend: { labels: { color:'#9898a8', font:{size:12}, boxWidth:12 } } }
    }
  });
}
 
// ---------- URL解析（Anthropic API） ----------
async function analyzeURL() {
  const url = document.getElementById('input-url').value.trim();
  const apiKey = document.getElementById('input-apikey').value.trim() || loadApiKey();
  const status = document.getElementById('analyze-status');
 
  if (!url) { status.textContent='URLを入力してください'; status.className='analyze-status err'; return; }
  if (!apiKey) { status.textContent='APIキーを入力してください'; status.className='analyze-status err'; return; }
 
  saveApiKey(apiKey);
  status.className='analyze-status';
  status.textContent='AIが解析中... (10〜20秒かかります)';
 
  const prompt = `以下の風俗店ページのURLを見て、店舗情報を抽出してください。
URLにアクセスできない場合はURLから読み取れる情報だけで回答してください。
 
URL: ${url}
 
以下のJSON形式のみで回答してください（説明文不要）:
{
  "name": "店舗名",
  "type": "deli または hotel または hybrid",
  "tel": "電話番号",
  "castCount": 在籍人数(数値またはnull),
  "price60": 60分通常価格(数値またはnull),
  "price60new": 60分新規最安値(数値またはnull),
  "price90": 90分価格(数値またはnull),
  "price120": 120分価格(数値またはnull),
  "shimei": 指名料(数値またはnull),
  "specialShimei": 特別指名料(数値またはnull),
  "entryFee": 入会金(数値またはnull),
  "totalReviews": 口コミ総数(数値またはnull),
  "scores": {
    "hp": HPの作り込み・情報設計スコア(0-100),
    "profile": プロフ画像クオリティスコア(0-100),
    "reviews": 口コミ数・信頼度スコア(0-100),
    "price": 価格競争力スコア(0-100),
    "cast": 在籍数・多様性スコア(0-100)
  },
  "aiTags": [{"text":"タグ名","type":"good または warn または bad"}],
  "aiSummary": "200文字以内のAI総評"
}`;
 
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role:'user', content: prompt }]
      })
    });
 
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || res.statusText);
    }
 
    const data = await res.json();
    const text = data.content[0].text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('JSONの解析に失敗しました');
 
    const parsed = JSON.parse(jsonMatch[0]);
    const newStore = {
      id: uid(),
      url,
      name: parsed.name || '（店舗名不明）',
      type: parsed.type || 'deli',
      tel: parsed.tel || '—',
      castCount: parsed.castCount || null,
      price60: parsed.price60 || null,
      price60new: parsed.price60new || null,
      price90: parsed.price90 || null,
      price120: parsed.price120 || null,
      shimei: parsed.shimei || null,
      specialShimei: parsed.specialShimei || null,
      entryFee: parsed.entryFee || null,
      totalReviews: parsed.totalReviews || null,
      scores: parsed.scores || null,
      aiTags: parsed.aiTags || [],
      aiSummary: parsed.aiSummary || '',
    };
 
    stores.push(newStore);
    saveStores(stores);
    closeModal('add');
    renderAll();
    showToast(`「${newStore.name}」を登録しました`, 'ok');
 
  } catch(e) {
    status.textContent = 'エラー: ' + e.message;
    status.className = 'analyze-status err';
  }
}
 
// ---------- 詳細モーダル ----------
function openDetail(id) {
  const s = stores.find(x=>x.id===id);
  if (!s) return;
  const total = calcTotal(s.scores);
  const backEst = s.price60new ? Math.round(s.price60new*0.6) : null;
  const typeLabels = { deli:'デリヘル', hotel:'ホテヘル', hybrid:'ハイブリッド' };
 
  const barsHtml = s.scores ? `
    <h4 style="font-size:13px;color:var(--text2);margin-bottom:10px">AIスコア詳細（クリックで編集）</h4>
    <div class="detail-score-bars" id="score-bars-${s.id}">
      ${Object.entries({hp:'HP作り込み・情報設計',profile:'プロフ画像クオリティ',reviews:'口コミ数・信頼度',price:'価格競争力',cast:'在籍数・多様性'}).map(([k,label])=>`
        <div class="detail-bar-row">
          <span class="detail-bar-name">${label}</span>
          <div class="detail-bar-bg"><div class="detail-bar-fill" style="width:${s.scores[k]}%;background:${barColor(k)}"></div></div>
          <input type="number" class="score-input" min="0" max="100" value="${s.scores[k]}"
            onchange="updateScore('${s.id}','${k}',this.value)"
            style="width:52px;padding:2px 6px;font-size:12px;text-align:right" />
        </div>`).join('')}
    </div>` : `<button class="btn-primary" onclick="runAIScore('${s.id}')">AIスコアを今すぐ生成</button>`;
 
  document.getElementById('detail-title').textContent = s.name;
  document.getElementById('detail-body').innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
      <span class="type-badge type-${s.type}">${typeLabels[s.type]}</span>
      ${s.tel&&s.tel!=='—'?`<span style="font-size:12px;color:var(--text3)">${s.tel}</span>`:''}
      ${s.url?`<a href="${s.url}" target="_blank" style="font-size:12px;color:var(--accent)">公式ページ →</a>`:''}
    </div>
    <div class="detail-grid">
      <div class="detail-metric"><div class="dm-label">AI総合スコア</div><div class="dm-val" style="color:${total>=75?'var(--green)':total>=55?'var(--amber)':'var(--red)'}">${total??'未解析'}</div></div>
      <div class="detail-metric"><div class="dm-label">在籍人数</div><div class="dm-val">${s.castCount??'—'}<span style="font-size:13px;font-weight:400"> 名</span></div></div>
      <div class="detail-metric"><div class="dm-label">60分 新規最安値</div><div class="dm-val">${formatYen(s.price60new)}</div><div class="dm-sub">通常 ${formatYen(s.price60)}</div></div>
      <div class="detail-metric"><div class="dm-label">90分 / 120分</div><div class="dm-val" style="font-size:14px">${formatYen(s.price90)} / ${formatYen(s.price120)}</div></div>
      <div class="detail-metric"><div class="dm-label">指名料</div><div class="dm-val">${formatYen(s.shimei)}</div><div class="dm-sub">特別指名 ${formatYen(s.specialShimei)}</div></div>
      <div class="detail-metric"><div class="dm-label">女子バック目安</div><div class="dm-val" style="color:var(--green)">${formatYen(backEst)}</div><div class="dm-sub">60分新規×60%</div></div>
    </div>
    ${barsHtml}
    ${s.aiSummary?`<h4 style="font-size:13px;color:var(--text2);margin:14px 0 8px">AI総評</h4><div class="detail-ai-summary">${s.aiSummary}</div>`:''}
    ${s.aiTags&&s.aiTags.length?`<div class="detail-tags" style="margin-top:10px">${s.aiTags.map(t=>`<span class="ai-tag tag-${t.type}">${t.text}</span>`).join('')}</div>`:''}
    <div style="margin-top:20px;display:flex;justify-content:flex-end;gap:8px">
      <button class="btn-danger" onclick="deleteStore('${s.id}');closeModal('detail')">削除</button>
      <button class="btn-ghost" onclick="closeModal('detail')">閉じる</button>
    </div>`;
  openModal('detail');
}
 
// ---------- スコア手動更新 ----------
function updateScore(id, key, val) {
  const s = stores.find(x=>x.id===id);
  if (!s||!s.scores) return;
  s.scores[key] = Math.min(100, Math.max(0, parseInt(val)||0));
  saveStores(stores);
  renderStores();
  showToast('スコアを更新しました', 'ok');
}
 
// ---------- AIスコア生成（未解析店舗用） ----------
async function runAIScore(id) {
  const s = stores.find(x=>x.id===id);
  const apiKey = loadApiKey();
  if (!apiKey) { showToast('APIキーを設定してください', 'err'); return; }
  showToast('AIスコアを生成中...', 'ok');
 
  const prompt = `以下の店舗情報を元にスコアを生成してください。
店舗名: ${s.name}
業態: ${s.type}
在籍数: ${s.castCount||'不明'}
価格60分: ${s.price60||'不明'}
口コミ数: ${s.totalReviews||'不明'}
 
JSONのみで回答:
{"hp":数値,"profile":数値,"reviews":数値,"price":数値,"cast":数値,"aiTags":[{"text":"タグ","type":"good/warn/bad"}],"aiSummary":"総評"}`;
 
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:500,messages:[{role:'user',content:prompt}]})
    });
    const data = await res.json();
    const parsed = JSON.parse(data.content[0].text.match(/\{[\s\S]*\}/)[0]);
    s.scores = { hp:parsed.hp, profile:parsed.profile, reviews:parsed.reviews, price:parsed.price, cast:parsed.cast };
    s.aiTags = parsed.aiTags||[];
    s.aiSummary = parsed.aiSummary||'';
    saveStores(stores);
    closeModal('detail');
    renderAll();
    openDetail(id);
    showToast('AIスコアを生成しました', 'ok');
  } catch(e) { showToast('エラー: '+e.message, 'err'); }
}
 
// ---------- 手動追加 ----------
function addManual() {
  const name = document.getElementById('m-name').value.trim();
  if (!name) { showToast('店舗名を入力してください','err'); return; }
  stores.push({
    id: uid(), name,
    type: document.getElementById('m-type').value,
    tel: document.getElementById('m-tel').value||'—',
    url: document.getElementById('m-url').value,
    castCount: parseInt(document.getElementById('m-cast').value)||null,
    price60: parseInt(document.getElementById('m-p60').value)||null,
    price60new: parseInt(document.getElementById('m-p60new').value)||null,
    price90:null, price120:null,
    shimei: parseInt(document.getElementById('m-shimei').value)||null,
    specialShimei: parseInt(document.getElementById('m-special').value)||null,
    entryFee: parseInt(document.getElementById('m-entry').value)||null,
    totalReviews: parseInt(document.getElementById('m-reviews').value)||null,
    scores:null, aiTags:[], aiSummary:'',
  });
  saveStores(stores);
  closeModal('add');
  renderAll();
  showToast(`「${name}」を登録しました`,'ok');
}
 
// ---------- 削除 ----------
function deleteStore(id) {
  stores = stores.filter(s=>s.id!==id);
  saveStores(stores);
  renderAll();
  showToast('店舗を削除しました','ok');
}
 
// ---------- 自店保存 ----------
function saveMyStore() {
  myStore = {
    name: document.getElementById('my-name').value||'（新規オープン予定）',
    type:'hybrid',
    price60: parseInt(document.getElementById('my-p60').value)||null,
    price60new: parseInt(document.getElementById('my-p60new').value)||null,
    shimei: parseInt(document.getElementById('my-shimei').value)||null,
    specialShimei: parseInt(document.getElementById('my-special').value)||null,
  };
  saveMySt(myStore);
  closeModal('mystore');
  renderAll();
  showToast('自店設定を保存しました','ok');
}
 
// ---------- フィルター・ソート ----------
function filterType(type,el) {
  currentFilter = type;
  document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
  renderStores();
}
function sortStores() { renderStores(); }
 
// ---------- モーダル ----------
function openModal(id) {
  if (id==='mystore') {
    document.getElementById('my-name').value = myStore.name!=='（新規オープン予定）'?myStore.name:'';
    document.getElementById('my-p60').value = myStore.price60||'';
    document.getElementById('my-p60new').value = myStore.price60new||'';
    document.getElementById('my-shimei').value = myStore.shimei||'';
    document.getElementById('my-special').value = myStore.specialShimei||'';
  }
  if (id==='add') {
    const saved = loadApiKey();
    if (saved) document.getElementById('input-apikey').value = saved;
  }
  document.getElementById('modal-'+id).classList.add('open');
}
function closeModal(id) { document.getElementById('modal-'+id).classList.remove('open'); }
function closeModalIfBg(e,id) { if (e.target===document.getElementById('modal-'+id)) closeModal(id); }
function switchMTab(tab,el) {
  document.querySelectorAll('.mtab').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.mtab-content').forEach(c=>c.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('mtab-'+tab).classList.add('active');
}
 
// ---------- トースト ----------
function showToast(msg,type) {
  const t = document.createElement('div');
  t.className=`toast toast-${type}`;
  t.textContent=msg;
  document.body.appendChild(t);
  requestAnimationFrame(()=>t.classList.add('show'));
  setTimeout(()=>{ t.classList.remove('show'); setTimeout(()=>t.remove(),300); },2800);
}
 
// ---------- 初期化 ----------
function renderAll() {
  renderKPI();
  renderStores();
  renderCompareTable();
  setTimeout(renderChart, 100);
}
document.addEventListener('DOMContentLoaded', renderAll);
