// ===================================================
// 競合分析DB - app.js v4
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
    aiSummary: '三宮エリア最大規模の在籍数を誇る老舗デリヘル。口コミ・ランキング機能が充実しており集客基盤は強固。一方で60分19,800円（クーポン後17,600円）と価格帯はやや高く、新規顧客の初回ハードルになり得る。',
  }];
}
function getDefaultMyStore() {
  return { name: '（自店 新規オープン予定）', type: 'hybrid', price60: null, price60new: null, shimei: null, specialShimei: null };
}
 
let stores = loadStores();
let myStore = loadMyStore();
let currentFilter = 'all';
 
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
 
// 女子バック計算（60分換算）
// 60分あれば: price60new * 0.6
// なければ90分で: price90 * 0.6 / 90 * 60
function calcBack(s) {
  if (s.price60new) return Math.round(s.price60new * 0.6);
  if (s.price90) return Math.round(s.price90 * 0.6 / 90 * 60);
  return null;
}
function backLabel(s) {
  if (s.price60new) return '60分新規x60%';
  if (s.price90) return '90分x0.6÷90x60換算';
  return '—';
}
 
function renderKPI() {
  const real = stores.filter(s=>s.scores);
  const prices = stores.filter(s=>s.price60new||s.price90).map(s=>s.price60new||Math.round(s.price90*0.6/90*60*10/6));
  const minPrice = prices.length ? Math.min(...prices) : null;
  const avgScore = real.length ? Math.round(real.reduce((a,s)=>a+calcTotal(s.scores),0)/real.length) : '—';
  const shimeiVals = stores.filter(s=>s.shimei).map(s=>s.shimei).sort((a,b)=>a-b);
  const medShimei = shimeiVals.length ? shimeiVals[Math.floor(shimeiVals.length/2)] : null;
  document.getElementById('kpi-row').innerHTML =
    '<div class="kpi-card"><div class="kpi-num">'+stores.length+'</div><div class="kpi-label">登録店舗</div></div>' +
    '<div class="kpi-card"><div class="kpi-num">'+(minPrice?minPrice.toLocaleString():'—')+'</div><div class="kpi-label">最安値 60分（円）</div></div>' +
    '<div class="kpi-card"><div class="kpi-num">'+(medShimei?medShimei.toLocaleString():'—')+'</div><div class="kpi-label">指名料 中央値</div></div>' +
    '<div class="kpi-card"><div class="kpi-num">'+avgScore+'</div><div class="kpi-label">平均 AIスコア</div></div>';
}
 
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
  if (!list.length) { grid.innerHTML = '<div class="empty-card"><div>該当する店舗がありません</div></div>'; return; }
  grid.innerHTML = list.map(s=>renderCard(s)).join('');
}
 
