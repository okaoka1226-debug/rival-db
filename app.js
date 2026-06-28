// ===================================================
// 競合分析DB - app.js v5
// ===================================================

const STORE_KEY = 'rival_db_stores_v3';
const MY_KEY    = 'rival_db_mystore_v3';
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
    // コース料金
    price60: 19800, price70: null, price80: null, price90: 21100, price120: 32100,
    minCourse: 19800, minCourseMin: 60,
    couponPrice: 17600, couponMin: 70, couponName: '業界最安値クーポン',
    shimei: 2200,
    entryFee: 1100, totalReviews: 520,
    scores: { hp: 82, profile: 76, reviews: 85, price: 68, cast: 90 },
    aiTags: [
      { text: '在籍116名・規模最大', type: 'good' },
      { text: '口コミ実績豊富', type: 'good' },
      { text: '価格やや高め', type: 'warn' },
    ],
    aiSummary: '三宮エリア最大規模の在籍数を誇る老舗デリヘル。口コミ実績が豊富で集客基盤は強固。価格帯はやや高め。',
  }];
}
function getDefaultMyStore() {
  return { name: '（自店 新規オープン予定）', type: 'hybrid', minCourse: null, minCourseMin: 60, couponPrice: null, couponMin: null, couponName: '', shimei: null };
}

let stores = loadStores();
let myStore = loadMyStore();
let currentFilter = 'all';
let editTargetId = null; // PDF再編集用

const TYPE_LABELS = { deli:'デリヘル', hotel:'ホテヘル', este:'エステ' };
const COURSE_MINS = [60, 70, 80, 90];

