(()=>{
  const list = document.getElementById('stopwatchList');
  const addBtn = document.getElementById('addStopwatch');

  const stopwatches = [];
  let rafId = null;
  const STORAGE_KEY = 'multi-stopwatches-v1';

  const pad = (value, size = 2) => String(value).padStart(size, '0');

  const formatMs = (ms) => {
    const safe = Math.max(0, Math.floor(ms));
    const totalSeconds = Math.floor(safe / 1000);
    const seconds = totalSeconds % 60;
    const totalMinutes = Math.floor(totalSeconds / 60);
    const minutes = totalMinutes % 60;
    const hours = Math.floor(totalMinutes / 60);
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  const parseTimeString = (raw) => {
    if (!raw) return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;

    if (!/^\d+(?::\d+){0,2}$/.test(trimmed)) return null;

    const timeChunks = trimmed.split(':').map(Number);
    let hours = 0;
    let minutes = 0;
    let seconds = 0;

    if (timeChunks.length === 1) {
      seconds = timeChunks[0];
    } else if (timeChunks.length === 2) {
      minutes = timeChunks[0];
      seconds = timeChunks[1];
    } else if (timeChunks.length === 3) {
      hours = timeChunks[0];
      minutes = timeChunks[1];
      seconds = timeChunks[2];
    }

    if ([hours, minutes, seconds].some((value) => Number.isNaN(value))) return null;

    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    return totalSeconds * 1000;
  };

  const getElapsed = (sw) => {
    if (!sw.running) return sw.timeMs;
    return sw.timeMs + (performance.now() - sw.lastStart);
  };

  const saveState = () => {
    const payload = stopwatches.map((sw) => ({
      id: sw.id,
      name: sw.name || 'Untitled',
      timeMs: Math.max(0, Math.floor(getElapsed(sw))),
    }));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      // Ignore storage errors (quota/private mode).
    }
  };

  const loadState = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch (error) {
      return [];
    }
  };

  const updateRunningLoop = () => {
    const anyRunning = stopwatches.some((sw) => sw.running);
    if (anyRunning && rafId === null) {
      rafId = requestAnimationFrame(tick);
    }
    if (!anyRunning && rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  const tick = () => {
    stopwatches.forEach((sw) => updateDisplay(sw));
    if (stopwatches.some((sw) => sw.running)) {
      rafId = requestAnimationFrame(tick);
    } else {
      rafId = null;
    }
  };

  const updateDisplay = (sw) => {
    sw.timeEl.textContent = formatMs(getElapsed(sw));
    sw.statusEl.textContent = sw.running ? 'Running' : 'Paused';
    sw.statusEl.classList.toggle('running', sw.running);
    sw.toggleBtn.textContent = sw.running ? 'Pause' : 'Start';
    if (!document.activeElement || document.activeElement !== sw.timeInput) {
      sw.timeInput.placeholder = formatMs(getElapsed(sw));
    }
  };

  const applyTime = (sw) => {
    const parsed = parseTimeString(sw.timeInput.value);
    if (parsed === null) {
      sw.errorEl.textContent = 'Use formats like 90, 2:03, or 1:02:03.';
      return;
    }

    sw.timeMs = parsed;
    if (sw.running) {
      sw.lastStart = performance.now();
    }
    sw.errorEl.textContent = '';
    sw.timeInput.value = '';
    updateDisplay(sw);
    saveState();
  };

  const renderCard = (sw) => {
    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.id = sw.id;

    card.innerHTML = `
      <div class="card-top">
        <textarea class="name" rows="2" aria-label="Stopwatch name">${sw.name}</textarea>
        <span class="status">Paused</span>
      </div>
      <div class="time">00:00:00</div>
      <div class="controls">
        <button class="toggle" type="button">Start</button>
        <button class="reset" type="button">Reset</button>
        <button class="remove" type="button">Remove</button>
      </div>
      <div class="setter">
        <label>Set time</label>
        <div class="setter-row">
          <input class="time-input" type="text" placeholder="00:00:00" inputmode="numeric" />
          <button class="apply" type="button">Apply</button>
        </div>
        <p class="hint">Examples: 90, 2:03, 1:02:03</p>
        <p class="error"></p>
      </div>
    `;

    sw.el = card;
    sw.nameInput = card.querySelector('.name');
    sw.timeEl = card.querySelector('.time');
    sw.statusEl = card.querySelector('.status');
    sw.toggleBtn = card.querySelector('.toggle');
    sw.resetBtn = card.querySelector('.reset');
    sw.removeBtn = card.querySelector('.remove');
    sw.timeInput = card.querySelector('.time-input');
    sw.applyBtn = card.querySelector('.apply');
    sw.errorEl = card.querySelector('.error');

    sw.nameInput.addEventListener('input', (event) => {
      sw.name = event.target.value.trim() || 'Untitled';
      saveState();
    });

    sw.toggleBtn.addEventListener('click', () => {
      if (sw.running) {
        sw.timeMs = getElapsed(sw);
        sw.running = false;
        sw.lastStart = 0;
      } else {
        sw.running = true;
        sw.lastStart = performance.now();
      }
      updateDisplay(sw);
      updateRunningLoop();
      saveState();
    });

    sw.resetBtn.addEventListener('click', () => {
      sw.timeMs = 0;
      sw.errorEl.textContent = '';
      if (sw.running) {
        sw.lastStart = performance.now();
      }
      updateDisplay(sw);
      saveState();
    });

    sw.removeBtn.addEventListener('click', () => {
      const index = stopwatches.findIndex((item) => item.id === sw.id);
      if (index >= 0) stopwatches.splice(index, 1);
      card.remove();
      updateRunningLoop();
      saveState();
    });

    sw.applyBtn.addEventListener('click', () => applyTime(sw));
    sw.timeInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        applyTime(sw);
      }
    });
    sw.timeInput.addEventListener('focus', () => {
      sw.timeInput.value = formatMs(getElapsed(sw));
      sw.timeInput.select();
    });

    updateDisplay(sw);
    return card;
  };

  const createStopwatch = (presetMs = 0, options = {}) => {
    const id =
      options.id ?? (globalThis.crypto?.randomUUID?.() ?? `sw-${Date.now()}-${Math.random()}`);
    const name = options.name ?? `Stopwatch ${stopwatches.length + 1}`;
    let timeMs = Number.isFinite(options.timeMs) ? options.timeMs : presetMs;
    timeMs = Math.max(0, Math.floor(timeMs));

    const sw = {
      id,
      name,
      timeMs,
      running: false,
      lastStart: 0,
    };
    stopwatches.push(sw);
    list.prepend(renderCard(sw));
    updateRunningLoop();
    if (options.persist !== false) saveState();
  };

  addBtn.addEventListener('click', () => createStopwatch());

  const stored = loadState();
  if (stored.length) {
    stored.forEach((item) =>
      createStopwatch(0, {
        id: item.id,
        name: item.name,
        timeMs: item.timeMs,
        persist: false,
      })
    );
    saveState();
  } else {
    createStopwatch();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveState();
  });
  window.addEventListener('pagehide', saveState);
  window.addEventListener('beforeunload', saveState);
})();