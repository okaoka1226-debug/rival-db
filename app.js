// ===================================================
// 競合分析DB - app.js
// Firebase Firestore対応（設定前はlocalStorageで動作）
// ===================================================

// ---------- Firebase設定（後で差し替え） ----------
// import { initializeApp } from "firebase/app";
// import { getFirestore, ... } from "firebase/firestore";
// const firebaseConfig = { apiKey: "...", ... };
// const app = initializeApp(firebaseConfig);
// const db = getFirestore(app);

// ---------- ローカルストレージDB ----------
const STORE_KEY = 'rival_db_stores';
const MY_KEY    = 'rival_db_mystore';

function loadStores() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || getDefaultStores(); }
  catch { return getDefaultStores(); }
}
function saveStores(list) {
  localStorage.setItem(STORE_KEY, JSON.stringify(list));
}
function loadMyStore() {
  try { return JSON.parse(localStorage.getItem(MY_KEY)) || getDefaultMyStore(); }
  catch { return getDefaultMyStore(); }
}
function saveMySt(obj) {
  localStorage.setItem(MY_KEY, JSON.stringify(obj));
}

// ---------- デフォルトデータ ----------
function getDefaultStores() {
  return [
    {
      id: 's001',
      name: '神戸デリヘル クリスタル',
      type: 'deli',
      tel: '078-777-6435',
      url: 'https://www.cityheaven.net/hyogo/A2802/A280201/kobe_crystal/',
      castCount: 116,
      price60: 19800,
      price60new: 17600,
      price90: 21100,
      price120: 32100,
      shimei: 2200,
      specialShimei: 1100,
      entryFee: 1100,
      totalReviews: 520,
      scores: { hp: 82, profile: 76, reviews: 85, price: 68, cast: 90 },
      aiTags: [
        { text: '在籍116名・規模最大', type: 'good' },
        { text: '口コミ実績豊富', type: 'good' },
        { text: 'ポイントカード導入済', type: 'good' },
        { text: '価格やや高め', type: 'warn' },
        { text: 'HP情報密度が過多', type: 'warn' },
      ],
      aiSummary: '三宮エリア最大規模の在籍数を誇る老舗デリヘル。口コミ・ランキング機能が充実しており集客基盤は強固。一方で60分19,800円（クーポン後17,600円）と価格帯はやや高く、新規顧客の初回ハードルになり得る。HP情報量が多く一見でわかりにくい面もある。新規参入店との差別化において「在籍数」と「実績」は強みだが、価格と導線設計に改善余地あり。',
    },
    {
      id: 's002',
      name: '（競合店 B）',
      type: 'hotel',
      tel: '—',
      url: '',
      castCount: null,
      price60: null,
      price60new: null,
      price90: null,
      price120: null,
      shimei: null,
      specialShimei: null,
      entryFee: null,
      totalReviews: null,
      scores: null,
      aiTags: [],
      aiSummary: '',
    },
  ];
}

function getDefaultMyStore() {
  return {
    name: '（自店 新規オープン予定）',
    type: 'hybrid',
    price60: null,
    price60new: null,
    shimei: null,
    specialShimei: null,
  };
}

// ---------- 状態 ----------
let stores = loadStores();
let myStore = loadMyStore();
let currentFilter = 'all';

