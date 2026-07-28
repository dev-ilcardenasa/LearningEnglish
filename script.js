/**
 * CONFIGURACIÓN Y VARIABLES GLOBALES
 */
const KEY = 'mf_quotes_v2';
const CATEGORIES_KEY = 'mf_categories_v2';
const FILTER_KEY = 'mf_quotes_filter';
const PAGE_KEY = 'mf_active_page';
let quotes = JSON.parse(localStorage.getItem(KEY) || '[]');
let categories = JSON.parse(localStorage.getItem(CATEGORIES_KEY) || '["General"]');
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

function saveCategories() {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
}

// ─── CATEGORIES MANAGEMENT ───
function renderCategories() {
  const grid = document.getElementById('categories-grid');
  if (!categories.length) {
    grid.innerHTML = `<div class="empty"><span class="emoji">📁</span>
      <p>No categories yet. Add your first one above!</p></div>`;
    return;
  }

  grid.innerHTML = categories.map((cat, index) => {
    const catStyles = getCategoryStyles(cat);
    const count = quotes.filter(q => q.category === cat).length;
    return `
      <div class="category-card" draggable="true" data-index="${index}">
        <div class="name-row">
          <div class="name-row-left">
            <div class="drag-handle" title="Drag to reorder">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <circle cx="9" cy="6" r="1"></circle>
                <circle cx="15" cy="6" r="1"></circle>
                <circle cx="9" cy="12" r="1"></circle>
                <circle cx="15" cy="12" r="1"></circle>
                <circle cx="9" cy="18" r="1"></circle>
                <circle cx="15" cy="18" r="1"></circle>
              </svg>
            </div>
            <span class="cat-badge ${catStyles ? 'colored' : ''}" ${catStyles} id="cat-display-${index}">${escHtml(cat)}</span>
            <span class="phrase-count">${count} phrase${count !== 1 ? 's' : ''}</span>
          </div>
          <input type="text" id="cat-edit-${index}" value="${escHtml(cat)}" style="display: none;" onkeydown="if(event.key === 'Enter') saveCategoryEdit(${index}); if(event.key === 'Escape') cancelCategoryEdit(${index});" />
          <button class="btn-icon" onclick="toggleCategoryEdit(${index})" title="Edit">
            ${EDIT_SVG}
          </button>
        </div>
        <div class="actions">
          <button class="btn-view-phrases" onclick="viewPhrasesInCategory('${escHtml(cat)}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            View Phrases
          </button>
          <div style="flex-grow:1;"></div>
          <button class="btn-sm btn-delete" onclick="deleteCategory(${index})">${DEL_SVG} Delete</button>
        </div>
      </div>
    `;
  }).join('');

  // Add drag and drop listeners
  const cards = grid.querySelectorAll('.category-card');
  cards.forEach(card => {
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragover', handleDragOver);
    card.addEventListener('drop', handleDrop);
    card.addEventListener('dragend', handleDragEnd);
  });
}

function addCategory() {
  const input = document.getElementById('new-category-input');
  const value = input.value.trim();
  if (!value) {
    showToast('⚠️ Enter a category name');
    return;
  }

  // Check for duplicates case-insensitively
  const normalizedValue = value.toLowerCase();
  const exists = categories.some(cat => cat.toLowerCase() === normalizedValue);
  if (exists) {
    showToast('⚠️ That category already exists');
    return;
  }

  categories.push(value);
  saveCategories();
  input.value = '';
  renderCategories();
  renderQuotes();
  showToast(`✅ Category "${value}" added`);
}

function toggleCategoryEdit(index) {
  const display = document.getElementById(`cat-display-${index}`);
  const editInput = document.getElementById(`cat-edit-${index}`);
  const card = document.querySelector(`.category-card[data-index="${index}"]`);
  const nameRowLeft = card.querySelector('.name-row-left');

  if (nameRowLeft.style.display === 'none') {
    // Already in edit mode, cancel
    cancelCategoryEdit(index);
  } else {
    // Switch to edit mode
    nameRowLeft.style.display = 'none';
    editInput.style.display = 'block';
    editInput.focus();
    editInput.select();
  }
}

function saveCategoryEdit(index) {
  const editInput = document.getElementById(`cat-edit-${index}`);
  const newValue = editInput.value.trim();
  const oldValue = categories[index];

  if (!newValue) {
    showToast('⚠️ Category name cannot be empty');
    editInput.value = oldValue;
    cancelCategoryEdit(index);
    return;
  }

  if (newValue !== oldValue) {
    // Check for duplicates case-insensitively
    const normalizedNew = newValue.toLowerCase();
    const exists = categories.some((cat, i) => i !== index && cat.toLowerCase() === normalizedNew);
    if (exists) {
      showToast('⚠️ That category already exists');
      editInput.value = oldValue;
      cancelCategoryEdit(index);
      return;
    }
  }

  // Update both categories and quotes that used the old name
  categories[index] = newValue;
  quotes = quotes.map(q => {
    if (q.category === oldValue) {
      q.category = newValue;
    }
    return q;
  });

  saveCategories();
  save();
  cancelCategoryEdit(index);
  renderCategories();
  renderQuotes();
  showToast('✅ Category updated');
}

