/**
 * CONFIGURACIÓN Y VARIABLES GLOBALES
 */
const KEY = 'mf_quotes_v2';
const FILTER_KEY = 'mf_quotes_filter';
let quotes = JSON.parse(localStorage.getItem(KEY) || '[]');
let speaking = null;

// Category colors configuration
const CAT_COLORS = [
  { name: 'blue', color: '#4da3ff' },
  { name: 'green', color: '#5de0c5' },
  { name: 'purple', color: '#a37cf7' },
  { name: 'orange', color: '#ff9f43' },
  { name: 'pink', color: '#ff78b9' },
  { name: 'red', color: '#e05d5d' },
  { name: 'teal', color: '#26c6da' },
  { name: 'yellow', color: '#ffca28' },
  { name: 'indigo', color: '#6610f2' }
];

function getCategoryStyles(category) {
  if (!category || category === 'General') {
    return '';
  }
  // Generate a stable hash-based index for the color
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % CAT_COLORS.length;
  const color = CAT_COLORS[index].color;
  
  return `style="--cat-color: ${color}; --cat-bg: ${color}1f; --cat-border: ${color}40"`;
}

// Guardar en LocalStorage
function save() {
  localStorage.setItem(KEY, JSON.stringify(quotes));
}

// Iconos SVG
const COPY_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
const CHECK_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>`;
const EDIT_SVG = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
const DEL_SVG = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>`;
const PLAY_SVG = `<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;

/**
 * NAVEGACIÓN
 */
function showPage(page) {
  // Hide all pages and deactivate tabs
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));

  // Activate selected page and tab
  document.getElementById('page-' + page).classList.add('active');
  document.getElementById('nav-' + page).classList.add('active');

  // Show/hide floating action button (FAB) depending on the page
  document.getElementById('fab').style.display = page === 'collection' ? 'flex' : 'none';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * GETYARN INTEGRATION
 */
function openClip(id) {
  const q = quotes.find(x => x.id === id);
  if (!q) return;

  // Switch to the Learning English tab
  showPage('yarn');

  // Load search in the iframe with the phrase directly
  const url = 'https://getyarn.io/yarn-find?text=' + encodeURIComponent(q.text);
  document.getElementById('embed-iframe').src = url;

  showToast('🔍 Searching clips...');
}

/**
 * PHRASE MANAGEMENT (CRUD)
 */
function saveQuote() {
  const text = document.getElementById('inp-text').value.trim();
  const category = document.getElementById('inp-category').value.trim() || 'General';
  const editId = document.getElementById('edit-id').value;

  if (!text) {
    showToast('⚠️ Type a phrase first');
    return;
  }

  if (editId) {
    // Edit existing phrase
    const idx = quotes.findIndex(q => q.id === Number(editId));
    if (idx !== -1) {
      quotes[idx].text = text;
      quotes[idx].category = category;
    }
    save();
    closeModal();
    renderQuotes();
    showToast('✏️ Phrase updated');
  } else {
    // Save new phrase
    quotes.unshift({
      id: Date.now(),
      text,
      category,
      date: new Date().toLocaleDateString('en-US')
    });
    save();
    closeModal();
    renderQuotes();
    showToast('✅ Phrase saved');
  }
}

function deleteQuote(id) {
  if (!confirm('Delete this phrase?')) return;
  stopSpeaking();
  quotes = quotes.filter(q => q.id !== id);
  save();
  renderQuotes();
  showToast('🗑️ Deleted');
}

function copyText(id) {
  const q = quotes.find(x => x.id === id);
  if (!q) return;

  navigator.clipboard.writeText(q.text).then(() => {
    const btn = document.getElementById('copy-' + id);
    if (btn) {
      btn.classList.add('copied');
      btn.innerHTML = CHECK_SVG;
      setTimeout(() => {
        btn.classList.remove('copied');
        btn.innerHTML = COPY_SVG;
      }, 1800);
    }
    showToast('📋 Copied');
  }).catch(() => showToast('⚠️ Could not copy'));
}

/**
 * MODAL
 */
function renderCategoryChips(selectedCategory = '') {
  const container = document.getElementById('modal-category-chips');
  const cats = [...new Set(quotes.map(q => q.category))].sort();
  
  if (cats.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = cats.map(c => {
    const styles = getCategoryStyles(c);
    const active = c === selectedCategory ? 'active' : '';
    return `<div class="chip ${active} ${styles ? 'colored' : ''}" ${styles} onclick="selectChip('${c}')">${escHtml(c)}</div>`;
  }).join('');
}

function selectChip(cat) {
  const input = document.getElementById('inp-category');
  input.value = cat;
  
  // Update active state of chips
  document.querySelectorAll('.chip').forEach(chip => {
    if (chip.textContent === cat) {
      chip.classList.add('active');
    } else {
      chip.classList.remove('active');
    }
  });
}

function openModal(editId = null) {
  const titleEl = document.getElementById('modal-title');
  const saveBtn = document.getElementById('modal-save-btn');
  let currentCat = '';

  if (editId) {
    const q = quotes.find(x => x.id === editId);
    if (!q) return;
    titleEl.innerHTML = 'Edit <span>phrase</span>';
    saveBtn.innerHTML = CHECK_SVG + ' Save changes';
    document.getElementById('edit-id').value = editId;
    document.getElementById('inp-text').value = q.text;
    document.getElementById('inp-category').value = q.category;
    currentCat = q.category;
  } else {
    titleEl.innerHTML = 'New <span>phrase</span>';
    saveBtn.innerHTML = '＋ Save';
    document.getElementById('edit-id').value = '';
    document.getElementById('inp-text').value = '';
    
    // Default to the current filter if one is selected, otherwise empty
    const activeFilter = document.getElementById('filter-cat').value;
    document.getElementById('inp-category').value = activeFilter;
    currentCat = activeFilter;
  }

  renderCategoryChips(currentCat);
  document.getElementById('modal-overlay').classList.add('open');
  
  // Update chips active state as user types a new category
  const catInput = document.getElementById('inp-category');
  catInput.oninput = () => {
    const val = catInput.value.trim();
    document.querySelectorAll('.chip').forEach(chip => {
      if (chip.textContent.toLowerCase() === val.toLowerCase()) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });
  };

  setTimeout(() => document.getElementById('inp-text').focus(), 60);
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

function overlayClick(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
}

/**
 * TEXT-TO-SPEECH (TTS)
 */
function stopSpeaking() {
  window.speechSynthesis.cancel();
  document.querySelectorAll('.btn-listen.playing').forEach(b => b.classList.remove('playing'));
  document.querySelectorAll('.wave-wrap.active').forEach(w => w.classList.remove('active'));
  speaking = null;
}

function speak(id) {
  const q = quotes.find(x => x.id === id);
  if (!q) return;

  if (speaking === id) {
    stopSpeaking();
    return;
  }

  stopSpeaking();

  const utt = new SpeechSynthesisUtterance(q.text);
  utt.lang = 'en-US';
  utt.rate = 0.88;

  // Try to select an English voice
  const voices = speechSynthesis.getVoices();
  const en = voices.find(v => v.lang.startsWith('en') && v.localService) || voices.find(v => v.lang.startsWith('en'));
  if (en) utt.voice = en;

  speaking = id;
  const btn = document.getElementById('btn-' + id);
  const wave = document.getElementById('wave-' + id);

  if (btn) btn.classList.add('playing');
  if (wave) wave.classList.add('active');

  utt.onend = utt.onerror = () => {
    if (btn) btn.classList.remove('playing');
    if (wave) wave.classList.remove('active');
    speaking = null;
  };

  speechSynthesis.speak(utt);
}

/**
 * UI RENDERING
 */
function renderQuotes() {
  const search = document.getElementById('search').value.toLowerCase();
  const filterEl = document.getElementById('filter-cat');
  const cat = filterEl.value;

  // Save current filter to localStorage
  localStorage.setItem(FILTER_KEY, cat);

  // Update category filter dropdown
  const cats = [...new Set(quotes.map(q => q.category))].sort();
  const cur = filterEl.value;
  filterEl.innerHTML = '<option value="">All categories</option>' +
    cats.map(c => `<option value="${c}"${c === cur ? ' selected' : ''}>${c}</option>`).join('');

  // Filter phrases
  const filtered = quotes.filter(q =>
    (!search || q.text.toLowerCase().includes(search)) &&
    (!cat || q.category === cat)
  );

  // Show counter
  document.getElementById('counter').textContent = filtered.length ? `${filtered.length} phrase${filtered.length !== 1 ? 's' : ''}` : '';

  const grid = document.getElementById('grid');
  if (!filtered.length) {
    grid.innerHTML = `<div class="empty"><span class="emoji">${quotes.length === 0 ? '✨' : '🔎'}</span>
      <p>${quotes.length === 0 ? 'Your collection is empty.<br><small>Tap <strong>＋</strong> to add your first phrase.</small>' : 'No results for that search.'}</p></div>`;
    return;
  }

  // Render cards
  grid.innerHTML = filtered.map(q => {
    const catStyles = getCategoryStyles(q.category);
    return `
    <div class="quote-card" id="card-${q.id}">
      <div class="text-row">
        <p class="quote-text">${escHtml(q.text)}</p>
        <button class="btn-icon" id="copy-${q.id}" title="Copy phrase" onclick="copyText(${q.id})">${COPY_SVG}</button>
      </div>
      <div class="meta-row">
        <span class="cat-badge ${catStyles ? 'colored' : ''}" ${catStyles}>${escHtml(q.category)}</span>
        <span class="lang-badge">🇺🇸 EN</span>
        <span class="date-txt">${q.date}</span>
      </div>
      <div class="card-actions">
        <button class="btn-sm btn-listen" id="btn-${q.id}" onclick="speak(${q.id})">
          ${PLAY_SVG} Listen
          <div class="wave-wrap" id="wave-${q.id}">
            <div class="wave-bar"></div><div class="wave-bar"></div>
            <div class="wave-bar"></div><div class="wave-bar"></div>
            <div class="wave-bar"></div>
          </div>
        </button>
        
        <button class="btn-sm btn-yarn" onclick="openClip(${q.id})">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <circle cx="12" cy="12" r="10"/>
            <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/>
          </svg>
          View clips
        </button>      

        <button class="btn-sm btn-edit" onclick="openModal(${q.id})">${EDIT_SVG}</button>
        <button class="btn-sm btn-delete" onclick="deleteQuote(${q.id})">${DEL_SVG}</button>
      </div>
    </div>`;
  }).join('');
}

/**
 * UTILS
 */
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2500);
}

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Event Listeners
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') saveQuote();
});

// Initialization
window.speechSynthesis.onvoiceschanged = () => { };

// Load saved filter
const savedFilter = localStorage.getItem(FILTER_KEY);
if (savedFilter) {
  document.getElementById('filter-cat').value = savedFilter;
}

renderQuotes();