function renderCard(s) {
  const total = calcTotal(s.scores);
  const sc = scoreClass(total);
  const typeLabels = { deli:'デリヘル', hotel:'ホテヘル', hybrid:'ハイブリッド' };
  const backEst = calcBack(s);
  const barsHtml = s.scores ?
    '<div class="score-bars">' +
    Object.entries({hp:'HP作り込み',profile:'プロフ品質',reviews:'口コミ数',price:'価格競争力',cast:'在籍・多様性'}).map(function(e){
      var k=e[0],label=e[1];
      return '<div class="bar-row"><span class="bar-name">'+label+'</span><div class="bar-bg"><div class="bar-fill" style="width:'+s.scores[k]+'%;background:'+barColor(k)+'"></div></div><span class="bar-num">'+s.scores[k]+'</span></div>';
    }).join('') + '</div>'
    : '<div style="font-size:12px;color:var(--text3);padding:12px 0;text-align:center">未解析 — クリックして解析実行</div>';
  const tagsHtml = s.aiTags&&s.aiTags.length ? '<div class="ai-tags">'+s.aiTags.map(function(t){return '<span class="ai-tag tag-'+t.type+'">'+t.text+'</span>';}).join('')+'</div>' : '';
  return '<div class="store-card" onclick="openDetail(\''+s.id+'\')">'+
    '<div class="card-top"><div>'+
    '<div class="card-name">'+s.name+'</div>'+
    '<div class="card-meta"><span class="type-badge type-'+s.type+'">'+typeLabels[s.type]+'</span>'+
    (s.tel&&s.tel!=='—'?'<span class="card-tel">'+s.tel+'</span>':'')+
    (s.castCount?'<span class="card-tel">在籍 '+s.castCount+'名</span>':'')+
    '</div></div>'+
    '<div class="score-circle '+sc+'"><div class="score-num">'+(total||'—')+'</div><div class="score-label">総合</div></div></div>'+
    '<div class="metrics">'+
    '<div class="metric"><div class="metric-label">新規最安値</div><div class="metric-val">'+formatYen(s.price60new||s.price90)+'</div><div class="metric-sub">'+(s.price60new?'60分':'90分')+'</div></div>'+
    '<div class="metric"><div class="metric-label">指名料</div><div class="metric-val">'+formatYen(s.shimei)+'</div><div class="metric-sub">特別 +'+formatYen(s.specialShimei)+'</div></div>'+
    '<div class="metric"><div class="metric-label">女子バック(60分換算)</div><div class="metric-val">'+formatYen(backEst)+'</div><div class="metric-sub">'+backLabel(s)+'</div></div>'+
    '</div>'+barsHtml+tagsHtml+'</div>';
}
 
function renderCompareTable() {
  var my = myStore;
  var rows = [{ isMy:true, cells:['<strong>'+my.name+'</strong>','—',formatYen(my.price60),formatYen(my.price60new),formatYen(my.shimei),formatYen(my.specialShimei),'—','—','—'] }];
  stores.forEach(function(s) {
    var backEst = calcBack(s);
    var cls='';
    if (my.price60new&&s.price60new) cls = s.price60new<my.price60new?'pricier':s.price60new>my.price60new?'cheaper':'same';
    rows.push({ isMy:false, cells:[
      s.name,
      {deli:'デリヘル',hotel:'ホテヘル',hybrid:'ハイブリッド'}[s.type],
      '<span class="num-cell">'+formatYen(s.price60)+'</span>',
      '<span class="num-cell '+cls+'">'+formatYen(s.price60new)+'</span>',
      '<span class="num-cell">'+formatYen(s.shimei)+'</span>',
      '<span class="num-cell">'+formatYen(s.specialShimei)+'</span>',
      '<span class="num-cell">'+formatYen(s.entryFee)+'</span>',
      '<span class="num-cell">'+formatYen(backEst)+'</span>',
      '<span class="num-cell">'+(s.totalReviews||'—')+'</span>',
    ]});
  });
  document.getElementById('compare-table').innerHTML =
    '<thead><tr>'+['店舗名','業態','60分通常','新規最安値','指名料','特別指名','入会金','女子バック(60分換算)','口コミ総数'].map(function(c){return '<th>'+c+'</th>';}).join('')+'</tr></thead>'+
    '<tbody>'+rows.map(function(r){return '<tr class="'+(r.isMy?'mystore-row':'')+'">'+r.cells.map(function(c){return '<td>'+c+'</td>';}).join('')+'</tr>';}).join('')+'</tbody>';
}
 