function calcTotal(scores) {
  if (!scores) return null;
  return Math.round(Object.values(scores).reduce((a,b)=>a+b,0)/Object.values(scores).length);
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
function calcBack(s) {
  if (s.couponPrice && s.couponMin) return Math.round(s.couponPrice * 0.6 / s.couponMin * 60);
  if (s.minCourse && s.minCourseMin) return Math.round(s.minCourse * 0.6 / s.minCourseMin * 60);
  return null;
}
function backLabel(s) {
  if (s.couponPrice && s.couponMin) return 'クーポン最安値x0.6÷'+s.couponMin+'x60換算';
  if (s.minCourse && s.minCourseMin) return '最小コースx0.6÷'+s.minCourseMin+'x60換算';
  return '—';
}

function renderKPI() {
  const real = stores.filter(s=>s.scores);
  const prices = stores.filter(s=>s.couponPrice||s.minCourse).map(s=>s.couponPrice||s.minCourse);
  const minPrice = prices.length ? Math.min(...prices) : null;
  const avgScore = real.length ? Math.round(real.reduce((a,s)=>a+calcTotal(s.scores),0)/real.length) : '—';
  const shimeiVals = stores.filter(s=>s.shimei).map(s=>s.shimei).sort((a,b)=>a-b);
  const medShimei = shimeiVals.length ? shimeiVals[Math.floor(shimeiVals.length/2)] : null;
  document.getElementById('kpi-row').innerHTML =
    '<div class="kpi-card"><div class="kpi-num">'+stores.length+'</div><div class="kpi-label">登録店舗</div></div>'+
    '<div class="kpi-card"><div class="kpi-num">'+(minPrice?minPrice.toLocaleString():'—')+'</div><div class="kpi-label">最安値クーポン（円）</div></div>'+
    '<div class="kpi-card"><div class="kpi-num">'+(medShimei?medShimei.toLocaleString():'—')+'</div><div class="kpi-label">指名料 中央値</div></div>'+
    '<div class="kpi-card"><div class="kpi-num">'+avgScore+'</div><div class="kpi-label">平均 AIスコア</div></div>';
}

function renderStores() {
  const sortVal = document.getElementById('sort-select').value;
  let list = [...stores];
  if (currentFilter!=='all') list = list.filter(s=>s.type===currentFilter);
  list.sort((a,b)=>{
    if (sortVal==='score') return (calcTotal(b.scores)??-1)-(calcTotal(a.scores)??-1);
    if (sortVal==='price_asc') return ((a.couponPrice||a.minCourse)||99999)-((b.couponPrice||b.minCourse)||99999);
    if (sortVal==='price_desc') return ((b.couponPrice||b.minCourse)||0)-((a.couponPrice||a.minCourse)||0);
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
  const backEst = calcBack(s);
  const barsHtml = s.scores ?
    '<div class="score-bars">'+
    Object.entries({hp:'HP作り込み',profile:'プロフ品質',reviews:'口コミ数',price:'価格競争力',cast:'在籍・多様性'}).map(function(e){
      var k=e[0],label=e[1];
      return '<div class="bar-row"><span class="bar-name">'+label+'</span><div class="bar-bg"><div class="bar-fill" style="width:'+s.scores[k]+'%;background:'+barColor(k)+'"></div></div><span class="bar-num">'+s.scores[k]+'</span></div>';
    }).join('')+'</div>'
    : '<div style="font-size:12px;color:var(--text3);padding:12px 0;text-align:center">未解析 — クリックして解析実行</div>';
  const tagsHtml = s.aiTags&&s.aiTags.length ? '<div class="ai-tags">'+s.aiTags.map(function(t){return '<span class="ai-tag tag-'+t.type+'">'+t.text+'</span>';}).join('')+'</div>' : '';
  return '<div class="store-card" onclick="openDetail(\''+s.id+'\')">' +
    '<div class="card-top"><div>'+
    '<div class="card-name">'+s.name+'</div>'+
    '<div class="card-meta"><span class="type-badge type-'+s.type+'">'+(TYPE_LABELS[s.type]||s.type)+'</span>'+
    (s.tel&&s.tel!=='—'?'<span class="card-tel">'+s.tel+'</span>':'')+
    (s.castCount?'<span class="card-tel">在籍 '+s.castCount+'名</span>':'')+
    '</div></div>'+
    '<div class="score-circle '+sc+'"><div class="score-num">'+(total||'—')+'</div><div class="score-label">総合</div></div></div>'+
    '<div class="metrics">'+
    '<div class="metric"><div class="metric-label">最小コース</div><div class="metric-val">'+formatYen(s.minCourse)+'</div><div class="metric-sub">'+(s.minCourseMin||'—')+'分</div></div>'+
    '<div class="metric"><div class="metric-label">クーポン最安値</div><div class="metric-val">'+formatYen(s.couponPrice)+'</div><div class="metric-sub">'+(s.couponMin||'—')+'分'+(s.couponName?' / '+s.couponName:'')+'</div></div>'+
    '<div class="metric"><div class="metric-label">女子バック(60分換算)</div><div class="metric-val">'+formatYen(backEst)+'</div><div class="metric-sub">'+backLabel(s)+'</div></div>'+
    '</div>'+barsHtml+tagsHtml+'</div>';
}

function renderCompareTable() {
  var my = myStore;
  var myBack = my.couponPrice&&my.couponMin ? Math.round(my.couponPrice*0.6/my.couponMin*60) : null;
  var rows = [{ isMy:true, cells:['<strong>'+my.name+'</strong>','—',formatYen(my.minCourse)+(my.minCourseMin?' / '+my.minCourseMin+'分':''),formatYen(my.couponPrice)+(my.couponMin?' / '+my.couponMin+'分':''),formatYen(my.shimei),'—',formatYen(myBack),'—'] }];
  stores.forEach(function(s) {
    var backEst = calcBack(s);
    var cls='';
    if (my.couponPrice&&s.couponPrice) cls = s.couponPrice<my.couponPrice?'pricier':s.couponPrice>my.couponPrice?'cheaper':'same';
    rows.push({ isMy:false, cells:[
      s.name,
      TYPE_LABELS[s.type]||s.type,
      '<span class="num-cell">'+formatYen(s.minCourse)+(s.minCourseMin?' / '+s.minCourseMin+'分':'')+'</span>',
      '<span class="num-cell '+cls+'">'+formatYen(s.couponPrice)+(s.couponMin?' / '+s.couponMin+'分':'')+'</span>',
      '<span class="num-cell">'+formatYen(s.shimei)+'</span>',
      '<span class="num-cell">'+formatYen(s.entryFee)+'</span>',
      '<span class="num-cell">'+formatYen(backEst)+'</span>',
      '<span class="num-cell">'+(s.totalReviews||'—')+'</span>',
    ]});
  });
  document.getElementById('compare-table').innerHTML =
    '<thead><tr>'+['店舗名','業態','最小コース','クーポン最安値','指名料','入会金','女子バック(60分換算)','口コミ総数'].map(function(c){return '<th>'+c+'</th>';}).join('')+'</tr></thead>'+
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
    data: { labels: labels, datasets: scored.map(function(s,i){return { label:s.name, data:[s.scores.hp,s.scores.profile,s.scores.reviews,s.scores.price,s.scores.cast], borderColor:colors[i%colors.length], backgroundColor:colors[i%colors.length]+'22', pointBackgroundColor:colors[i%colors.length], borderWidth:2, pointRadius:4 };}) },
    options: { responsive:true, maintainAspectRatio:false, scales:{ r:{ min:0, max:100, ticks:{stepSize:25,color:'#60606e',font:{size:10}}, grid:{color:'rgba(255,255,255,0.07)'}, angleLines:{color:'rgba(255,255,255,0.07)'}, pointLabels:{color:'#9898a8',font:{size:11}} } }, plugins:{ legend:{ labels:{ color:'#9898a8', font:{size:12}, boxWidth:12 } } } }
  });
  var barCanvas = document.getElementById('bar-canvas');
  if (!barCanvas) return;
  var barCtx = barCanvas.getContext('2d');
  var priced = stores.filter(function(s){return s.couponPrice||s.minCourse;});
  new Chart(barCtx, {
    type: 'bar',
    data: { labels: priced.map(function(s){return s.name.length>8?s.name.slice(0,8)+'...':s.name;}), datasets:[
      { label:'クーポン最安値', data:priced.map(function(s){return s.couponPrice||0;}), backgroundColor:'#7c6af7aa', borderRadius:4 },
      { label:'最小コース',     data:priced.map(function(s){return s.minCourse||0;}),   backgroundColor:'#3b3b4f', borderRadius:4 },
    ]},
    options: { responsive:true, maintainAspectRatio:false, scales:{ x:{ticks:{color:'#9898a8',font:{size:11}},grid:{color:'rgba(255,255,255,0.05)'}}, y:{ticks:{color:'#9898a8',font:{size:11},callback:function(v){return v.toLocaleString()+'円';}},grid:{color:'rgba(255,255,255,0.07)'}} }, plugins:{legend:{labels:{color:'#9898a8',font:{size:12},boxWidth:12}}} }
  });
}

// ---------- URL解析 ----------
async function analyzeURL() {
  var url = document.getElementById('input-url').value.trim();
  var apiKey = document.getElementById('input-apikey').value.trim() || loadApiKey();
  var status = document.getElementById('analyze-status');
  if (!url) { status.textContent='URLを入力してください'; status.className='analyze-status err'; return; }
  if (!apiKey) { status.textContent='APIキーを入力してください'; status.className='analyze-status err'; return; }
  saveApiKey(apiKey);
  status.className='analyze-status';
  status.textContent='サーバー経由でページ取得中... (20〜40秒)';
  try {
    var res = await fetch('https://rival-scraper.onrender.com/analyze', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ url:url, api_key:apiKey })
    });
    if (!res.ok) throw new Error('サーバーエラー: '+res.statusText);
    var parsed = await res.json();
    if (parsed.error) throw new Error(parsed.error);
    var newStore = buildStore(parsed, url);
    if (editTargetId) {
      var idx = stores.findIndex(function(s){return s.id===editTargetId;});
      if (idx>=0) { newStore.id = editTargetId; stores[idx] = newStore; }
      editTargetId = null;
    } else {
      stores.push(newStore);
    }
    saveStores(stores);
    closeModal('add');
    renderAll();
    showToast('「'+newStore.name+'」を登録しました', 'ok');
  } catch(e) {
    status.textContent = 'エラー: '+e.message;
    status.className = 'analyze-status err';
  }
}