// ---------- スコア計算 ----------
function calcTotal(scores) {
  if (!scores) return null;
  const vals = Object.values(scores);
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function scoreClass(n) {
  if (n === null) return 'score-none';
  if (n >= 75) return 'score-high';
  if (n >= 55) return 'score-mid';
  return 'score-low';
}

function barColor(key) {
  const map = { hp: '#7c6af7', profile: '#34d399', reviews: '#f59e0b', price: '#22d3ee', cast: '#f472b6' };
  return map[key] || '#7c6af7';
}

function formatYen(n) {
  if (n === null || n === undefined) return '—';
  return n.toLocaleString('ja-JP') + '円';
}

// ---------- KPIバー ----------
function renderKPI() {
  const real = stores.filter(s => s.scores);
  const minPrice = Math.min(...stores.filter(s => s.price60new).map(s => s.price60new));
  const avgScore = real.length ? Math.round(real.reduce((a, s) => a + calcTotal(s.scores), 0) / real.length) : '—';
  const shimeiVals = stores.filter(s => s.shimei).map(s => s.shimei);
  const medShimei = shimeiVals.length ? shimeiVals.sort((a,b)=>a-b)[Math.floor(shimeiVals.length/2)] : null;

  document.getElementById('kpi-row').innerHTML = `
    <div class="kpi-card">
      <div class="kpi-num">${stores.length}</div>
      <div class="kpi-label">登録店舗</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-num">${minPrice ? minPrice.toLocaleString() : '—'}</div>
      <div class="kpi-label">最安値 60分（円）</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-num">${medShimei ? medShimei.toLocaleString() : '—'}</div>
      <div class="kpi-label">指名料 中央値</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-num">${avgScore}</div>
      <div class="kpi-label">平均 AIスコア</div>
    </div>
  `;
}

// ---------- 店舗カード ----------
function renderStores() {
  const sortVal = document.getElementById('sort-select').value;
  let list = [...stores];

  if (currentFilter !== 'all') list = list.filter(s => s.type === currentFilter);

  list.sort((a, b) => {
    if (sortVal === 'score') {
      const sa = calcTotal(a.scores) ?? -1;
      const sb = calcTotal(b.scores) ?? -1;
      return sb - sa;
    } else if (sortVal === 'price_asc') {
      return (a.price60new ?? 99999) - (b.price60new ?? 99999);
    } else if (sortVal === 'price_desc') {
      return (b.price60new ?? 0) - (a.price60new ?? 0);
    } else if (sortVal === 'cast') {
      return (b.castCount ?? 0) - (a.castCount ?? 0);
    } else if (sortVal === 'reviews') {
      return (b.totalReviews ?? 0) - (a.totalReviews ?? 0);
    }
    return 0;
  });

  const grid = document.getElementById('store-grid');

  if (list.length === 0) {
    grid.innerHTML = `<div class="empty-card"><svg width="40" height="40" viewBox="0 0 40 40" fill="none"><rect x="6" y="6" width="28" height="28" rx="4" stroke="currentColor" stroke-width="1.5"/><path d="M13 20h14M20 13v14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg><div>このフィルターに一致する店舗がありません</div></div>`;
    return;
  }

  grid.innerHTML = list.map(s => renderCard(s)).join('');
}

function renderCard(s) {
  const total = calcTotal(s.scores);
  const sc = scoreClass(total);
  const typeLabels = { deli: 'デリヘル', hotel: 'ホテヘル', hybrid: 'ハイブリッド' };
  const backEst = s.price60new ? Math.round(s.price60new * 0.6) : null;

  const barsHtml = s.scores ? `
    <div class="score-bars">
      ${Object.entries({ hp: 'HP作り込み', profile: 'プロフ品質', reviews: '口コミ数', price: '価格競争力', cast: '在籍・多様性' }).map(([k, label]) => `
        <div class="bar-row">
          <span class="bar-name">${label}</span>
          <div class="bar-bg"><div class="bar-fill" style="width:${s.scores[k]}%;background:${barColor(k)}"></div></div>
          <span class="bar-num">${s.scores[k]}</span>
        </div>
      `).join('')}
    </div>
  ` : `<div style="font-size:12px;color:var(--text3);padding:12px 0;text-align:center">解析未実行 — 詳細から実行</div>`;

  const tagsHtml = s.aiTags.length ? `
    <div class="ai-tags">
      ${s.aiTags.map(t => `<span class="ai-tag tag-${t.type}">${t.text}</span>`).join('')}
    </div>
  ` : '';

  return `
    <div class="store-card" onclick="openDetail('${s.id}')">
      <div class="card-top">
        <div>
          <div class="card-name">${s.name}</div>
          <div class="card-meta">
            <span class="type-badge type-${s.type}">${typeLabels[s.type]}</span>
            ${s.tel !== '—' ? `<span class="card-tel">${s.tel}</span>` : ''}
            ${s.castCount ? `<span class="card-tel">在籍 ${s.castCount}名</span>` : ''}
          </div>
        </div>
        <div class="score-circle ${sc}">
          <div class="score-num">${total ?? '—'}</div>
          <div class="score-label">総合</div>
        </div>
      </div>

      <div class="metrics">
        <div class="metric">
          <div class="metric-label">新規最安値</div>
          <div class="metric-val">${formatYen(s.price60new)}</div>
          <div class="metric-sub">60分</div>
        </div>
        <div class="metric">
          <div class="metric-label">指名料</div>
          <div class="metric-val">${formatYen(s.shimei)}</div>
          <div class="metric-sub">特別 +${formatYen(s.specialShimei)}</div>
        </div>
        <div class="metric">
          <div class="metric-label">女子バック目安</div>
          <div class="metric-val">${formatYen(backEst)}</div>
          <div class="metric-sub">60分×60%試算</div>
        </div>
      </div>

      ${barsHtml}
      ${tagsHtml}
    </div>
  `;
}

// ---------- 比較テーブル ----------
function renderCompareTable() {
  const my = myStore;
  const cols = ['店舗名', '業態', '60分通常', '新規最安値', '指名料', '特別指名', '入会金', '女子バック目安', '口コミ総数'];

  const rows = [
    // 自店（先頭）
    {
      isMy: true,
      cells: [
        `<strong>${my.name}</strong>`,
        '—',
        formatYen(my.price60),
        formatYen(my.price60new),
        formatYen(my.shimei),
        formatYen(my.specialShimei),
        '—', '—', '—'
      ]
    },
    ...stores.map(s => {
      const backEst = s.price60new ? Math.round(s.price60new * 0.6) : null;
      let p60cls = '';
      if (my.price60new && s.price60new) {
        p60cls = s.price60new < my.price60new ? 'pricier' : s.price60new > my.price60new ? 'cheaper' : 'same';
      }
      return {
        isMy: false,
        cells: [
          s.name,
          { deli: 'デリヘル', hotel: 'ホテヘル', hybrid: 'ハイブリッド' }[s.type],
          `<span class="num-cell">${formatYen(s.price60)}</span>`,
          `<span class="num-cell ${p60cls}">${formatYen(s.price60new)}</span>`,
          `<span class="num-cell">${formatYen(s.shimei)}</span>`,
          `<span class="num-cell">${formatYen(s.specialShimei)}</span>`,
          `<span class="num-cell">${formatYen(s.entryFee)}</span>`,
          `<span class="num-cell">${formatYen(backEst)}</span>`,
          `<span class="num-cell">${s.totalReviews ?? '—'}</span>`,
        ]
      };
    })
  ];

  document.getElementById('compare-table').innerHTML = `
    <thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
    <tbody>
      ${rows.map(r => `
        <tr class="${r.isMy ? 'mystore-row' : ''}">
          ${r.cells.map(c => `<td>${c}</td>`).join('')}
        </tr>
      `).join('')}
    </tbody>
  `;
}

// ---------- 詳細モーダル ----------
function openDetail(id) {
  const s = stores.find(x => x.id === id);
  if (!s) return;
  const total = calcTotal(s.scores);
  const backEst = s.price60new ? Math.round(s.price60new * 0.6) : null;
  const typeLabels = { deli: 'デリヘル', hotel: 'ホテヘル', hybrid: 'ハイブリッド' };

  document.getElementById('detail-title').textContent = s.name;

  const barsHtml = s.scores ? `
    <h4 style="font-size:13px;color:var(--text2);margin-bottom:10px">AIスコア詳細</h4>
    <div class="detail-score-bars">
      ${Object.entries({ hp: 'HP作り込み・情報設計', profile: 'プロフ画像クオリティ', reviews: '口コミ数・信頼度', price: '価格競争力', cast: '在籍数・多様性' }).map(([k, label]) => `
        <div class="detail-bar-row">
          <span class="detail-bar-name">${label}</span>
          <div class="detail-bar-bg"><div class="detail-bar-fill" style="width:${s.scores[k]}%;background:${barColor(k)}"></div></div>
          <span class="detail-bar-num">${s.scores[k]}</span>
        </div>
      `).join('')}
    </div>
  ` : '';

  document.getElementById('detail-body').innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
      <span class="type-badge type-${s.type}">${typeLabels[s.type]}</span>
      ${s.tel !== '—' ? `<span style="font-size:12px;color:var(--text3)">${s.tel}</span>` : ''}
      ${s.url ? `<a href="${s.url}" target="_blank" style="font-size:12px;color:var(--accent)">公式ページ →</a>` : ''}
    </div>

    <div class="detail-grid">
      <div class="detail-metric"><div class="dm-label">AI総合スコア</div><div class="dm-val" style="color:${total>=75?'var(--green)':total>=55?'var(--amber)':'var(--red)'}">${total ?? '未解析'}</div></div>
      <div class="detail-metric"><div class="dm-label">在籍人数</div><div class="dm-val">${s.castCount ?? '—'}<span style="font-size:13px;font-weight:400"> 名</span></div></div>
      <div class="detail-metric"><div class="dm-label">60分 新規最安値</div><div class="dm-val">${formatYen(s.price60new)}</div><div class="dm-sub">通常 ${formatYen(s.price60)}</div></div>
      <div class="detail-metric"><div class="dm-label">90分 / 120分</div><div class="dm-val" style="font-size:14px">${formatYen(s.price90)} / ${formatYen(s.price120)}</div></div>
      <div class="detail-metric"><div class="dm-label">指名料</div><div class="dm-val">${formatYen(s.shimei)}</div><div class="dm-sub">特別指名 ${formatYen(s.specialShimei)}</div></div>
      <div class="detail-metric"><div class="dm-label">女子バック目安</div><div class="dm-val" style="color:var(--green)">${formatYen(backEst)}</div><div class="dm-sub">60分新規×60%</div></div>
    </div>

    ${barsHtml}

    ${s.aiSummary ? `
      <h4 style="font-size:13px;color:var(--text2);margin-bottom:8px">AI総評</h4>
      <div class="detail-ai-summary">${s.aiSummary}</div>
    ` : ''}

    ${s.aiTags.length ? `
      <div class="detail-tags">
        ${s.aiTags.map(t => `<span class="ai-tag tag-${t.type}">${t.text}</span>`).join('')}
      </div>
    ` : ''}

    <div style="margin-top:20px;display:flex;justify-content:flex-end;gap:8px">
      <button class="btn-danger" onclick="deleteStore('${s.id}');closeModal('detail')">削除</button>
      <button class="btn-ghost" onclick="closeModal('detail')">閉じる</button>
    </div>
  `;

  openModal('detail');
}

// ---------- 削除 ----------
function deleteStore(id) {
  stores = stores.filter(s => s.id !== id);
  saveStores(stores);
  renderAll();
  showToast('店舗を削除しました', 'ok');
}

// ---------- 手動追加 ----------
function addManual() {
  const name = document.getElementById('m-name').value.trim();
  if (!name) { showToast('店舗名を入力してください', 'err'); return; }

  const newStore = {
    id: 's' + Date.now(),
    name,
    type: document.getElementById('m-type').value,
    tel: document.getElementById('m-tel').value || '—',
    url: document.getElementById('m-url').value,
    castCount: parseInt(document.getElementById('m-cast').value) || null,
    price60:    parseInt(document.getElementById('m-p60').value) || null,
    price60new: parseInt(document.getElementById('m-p60new').value) || null,
    price90: null, price120: null,
    shimei:        parseInt(document.getElementById('m-shimei').value) || null,
    specialShimei: parseInt(document.getElementById('m-special').value) || null,
    entryFee:      parseInt(document.getElementById('m-entry').value) || null,
    totalReviews:  parseInt(document.getElementById('m-reviews').value) || null,
    scores: null,
    aiTags: [],
    aiSummary: '',
  };

  stores.push(newStore);
  saveStores(stores);
  closeModal('add');
  renderAll();
  showToast(`「${name}」を登録しました`, 'ok');
}

// ---------- URL解析（AIスタブ→要API連携） ----------
function analyzeURL() {
  const url = document.getElementById('input-url').value.trim();
  const status = document.getElementById('analyze-status');
  if (!url) { status.textContent = 'URLを入力してください'; status.className = 'analyze-status err'; return; }

  status.className = 'analyze-status';
  status.textContent = '解析中...';

  // ここでAnthropicAPI or スクレイピングエンドポイントを呼ぶ
  // 現在はモック動作
  setTimeout(() => {
    const mockStore = {
      id: 's' + Date.now(),
      name: '（解析結果店舗）',
      type: 'deli',
      tel: '—',
      url,
      castCount: null,
      price60: null, price60new: null, price90: null, price120: null,
      shimei: null, specialShimei: null, entryFee: null,
      totalReviews: null,
      scores: null,
      aiTags: [{ text: 'AI解析待ち', type: 'info' }],
      aiSummary: '',
    };
    stores.push(mockStore);
    saveStores(stores);
    closeModal('add');
    renderAll();
    showToast('URL登録しました（スクレイピングは実装後に自動実行）', 'ok');
  }, 1200);
}

// ---------- 自店保存 ----------
function saveMyStore() {
  myStore = {
    name: document.getElementById('my-name').value || '（新規オープン予定）',
    type: 'hybrid',
    price60:    parseInt(document.getElementById('my-p60').value) || null,
    price60new: parseInt(document.getElementById('my-p60new').value) || null,
    shimei:        parseInt(document.getElementById('my-shimei').value) || null,
    specialShimei: parseInt(document.getElementById('my-special').value) || null,
  };
  saveMySt(myStore);
  closeModal('mystore');
  renderAll();
  showToast('自店設定を保存しました', 'ok');
}

// ---------- フィルター・ソート ----------
function filterType(type, el) {
  currentFilter = type;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  renderStores();
}
function sortStores() { renderStores(); }

// ---------- モーダル ----------
function openModal(id) {
  // 自店設定モーダルを開くとき現在値を埋める
  if (id === 'mystore') {
    document.getElementById('my-name').value  = myStore.name !== '（新規オープン予定）' ? myStore.name : '';
    document.getElementById('my-p60').value   = myStore.price60 || '';
    document.getElementById('my-p60new').value = myStore.price60new || '';
    document.getElementById('my-shimei').value = myStore.shimei || '';
    document.getElementById('my-special').value = myStore.specialShimei || '';
  }
  document.getElementById('modal-' + id).classList.add('open');
}
function closeModal(id) {
  document.getElementById('modal-' + id).classList.remove('open');
}
function closeModalIfBg(e, id) {
  if (e.target === document.getElementById('modal-' + id)) closeModal(id);
}
function switchMTab(tab, el) {
  document.querySelectorAll('.mtab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.mtab-content').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('mtab-' + tab).classList.add('active');
}

// ---------- トースト ----------
function showToast(msg, type) {
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => { t.classList.add('show'); });
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 300);
  }, 2800);
}

// ---------- 初期化 ----------
function renderAll() {
  renderKPI();
  renderStores();
  renderCompareTable();
}

document.addEventListener('DOMContentLoaded', renderAll);
