// script.js
// Contact Form: debounced validation, localStorage persistence, event delegation for delete

// ---------- Config / constants ----------
const STORAGE_KEY = 'contact_messages_v1';
const DEBOUNCE_DELAY = 300; // ms for validation

// ---------- Helpers ----------
function debounce(fn, delay = DEBOUNCE_DELAY) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

function uid() {
  return Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36);
}

function escapeHtml(s = '') {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatDateISO(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(); // simple readable format
  } catch {
    return iso;
  }
}

// ---------- localStorage safe wrappers ----------
function loadMessages() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('Invalid format');
    return parsed;
  } catch (err) {
    console.error('Failed to load messages from localStorage:', err);
    // Graceful recovery: remove bad key and return empty array
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    return [];
  }
}

function saveMessages(messages) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    return true;
  } catch (err) {
    console.error('Failed to save messages to localStorage:', err);
    // Graceful fallback: inform user but keep app running
    // (You can also show a UI message instead of alert)
    alert('Warning: Could not save message locally (storage may be full or restricted).');
    return false;
  }
}

// ---------- Validation ----------
const validators = {
  name: v => v.trim().length >= 2 ? null : 'Name must be at least 2 characters.',
  email: v => /^\S+@\S+\.\S+$/.test(v) ? null : 'Enter a valid email address.',
  message: v => v.trim().length >= 10 ? null : 'Message must be at least 10 characters.'
};

function showFieldError(fieldEl, msg) {
  const errEl = document.getElementById(fieldEl.id + 'Error');
  if (msg) {
    errEl.textContent = msg;
    fieldEl.classList.add('input-error');
  } else {
    errEl.textContent = '';
    fieldEl.classList.remove('input-error');
  }
}

function validateFieldById(id) {
  const el = document.getElementById(id);
  if (!el || !validators[id]) return true;
  const msg = validators[id](el.value);
  showFieldError(el, msg);
  return !msg;
}

// ---------- Rendering ----------
function renderMessagesList() {
  const messagesList = document.getElementById('messagesList');
  const emptyState = document.getElementById('emptyState');

  const messages = loadMessages();
  messagesList.innerHTML = '';

  if (!messages.length) {
    emptyState.style.display = '';
    return;
  } else {
    emptyState.style.display = 'none';
  }

  // show newest first
  [...messages].reverse().forEach(msg => {
    const li = document.createElement('li');
    li.className = 'message-item';
    li.dataset.id = msg.id;

    li.innerHTML = `
      <div class="message-content">
        <strong>From: ${escapeHtml(msg.name)} (${escapeHtml(msg.email)})</strong>
        <div class="message-meta">Sent: ${formatDateISO(msg.createdAt)}</div>
        <p class="message-text">${escapeHtml(msg.message)}</p>
      </div>
      <div class="message-actions">
        <button type="button" class="delete-btn" data-id="${escapeHtml(msg.id)}" aria-label="Delete message">Delete</button>
      </div>
    `;

    messagesList.appendChild(li);
  });
}

// ---------- Initialization & event wiring ----------
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contactForm');
  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const messageInput = document.getElementById('message');
  const successEl = document.getElementById('formSuccess');
  const messagesList = document.getElementById('messagesList');

  // Render existing messages on load
  renderMessagesList();

  // --- Debounced input validation (use addEventListener)
  // Create a fresh debounced function per input so timers don't clash
  [nameInput, emailInput, messageInput].forEach(input => {
    input.addEventListener('input', debounce((e) => {
      validateFieldById(e.target.id);
    }, DEBOUNCE_DELAY));
  });

  // --- Form submit (prevent reload)
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // immediate validation of all fields (synchronous)
    const validName = validateFieldById('name');
    const validEmail = validateFieldById('email');
    const validMessage = validateFieldById('message');

    if (!validName || !validEmail || !validMessage) {
      // Focus first invalid field (nice UX)
      if (!validName) nameInput.focus();
      else if (!validEmail) emailInput.focus();
      else messageInput.focus();
      return;
    }

    const newMsg = {
      id: uid(),
      name: nameInput.value.trim(),
      email: emailInput.value.trim(),
      message: messageInput.value.trim(),
      createdAt: new Date().toISOString()
    };

    const msgs = loadMessages();
    msgs.push(newMsg);

    if (saveMessages(msgs)) {
      // success UI: show message briefly
      successEl.textContent = '✅ Message saved locally';
      successEl.hidden = false;
      setTimeout(() => {
        successEl.hidden = true;
      }, 2500);
    }

    // reset form (keeps placeholders)
    form.reset();

    // clear any shown errors
    showFieldError(nameInput, null);
    showFieldError(emailInput, null);
    showFieldError(messageInput, null);

    // re-render messages
    renderMessagesList();
  });

  // --- Delete messages (event delegation)
  // Single listener on parent container (messagesList)
  messagesList.addEventListener('click', (e) => {
    // Use closest to allow clicking inside button children etc.
    const btn = e.target.closest('.delete-btn');
    if (!btn) return;

    const idToDelete = btn.dataset.id;
    if (!idToDelete) return;

    let messages = loadMessages();
    const newMessages = messages.filter(m => String(m.id) !== String(idToDelete));

    if (saveMessages(newMessages)) {
      // re-render after deletion
      renderMessagesList();
    }
  });

  // Optionally: accessibility - clear success on focus of any field
  [nameInput, emailInput, messageInput].forEach(i => {
    i.addEventListener('focus', () => {
      successEl.hidden = true;
    });
  });

}); // DOMContentLoaded