var chartInstance = null;
function renderChart() {
  var canvas = document.getElementById('chart-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
  var scored = stores.filter(function(s){return s.scores;});
  if (!scored.length) return;
  var labels = ['HP作り込み','プロフ品質','口コミ数','価格競争力','在籍・多様性'];
  var colors = ['#7c6af7','#34d399','#f59e0b','#22d3ee','#f472b6'];
  chartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: labels,
      datasets: scored.map(function(s,i){return {
        label: s.name,
        data: [s.scores.hp, s.scores.profile, s.scores.reviews, s.scores.price, s.scores.cast],
        borderColor: colors[i%colors.length],
        backgroundColor: colors[i%colors.length]+'22',
        pointBackgroundColor: colors[i%colors.length],
        borderWidth: 2, pointRadius: 4,
      };})
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: { r: { min:0, max:100, ticks:{stepSize:25,color:'#60606e',font:{size:10}}, grid:{color:'rgba(255,255,255,0.07)'}, angleLines:{color:'rgba(255,255,255,0.07)'}, pointLabels:{color:'#9898a8',font:{size:11}} } },
      plugins: { legend: { labels: { color:'#9898a8', font:{size:12}, boxWidth:12 } } }
    }
  });
  var barCanvas = document.getElementById('bar-canvas');
  if (!barCanvas) return;
  var barCtx = barCanvas.getContext('2d');
  var priced = stores.filter(function(s){return s.price60new||s.price90;});
  new Chart(barCtx, {
    type: 'bar',
    data: {
      labels: priced.map(function(s){return s.name.length>8?s.name.slice(0,8)+'...':s.name;}),
      datasets: [
        { label:'新規最安値', data:priced.map(function(s){return s.price60new||s.price90||0;}), backgroundColor:'#7c6af7aa', borderRadius:4 },
        { label:'通常価格',   data:priced.map(function(s){return s.price60||0;}),  backgroundColor:'#3b3b4f', borderRadius:4 },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        x: { ticks:{color:'#9898a8',font:{size:11}}, grid:{color:'rgba(255,255,255,0.05)'} },
        y: { ticks:{color:'#9898a8',font:{size:11},callback:function(v){return v.toLocaleString()+'円';}}, grid:{color:'rgba(255,255,255,0.07)'} }
      },
      plugins: { legend: { labels: { color:'#9898a8', font:{size:12}, boxWidth:12 } } }
    }
  });
}
 
async function analyzeURL() {
  var url = document.getElementById('input-url').value.trim();
  var apiKey = document.getElementById('input-apikey').value.trim() || loadApiKey();
  var status = document.getElementById('analyze-status');
  if (!url) { status.textContent='URLを入力してください'; status.className='analyze-status err'; return; }
  if (!apiKey) { status.textContent='APIキーを入力してください'; status.className='analyze-status err'; return; }
  saveApiKey(apiKey);
  status.className='analyze-status';
  status.textContent='サーバー経由でページ取得中... (20〜40秒かかります)';
  try {
    var res = await fetch('https://rival-scraper.onrender.com/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url, api_key: apiKey })
    });
    if (!res.ok) throw new Error('サーバーエラー: ' + res.statusText);
    var parsed = await res.json();
    if (parsed.error) throw new Error(parsed.error);
    stores.push({
      id: uid(), url: url,
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
    });
    saveStores(stores);
    closeModal('add');
    renderAll();
    showToast('「'+parsed.name+'」を登録しました', 'ok');
  } catch(e) {
    status.textContent = 'エラー: ' + e.message;
    status.className = 'analyze-status err';
  }
}
 