function cancelCategoryEdit(index) {
  const card = document.querySelector(`.category-card[data-index="${index}"]`);
  const nameRowLeft = card.querySelector('.name-row-left');
  const editInput = document.getElementById(`cat-edit-${index}`);
  nameRowLeft.style.display = 'flex';
  editInput.style.display = 'none';
  editInput.value = categories[index];
}

function deleteCategory(index) {
  const catName = categories[index];
  const quotesInCategory = quotes.filter(q => q.category === catName).length;
  const otherCategories = categories.filter((_, i) => i !== index);
  const hasOtherCategories = otherCategories.length > 0;

  let message = `Are you sure you want to delete "${catName}"?`;
  if (quotesInCategory > 0) {
    if (hasOtherCategories) {
      const targetCat = otherCategories[0];
      message += ` ${quotesInCategory} quote(s) will be moved to "${targetCat}".`;
    } else {
      message += ` ${quotesInCategory} quote(s) will be permanently deleted since no other categories exist.`;
    }
  }

  if (!confirm(message)) return;

  if (quotesInCategory > 0) {
    if (hasOtherCategories) {
      const targetCat = otherCategories[0];
      quotes = quotes.map(q => {
        if (q.category === catName) {
          q.category = targetCat;
        }
        return q;
      });
    } else {
      quotes = quotes.filter(q => q.category !== catName);
    }
    save();
  }

  categories.splice(index, 1);

  saveCategories();
  renderCategories();
  renderQuotes();
  showToast(`✅ Category "${catName}" deleted`);
}

function viewPhrasesInCategory(category) {
  // Set the filter
  document.getElementById('filter-cat').value = category;
  localStorage.setItem(FILTER_KEY, category);
  
  // Clear the search bar
  document.getElementById('search').value = '';
  document.getElementById('clear-search').classList.remove('show');

  // Go to the collection page and refresh the quotes
  showPage('collection');
  renderQuotes();
}

// Drag and drop variables
let draggedIndex = null;

function handleDragStart(e) {
  draggedIndex = Number(e.target.dataset.index);
  e.target.classList.add('dragging');
}

function handleDragOver(e) {
  e.preventDefault();
}

function handleDrop(e) {
  e.preventDefault();
  const targetIndex = Number(e.target.closest('.category-card').dataset.index);
  if (draggedIndex === null || draggedIndex === targetIndex) return;

  // Reorder array
  const [removed] = categories.splice(draggedIndex, 1);
  categories.splice(targetIndex, 0, removed);

  saveCategories();
  renderCategories();
  renderQuotes();
}

