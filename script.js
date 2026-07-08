/* ===========================
   PASSWORD GATE
   =========================== */
const PW_CORRECT = 'LRDS';
const PW_SESSION_KEY = 'lrds_unlocked';

function initPasswordGate() {
  const gate = document.getElementById('passwordGate');
  const input = document.getElementById('pwInput');
  const submitBtn = document.getElementById('pwSubmit');
  const errorEl = document.getElementById('pwError');

  if (sessionStorage.getItem(PW_SESSION_KEY) === '1') {
    gate.classList.add('unlocked');
    gate.addEventListener('transitionend', () => { gate.hidden = true; }, { once: true });
    return;
  }

  function tryUnlock() {
    const val = input.value.trim().toUpperCase();
    if (val === PW_CORRECT) {
      sessionStorage.setItem(PW_SESSION_KEY, '1');
      errorEl.textContent = '';
      gate.classList.add('unlocked');
      gate.addEventListener('transitionend', () => { gate.hidden = true; }, { once: true });
    } else {
      errorEl.textContent = 'Mot de passe incorrect.';
      input.value = '';
      input.focus();
      input.classList.remove('shake');
      void input.offsetWidth;
      input.classList.add('shake');
    }
  }

  submitBtn.addEventListener('click', tryUnlock);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') tryUnlock(); });
  input.focus();
}

/* ===========================
   ASSETS
   =========================== */
const ASSETS = {
  panoramic:         'content/slides/panoramic.png',
  logoPattern:       'assets/logo.svg',
  plusBlackCircle:   'assets/plus-black-circle.svg',
  plusBlackIcon:     'assets/plus-black-icon.svg',
  plusWhiteCircle:   'assets/plus-white-circle.svg',
  plusWhiteIcon:     'assets/plus-white-icon.svg',
  crossIcon:         'assets/cross-icon.svg',
};

/* ===========================
   STATE
   =========================== */
const state = {
  config: null,
  visited: new Set(),
  currentModalId: null,
  modalLabelVisible: false,
  scrollX: 0,
  maxScrollX: 0,
  isDragging: false,
  dragStartX: 0,
  dragScrollX: 0,
  introComplete: false,
  animating: false,
  progressDragging: false,
};

/* ===========================
   DOM REFS
   =========================== */
const $ = id => document.getElementById(id);
const dom = {
  app: $('app'),
  instructionText: $('instructionText'),
  panoramicWrapper: $('panoramicWrapper'),
  panoramicTrack: $('panoramicTrack'),
  panoramicImg: $('panoramicImg'),
  progressTrack: $('progressTrack'),
  progressDot: $('progressDot'),
  btnQuitWrap: $('btnQuitWrap'),
  btnQuit: $('btnQuit'),
  modalOverlay: $('modalOverlay'),
  modalImg: $('modalImg'),
  modalTitle: $('modalTitle'),
  modalText: $('modalText'),
  modalContentPanel: $('modalContentPanel'),
  modalPanelsTrack: $('modalPanelsTrack'),
  modalLabelPanel: $('modalLabelPanel'),
  modalConsigne: $('modalConsigne'),
  modalLabelImg: $('modalLabelImg'),
  modalToggleBtn: $('modalToggleBtn'),
  toggleBtnCircle: $('toggleBtnCircle'),
  toggleBtnIcon: $('toggleBtnIcon'),
  btnRetour: $('btnRetour'),
};

/* ===========================
   INIT
   =========================== */
async function init() {
  state.config = await loadConfig();

  document.querySelector('.logo-img').src = ASSETS.logoPattern;

  const panoramicSrc = state.config.panoramic || ASSETS.panoramic;
  await new Promise(resolve => {
    dom.panoramicImg.src = panoramicSrc;
    if (dom.panoramicImg.complete && dom.panoramicImg.naturalWidth > 0) {
      resolve();
    } else {
      dom.panoramicImg.onload = resolve;
      dom.panoramicImg.onerror = resolve;
    }
  });

  computeScrollBounds();
  renderPlusButtons();
  setupDrag();
  setupProgressBar();
  setupModalToggle();
  setupRetour();
  setupQuit();
  window.addEventListener('resize', onResize);

  playIntroAnimation();
}

async function loadConfig() {
  try {
    const res = await fetch('content/config.json');
    return await res.json();
  } catch (e) {
    console.warn('config.json not found, using defaults');
    return {
      panoramic: null,
      instructionDefault: 'Explorer la panoramique et cliquez sur tous les PLUS pour découvrir les soins.',
      instructionComplete: 'Vous avez visité tous les soins.',
      labelQuit: 'QUITTER',
      labelBack: 'RETOUR',
      modals: [],
    };
  }
}

/* ===========================
   SCROLL / BOUNDS
   =========================== */