function buildStore(parsed, url) {
  return {
    id: uid(), url: url||'',
    name: parsed.name||'（店舗名不明）',
    type: parsed.type||'deli',
    tel: parsed.tel||'—',
    castCount: parsed.castCount||null,
    price60: parsed.price60||null, price70: parsed.price70||null,
    price80: parsed.price80||null, price90: parsed.price90||null, price120: parsed.price120||null,
    minCourse: parsed.minCourse||parsed.price60||null,
    minCourseMin: parsed.minCourseMin||60,
    couponPrice: parsed.couponPrice||parsed.price60new||null,
    couponMin: parsed.couponMin||parsed.couponMinutes||null,
    couponName: parsed.couponName||'',
    shimei: parsed.shimei||null,
    entryFee: parsed.entryFee||null,
    totalReviews: parsed.totalReviews||null,
    scores: parsed.scores||null,
    aiTags: parsed.aiTags||[],
    aiSummary: parsed.aiSummary||'',
  };
}

// ---------- PDF解析 ----------
async function handlePDFUpload() {
  var fileInput = document.getElementById('pdf-input');
  var apiKey = document.getElementById('pdf-apikey').value.trim() || loadApiKey();
  var status = document.getElementById('pdf-status');
  if (!fileInput.files.length) { status.textContent='PDFを選択してください'; status.className='analyze-status err'; return; }
  if (!apiKey) { status.textContent='APIキーを入力してください'; status.className='analyze-status err'; return; }
  saveApiKey(apiKey);
  var files = Array.from(fileInput.files);
  var total = files.length;
  try {
    var result = null;
    for (var i=0; i<files.length; i++) {
      status.className='analyze-status';
      status.textContent='解析中... '+(i+1)+' / '+total+' 枚目 (20〜30秒)';
      var base64 = await fileToBase64(files[i]);
      var parsed = await analyzeSinglePDF(base64, apiKey, i===0);
      if (i===0) { result = parsed; } else { result = mergeResults(result, parsed); }
    }
    var newStore = buildStore(result, '');
    if (editTargetId) {
      var idx = stores.findIndex(function(s){return s.id===editTargetId;});
      if (idx>=0) {
        // 既存の手動入力値を保持しつつPDFで上書き
        var existing = stores[idx];
        newStore.id = editTargetId;
        // nullの項目は既存値を維持
        Object.keys(existing).forEach(function(k){
          if (newStore[k]===null && existing[k]!==null) newStore[k] = existing[k];
        });
        stores[idx] = newStore;
      }
      editTargetId = null;
    } else {
      stores.push(newStore);
    }
    saveStores(stores);
    closeModal('add');
    renderAll();
    showToast('「'+newStore.name+'」を'+total+'枚のPDFから登録しました', 'ok');
  } catch(e) {
    status.textContent = 'エラー: '+e.message;
    status.className = 'analyze-status err';
  }
}