function handleDragEnd(e) {
  e.target.classList.remove('dragging');
  draggedIndex = null;
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

  // Render categories page if needed
  if (page === 'categories') {
    renderCategories();
  }

  // Persist active page so it's restored after reload
  localStorage.setItem(PAGE_KEY, page);

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * GETYARN INTEGRATION
 */
function openClip(id) {
  const q = quotes.find(x => x.id === id);
  if (!q) return;

  // Open Yarn search in a new tab (works on mobile and desktop)
  const url = 'https://getyarn.io/yarn-find?text=' + encodeURIComponent(q.text);
  window.open(url, '_blank');

  showToast('🔍 Opening Yarn in a new tab...');
}

function searchYarnManual() {
  const val = document.getElementById('yarn-manual-search').value.trim();
  if (!val) {
    showToast('⚠️ Type something to search');
    return;
  }
  const url = 'https://getyarn.io/yarn-find?text=' + encodeURIComponent(val);
  window.open(url, '_blank');
  showToast('🔍 Opening Yarn in a new tab...');
}

/**
 * PHRASE MANAGEMENT (CRUD)
 */
function saveQuote() {
  const rawText = document.getElementById('inp-text').value;
  const trimmedText = rawText.trim();
  const editId = document.getElementById('edit-id').value;

  if (!trimmedText) {
    showToast('⚠️ Type a phrase first');
    return;
  }

  if (!categories.length) {
    showToast('⚠️ You must create a category first');
    return;
  }

  // Duplicate check: compare trimmed + case-insensitive text against all phrases
  // When editing, skip the current phrase being edited (allow same-text saves)
  const normalizedText = trimmedText.toLowerCase();
  const duplicate = quotes.find(q => {
    const isSame = q.text.trim().toLowerCase() === normalizedText;
    if (!editId) return isSame;
    return isSame && q.id !== Number(editId);
  });
  if (duplicate) {
    showToast('⚠️ That phrase already exists in the system');
    return;
  }

  const category = document.getElementById('inp-category').value || categories[0];

  if (editId) {
    // Edit existing phrase
    const idx = quotes.findIndex(q => q.id === Number(editId));
    if (idx !== -1) {
      quotes[idx].text = rawText;
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
      text: rawText,
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
  
  container.innerHTML = categories.map(c => {
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
  if (!editId && !categories.length) {
    showToast('⚠️ You must create a category first');
    showPage('categories');
    return;
  }

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
    currentCat = q.category;
  } else {
    titleEl.innerHTML = 'New <span>phrase</span>';
    saveBtn.innerHTML = '＋ Save';
    document.getElementById('edit-id').value = '';
    document.getElementById('inp-text').value = '';
    
    // Default to the current filter if one is selected, otherwise first available category
    const activeFilter = document.getElementById('filter-cat').value;
    currentCat = activeFilter || categories[0] || '';
  }

  document.getElementById('inp-category').value = currentCat;
  renderCategoryChips(currentCat);
  document.getElementById('modal-overlay').classList.add('open');

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
function onSearchInput() {
  const searchInput = document.getElementById('search');
  const clearBtn = document.getElementById('clear-search');
  
  if (searchInput.value.length > 0) {
    clearBtn.classList.add('show');
  } else {
    clearBtn.classList.remove('show');
  }
  
  renderQuotes();
}

function onFilterChange() {
  const filterEl = document.getElementById('filter-cat');
  localStorage.setItem(FILTER_KEY, filterEl.value);
  renderQuotes();
}

function clearSearch() {
  const searchInput = document.getElementById('search');
  searchInput.value = '';
  document.getElementById('clear-search').classList.remove('show');
  searchInput.focus();
  renderQuotes();
}

function renderQuotes() {
  const search = document.getElementById('search').value.toLowerCase();
  const filterEl = document.getElementById('filter-cat');

  // Rebuild category filter dropdown so ALL categories (including newly added) are present
  filterEl.innerHTML = '<option value="">All categories</option>' +
    categories.map(c => `<option value="${c}">${c}</option>`).join('');

  // Always use localStorage as the single source of truth for the active filter.
  // Both manual onchange (onFilterChange) and programmatic changes (viewPhrasesInCategory)
  // write to localStorage BEFORE renderQuotes is called — so this is always correct.
  const storedFilter = localStorage.getItem(FILTER_KEY) || '';
  filterEl.value = categories.includes(storedFilter) || storedFilter === '' ? storedFilter : '';
  const cat = filterEl.value;

  // Filter phrases
  const filtered = quotes.filter(q =>
    (!search || q.text.toLowerCase().includes(search)) &&
    (!cat || q.category === cat)
  );

  // Show counter
  document.getElementById('counter').textContent = filtered.length ? `${filtered.length} phrase${filtered.length !== 1 ? 's' : ''}` : '';

  const grid = document.getElementById('grid');
  if (!filtered.length) {
    let emoji = '🔎';
    let message = 'No results for that search.';
    if (quotes.length === 0) {
      emoji = '✨';
      message = 'Your collection is empty.<br><small>Tap <strong>＋</strong> to add your first phrase.</small>';
    } else if (cat) {
      // If a category is selected but there are no results, it means the category is empty
      emoji = '📂';
      message = `This category has no phrases yet.<br><small>Tap <strong>＋</strong> to add a phrase to "${cat}".</small>`;
    }
    grid.innerHTML = `<div class="empty"><span class="emoji">${emoji}</span><p>${message}</p></div>`;
    return;
  }

  // Render cards
  grid.innerHTML = filtered.map(q => {
    const catStyles = getCategoryStyles(q.category);
    return `
    <div class="quote-card" id="card-${q.id}">
      <div class="text-row">
        <p class="quote-text">${escHtml(q.text).replace(/\n/g, '<br>')}</p>
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

// Initialize categories: deduplicate case-insensitively, merge quotes from phrases
const normalizedCategoriesMap = new Map(); // key: lowercase category name, value: original category name

// Step 1: Process existing categories, deduplicating case-insensitively and keeping the first occurrence
categories.forEach(cat => {
  const normalized = cat.toLowerCase();
  if (!normalizedCategoriesMap.has(normalized)) {
    normalizedCategoriesMap.set(normalized, cat);
  }
});

// Step 2: Process quotes to make sure all their categories are present, deduplicating case-insensitively
const uniqueQuoteCategories = [...new Set(quotes.map(q => q.category))];
uniqueQuoteCategories.forEach(cat => {
  const normalized = cat.toLowerCase();
  if (!normalizedCategoriesMap.has(normalized)) {
    normalizedCategoriesMap.set(normalized, cat);
  } else {
    // If quote has a case-variant of an existing category, update the quote to use the existing category name
    const existingCat = normalizedCategoriesMap.get(normalized);
    if (existingCat !== cat) {
      quotes = quotes.map(q => {
        if (q.category === cat) {
          q.category = existingCat;
        }
        return q;
      });
    }
  }
});

// Step 3: Create the final categories array from the map's values (preserves user-defined order and empty categories)
categories = Array.from(normalizedCategoriesMap.values());

saveCategories();
save();

// Render everything (filter dropdown is auto-populated from localStorage by renderQuotes)
renderQuotes();

// Restore last active page (default to 'collection' if none saved)
const savedPage = localStorage.getItem(PAGE_KEY) || 'collection';
showPage(savedPage);