function openDetail(id) {
  var s = stores.find(function(x){return x.id===id;});
  if (!s) return;
  var total = calcTotal(s.scores);
  var backEst = calcBack(s);
  var typeLabels = { deli:'デリヘル', hotel:'ホテヘル', hybrid:'ハイブリッド' };
 
  var barsHtml = s.scores ?
    '<h4 style="font-size:13px;color:var(--text2);margin-bottom:10px">AIスコア詳細（数字で編集可）</h4>'+
    '<div class="detail-score-bars">'+
    Object.entries({hp:'HP作り込み',profile:'プロフ品質',reviews:'口コミ数',price:'価格競争力',cast:'在籍・多様性'}).map(function(e){
      var k=e[0],label=e[1];
      return '<div class="detail-bar-row"><span class="detail-bar-name">'+label+'</span><div class="detail-bar-bg"><div class="detail-bar-fill" style="width:'+s.scores[k]+'%;background:'+barColor(k)+'"></div></div><input type="number" class="score-input" min="0" max="100" value="'+s.scores[k]+'" onchange="updateScore(\''+s.id+'\',\''+k+'\',this.value)" style="width:52px;padding:2px 6px;font-size:12px;text-align:right" /></div>';
    }).join('')+'</div>'
    : '<button class="btn-primary" style="margin-bottom:12px" onclick="runAIScore(\''+s.id+'\')">AIスコアを今すぐ生成</button>';
 
  // 手動更新フォーム
  var editForm =
    '<div style="background:var(--bg3);border-radius:8px;padding:14px;margin:14px 0">'+
    '<div style="font-size:12px;font-weight:600;color:var(--text2);margin-bottom:10px">数値を手動更新</div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'+
    '<div><div style="font-size:11px;color:var(--text3);margin-bottom:4px">口コミ総数</div><input type="number" id="edit-reviews-'+s.id+'" value="'+(s.totalReviews||'')+'" placeholder="1338" style="width:100%;background:var(--bg4);border:1px solid var(--border2);color:var(--text);padding:6px 8px;border-radius:4px;font-size:13px" /></div>'+
    '<div><div style="font-size:11px;color:var(--text3);margin-bottom:4px">在籍人数</div><input type="number" id="edit-cast-'+s.id+'" value="'+(s.castCount||'')+'" placeholder="116" style="width:100%;background:var(--bg4);border:1px solid var(--border2);color:var(--text);padding:6px 8px;border-radius:4px;font-size:13px" /></div>'+
    '<div><div style="font-size:11px;color:var(--text3);margin-bottom:4px">60分新規価格</div><input type="number" id="edit-p60-'+s.id+'" value="'+(s.price60new||'')+'" placeholder="17600" style="width:100%;background:var(--bg4);border:1px solid var(--border2);color:var(--text);padding:6px 8px;border-radius:4px;font-size:13px" /></div>'+
    '<div><div style="font-size:11px;color:var(--text3);margin-bottom:4px">90分価格</div><input type="number" id="edit-p90-'+s.id+'" value="'+(s.price90||'')+'" placeholder="21100" style="width:100%;background:var(--bg4);border:1px solid var(--border2);color:var(--text);padding:6px 8px;border-radius:4px;font-size:13px" /></div>'+
    '<div><div style="font-size:11px;color:var(--text3);margin-bottom:4px">指名料</div><input type="number" id="edit-shimei-'+s.id+'" value="'+(s.shimei||'')+'" placeholder="2200" style="width:100%;background:var(--bg4);border:1px solid var(--border2);color:var(--text);padding:6px 8px;border-radius:4px;font-size:13px" /></div>'+
    '<div><div style="font-size:11px;color:var(--text3);margin-bottom:4px">特別指名料</div><input type="number" id="edit-special-'+s.id+'" value="'+(s.specialShimei||'')+'" placeholder="1100" style="width:100%;background:var(--bg4);border:1px solid var(--border2);color:var(--text);padding:6px 8px;border-radius:4px;font-size:13px" /></div>'+
    '</div>'+
    '<button class="btn-primary" style="margin-top:10px" onclick="saveEdits(\''+s.id+'\')">数値を保存</button>'+
    '</div>';
 
  document.getElementById('detail-title').textContent = s.name;
  document.getElementById('detail-body').innerHTML =
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">'+
    '<span class="type-badge type-'+s.type+'">'+typeLabels[s.type]+'</span>'+
    (s.tel&&s.tel!=='—'?'<span style="font-size:12px;color:var(--text3)">'+s.tel+'</span>':'')+
    (s.url?'<a href="'+s.url+'" target="_blank" style="font-size:12px;color:var(--accent)">公式ページ →</a>':'')+
    '</div>'+
    '<div class="detail-grid">'+
    '<div class="detail-metric"><div class="dm-label">AI総合スコア</div><div class="dm-val" style="color:'+(total>=75?'var(--green)':total>=55?'var(--amber)':'var(--red)')+'">'+( total||'未解析')+'</div></div>'+
    '<div class="detail-metric"><div class="dm-label">在籍人数</div><div class="dm-val">'+(s.castCount||'—')+'<span style="font-size:13px;font-weight:400"> 名</span></div></div>'+
    '<div class="detail-metric"><div class="dm-label">60分 新規最安値</div><div class="dm-val">'+formatYen(s.price60new)+'</div><div class="dm-sub">通常 '+formatYen(s.price60)+'</div></div>'+
    '<div class="detail-metric"><div class="dm-label">90分 / 120分</div><div class="dm-val" style="font-size:14px">'+formatYen(s.price90)+' / '+formatYen(s.price120)+'</div></div>'+
    '<div class="detail-metric"><div class="dm-label">指名料</div><div class="dm-val">'+formatYen(s.shimei)+'</div><div class="dm-sub">特別指名 '+formatYen(s.specialShimei)+'</div></div>'+
    '<div class="detail-metric"><div class="dm-label">女子バック(60分換算)</div><div class="dm-val" style="color:var(--green)">'+formatYen(backEst)+'</div><div class="dm-sub">'+backLabel(s)+'</div></div>'+
    '<div class="detail-metric"><div class="dm-label">口コミ総数</div><div class="dm-val">'+(s.totalReviews||'—')+'件</div></div>'+
    '</div>'+
    editForm+
    barsHtml+
    '<div style="display:flex;gap:8px;margin:14px 0 4px">'+
    '<button class="btn-primary" style="flex:1" onclick="runAIScore(\''+s.id+'\')">AI総評を再生成</button>'+
    '</div>'+
    (s.aiSummary?'<h4 style="font-size:13px;color:var(--text2);margin:14px 0 8px">AI総評</h4><div class="detail-ai-summary">'+s.aiSummary+'</div>':'')+
    (s.aiTags&&s.aiTags.length?'<div class="detail-tags" style="margin-top:10px">'+s.aiTags.map(function(t){return '<span class="ai-tag tag-'+t.type+'">'+t.text+'</span>';}).join('')+'</div>':'')+
    '<div style="margin-top:20px;display:flex;justify-content:flex-end;gap:8px">'+
    '<button class="btn-danger" onclick="deleteStore(\''+s.id+'\');closeModal(\'detail\')">削除</button>'+
    '<button class="btn-ghost" onclick="closeModal(\'detail\')">閉じる</button></div>';
  openModal('detail');
}
 