function fileToBase64(file) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onload = function(){ resolve(reader.result.split(',')[1]); };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function analyzeSinglePDF(base64, apiKey, isFirst) {
  var prompt = isFirst ?
    'このPDFは風俗店（デリヘル・ホテヘル・エステ）のシティヘブンネット掲載ページです。以下のJSON形式のみで回答（説明文不要）:\n{"name":"店舗名","type":"deli/hotel/este","tel":"電話番号","castCount":在籍人数,"price60":60分通常価格,"price70":70分価格,"price80":80分価格,"price90":90分価格,"minCourse":最小コース価格,"minCourseMin":最小コース分数,"couponPrice":クーポン最安値価格,"couponMin":クーポン分数,"couponName":"クーポン名","shimei":指名料,"entryFee":入会金,"totalReviews":口コミ総数,"scores":{"hp":0-100,"profile":0-100,"reviews":0-100,"price":0-100,"cast":0-100},"aiTags":[{"text":"タグ","type":"good/warn/bad"}],"aiSummary":"200文字以内の総評"}'
    : 'このPDFも同じ風俗店のページです。追加情報があればJSONで回答:\n{"castCount":在籍人数,"price60":60分,"price70":70分,"price80":80分,"price90":90分,"minCourse":最小コース価格,"minCourseMin":最小コース分数,"couponPrice":クーポン最安値,"couponMin":クーポン分数,"couponName":"クーポン名","shimei":指名料,"totalReviews":口コミ総数}';

  var res = await fetch('https://api.anthropic.com/v1/messages', {
    method:'POST',
    headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
    body: JSON.stringify({ model:'claude-sonnet-4-6', max_tokens:1500, messages:[{ role:'user', content:[
      { type:'document', source:{ type:'base64', media_type:'application/pdf', data:base64 } },
      { type:'text', text:prompt }
    ]}]})
  });
  if (!res.ok) { var err = await res.json(); throw new Error(err.error?.message||res.statusText); }
  var data = await res.json();
  var text = data.content[0].text.trim();
  var jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('JSONの解析に失敗しました');
  return JSON.parse(jsonMatch[0]);
}

function mergeResults(base, additional) {
  var fields = ['castCount','price60','price70','price80','price90','minCourse','minCourseMin','couponPrice','couponMin','couponName','shimei','entryFee','totalReviews'];
  fields.forEach(function(f){ if (additional[f]!==null&&additional[f]!==undefined) base[f]=additional[f]; });
  return base;
}

