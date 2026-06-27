// ===================================================
// PDF解析モジュール - pdf-analyzer.js
// ===================================================

async function analyzePDF(file, apiKey) {
  const status = document.getElementById('pdf-status');
  status.className = 'analyze-status';
  status.textContent = 'PDFを読み込み中...';

  // FileをBase64に変換
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  status.textContent = 'AIが解析中... (20〜30秒かかります)';

  const prompt = `このPDFは風俗店（デリヘル・ホテヘル）のシティヘブンネット掲載ページです。
以下の情報を抽出してJSON形式のみで回答してください（説明文・コードブロック不要）:

{
  "name": "店舗名",
  "type": "deli または hotel または hybrid",
  "tel": "電話番号",
  "castCount": 在籍人数(数値またはnull),
  "price60": 60分通常価格(数値またはnull),
  "price60new": 60分新規・最安値(数値またはnull),
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
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: base64
            }
          },
          {
            type: 'text',
            text: prompt
          }
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

  try {
    const parsed = await analyzePDF(fileInput.files[0], apiKey);

    const newStore = {
      id: uid(),
      url: '',
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
    showToast(`「${newStore.name}」をPDFから登録しました`, 'ok');

  } catch(e) {
    status.textContent = 'エラー: ' + e.message;
    status.className = 'analyze-status err';
  }
}

// ドラッグ&ドロップ
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
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      document.getElementById('pdf-input').files = e.dataTransfer.files;
      document.getElementById('pdf-filename').textContent = file.name;
    }
  });

  document.getElementById('pdf-input').addEventListener('change', e => {
    if (e.target.files[0]) {
      document.getElementById('pdf-filename').textContent = e.target.files[0].name;
    }
  });
}

document.addEventListener('DOMContentLoaded', initDropZone);