// 数値手動保存
function saveEdits(id) {
  var s = stores.find(function(x){return x.id===id;});
  if (!s) return;
  var reviews = parseInt(document.getElementById('edit-reviews-'+id).value)||null;
  var cast = parseInt(document.getElementById('edit-cast-'+id).value)||null;
  var p60 = parseInt(document.getElementById('edit-p60-'+id).value)||null;
  var p90 = parseInt(document.getElementById('edit-p90-'+id).value)||null;
  var shimei = parseInt(document.getElementById('edit-shimei-'+id).value)||null;
  var special = parseInt(document.getElementById('edit-special-'+id).value)||null;
  if (reviews!==null) s.totalReviews = reviews;
  if (cast!==null) s.castCount = cast;
  if (p60!==null) s.price60new = p60;
  if (p90!==null) s.price90 = p90;
  if (shimei!==null) s.shimei = shimei;
  if (special!==null) s.specialShimei = special;
  saveStores(stores);
  closeModal('detail');
  renderAll();
  openDetail(id);
  showToast('数値を更新しました', 'ok');
}
 
function updateScore(id, key, val) {
  var s = stores.find(function(x){return x.id===id;});
  if (!s||!s.scores) return;
  s.scores[key] = Math.min(100, Math.max(0, parseInt(val)||0));
  saveStores(stores);
  renderStores();
  showToast('スコアを更新しました', 'ok');
}
 
