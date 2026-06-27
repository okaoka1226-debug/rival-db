// ===================================================
// PDF解析モジュール - pdf-analyzer.js v2
// 複数PDF対応版（最大10枚）
// ===================================================
 
async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
 
async function analyzeSinglePDF(base64, apiKey, isFirst) {
  const prompt = isFirst ? `このPDFは風俗店（デリヘル・ホテヘル）のシティヘブンネット掲載ページです。
以下の情報を抽出してJSON形式のみで回答してください（説明文・コードブロック不要）:
 
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
    "hp": HPの作り込み・情報設計(0-100),
    "profile": プロフ画像クオリティ(0-100),
    "reviews": 口コミ数・信頼度(0-100),
    "price": 価格競争力(0-100),
    "cast": 在籍数・多様性(0-100)
  },
  "aiTags": [{"text": "タグ名", "type": "good または warn または bad"}],
  "aiSummary": "200文字以内のAI総評"
}` : `このPDFも同じ風俗店のページです。
追加情報（在籍キャスト数・口コミ数・価格など）があれば抽出してください。
以下のJSON形式のみで回答（不明な項目はnull）:
 
{
  "castCount": 在籍人数(数値またはnull),
  "price60": 60分通常価格(数値またはnull),
  "price60new": 60分新規最安値(数値またはnull),
  "shimei": 指名料(数値またはnull),
  "specialShimei": 特別指名料(数値またはnull),
  "totalReviews": 口コミ総数(数値またはnull)
}`;
 
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
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
          { type: 'text', text: prompt }
        ]
      }]
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
  return JSON.parse(jsonMatch[0]);
}
 
// 複数結果をマージ（nullでない値で上書き）
function mergeResults(base, additional) {
  const fields = ['castCount','price60','price60new','price90','price120','shimei','specialShimei','entryFee','totalReviews'];
  fields.forEach(f => {
    if (additional[f] !== null && additional[f] !== undefined) {
      base[f] = additional[f];
    }
  });
  return base;
}
 
async function handlePDFUpload() {
  const fileInput = document.getElementById('pdf-input');
  const apiKey = document.getElementById('pdf-apikey').value.trim() || loadApiKey();
  const status = document.getElementById('pdf-status');
 
  if (!fileInput.files.length) {
    status.textContent = 'PDFを選択してください';
    status.className = 'analyze-status err';
    return;
  }
  if (!apiKey) {
    status.textContent = 'APIキーを入力してください';
    status.className = 'analyze-status err';
    return;
  }
 
  saveApiKey(apiKey);
  const files = Array.from(fileInput.files);
  const total = files.length;
 
  try {
    let result = null;
 
    for (let i = 0; i < files.length; i++) {
      status.className = 'analyze-status';
      status.textContent = `解析中... ${i + 1} / ${total} 枚目 (20〜30秒)`;
 
      const base64 = await fileToBase64(files[i]);
      const parsed = await analyzeSinglePDF(base64, apiKey, i === 0);
 
      if (i === 0) {
        result = parsed;
      } else {
        result = mergeResults(result, parsed);
      }
    }
 
    const newStore = {
      id: uid(),
      url: '',
      name: result.name || '（店舗名不明）',
      type: result.type || 'deli',
      tel: result.tel || '—',
      castCount: result.castCount || null,
      price60: result.price60 || null,
      price60new: result.price60new || null,
      price90: result.price90 || null,
      price120: result.price120 || null,
      shimei: result.shimei || null,
      specialShimei: result.specialShimei || null,
      entryFee: result.entryFee || null,
      totalReviews: result.totalReviews || null,
      scores: result.scores || null,
      aiTags: result.aiTags || [],
      aiSummary: result.aiSummary || '',
    };
 
    stores.push(newStore);
    saveStores(stores);
    closeModal('add');
    renderAll();
    showToast(`「${newStore.name}」を${total}枚のPDFから登録しました`, 'ok');
 
  } catch(e) {
    status.textContent = 'エラー: ' + e.message;
    status.className = 'analyze-status err';
  }
}
 
// ドラッグ&ドロップ（複数対応）
function initDropZone() {
  const zone = document.getElementById('drop-zone');
  if (!zone) return;
 
  zone.addEventListener('dragover', e => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
    if (files.length) {
      // FileListは直接代入できないのでinputをリセット
      const dt = new DataTransfer();
      files.forEach(f => dt.items.add(f));
      document.getElementById('pdf-input').files = dt.files;
      updateFileLabel(files);
    }
  });
 
  document.getElementById('pdf-input').addEventListener('change', e => {
    const files = Array.from(e.target.files);
    updateFileLabel(files);
  });
}
 
function updateFileLabel(files) {
  const label = document.getElementById('pdf-filename');
  if (files.length === 1) {
    label.textContent = files[0].name;
  } else {
    label.textContent = `${files.length}枚選択: ${files.map(f => f.name).join(', ')}`;
  }
}
 
document.addEventListener('DOMContentLoaded', initDropZone);