function initDropZone() {
  var zone = document.getElementById('drop-zone');
  if (!zone) return;
  zone.addEventListener('dragover', function(e){ e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', function(){ zone.classList.remove('drag-over'); });
  zone.addEventListener('drop', function(e){
    e.preventDefault(); zone.classList.remove('drag-over');
    var files = Array.from(e.dataTransfer.files).filter(function(f){return f.type==='application/pdf';});
    if (files.length) { var dt=new DataTransfer(); files.forEach(function(f){dt.items.add(f);}); document.getElementById('pdf-input').files=dt.files; updateFileLabel(files); }
  });
  document.getElementById('pdf-input').addEventListener('change', function(e){ updateFileLabel(Array.from(e.target.files)); });
}
function updateFileLabel(files) {
  var label = document.getElementById('pdf-filename');
  label.textContent = files.length===1 ? files[0].name : files.length+'枚選択: '+files.map(function(f){return f.name;}).join(', ');
}

// ---------- 詳細モーダル ----------
function openDetail(id) {
  var s = stores.find(function(x){return x.id===id;});
  if (!s) return;
  var total = calcTotal(s.scores);
  var backEst = calcBack(s);

  var barsHtml = s.scores ?
    '<h4 style="font-size:13px;color:var(--text2);margin-bottom:10px">AIスコア詳細（数字で編集可）</h4>'+
    '<div class="detail-score-bars">'+
    Object.entries({hp:'HP作り込み',profile:'プロフ品質',reviews:'口コミ数',price:'価格競争力',cast:'在籍・多様性'}).map(function(e){
      var k=e[0],label=e[1];
      return '<div class="detail-bar-row"><span class="detail-bar-name">'+label+'</span><div class="detail-bar-bg"><div class="detail-bar-fill" style="width:'+s.scores[k]+'%;background:'+barColor(k)+'"></div></div><input type="number" class="score-input" min="0" max="100" value="'+s.scores[k]+'" onchange="updateScore(\''+s.id+'\',\''+k+'\',this.value)" style="width:52px;padding:2px 6px;font-size:12px;text-align:right" /></div>';
    }).join('')+'</div>'
    : '';

  var editForm =
    '<div style="background:var(--bg3);border-radius:8px;padding:14px;margin:14px 0">'+
    '<div style="font-size:12px;font-weight:600;color:var(--text2);margin-bottom:10px">数値を手動更新</div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'+
    '<div><div style="font-size:11px;color:var(--text3);margin-bottom:4px">口コミ総数</div><input type="number" id="edit-reviews-'+s.id+'" value="'+(s.totalReviews||'')+'" placeholder="1338" style="width:100%;background:var(--bg4);border:1px solid var(--border2);color:var(--text);padding:6px 8px;border-radius:4px;font-size:13px" /></div>'+
    '<div><div style="font-size:11px;color:var(--text3);margin-bottom:4px">在籍人数</div><input type="number" id="edit-cast-'+s.id+'" value="'+(s.castCount||'')+'" placeholder="116" style="width:100%;background:var(--bg4);border:1px solid var(--border2);color:var(--text);padding:6px 8px;border-radius:4px;font-size:13px" /></div>'+
    '<div><div style="font-size:11px;color:var(--text3);margin-bottom:4px">最小コース価格</div><input type="number" id="edit-min-'+s.id+'" value="'+(s.minCourse||'')+'" placeholder="18700" style="width:100%;background:var(--bg4);border:1px solid var(--border2);color:var(--text);padding:6px 8px;border-radius:4px;font-size:13px" /></div>'+
    '<div><div style="font-size:11px;color:var(--text3);margin-bottom:4px">最小コース分数</div><select id="edit-minmin-'+s.id+'" style="width:100%;background:var(--bg4);border:1px solid var(--border2);color:var(--text);padding:6px 8px;border-radius:4px;font-size:13px">'+
    COURSE_MINS.map(function(m){return '<option value="'+m+'"'+(s.minCourseMin===m?' selected':'')+'>'+m+'分</option>';}).join('')+'</select></div>'+
    '<div><div style="font-size:11px;color:var(--text3);margin-bottom:4px">クーポン最安値</div><input type="number" id="edit-coup-'+s.id+'" value="'+(s.couponPrice||'')+'" placeholder="17600" style="width:100%;background:var(--bg4);border:1px solid var(--border2);color:var(--text);padding:6px 8px;border-radius:4px;font-size:13px" /></div>'+
    '<div><div style="font-size:11px;color:var(--text3);margin-bottom:4px">クーポン分数</div><select id="edit-coupmin-'+s.id+'" style="width:100%;background:var(--bg4);border:1px solid var(--border2);color:var(--text);padding:6px 8px;border-radius:4px;font-size:13px">'+
    '<option value="">—</option>'+COURSE_MINS.map(function(m){return '<option value="'+m+'"'+(s.couponMin===m?' selected':'')+'>'+m+'分</option>';}).join('')+'</select></div>'+
    '<div><div style="font-size:11px;color:var(--text3);margin-bottom:4px">クーポン名</div><input type="text" id="edit-coupname-'+s.id+'" value="'+(s.couponName||'')+'" placeholder="業界最安値クーポン" style="width:100%;background:var(--bg4);border:1px solid var(--border2);color:var(--text);padding:6px 8px;border-radius:4px;font-size:13px" /></div>'+
    '<div><div style="font-size:11px;color:var(--text3);margin-bottom:4px">指名料</div><input type="number" id="edit-shimei-'+s.id+'" value="'+(s.shimei||'')+'" placeholder="2200" style="width:100%;background:var(--bg4);border:1px solid var(--border2);color:var(--text);padding:6px 8px;border-radius:4px;font-size:13px" /></div>'+
    '</div>'+
    '<button class="btn-primary" style="margin-top:10px" onclick="saveEdits(\''+s.id+'\')">数値を保存</button>'+
    '</div>';

  document.getElementById('detail-title').textContent = s.name;
  document.getElementById('detail-body').innerHTML =
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;flex-wrap:wrap">'+
    '<span class="type-badge type-'+s.type+'">'+(TYPE_LABELS[s.type]||s.type)+'</span>'+
    (s.tel&&s.tel!=='—'?'<span style="font-size:12px;color:var(--text3)">'+s.tel+'</span>':'')+
    (s.url?'<a href="'+s.url+'" target="_blank" style="font-size:12px;color:var(--accent)">公式ページ →</a>':'')+
    '<button class="btn-ghost" style="font-size:11px;padding:3px 10px;margin-left:auto" onclick="openReEditModal(\''+s.id+'\')">PDFで再編集</button>'+
    '</div>'+
    '<div class="detail-grid">'+
    '<div class="detail-metric"><div class="dm-label">AI総合スコア</div><div class="dm-val" style="color:'+(total>=75?'var(--green)':total>=55?'var(--amber)':'var(--red)')+'">'+( total||'未解析')+'</div></div>'+
    '<div class="detail-metric"><div class="dm-label">在籍人数</div><div class="dm-val">'+(s.castCount||'—')+'<span style="font-size:13px;font-weight:400"> 名</span></div></div>'+
    '<div class="detail-metric"><div class="dm-label">最小コース</div><div class="dm-val">'+formatYen(s.minCourse)+'</div><div class="dm-sub">'+(s.minCourseMin||'—')+'分</div></div>'+
    '<div class="detail-metric"><div class="dm-label">クーポン最安値</div><div class="dm-val">'+formatYen(s.couponPrice)+'</div><div class="dm-sub">'+(s.couponMin||'—')+'分'+(s.couponName?' / '+s.couponName:'')+'</div></div>'+
    '<div class="detail-metric"><div class="dm-label">指名料</div><div class="dm-val">'+formatYen(s.shimei)+'</div></div>'+
    '<div class="detail-metric"><div class="dm-label">女子バック(60分換算)</div><div class="dm-val" style="color:var(--green)">'+formatYen(backEst)+'</div><div class="dm-sub">'+backLabel(s)+'</div></div>'+
    '<div class="detail-metric"><div class="dm-label">口コミ総数</div><div class="dm-val">'+(s.totalReviews||'—')+'件</div></div>'+
    '</div>'+
    editForm+barsHtml+
    '<button class="btn-primary" style="margin:10px 0" onclick="runAIScore(\''+s.id+'\')">AI総評を再生成</button>'+
    (s.aiSummary?'<h4 style="font-size:13px;color:var(--text2);margin:14px 0 8px">AI総評</h4><div class="detail-ai-summary">'+s.aiSummary+'</div>':'')+
    (s.aiTags&&s.aiTags.length?'<div class="detail-tags" style="margin-top:10px">'+s.aiTags.map(function(t){return '<span class="ai-tag tag-'+t.type+'">'+t.text+'</span>';}).join('')+'</div>':'')+
    '<div style="margin-top:20px;display:flex;justify-content:flex-end;gap:8px">'+
    '<button class="btn-danger" onclick="deleteStore(\''+s.id+'\');closeModal(\'detail\')">削除</button>'+
    '<button class="btn-ghost" onclick="closeModal(\'detail\')">閉じる</button></div>';
  openModal('detail');
}

// PDFで再編集モーダルを開く
function openReEditModal(id) {
  editTargetId = id;
  closeModal('detail');
  openModal('add');
  // PDFタブに切り替え
  document.querySelectorAll('.mtab').forEach(function(b){b.classList.remove('active');});
  document.querySelectorAll('.mtab-content').forEach(function(c){c.classList.remove('active');});
  document.querySelector('.mtab').classList.add('active');
  document.getElementById('mtab-pdf').classList.add('active');
  document.getElementById('pdf-status').textContent = '再編集モード: PDFをドロップしてください';
  document.getElementById('pdf-status').className = 'analyze-status ok';
}

function saveEdits(id) {
  var s = stores.find(function(x){return x.id===id;});
  if (!s) return;
  var v = function(eid){ return document.getElementById(eid).value; };
  if (parseInt(v('edit-reviews-'+id))) s.totalReviews = parseInt(v('edit-reviews-'+id));
  if (parseInt(v('edit-cast-'+id))) s.castCount = parseInt(v('edit-cast-'+id));
  if (parseInt(v('edit-min-'+id))) s.minCourse = parseInt(v('edit-min-'+id));
  if (v('edit-minmin-'+id)) s.minCourseMin = parseInt(v('edit-minmin-'+id));
  if (parseInt(v('edit-coup-'+id))) s.couponPrice = parseInt(v('edit-coup-'+id));
  if (v('edit-coupmin-'+id)) s.couponMin = parseInt(v('edit-coupmin-'+id));
  if (v('edit-coupname-'+id)) s.couponName = v('edit-coupname-'+id);
  if (parseInt(v('edit-shimei-'+id))) s.shimei = parseInt(v('edit-shimei-'+id));
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
  var prompt = '以下の風俗店情報を元にAI評価を生成してください。\n店舗名: '+s.name+'\n業態: '+(TYPE_LABELS[s.type]||s.type)+'\n在籍数: '+(s.castCount||'不明')+'\n最小コース: '+(s.minCourse||'不明')+'円/'+(s.minCourseMin||'不明')+'分\nクーポン最安値: '+(s.couponPrice||'不明')+'円/'+(s.couponMin||'不明')+'分\n指名料: '+(s.shimei||'不明')+'\n口コミ数: '+(s.totalReviews||'不明')+'\n\nJSONのみで回答:\n{"hp":0-100,"profile":0-100,"reviews":0-100,"price":0-100,"cast":0-100,"aiTags":[{"text":"タグ","type":"good/warn/bad"}],"aiSummary":"200文字以内"}';
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

// ---------- 全店一括再評価 ----------
async function reEvaluateAll() {
  var apiKey = loadApiKey();
  if (!apiKey) { showToast('APIキーが必要です', 'err'); return; }
  if (stores.length < 2) { showToast('2店舗以上必要です', 'err'); return; }
  var btn = document.getElementById('reeval-btn');
  if (btn) { btn.textContent = '再評価中...'; btn.disabled = true; }
  showToast('全'+stores.length+'店舗を一括再評価中... (30〜60秒)', 'ok');
  var storeList = stores.map(function(s){
    return '店舗名: '+s.name+' / 業態: '+(TYPE_LABELS[s.type]||s.type)+' / 在籍: '+(s.castCount||'不明')+'名 / 最小コース: '+(s.minCourse||'不明')+'円/'+(s.minCourseMin||'不明')+'分 / クーポン最安値: '+(s.couponPrice||'不明')+'円/'+(s.couponMin||'不明')+'分 / 指名料: '+(s.shimei||'不明')+'円 / 口コミ数: '+(s.totalReviews||'不明')+'件';
  }).join('\n');
  var prompt = '以下は三宮エリアの風俗店リスト（'+stores.length+'店舗）です。この中での相対評価でスコアをつけてください。\n\n【評価基準】hp:HP作り込み / profile:プロフ画像品質 / reviews:口コミ件数（多いほど高） / price:価格競争力（安いほど高） / cast:在籍数（多いほど高）\n\n【重要】必ずこのリスト内での相対評価にしてください。最上位を90〜100、最下位を20〜40にしてください。\n\n【店舗リスト】\n'+storeList+'\n\nJSON形式のみで回答:\n{"results":[{"name":"店舗名","hp":数値,"profile":数値,"reviews":数値,"price":数値,"cast":数値,"aiTags":[{"text":"タグ","type":"good/warn/bad"}],"aiSummary":"100文字以内"}]}';
  try {
    var res = await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:4000,messages:[{role:'user',content:prompt}]})
    });
    var data = await res.json();
    var parsed = JSON.parse(data.content[0].text.match(/\{[\s\S]*\}/)[0]);
    parsed.results.forEach(function(r){
      var s = stores.find(function(x){return x.name===r.name;});
      if (s) { s.scores={hp:r.hp,profile:r.profile,reviews:r.reviews,price:r.price,cast:r.cast}; s.aiTags=r.aiTags||[]; s.aiSummary=r.aiSummary||''; }
    });
    saveStores(stores);
    renderAll();
    showToast('全'+stores.length+'店舗の再評価完了！', 'ok');
  } catch(e) {
    showToast('エラー: '+e.message, 'err');
  } finally {
    if (btn) { btn.textContent = '全店一括再評価'; btn.disabled = false; }
  }
}