async function runAIScore(id) {
  var s = stores.find(function(x){return x.id===id;});
  var apiKey = loadApiKey();
  if (!apiKey) { showToast('APIキーを設定してください', 'err'); return; }
  showToast('AI総評を再生成中...', 'ok');
  var prompt = '以下の風俗店情報を元にAI評価を生成してください。\n店舗名: '+s.name+'\n業態: '+s.type+'\n在籍数: '+(s.castCount||'不明')+'\n60分価格: '+(s.price60new||'不明')+'\n90分価格: '+(s.price90||'不明')+'\n指名料: '+(s.shimei||'不明')+'\n口コミ数: '+(s.totalReviews||'不明')+'\n\nJSONのみで回答:\n{"hp":数値0-100,"profile":数値0-100,"reviews":数値0-100,"price":数値0-100,"cast":数値0-100,"aiTags":[{"text":"タグ","type":"good/warn/bad"}],"aiSummary":"200文字以内の総評"}';
  try {
    var res = await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:800,messages:[{role:'user',content:prompt}]})
    });
    var data = await res.json();
    var parsed = JSON.parse(data.content[0].text.match(/\{[\s\S]*\}/)[0]);
    s.scores = { hp:parsed.hp, profile:parsed.profile, reviews:parsed.reviews, price:parsed.price, cast:parsed.cast };
    s.aiTags = parsed.aiTags||[];
    s.aiSummary = parsed.aiSummary||'';
    saveStores(stores);
    closeModal('detail');
    renderAll();
    openDetail(id);
    showToast('AI総評を再生成しました', 'ok');
  } catch(e) { showToast('エラー: '+e.message, 'err'); }
}
 
function addManual() {
  var name = document.getElementById('m-name').value.trim();
  if (!name) { showToast('店舗名を入力してください','err'); return; }
  stores.push({
    id: uid(), name: name,
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
  showToast('「'+name+'」を登録しました','ok');
}
 
function deleteStore(id) {
  stores = stores.filter(function(s){return s.id!==id;});
  saveStores(stores);
  renderAll();
  showToast('店舗を削除しました','ok');
}
 
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
 
function filterType(type,el) {
  currentFilter = type;
  document.querySelectorAll('.filter-btn').forEach(function(b){b.classList.remove('active');});
  el.classList.add('active');
  renderStores();
}
function sortStores() { renderStores(); }
 
function openModal(id) {
  if (id==='mystore') {
    document.getElementById('my-name').value = myStore.name!=='（新規オープン予定）'?myStore.name:'';
    document.getElementById('my-p60').value = myStore.price60||'';
    document.getElementById('my-p60new').value = myStore.price60new||'';
    document.getElementById('my-shimei').value = myStore.shimei||'';
    document.getElementById('my-special').value = myStore.specialShimei||'';
  }
  if (id==='add') {
    var saved = loadApiKey();
    if (saved) document.getElementById('input-apikey').value = saved;
  }
  document.getElementById('modal-'+id).classList.add('open');
}
function closeModal(id) { document.getElementById('modal-'+id).classList.remove('open'); }
function closeModalIfBg(e,id) { if (e.target===document.getElementById('modal-'+id)) closeModal(id); }
function switchMTab(tab,el) {
  document.querySelectorAll('.mtab').forEach(function(b){b.classList.remove('active');});
  document.querySelectorAll('.mtab-content').forEach(function(c){c.classList.remove('active');});
  el.classList.add('active');
  document.getElementById('mtab-'+tab).classList.add('active');
}
 
function showToast(msg,type) {
  var t = document.createElement('div');
  t.className='toast toast-'+type;
  t.textContent=msg;
  document.body.appendChild(t);
  requestAnimationFrame(function(){t.classList.add('show');});
  setTimeout(function(){ t.classList.remove('show'); setTimeout(function(){t.remove();},300); },2800);
}
 
function renderAll() {
  renderKPI();
  renderStores();
  renderCompareTable();
  setTimeout(renderChart, 100);
}
document.addEventListener('DOMContentLoaded', renderAll);