function computeScrollBounds() {
  const wrapperW = dom.panoramicWrapper.offsetWidth;
  const trackW = dom.panoramicTrack.scrollWidth;
  state.maxScrollX = Math.max(0, trackW - wrapperW);
}

function setScrollX(x, animated = false) {
  x = Math.max(0, Math.min(state.maxScrollX, x));
  state.scrollX = x;

  if (animated) {
    dom.panoramicTrack.classList.add('is-animating');
  } else {
    dom.panoramicTrack.classList.remove('is-animating');
  }
  dom.panoramicTrack.style.transform = `translateX(${-x}px)`;
  updateProgress(x);
}

function updateProgress(x) {
  if (state.maxScrollX === 0) return;
  const trackW = dom.progressTrack.offsetWidth;
  const dotW = dom.progressDot.offsetWidth;
  const ratio = x / state.maxScrollX;
  const maxLeft = trackW - dotW;
  dom.progressDot.style.left = (ratio * maxLeft) + 'px';
}

/* ===========================
   INTRO ANIMATION — pan lent
   =========================== */
function playIntroAnimation() {
  setScrollX(state.maxScrollX);
  state.animating = true;

  setTimeout(() => {
    dom.panoramicTrack.classList.add('is-animating');
    dom.panoramicTrack.style.transition = 'transform 4s cubic-bezier(0.4, 0, 0.2, 1)';
    dom.panoramicTrack.style.transform = `translateX(0px)`;
    updateProgress(0);
    state.scrollX = 0;

    setTimeout(() => {
      dom.panoramicTrack.style.transition = '';
      dom.panoramicTrack.classList.remove('is-animating');
      showButtonsSequentially();
    }, 4300);
  }, 400);
}

function showButtonsSequentially() {
  const buttons = [...document.querySelectorAll('.plus-btn')];
  const sorted = buttons.sort((a, b) => parseFloat(a.style.left) - parseFloat(b.style.left));

  sorted.forEach((btn, i) => {
    setTimeout(() => {
      btn.classList.add('visible', 'animate-in');
      if (i === sorted.length - 1) {
        state.animating = false;
        state.introComplete = true;
      }
    }, i * 500);
  });
}

/* ===========================
   PLUS BUTTONS
   =========================== */
function renderPlusButtons() {
  const modals = state.config.modals || [];

  modals.forEach(modal => {
    const btn = document.createElement('button');
    btn.className = 'plus-btn';
    btn.setAttribute('data-id', modal.id);
    btn.style.left = modal.position.x + '%';
    btn.style.top = modal.position.y + '%';
    btn.setAttribute('aria-label', `Découvrir ${modal.id}`);

    const circle = document.createElement('img');
    circle.className = 'btn-circle';
    circle.src = ASSETS.plusBlackCircle;
    circle.alt = '';

    const icon = document.createElement('img');
    icon.className = 'btn-icon';
    icon.src = ASSETS.plusBlackIcon;
    icon.alt = '';

    btn.appendChild(circle);
    btn.appendChild(icon);

    btn.addEventListener('click', () => {
      if (state.animating) return;
      openModal(modal.id);
    });

    dom.panoramicTrack.appendChild(btn);
  });
}

function getPlusBtn(id) {
  return dom.panoramicTrack.querySelector(`.plus-btn[data-id="${id}"]`);
}

function markVisited(id) {
  state.visited.add(id);
  const btn = getPlusBtn(id);
  if (btn) {
    btn.classList.add('visited');
    btn.querySelector('.btn-circle').src = ASSETS.plusWhiteCircle;
    btn.querySelector('.btn-icon').src = ASSETS.plusWhiteIcon;
  }
}

/* ===========================
   MODAL
   =========================== */
async function openModal(id) {
  const modal = state.config.modals.find(m => m.id === id);
  if (!modal) return;

  state.currentModalId = id;
  state.modalLabelVisible = false;

  const cb = '?_=' + Date.now();
  dom.modalImg.src = modal.image ? modal.image + cb : '';
  dom.modalTitle.textContent = '';
  dom.modalText.innerHTML = '';
  dom.modalConsigne.textContent = '';
  dom.modalLabelImg.src = modal.label ? modal.label + cb : '';

  // Reset panels to text view
  dom.modalPanelsTrack.classList.remove('show-label');
  dom.modalToggleBtn.classList.remove('is-cross');
  dom.toggleBtnCircle.src = ASSETS.plusBlackCircle;
  dom.toggleBtnIcon.src = ASSETS.plusBlackIcon;

  try {
    const [titleRes, textRes, consigneRes] = await Promise.all([
      fetch(modal.titleFile).catch(() => null),
      fetch(modal.textFile).catch(() => null),
      fetch(modal.consigneFile).catch(() => null),
    ]);
    if (titleRes && titleRes.ok) {
      const title = await titleRes.text();
      dom.modalTitle.innerHTML = title.trim().replace(/\n/g, '<br>');
    }
    if (textRes && textRes.ok) {
      dom.modalText.innerHTML = await textRes.text();
    }
    if (consigneRes && consigneRes.ok) {
      dom.modalConsigne.textContent = (await consigneRes.text()).trim();
    }
  } catch (e) {
    console.warn('Could not load modal content', e);
  }

  // Fade in
  requestAnimationFrame(() => {
    dom.modalOverlay.classList.add('open');
  });

  markVisited(id);
  checkCompletion();
}