function addManual() {
  var name = document.getElementById('m-name').value.trim();
  if (!name) { showToast('店舗名を入力してください','err'); return; }
  stores.push({
    id:uid(), name:name,
    type: document.getElementById('m-type').value,
    tel: document.getElementById('m-tel').value||'—',
    url: document.getElementById('m-url').value,
    castCount: parseInt(document.getElementById('m-cast').value)||null,
    price60:null, price70:null, price80:null, price90:null, price120:null,
    minCourse: parseInt(document.getElementById('m-mincourse').value)||null,
    minCourseMin: parseInt(document.getElementById('m-mincoursemin').value)||60,
    couponPrice: parseInt(document.getElementById('m-coupon').value)||null,
    couponMin: parseInt(document.getElementById('m-couponmin').value)||null,
    couponName: document.getElementById('m-couponname').value||'',
    shimei: parseInt(document.getElementById('m-shimei').value)||null,
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
    minCourse: parseInt(document.getElementById('my-mincourse').value)||null,
    minCourseMin: parseInt(document.getElementById('my-mincoursemin').value)||60,
    couponPrice: parseInt(document.getElementById('my-coupon').value)||null,
    couponMin: parseInt(document.getElementById('my-couponmin').value)||null,
    couponName: document.getElementById('my-couponname').value||'',
    shimei: parseInt(document.getElementById('my-shimei').value)||null,
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
    document.getElementById('my-mincourse').value = myStore.minCourse||'';
    document.getElementById('my-mincoursemin').value = myStore.minCourseMin||60;
    document.getElementById('my-coupon').value = myStore.couponPrice||'';
    document.getElementById('my-couponmin').value = myStore.couponMin||'';
    document.getElementById('my-couponname').value = myStore.couponName||'';
    document.getElementById('my-shimei').value = myStore.shimei||'';
  }
  if (id==='add') {
    var saved = loadApiKey();
    if (document.getElementById('pdf-apikey') && saved) document.getElementById('pdf-apikey').value = saved;
    if (document.getElementById('input-apikey') && saved) document.getElementById('input-apikey').value = saved;
    if (!editTargetId) {
      if (document.getElementById('pdf-status')) document.getElementById('pdf-status').textContent='';
    }
  }
  document.getElementById('modal-'+id).classList.add('open');
}
function closeModal(id) { document.getElementById('modal-'+id).classList.remove('open'); if(id==='add') editTargetId=null; }
function closeModalIfBg(e,id) { if (e.target===document.getElementById('modal-'+id)) closeModal(id); }
function switchMTab(tab,el) {
  document.querySelectorAll('.mtab').forEach(function(b){b.classList.remove('active');});
  document.querySelectorAll('.mtab-content').forEach(function(c){c.classList.remove('active');});
  el.classList.add('active');
  document.getElementById('mtab-'+tab).classList.add('active');
}

function showToast(msg,type) {
  var t=document.createElement('div'); t.className='toast toast-'+type; t.textContent=msg;
  document.body.appendChild(t);
  requestAnimationFrame(function(){t.classList.add('show');});
  setTimeout(function(){t.classList.remove('show');setTimeout(function(){t.remove();},300);},2800);
}

function renderAll() { renderKPI(); renderStores(); renderCompareTable(); setTimeout(renderChart,100); }
document.addEventListener('DOMContentLoaded', function(){ initDropZone(); renderAll(); });

// ---------- GitHubエクスポート ----------
function exportToGitHub() {
  var data = {
    stores: stores,
    myStore: myStore,
    exportedAt: new Date().toISOString(),
    version: 3
  };
  var json = JSON.stringify(data, null, 2);
  var blob = new Blob([json], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'rival-data.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('rival-data.json をダウンロードしました！GitHubにアップしてください', 'ok');
}

// ---------- GitHubからデータ読み込み ----------
async function loadFromGitHub() {
  try {
    // キャッシュを無効化するためにタイムスタンプを付与
    var res = await fetch('rival-data.json?t=' + Date.now());
    if (!res.ok) throw new Error('データファイルが見つかりません');
    var data = await res.json();
    if (data.stores) {
      stores = data.stores;
      saveStores(stores);
    }
    if (data.myStore) {
      myStore = data.myStore;
      saveMySt(myStore);
    }
    renderAll();
    showToast('最新データを読み込みました（' + stores.length + '店舗）', 'ok');
  } catch(e) {
    // ファイルがない場合はLocalStorageのデータをそのまま使う
    console.log('rival-data.json not found, using localStorage');
  }
}

// 起動時にGitHubからデータ読み込みを試みる
document.addEventListener('DOMContentLoaded', function() {
  initDropZone();
  // まずGitHubからデータ読み込みを試みる
  loadFromGitHub().then(function() {
    renderAll();
  });
});
