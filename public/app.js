/* ═══════════════════════════════════════════
   BCRE Demo Spot — App Logic
   ═══════════════════════════════════════════ */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const state = {
  prototypes: [],
  currentIndex: 0,
  cardsVisible: 1,
};

// ── DOM refs ──
const track = $('#track');
const prevBtn = $('#prevBtn');
const nextBtn = $('#nextBtn');
const dotsContainer = $('#dots');
const carousel = $('#carousel');
const emptyState = $('#emptyState');
const modal = $('#modal');
const urlInput = $('#urlInput');
const submitBtn = $('#submitUrl');
const modalError = $('#modalError');
const cardTemplate = $('#cardTemplate');

// ── Init ──
async function init() {
  bindEvents();
  await loadPrototypes();
}

function bindEvents() {
  $('#addBtn').addEventListener('click', openModal);
  $('#closeModal').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  submitBtn.addEventListener('click', handleSubmit);
  urlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSubmit(); });
  prevBtn.addEventListener('click', () => navigate(-1));
  nextBtn.addEventListener('click', () => navigate(1));
  window.addEventListener('resize', () => {
    updateCardsVisible();
    render();
  });

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (modal.classList.contains('hidden')) {
      if (e.key === 'ArrowLeft') navigate(-1);
      if (e.key === 'ArrowRight') navigate(1);
    }
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
  });
}

// ── API ──
async function loadPrototypes() {
  try {
    const res = await fetch('/api/prototypes');
    state.prototypes = await res.json();
  } catch { state.prototypes = []; }
  updateCardsVisible();
  render();
}

async function addPrototype(url) {
  const res = await fetch('/api/prototypes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to capture prototype');
  }
  return res.json();
}

async function deletePrototype(id) {
  await fetch(`/api/prototypes/${id}`, { method: 'DELETE' });
  state.prototypes = state.prototypes.filter(p => p.id !== id);
  if (state.currentIndex >= maxIndex()) {
    state.currentIndex = Math.max(0, maxIndex());
  }
  render();
  toast('Prototype removed');
}

// ── Modal ──
function openModal() {
  modal.classList.remove('hidden');
  urlInput.value = '';
  modalError.classList.add('hidden');
  setTimeout(() => urlInput.focus(), 100);
}

function closeModal() {
  modal.classList.add('hidden');
}

async function handleSubmit() {
  const url = urlInput.value.trim();
  if (!url) return;

  try {
    new URL(url); // validate
  } catch {
    showError('Please enter a valid URL');
    return;
  }

  setLoading(true);
  hideError();

  try {
    const proto = await addPrototype(url);
    state.prototypes.push(proto);
    state.currentIndex = maxIndex(); // scroll to the new one
    render();
    closeModal();
    toast(`Added "${proto.title}"`);
  } catch (err) {
    showError(err.message);
  } finally {
    setLoading(false);
  }
}

function setLoading(on) {
  submitBtn.disabled = on;
  urlInput.disabled = on;
  submitBtn.querySelector('.btn-text').classList.toggle('hidden', on);
  submitBtn.querySelector('.btn-loader').classList.toggle('hidden', !on);
}

function showError(msg) { modalError.textContent = msg; modalError.classList.remove('hidden'); }
function hideError() { modalError.classList.add('hidden'); }

// ── Carousel / Rendering ──
function updateCardsVisible() {
  const w = window.innerWidth;
  if (w > 1200) state.cardsVisible = 3;
  else if (w > 800) state.cardsVisible = 2;
  else state.cardsVisible = 1;
}

function maxIndex() {
  return Math.max(0, state.prototypes.length - state.cardsVisible);
}

function navigate(dir) {
  state.currentIndex = Math.min(maxIndex(), Math.max(0, state.currentIndex + dir));
  updateTrack();
  updateDots();
  updateNavButtons();
}

function goTo(index) {
  state.currentIndex = Math.min(maxIndex(), Math.max(0, index));
  updateTrack();
  updateDots();
  updateNavButtons();
}

function render() {
  const { prototypes } = state;

  // Show/hide empty state
  const hasProtos = prototypes.length > 0;
  emptyState.classList.toggle('hidden', hasProtos);
  carousel.classList.toggle('hidden', !hasProtos);
  dotsContainer.classList.toggle('hidden', !hasProtos);

  if (!hasProtos) return;

  // Build cards
  track.innerHTML = '';
  prototypes.forEach((proto) => {
    const frag = cardTemplate.content.cloneNode(true);
    const card = frag.querySelector('.card');
    const img = frag.querySelector('.card-img');
    const imgWrap = frag.querySelector('.card-img-wrap');

    img.src = proto.snapshot;
    img.alt = proto.title;
    frag.querySelector('.card-title').textContent = proto.title;
    frag.querySelector('.card-desc').textContent = proto.description;

    const link = frag.querySelector('.card-link');
    link.href = proto.url;
    link.textContent = 'Open ↗';

    // Click image to visit
    imgWrap.style.cursor = 'pointer';
    imgWrap.addEventListener('click', () => window.open(proto.url, '_blank'));

    // Delete
    frag.querySelector('.card-delete').addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`Remove "${proto.title}"?`)) deletePrototype(proto.id);
    });

    track.appendChild(frag);
  });

  // Dots
  dotsContainer.innerHTML = '';
  const totalDots = maxIndex() + 1;
  for (let i = 0; i < totalDots; i++) {
    const dot = document.createElement('button');
    dot.className = 'dot' + (i === state.currentIndex ? ' active' : '');
    dot.addEventListener('click', () => goTo(i));
    dotsContainer.appendChild(dot);
  }

  updateTrack();
  updateNavButtons();
}

function updateTrack() {
  const card = track.querySelector('.card');
  if (!card) return;
  const gap = 24;
  const cardWidth = card.offsetWidth + gap;
  track.style.transform = `translateX(-${state.currentIndex * cardWidth}px)`;
}

function updateDots() {
  dotsContainer.querySelectorAll('.dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === state.currentIndex);
  });
}

function updateNavButtons() {
  prevBtn.disabled = state.currentIndex <= 0;
  nextBtn.disabled = state.currentIndex >= maxIndex();
}

// ── Toast Notification ──
function toast(msg) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3000);
}

// ── Touch / Swipe Support ──
let touchStartX = 0;
let touchEndX = 0;

document.addEventListener('touchstart', (e) => {
  touchStartX = e.changedTouches[0].screenX;
}, { passive: true });

document.addEventListener('touchend', (e) => {
  touchEndX = e.changedTouches[0].screenX;
  const diff = touchStartX - touchEndX;
  if (Math.abs(diff) > 60) {
    navigate(diff > 0 ? 1 : -1);
  }
}, { passive: true });

// ── Go! ──
init();