function closeModal() {
  dom.modalOverlay.classList.remove('open');
  setTimeout(() => {
    state.currentModalId = null;
    state.modalLabelVisible = false;
    dom.modalPanelsTrack.classList.remove('show-label');
  }, 400);
}

function toggleModalContent() {
  state.modalLabelVisible = !state.modalLabelVisible;

  if (state.modalLabelVisible) {
    dom.modalPanelsTrack.classList.add('show-label');
    dom.modalToggleBtn.classList.add('is-cross');
    dom.toggleBtnCircle.src = ASSETS.plusBlackCircle;
    dom.toggleBtnIcon.src = ASSETS.crossIcon;
  } else {
    dom.modalPanelsTrack.classList.remove('show-label');
    dom.modalToggleBtn.classList.remove('is-cross');
    dom.toggleBtnCircle.src = ASSETS.plusBlackCircle;
    dom.toggleBtnIcon.src = ASSETS.plusBlackIcon;
  }
}

/* ===========================
   COMPLETION CHECK
   =========================== */
function checkCompletion() {
  const total = (state.config.modals || []).length;
  if (total === 0) return;
  if (state.visited.size >= total) {
    showCompletionState();
  }
}

function showCompletionState() {
  dom.instructionText.style.opacity = '0';
  setTimeout(() => {
    dom.instructionText.textContent = state.config.instructionComplete;
    dom.instructionText.classList.add('centered');
    dom.instructionText.style.opacity = '1';
  }, 400);

  dom.btnQuitWrap.style.display = 'flex';
  dom.btnQuit.textContent = state.config.labelQuit;
}

/* ===========================
   DRAG — panoramique
   =========================== */
function setupDrag() {
  const wrapper = dom.panoramicWrapper;

  wrapper.addEventListener('touchstart', onDragStart, { passive: true });
  wrapper.addEventListener('touchmove', onDragMove, { passive: false });
  wrapper.addEventListener('touchend', onDragEnd);

  wrapper.addEventListener('mousedown', onDragStart);
  window.addEventListener('mousemove', onDragMove);
  window.addEventListener('mouseup', onDragEnd);
}

function getClientX(e) {
  return e.touches ? e.touches[0].clientX : e.clientX;
}

function onDragStart(e) {
  if (!state.introComplete) return;
  state.isDragging = true;
  state.dragStartX = getClientX(e);
  state.dragScrollX = state.scrollX;
  dom.panoramicWrapper.classList.add('is-dragging');
  dom.panoramicTrack.style.transition = 'none';
}

function onDragMove(e) {
  if (!state.isDragging) return;
  if (e.cancelable) e.preventDefault();
  const delta = state.dragStartX - getClientX(e);
  setScrollX(state.dragScrollX + delta);
}

function onDragEnd() {
  if (!state.isDragging) return;
  state.isDragging = false;
  dom.panoramicWrapper.classList.remove('is-dragging');
}

/* ===========================
   PROGRESS BAR — cliquable & draggable
   =========================== */
function setupProgressBar() {
  const track = dom.progressTrack;

  function seekFromEvent(e) {
    const rect = track.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setScrollX(ratio * state.maxScrollX);
  }

  track.addEventListener('mousedown', e => {
    state.progressDragging = true;
    seekFromEvent(e);
    e.stopPropagation();
  });
  track.addEventListener('touchstart', e => {
    state.progressDragging = true;
    seekFromEvent(e);
    e.stopPropagation();
  }, { passive: true });

  window.addEventListener('mousemove', e => {
    if (state.progressDragging) seekFromEvent(e);
  });
  window.addEventListener('touchmove', e => {
    if (state.progressDragging) seekFromEvent(e);
  }, { passive: true });

  window.addEventListener('mouseup', () => { state.progressDragging = false; });
  window.addEventListener('touchend', () => { state.progressDragging = false; });
}

/* ===========================
   EVENTS
   =========================== */
function setupModalToggle() {
  dom.modalToggleBtn.addEventListener('click', toggleModalContent);
}

function setupRetour() {
  dom.btnRetour.addEventListener('click', closeModal);
}

function setupQuit() {
  dom.btnQuit.addEventListener('click', () => {
    console.log('SCORM exit');
  });
}

function onResize() {
  computeScrollBounds();
  setScrollX(state.scrollX);
}

/* ===========================
   START
   =========================== */
document.addEventListener('DOMContentLoaded', () => {
  initPasswordGate();
  init();
});
