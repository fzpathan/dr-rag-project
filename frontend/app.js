'use strict';

const API = '/api/v1';

// ─── State ───────────────────────────────────────────────────
const state = {
    user: null,
    accessToken: null,
    refreshToken: null,
    currentView: 'query',
    history: [],
    saved: [],
    patients: [],
    pendingSave: null,
    isStreaming: false,
    settings: {
        show_voice: true,
        show_advanced_options: true,
        show_citations: true,
        show_history: true,
        show_saved_rubrics: true,
        show_processing_time: true,
        show_analysis: true,
        theme: 'default',
    },
};

const voice = {
    mediaRecorder: null,
    chunks: [],
    isRecording: false,
};

// ─── Storage (tokens only — history/saved now server-side) ───
const store = {
    save() {
        try {
            localStorage.setItem('cliniq_tokens', JSON.stringify({ access: state.accessToken, refresh: state.refreshToken }));
            localStorage.setItem('cliniq_user', JSON.stringify(state.user));
        } catch (e) { console.error('Storage save error:', e); }
    },
    load() {
        try {
            const tokens = JSON.parse(localStorage.getItem('cliniq_tokens') || 'null');
            if (tokens) { state.accessToken = tokens.access; state.refreshToken = tokens.refresh; }
            state.user = JSON.parse(localStorage.getItem('cliniq_user') || 'null');
        } catch (e) { console.error('Storage load error:', e); }
    },
    clear() {
        localStorage.removeItem('cliniq_tokens');
        localStorage.removeItem('cliniq_user');
        state.accessToken = null;
        state.refreshToken = null;
        state.user = null;
    }
};

// ─── API Layer ────────────────────────────────────────────────
let isRefreshing = false;
let refreshWaiters = [];

async function doTokenRefresh() {
    const res = await fetch(`${API}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: state.refreshToken }),
    });
    if (!res.ok) throw new Error('Refresh failed');
    const data = await res.json();
    state.accessToken = data.access_token;
    state.refreshToken = data.refresh_token;
    store.save();
}

async function apiRequest(method, path, body = null, isRetry = false) {
    const headers = { 'Content-Type': 'application/json' };
    if (state.accessToken) headers['Authorization'] = `Bearer ${state.accessToken}`;

    const res = await fetch(`${API}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null,
    });

    if (res.status === 401 && !isRetry && state.refreshToken) {
        if (!isRefreshing) {
            isRefreshing = true;
            try {
                await doTokenRefresh();
                isRefreshing = false;
                refreshWaiters.forEach(fn => fn());
                refreshWaiters = [];
            } catch {
                isRefreshing = false;
                refreshWaiters = [];
                doLogout();
                throw new Error('Session expired. Please log in again.');
            }
        } else {
            await new Promise(resolve => refreshWaiters.push(resolve));
        }
        return apiRequest(method, path, body, true);
    }

    if (!res.ok) {
        let msg = `Request failed (${res.status})`;
        try { const j = await res.json(); msg = j.detail || j.message || msg; } catch {}
        throw new Error(msg);
    }

    if (res.status === 204) return null;
    return res.json();
}

async function apiQueryStream(question, topK, onCitations, onToken, onDone, onHistoryId, onError) {
    const headers = { 'Content-Type': 'application/json' };
    if (state.accessToken) headers['Authorization'] = `Bearer ${state.accessToken}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120_000);

    try {
        const res = await fetch(`${API}/query/stream`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ question, top_k: topK }),
            signal: controller.signal,
        });

        if (!res.ok) {
            let msg = `Request failed (${res.status})`;
            try { const j = await res.json(); msg = j.detail || msg; } catch {}
            onError(msg); return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();
            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                try {
                    const data = JSON.parse(line.slice(6));
                    if (data.type === 'citations') onCitations(data.citations || []);
                    else if (data.type === 'token') onToken(data.content || '');
                    else if (data.type === 'done') onDone(data);
                    else if (data.type === 'history_id') onHistoryId(data.id);
                } catch {}
            }
        }
    } catch (e) {
        if (e.name === 'AbortError') {
            onError('Request timed out. Please try again.');
        } else {
            onError(e.message);
        }
    } finally {
        clearTimeout(timeoutId);
    }
}

// ─── Auth ─────────────────────────────────────────────────────
async function initApp() {
    store.load();
    if (state.accessToken) {
        try {
            state.user = await apiRequest('GET', '/auth/me');
            store.save();
            showApp();
        } catch {
            doLogout();
        }
    } else {
        showAuth('login');
    }
}

function showAuth(form) {
    document.getElementById('app-screen').classList.add('hidden');
    document.getElementById('auth-screen').classList.remove('hidden');
    const modal = document.getElementById('auth-modal');
    modal.classList.remove('hidden');
    renderAuthCard(form);
    // Close modal handlers
    document.getElementById('ln-auth-close').onclick = closeLandingModal;
    document.getElementById('ln-auth-backdrop').onclick = closeLandingModal;
    // Mobile menu toggle
    document.getElementById('ln-hamburger').onclick = () => {
        document.getElementById('ln-mobile-menu').classList.toggle('hidden');
    };
    // Close mobile menu nav links
    ['ln-mob-feat','ln-mob-how'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.onclick = () => document.getElementById('ln-mobile-menu').classList.add('hidden');
    });
}

function closeLandingModal() {
    document.getElementById('auth-modal').classList.add('hidden');
}

async function showApp() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('auth-modal').classList.add('hidden');
    document.getElementById('app-screen').classList.remove('hidden');
    updateSidebarUser();
    await loadAndApplySettings();
    // Load persistent data from server
    try { state.history = await apiRequest('GET', '/history'); } catch { state.history = []; }
    try { state.saved = await apiRequest('GET', '/saved'); } catch { state.saved = []; }
    try { state.patients = await apiRequest('GET', '/patients'); } catch { state.patients = []; }
    setupAppEvents();
    navigate('query');
}

function doLogout() {
    store.clear();
    state.history = [];
    state.saved = [];
    state.patients = [];
    showAuth('login');
}

async function loadAndApplySettings() {
    try {
        const s = await apiRequest('GET', '/admin/my-settings');
        if (s) state.settings = { ...state.settings, ...s };
    } catch {}
    applySettings();
}

function applySettings() {
    const s = state.settings;
    // Theme
    document.body.className = s.theme && s.theme !== 'default' ? `theme-${s.theme}` : '';
    // Show/hide nav items
    document.querySelectorAll('.nav-btn[data-view="history"]').forEach(el =>
        el.classList.toggle('hidden', !s.show_history));
    document.querySelectorAll('.nav-btn[data-view="saved"]').forEach(el =>
        el.classList.toggle('hidden', !s.show_saved_rubrics));
    // Show admin nav for admins
    document.querySelectorAll('.admin-only').forEach(el =>
        el.classList.toggle('hidden', !state.user?.is_admin));
    // Show/hide voice controls
    document.querySelectorAll('.voice-controls').forEach(el =>
        el.classList.toggle('hidden', !s.show_voice));
}

function updateSidebarUser() {
    if (!state.user) return;
    const name = state.user.full_name || state.user.email || 'User';
    document.getElementById('sidebar-user-name').textContent = name;
    document.getElementById('user-avatar').textContent = name[0].toUpperCase();
}

// ─── App Events ───────────────────────────────────────────────
function setupAppEvents() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => navigate(btn.dataset.view));
    });
    document.getElementById('logout-btn').addEventListener('click', doLogout);
}

// ─── Router ───────────────────────────────────────────────────
function navigate(view) {
    state.currentView = view;
    document.querySelectorAll('.nav-btn').forEach(btn =>
        btn.classList.toggle('active', btn.dataset.view === view)
    );
    const container = document.getElementById('main-content');
    switch (view) {
        case 'query':    container.innerHTML = renderQueryView();    setupQueryEvents();    break;
        case 'history':  container.innerHTML = renderHistoryView();  setupHistoryEvents();  break;
        case 'saved':    container.innerHTML = renderSavedView();    setupSavedEvents();    break;
        case 'patients': container.innerHTML = renderPatientsView(); setupPatientsEvents(); break;
        case 'admin':    container.innerHTML = renderAdminView();    setupAdminEvents();    break;
    }
}

// ─── Query View ───────────────────────────────────────────────
function renderQueryView() {
    return `
    <div class="view-header">
        <h2>Remedy Query</h2>
        <p>Describe the patient's symptoms to find matching homeopathic remedies</p>
    </div>
    <div class="card">
        <div class="textarea-label-row">
            <label for="symptom-input">Patient Symptoms</label>
            <div class="voice-controls">
                <select id="voice-lang" class="voice-lang-select" title="Voice input language">
                    <option value="auto">Auto-detect</option>
                    <option value="hi">Hindi</option>
                    <option value="mr">Marathi</option>
                    <option value="en">English</option>
                </select>
                <button class="btn-mic" id="btn-mic" title="Record voice input (translated to English)">
                    <svg id="mic-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                </button>
            </div>
        </div>
        <textarea id="symptom-input" class="symptom-textarea"
            placeholder="Describe the patient's symptoms in detail. Include mental/emotional state, physical complaints, modalities (what makes it better or worse), time of onset, etc.&#10;&#10;Example: Patient is anxious, restless, very chilly, thirsty for small sips of water, worse at midnight, better with warmth.&#10;&#10;Or use the mic button to speak in Hindi / Marathi — text will be automatically translated to English."></textarea>
        <div>
            <span class="options-toggle" id="options-toggle" ${!state.settings.show_advanced_options ? 'style="display:none"' : ''}>⚙ Advanced options</span>
            <div class="options-panel" id="options-panel">
                <div class="option-group">
                    <label>Results per source (top_k)</label>
                    <input type="number" id="top-k" value="3" min="1" max="20">
                </div>
            </div>
        </div>
        <div class="query-actions">
            <button class="btn-submit" id="btn-submit">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                Analyse Symptoms
            </button>
        </div>
    </div>
    <details class="tips-panel" id="tips-panel">
        <summary class="tips-summary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Tips for better results
            <svg class="tips-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </summary>
        <div class="tips-body">
            <div class="tips-grid">
                <div class="tip-item">
                    <div class="tip-icon">🎯</div>
                    <div>
                        <div class="tip-title">Lead with the peculiar</div>
                        <div class="tip-text">Strange, rare, or striking symptoms carry the most weight — "worse at exactly 3 am" or "craves ice-cold water despite being chilly" pinpoints faster than common complaints.</div>
                    </div>
                </div>
                <div class="tip-item">
                    <div class="tip-icon">📍</div>
                    <div>
                        <div class="tip-title">Be specific about location & sensation</div>
                        <div class="tip-text">Describe where exactly (right side, inner corner, descending) and what it feels like (burning, stitching, pressing, bursting). "Headache" is vague; "splitting pain over left eye, worse stooping" is actionable.</div>
                    </div>
                </div>
                <div class="tip-item">
                    <div class="tip-icon">⬆️⬇️</div>
                    <div>
                        <div class="tip-title">Include all modalities</div>
                        <div class="tip-text">What makes each symptom better or worse? Heat, cold, motion, rest, pressure, lying down, time of day, weather, eating, emotions — every modality narrows the differential significantly.</div>
                    </div>
                </div>
                <div class="tip-item">
                    <div class="tip-icon">🧠</div>
                    <div>
                        <div class="tip-title">Mental & emotional state first</div>
                        <div class="tip-text">In homeopathy, mental symptoms often outweigh physical ones. Describe the patient's mood, fears, disposition, and any change in behavior since the illness — even if they seem unrelated.</div>
                    </div>
                </div>
                <div class="tip-item">
                    <div class="tip-icon">🕐</div>
                    <div>
                        <div class="tip-title">Mention timing precisely</div>
                        <div class="tip-text">Note onset, duration, and periodicity. "Worse at midnight", "every other day", "returns each winter" — time modalities are often decisive rubrics in repertorization.</div>
                    </div>
                </div>
                <div class="tip-item">
                    <div class="tip-icon">👁️</div>
                    <div>
                        <div class="tip-title">Observe body language & appearance</div>
                        <div class="tip-text">The AI cross-references a body language repertory. Posture, gestures, eye contact, facial expression, and clothing style can confirm or differentiate remedies — describe what you observe.</div>
                    </div>
                </div>
                <div class="tip-item">
                    <div class="tip-icon">🌡️</div>
                    <div>
                        <div class="tip-title">Note constitution & thermals</div>
                        <div class="tip-text">Is the patient hot or chilly? Thirsty or thirstless? Sweating pattern, food cravings/aversions, body build, and dominant miasm give the AI strong constitutional context.</div>
                    </div>
                </div>
                <div class="tip-item">
                    <div class="tip-icon">🎤</div>
                    <div>
                        <div class="tip-title">Voice input in Hindi / Marathi</div>
                        <div class="tip-text">Use the mic button to dictate the case as the patient speaks — the AI transcribes and translates automatically. Select the language in the dropdown before recording.</div>
                    </div>
                </div>
            </div>
        </div>
    </details>
    <div id="response-area"></div>`;
}

function setupQueryEvents() {
    document.getElementById('options-toggle').addEventListener('click', () =>
        document.getElementById('options-panel').classList.toggle('open')
    );
    document.getElementById('btn-submit').addEventListener('click', submitQuery);
    document.getElementById('symptom-input').addEventListener('keydown', e => {
        if (e.key === 'Enter' && e.ctrlKey) submitQuery();
    });
    // Auto-open tips on first visit; collapse once user starts typing
    const tips = document.getElementById('tips-panel');
    if (tips) {
        tips.open = true;
        document.getElementById('symptom-input').addEventListener('input', () => {
            tips.open = false;
        }, { once: true });
    }
    setupVoiceEvents();
}

function setupVoiceEvents() {
    const btn = document.getElementById('btn-mic');
    if (!btn) return;

    if (!navigator.mediaDevices || !window.MediaRecorder) {
        btn.disabled = true;
        btn.title = 'Voice input not supported in this browser';
        return;
    }

    btn.addEventListener('click', () => {
        if (voice.isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    });
}

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        voice.chunks = [];
        voice.mediaRecorder = new MediaRecorder(stream);
        voice.isRecording = true;

        voice.mediaRecorder.ondataavailable = e => {
            if (e.data.size > 0) voice.chunks.push(e.data);
        };

        voice.mediaRecorder.onstop = async () => {
            stream.getTracks().forEach(t => t.stop());
            const blob = new Blob(voice.chunks, { type: 'audio/webm' });
            voice.chunks = [];
            await sendAudioForTranscription(blob);
        };

        voice.mediaRecorder.start();
        setMicRecording(true);
        showToast('Recording… click mic again to stop.', 'info');
    } catch (e) {
        const name = e.name || '';
        if (name === 'NotAllowedError') {
            showToast('Mic blocked — allow microphone in browser AND Windows Settings → Privacy → Microphone.', 'error');
        } else if (name === 'NotFoundError') {
            showToast('No microphone found on this device.', 'error');
        } else if (name === 'NotReadableError') {
            showToast('Microphone is in use by another app. Close it and try again.', 'error');
        } else {
            showToast(`Mic error: ${e.name} — ${e.message}`, 'error');
        }
    }
}

function stopRecording() {
    if (voice.mediaRecorder && voice.isRecording) {
        voice.mediaRecorder.stop();
        voice.isRecording = false;
        setMicRecording(false);
    }
}

function setMicRecording(on) {
    const btn = document.getElementById('btn-mic');
    if (!btn) return;
    if (on) {
        btn.classList.add('recording');
        btn.title = 'Recording… click to stop';
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>`;
    } else {
        btn.classList.remove('recording');
        btn.title = 'Record voice input (translated to English)';
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`;
    }
}

async function sendAudioForTranscription(blob) {
    const btn = document.getElementById('btn-mic');
    const lang = document.getElementById('voice-lang')?.value || 'auto';

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<div class="loading-pulse" style="scale:.7"><span></span><span></span><span></span></div>`;
    }

    try {
        const formData = new FormData();
        formData.append('file', blob, 'recording.webm');
        formData.append('language', lang);

        const headers = {};
        if (state.accessToken) headers['Authorization'] = `Bearer ${state.accessToken}`;

        const res = await fetch(`${API}/voice/transcribe`, {
            method: 'POST',
            headers,
            body: formData,
        });

        if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            throw new Error(j.detail || `Transcription failed (${res.status})`);
        }

        const data = await res.json();
        const textarea = document.getElementById('symptom-input');
        if (textarea && data.text) {
            textarea.value = (textarea.value ? textarea.value + ' ' : '') + data.text;
            textarea.focus();
            const langLabel = data.detected_language ? ` (detected: ${data.detected_language})` : '';
            showToast(`Transcribed${langLabel}`, 'success');
        }
    } catch (e) {
        showToast(e.message, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            setMicRecording(false);
        }
    }
}

async function submitQuery() {
    const question = document.getElementById('symptom-input').value.trim();
    if (!question) { showToast('Please enter symptoms first.', 'error'); return; }
    if (state.isStreaming) return;

    const topK = parseInt(document.getElementById('top-k').value) || 3;
    const btn = document.getElementById('btn-submit');
    const responseArea = document.getElementById('response-area');

    state.isStreaming = true;
    btn.disabled = true;
    btn.innerHTML = `<div class="loading-pulse"><span></span><span></span><span></span></div>&nbsp;Analysing…`;

    responseArea.innerHTML = `
    <div class="card" id="active-response">
        <div class="response-header">
            <h3>Repertorization</h3>
            <div class="response-meta" id="response-meta"></div>
        </div>
        <div class="md" id="response-body">
            <div class="loading-pulse"><span></span><span></span><span></span></div>
        </div>
    </div>`;

    let fullText = '';
    let citations = [];

    let entry = null;

    await apiQueryStream(
        question, topK,
        (c) => { citations = c; },
        (token) => {
            fullText += token;
            const body = document.getElementById('response-body');
            if (body) body.innerHTML = marked.parse(getDisplayText(fullText));
        },
        (data) => {
            const meta = document.getElementById('response-meta');
            if (meta) meta.innerHTML = `
                ${data.cached ? '<span class="badge badge-cached">Cached</span>' : ''}
                <span class="badge badge-time">${data.processing_time_ms}ms</span>`;

            entry = {
                id: String(Date.now()),  // temporary; replaced by history_id event
                question, answer: fullText, citations,
                sources_used: data.sources_used || [],
                processing_time_ms: data.processing_time_ms,
                cached: data.cached,
                created_at: new Date().toISOString(),
            };
            // History is auto-saved server-side by the stream endpoint.
            // Just keep local state in sync for the current session.
            state.history.unshift(entry);
            if (state.history.length > 50) state.history.pop();

            const card = document.getElementById('active-response');
            if (card) {
                card.insertAdjacentHTML('beforeend', `
                    <div class="response-actions">
                        <button class="btn-secondary btn-save" id="btn-save-response">🔖 Save as Rubric</button>
                        <button class="btn-secondary btn-assign" id="btn-assign-response">👤 Assign to Patient</button>
                    </div>`);
                document.getElementById('btn-save-response').addEventListener('click', () => showSaveModal(entry));
                document.getElementById('btn-assign-response').addEventListener('click', () => showAssignModal(entry));
            }

            if (citations.length > 0 && state.settings.show_citations) {
                responseArea.insertAdjacentHTML('beforeend', renderCitationsCard(citations));
                setupCitationToggles(responseArea);
            }

            // Hide processing time badge if disabled
            if (!state.settings.show_processing_time) {
                document.querySelector('.badge-time')?.remove();
            }

            finishStreaming(btn);
        },
        (id) => {
            // Patch entry with the real DB id once the server confirms the save
            if (entry) {
                entry.id = id;
                const h = state.history.find(h => h === entry);
                if (h) h.id = id;
            }
        },
        (err) => {
            const body = document.getElementById('response-body');
            if (body) body.innerHTML = `<p style="color:var(--error)">⚠ ${esc(err)}</p>`;
            finishStreaming(btn);
        }
    );
}

function finishStreaming(btn) {
    state.isStreaming = false;
    btn.disabled = false;
    btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> Analyse Symptoms`;
}

function renderCitationsCard(citations) {
    return `
    <div class="card">
        <div class="citations-title">📚 Source Citations (${citations.length})</div>
        ${citations.map((c, i) => `
        <div class="citation-item">
            <div class="citation-header" data-idx="${i}">
                <span class="citation-source">${esc(c.source)}</span>
                ${c.page ? `<span class="citation-page">p. ${c.page}</span>` : ''}
            </div>
            <div class="citation-excerpt" id="cit-${i}">${esc(c.excerpt)}</div>
        </div>`).join('')}
    </div>`;
}

function setupCitationToggles(container) {
    container.querySelectorAll('.citation-header').forEach(h =>
        h.addEventListener('click', () =>
            document.getElementById(`cit-${h.dataset.idx}`).classList.toggle('open')
        )
    );
}

// ─── History View ─────────────────────────────────────────────
function renderHistoryView() {
    if (!state.history.length) return `
        <div class="view-header"><h2>History</h2><p>Your recent queries</p></div>
        <div class="empty-state"><div class="empty-icon">📋</div><p>No queries yet. Submit a symptom query to get started.</p></div>`;

    return `
    <div class="view-header"><h2>History</h2><p>${state.history.length} recent queries</p></div>
    ${state.history.map((item, i) => `
    <div class="list-item">
        <div class="list-item-header" data-idx="${i}">
            <div>
                <div class="list-item-title">${esc(truncate(item.question, 100))}</div>
                ${item.cached ? '<div class="list-item-subtitle">⚡ Cached response</div>' : ''}
            </div>
            <div class="list-item-date">${fmtDate(item.created_at)}</div>
        </div>
        <div class="list-item-body" id="hist-${i}">
            <div class="md">${marked.parse(getDisplayText(item.answer))}</div>
            <div class="list-item-actions">
                <button class="btn-secondary btn-save" data-idx="${i}">🔖 Save as Rubric</button>
                <button class="btn-secondary btn-assign" data-idx="${i}">👤 Assign to Patient</button>
                ${item.citations && item.citations.length && state.settings.show_citations
                    ? `<button class="btn-secondary btn-show-cit" data-idx="${i}">📚 Citations (${item.citations.length})</button>`
                    : ''}
                <button class="btn-secondary btn-delete-hist" data-idx="${i}" style="color:#c0392b;">🗑 Delete</button>
            </div>
            <div id="hist-cit-${i}"></div>
        </div>
    </div>`).join('')}`;
}

function setupHistoryEvents() {
    document.querySelectorAll('#main-content .list-item-header').forEach(h =>
        h.addEventListener('click', () =>
            document.getElementById(`hist-${h.dataset.idx}`).classList.toggle('open')
        )
    );
    document.querySelectorAll('#main-content .btn-save').forEach(btn =>
        btn.addEventListener('click', e => {
            e.stopPropagation();
            showSaveModal(state.history[btn.dataset.idx]);
        })
    );
    document.querySelectorAll('#main-content .btn-assign').forEach(btn =>
        btn.addEventListener('click', e => {
            e.stopPropagation();
            showAssignModal(state.history[btn.dataset.idx]);
        })
    );
    document.querySelectorAll('.btn-show-cit').forEach(btn =>
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const idx = btn.dataset.idx;
            const container = document.getElementById(`hist-cit-${idx}`);
            if (container.innerHTML) { container.innerHTML = ''; return; }
            container.innerHTML = renderCitationsCard(state.history[idx].citations);
            setupCitationToggles(container);
        })
    );
    document.querySelectorAll('.btn-delete-hist').forEach(btn =>
        btn.addEventListener('click', async e => {
            e.stopPropagation();
            if (!confirm('Delete this query from history?')) return;
            const item = state.history[Number(btn.dataset.idx)];
            try { await apiRequest('DELETE', `/history/${item.id}`); } catch {}
            state.history = state.history.filter(h => h.id !== item.id);
            navigate('history');
        })
    );
}

// ─── Saved View ───────────────────────────────────────────────
function renderSavedView() {
    if (!state.saved.length) return `
        <div class="view-header"><h2>Saved Rubrics</h2><p>Your bookmarked responses</p></div>
        <div class="empty-state"><div class="empty-icon">🔖</div><p>No saved rubrics yet. Save a response to access it here.</p></div>`;

    return `
    <div class="view-header"><h2>Saved Rubrics</h2><p>${state.saved.length} saved</p></div>
    ${state.saved.map((item, i) => `
    <div class="list-item">
        <div class="list-item-header" data-idx="${i}">
            <div>
                <div class="list-item-title" style="color:var(--primary)">${esc(item.name)}</div>
                <div class="list-item-subtitle">${esc(truncate(item.question, 80))}</div>
            </div>
            <div class="list-item-date">${fmtDate(item.created_at || item.saved_at)}</div>
        </div>
        <div class="list-item-body" id="saved-${i}">
            <div class="md">${marked.parse(getDisplayText(item.answer))}</div>
            ${item.citations && item.citations.length && state.settings.show_citations
                ? `<div style="margin-top:.75rem">${renderCitationsCard(item.citations)}</div>`
                : ''}
            <div class="list-item-actions">
                <button class="btn-secondary btn-danger btn-del-saved" data-idx="${i}">🗑 Delete</button>
            </div>
        </div>
    </div>`).join('')}`;
}

function setupSavedEvents() {
    document.querySelectorAll('#main-content .list-item-header').forEach(h =>
        h.addEventListener('click', () => {
            const body = document.getElementById(`saved-${h.dataset.idx}`);
            body.classList.toggle('open');
            if (body.classList.contains('open')) setupCitationToggles(body);
        })
    );
    document.querySelectorAll('.btn-del-saved').forEach(btn =>
        btn.addEventListener('click', async e => {
            e.stopPropagation();
            const item = state.saved[parseInt(btn.dataset.idx)];
            try { await apiRequest('DELETE', `/saved/${item.id}`); } catch {}
            state.saved = state.saved.filter(s => s.id !== item.id);
            showToast('Rubric deleted.', 'info');
            navigate('saved');
        })
    );
}

// ─── Save Modal ───────────────────────────────────────────────
function showSaveModal(entry) {
    state.pendingSave = entry;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'save-modal';
    overlay.innerHTML = `
    <div class="modal">
        <h3>🔖 Save as Rubric</h3>
        <div class="form-group">
            <label>Rubric Name</label>
            <input type="text" id="rubric-name" class="modal-input"
                placeholder="e.g. Anxiety + restlessness + midnight aggravation"
                value="${esc(truncate(entry.question, 60))}">
        </div>
        <div class="modal-actions">
            <button class="btn-cancel" id="modal-cancel">Cancel</button>
            <button class="btn-confirm" id="modal-confirm">Save</button>
        </div>
    </div>`;
    document.body.appendChild(overlay);
    const input = document.getElementById('rubric-name');
    input.focus(); input.select();
    document.getElementById('modal-cancel').addEventListener('click', closeModal);
    document.getElementById('modal-confirm').addEventListener('click', confirmSave);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
    input.addEventListener('keydown', e => { if (e.key === 'Enter') confirmSave(); });
}

function closeModal() {
    document.getElementById('save-modal')?.remove();
}

// ─── Assign Query to Patient ──────────────────────────────────
function showAssignModal(entry) {
    document.getElementById('assign-modal')?.remove();
    const patients = state.patients || [];
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'assign-modal';
    overlay.innerHTML = `
    <div class="modal">
        <h3>👤 Assign to Patient</h3>
        <p class="modal-desc">Link this query to a patient record so it appears in their case history.</p>
        ${patients.length === 0
            ? `<p class="modal-empty">No patients yet. <a class="modal-link" onclick="closeAssignModal();navigate('patients')">Add a patient first →</a></p>`
            : `<div class="form-group">
                <input type="text" id="assign-search" class="modal-input" placeholder="Search patient by name…" autocomplete="off">
               </div>
               <div class="assign-patient-list" id="assign-patient-list">
                 ${patients.map(p => `
                   <div class="assign-patient-item" data-patient-id="${p.id}">
                     <div class="assign-patient-avatar">${esc(p.name.charAt(0).toUpperCase())}</div>
                     <div class="assign-patient-info">
                       <div class="assign-patient-name">${esc(p.name)}</div>
                       ${p.date_of_birth ? `<div class="assign-patient-meta">DOB: ${esc(p.date_of_birth)}</div>` : ''}
                     </div>
                     <svg class="assign-check hidden" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                   </div>`).join('')}
               </div>`}
        <div class="modal-actions">
            <button class="btn-cancel" id="assign-cancel">Cancel</button>
            <button class="btn-confirm" id="assign-confirm" disabled>Assign</button>
        </div>
    </div>`;
    document.body.appendChild(overlay);

    let selectedPatientId = null;

    // Search filter
    document.getElementById('assign-search')?.addEventListener('input', e => {
        const q = e.target.value.toLowerCase();
        document.querySelectorAll('.assign-patient-item').forEach(el => {
            el.style.display = el.querySelector('.assign-patient-name').textContent.toLowerCase().includes(q) ? '' : 'none';
        });
    });

    // Patient selection
    document.querySelectorAll('.assign-patient-item').forEach(el => {
        el.addEventListener('click', () => {
            document.querySelectorAll('.assign-patient-item').forEach(x => {
                x.classList.remove('selected');
                x.querySelector('.assign-check').classList.add('hidden');
            });
            el.classList.add('selected');
            el.querySelector('.assign-check').classList.remove('hidden');
            selectedPatientId = el.dataset.patientId;
            document.getElementById('assign-confirm').disabled = false;
        });
    });

    document.getElementById('assign-cancel').addEventListener('click', closeAssignModal);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeAssignModal(); });

    document.getElementById('assign-confirm')?.addEventListener('click', async () => {
        if (!selectedPatientId) return;
        const btn = document.getElementById('assign-confirm');
        btn.disabled = true;
        btn.textContent = 'Assigning…';
        try {
            await apiRequest('POST', `/patients/${selectedPatientId}/queries`, {
                query_history_id: entry.id,
            });
            const patient = state.patients.find(p => p.id === selectedPatientId);
            closeAssignModal();
            showToast(`Query assigned to ${patient?.name || 'patient'}.`, 'success');
        } catch (e) {
            showToast(`Failed to assign: ${e.message}`, 'error');
            btn.disabled = false;
            btn.textContent = 'Assign';
        }
    });
}

function closeAssignModal() {
    document.getElementById('assign-modal')?.remove();
}

async function confirmSave() {
    const name = document.getElementById('rubric-name').value.trim();
    if (!name) { showToast('Please enter a name.', 'error'); return; }
    try {
        const saved = await apiRequest('POST', '/saved', {
            name,
            question: state.pendingSave.question,
            answer: state.pendingSave.answer,
            citations: state.pendingSave.citations || [],
        });
        state.saved.unshift(saved);
        closeModal();
        showToast('Rubric saved!', 'success');
    } catch (e) {
        showToast(`Save failed: ${e.message}`, 'error');
    }
}

// ─── Patients View ────────────────────────────────────────────
function renderPatientsView() {
    const patients = state.patients || [];
    return `
    <div class="view-header">
        <div><h2>Patients</h2><p>${patients.length} patient${patients.length !== 1 ? 's' : ''}</p></div>
        <button class="btn-primary" id="btn-new-patient">+ New Patient</button>
    </div>
    <input type="text" id="patient-search" class="modal-input" placeholder="Search by name…" style="margin-bottom:12px">
    <div id="patient-list">
    ${patients.length === 0
        ? `<div class="empty-state"><div class="empty-icon">👤</div><p>No patients yet. Add your first patient.</p></div>`
        : patients.map((p, i) => `
        <div class="list-item" style="cursor:pointer">
            <div class="list-item-header" data-patient-idx="${i}">
                <div>
                    <div class="list-item-title">${esc(p.name)}</div>
                    <div class="list-item-subtitle">${[p.gender, p.date_of_birth].filter(Boolean).join(' · ')}</div>
                </div>
                <div class="list-item-actions" style="flex-direction:row;gap:8px;align-items:center">
                    <button class="btn-secondary btn-view-patient" data-patient-id="${p.id}" data-patient-idx="${i}">View</button>
                    <button class="btn-secondary btn-danger btn-del-patient" data-patient-id="${p.id}" data-patient-idx="${i}">🗑</button>
                </div>
            </div>
        </div>`).join('')}
    </div>

    <!-- Patient detail modal -->
    <div id="patient-detail" class="hidden" style="margin-top:16px"></div>

    <!-- Patient form modal -->
    <div id="patient-form-modal" class="hidden" style="
        position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:1000">
        <div class="modal-card" style="width:100%;max-width:480px;padding:24px">
            <h3 id="patient-form-title">New Patient</h3>
            <input type="hidden" id="pf-id">
            <div class="form-group"><label>Full Name *</label><input type="text" id="pf-name" class="modal-input" placeholder="Patient name"></div>
            <div class="form-group"><label>Date of Birth</label><input type="date" id="pf-dob" class="modal-input"></div>
            <div class="form-group"><label>Gender</label>
                <select id="pf-gender" class="modal-input">
                    <option value="">— select —</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                </select>
            </div>
            <div class="form-group"><label>Contact</label><input type="text" id="pf-contact" class="modal-input" placeholder="Phone or email"></div>
            <div class="form-group"><label>Notes</label><textarea id="pf-notes" class="modal-input" rows="3" placeholder="Chief complaint, constitutional notes…"></textarea></div>
            <div class="modal-actions">
                <button class="btn-cancel" id="pf-cancel">Cancel</button>
                <button class="btn-confirm" id="pf-save">Save Patient</button>
            </div>
        </div>
    </div>`;
}

function setupPatientsEvents() {
    // New patient button
    document.getElementById('btn-new-patient')?.addEventListener('click', () => openPatientForm(null));

    // Search
    document.getElementById('patient-search')?.addEventListener('input', e => {
        const q = e.target.value.toLowerCase();
        document.querySelectorAll('#patient-list .list-item').forEach(el => {
            const name = el.querySelector('.list-item-title')?.textContent?.toLowerCase() || '';
            el.style.display = name.includes(q) ? '' : 'none';
        });
    });

    // View patient queries
    document.querySelectorAll('.btn-view-patient').forEach(btn =>
        btn.addEventListener('click', async e => {
            e.stopPropagation();
            const id = btn.dataset.patientId;
            const idx = btn.dataset.patientIdx;
            const p = state.patients[idx];
            try {
                const queries = await apiRequest('GET', `/patients/${id}/queries`);
                document.getElementById('patient-detail').classList.remove('hidden');
                document.getElementById('patient-detail').innerHTML = `
                    <div class="view-header" style="margin-top:0">
                        <h3>${esc(p.name)} — Query History</h3>
                        <button class="btn-secondary btn-edit-patient" data-patient-idx="${idx}">✏️ Edit</button>
                    </div>
                    ${queries.length === 0
                        ? '<p style="color:var(--text-secondary)">No queries linked to this patient yet.</p>'
                        : queries.map(q => `
                        <div class="list-item" style="margin-bottom:8px">
                            <div class="list-item-header">
                                <div class="list-item-title">${esc(truncate(q.question, 80))}</div>
                                <div class="list-item-date">${fmtDate(q.created_at)}</div>
                            </div>
                        </div>`).join('')}`;
                document.querySelector('.btn-edit-patient')?.addEventListener('click', () => openPatientForm(state.patients[idx]));
            } catch { showToast('Failed to load patient queries.', 'error'); }
        })
    );

    // Delete patient
    document.querySelectorAll('.btn-del-patient').forEach(btn =>
        btn.addEventListener('click', async e => {
            e.stopPropagation();
            if (!confirm('Delete this patient and all linked data?')) return;
            try {
                await apiRequest('DELETE', `/patients/${btn.dataset.patientId}`);
                state.patients = state.patients.filter(p => p.id !== btn.dataset.patientId);
                navigate('patients');
                showToast('Patient deleted.', 'info');
            } catch { showToast('Failed to delete patient.', 'error'); }
        })
    );

    // Patient form
    document.getElementById('pf-cancel')?.addEventListener('click', () =>
        document.getElementById('patient-form-modal').classList.add('hidden'));
    document.getElementById('pf-save')?.addEventListener('click', savePatientForm);
}

function openPatientForm(patient) {
    const modal = document.getElementById('patient-form-modal');
    document.getElementById('patient-form-title').textContent = patient ? 'Edit Patient' : 'New Patient';
    document.getElementById('pf-id').value = patient?.id || '';
    document.getElementById('pf-name').value = patient?.name || '';
    document.getElementById('pf-dob').value = patient?.date_of_birth || '';
    document.getElementById('pf-gender').value = patient?.gender || '';
    document.getElementById('pf-contact').value = patient?.contact || '';
    document.getElementById('pf-notes').value = patient?.notes || '';
    modal.classList.remove('hidden');
}

async function savePatientForm() {
    const name = document.getElementById('pf-name').value.trim();
    if (!name) { showToast('Name is required.', 'error'); return; }
    const id = document.getElementById('pf-id').value;
    const body = {
        name,
        date_of_birth: document.getElementById('pf-dob').value || null,
        gender: document.getElementById('pf-gender').value || null,
        contact: document.getElementById('pf-contact').value.trim() || null,
        notes: document.getElementById('pf-notes').value.trim() || null,
    };
    try {
        if (id) {
            const updated = await apiRequest('PUT', `/patients/${id}`, body);
            const idx = state.patients.findIndex(p => p.id === id);
            if (idx >= 0) state.patients[idx] = updated;
        } else {
            const created = await apiRequest('POST', '/patients', body);
            state.patients.unshift(created);
        }
        document.getElementById('patient-form-modal').classList.add('hidden');
        navigate('patients');
        showToast('Patient saved!', 'success');
    } catch { showToast('Failed to save patient.', 'error'); }
}

// ─── Admin View ───────────────────────────────────────────────
function renderAdminView() {
    const s = state.settings;
    const themes = ['default', 'blue', 'purple', 'rose', 'dark'];
    const themeLabels = { default: 'Teal', blue: 'Blue', purple: 'Purple', rose: 'Rose', dark: 'Dark' };

    const toggle = (id, checked, label, desc) => `
    <div class="setting-row">
        <div>
            <div class="setting-label">${label}</div>
            <div class="setting-desc">${desc}</div>
        </div>
        <label class="toggle">
            <input type="checkbox" id="${id}" ${checked ? 'checked' : ''}>
            <span class="toggle-slider"></span>
        </label>
    </div>`;

    return `
    <div class="view-header">
        <h2>Admin Panel</h2>
        <p>Control the interface shown to all users</p>
    </div>

    <div class="card">
        <div class="view-header" style="margin-bottom:1rem"><h2 style="font-size:1rem">Global Defaults</h2><p style="font-size:.8rem;color:var(--text-muted)">Applied to all users unless overridden per user below</p></div>
        <div class="settings-grid">
            ${toggle('set-voice', s.show_voice, 'Voice Input', 'Allow microphone / Hindi / Marathi voice queries')}
            ${toggle('set-advanced', s.show_advanced_options, 'Advanced Options', 'Show the top_k and source filter controls on the query page')}
            ${toggle('set-citations', s.show_citations, 'Source Citations', 'Show the citations panel below each response')}
            ${toggle('set-analysis', s.show_analysis, 'Analysis Section', 'Show the narrative Analysis text below the repertorization table')}
            ${toggle('set-history', s.show_history, 'History', 'Show the History tab in the sidebar')}
            ${toggle('set-saved', s.show_saved_rubrics, 'Saved Rubrics', 'Show the Saved Rubrics tab in the sidebar')}
            ${toggle('set-timing', s.show_processing_time, 'Processing Time', 'Show the response time badge on each result')}
        </div>
        <div class="setting-row" style="margin-top:1rem; flex-direction:column; align-items:flex-start; gap:.75rem">
            <div>
                <div class="setting-label">Theme</div>
                <div class="setting-desc">Colour theme applied to all users</div>
            </div>
            <div class="theme-grid">
                ${themes.map(t => `
                <button class="theme-btn ${s.theme === t ? 'active' : ''}" data-theme="${t}" title="${themeLabels[t]}"></button>`).join('')}
            </div>
        </div>
        <button class="admin-save-btn" id="admin-save">Save Global Defaults</button>
    </div>

    <div class="card">
        <div class="view-header" style="margin-bottom:1rem">
            <h2 style="font-size:1rem">Per-User Feature Access</h2>
            <p style="font-size:.8rem;color:var(--text-muted)">Override global defaults for individual users. Greyed-out = using global default.</p>
        </div>
        <div id="acl-matrix-wrap"><p style="color:var(--text-muted);font-size:.9rem">Loading…</p></div>
    </div>`;
}

function setupAdminEvents() {
    // Theme buttons
    let selectedTheme = state.settings.theme;
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            selectedTheme = btn.dataset.theme;
            document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            // Preview theme immediately
            document.body.className = selectedTheme !== 'default' ? `theme-${selectedTheme}` : '';
        });
    });

    // Save global defaults
    document.getElementById('admin-save').addEventListener('click', async () => {
        const settings = {
            show_voice: document.getElementById('set-voice').checked,
            show_advanced_options: document.getElementById('set-advanced').checked,
            show_citations: document.getElementById('set-citations').checked,
            show_analysis: document.getElementById('set-analysis').checked,
            show_history: document.getElementById('set-history').checked,
            show_saved_rubrics: document.getElementById('set-saved').checked,
            show_processing_time: document.getElementById('set-timing').checked,
            theme: selectedTheme,
        };
        try {
            await apiRequest('POST', '/admin/settings', settings);
            state.settings = { ...state.settings, ...settings };
            applySettings();
            showToast('Global defaults saved!', 'success');
        } catch (e) {
            showToast(e.message, 'error');
        }
    });

    // Load ACL matrix
    loadAclMatrix();
}

const ACL_FEATURES = [
    { key: 'show_voice',            label: 'Voice' },
    { key: 'show_analysis',         label: 'Analysis' },
    { key: 'show_citations',        label: 'Citations' },
    { key: 'show_history',          label: 'History' },
    { key: 'show_saved_rubrics',    label: 'Saved' },
    { key: 'show_advanced_options', label: 'Adv. Opts' },
    { key: 'show_processing_time',  label: 'Timing' },
];

async function loadAclMatrix() {
    const wrap = document.getElementById('acl-matrix-wrap');
    if (!wrap) return;
    let users;
    try { users = await apiRequest('GET', '/admin/users'); }
    catch (e) { wrap.innerHTML = `<p style="color:var(--error)">${esc(e.message)}</p>`; return; }

    const global = state.settings;
    wrap.innerHTML = `
    <div class="acl-scroll">
    <table class="acl-table">
        <thead><tr>
            <th>User</th>
            ${ACL_FEATURES.map(f => `<th>${f.label}</th>`).join('')}
            <th></th>
        </tr></thead>
        <tbody>
        ${users.map(u => `
        <tr data-uid="${esc(u.id)}">
            <td class="acl-user-cell">
                <div class="acl-user-name">${esc(u.full_name)}</div>
                <div class="acl-user-email">${esc(u.email)}</div>
            </td>
            ${ACL_FEATURES.map(f => {
                const hasOverride = u.feature_flags[f.key] !== undefined && u.feature_flags[f.key] !== null;
                const val = hasOverride ? u.feature_flags[f.key] : global[f.key];
                return `<td class="acl-cell">
                    <label class="acl-toggle ${hasOverride ? 'overridden' : 'inherited'}" title="${hasOverride ? 'User-specific override' : 'Using global default'}">
                        <input type="checkbox" data-feature="${f.key}" ${val ? 'checked' : ''}>
                        <span class="acl-slider"></span>
                    </label>
                </td>`;
            }).join('')}
            <td><button class="btn-secondary acl-save-btn" data-uid="${esc(u.id)}">Save</button></td>
        </tr>`).join('')}
        </tbody>
    </table>
    </div>`;

    // Mark overridden on change
    wrap.querySelectorAll('.acl-toggle input').forEach(cb => {
        cb.addEventListener('change', () => {
            cb.closest('.acl-toggle').classList.remove('inherited');
            cb.closest('.acl-toggle').classList.add('overridden');
        });
    });

    // Save per-user
    wrap.querySelectorAll('.acl-save-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const uid = btn.dataset.uid;
            const row = wrap.querySelector(`tr[data-uid="${uid}"]`);
            const flags = {};
            row.querySelectorAll('input[data-feature]').forEach(cb => {
                flags[cb.dataset.feature] = cb.checked;
            });
            btn.disabled = true; btn.textContent = '…';
            try {
                await apiRequest('POST', `/admin/users/${uid}/settings`, flags);
                showToast('User settings saved!', 'success');
                // Mark all toggles in row as overridden
                row.querySelectorAll('.acl-toggle').forEach(el => {
                    el.classList.remove('inherited'); el.classList.add('overridden');
                });
            } catch (e) {
                showToast(e.message, 'error');
            } finally {
                btn.disabled = false; btn.textContent = 'Save';
            }
        });
    });
}

// ─── Auth Views ───────────────────────────────────────────────
function renderAuthCard(form) {
    const card = document.getElementById('auth-card');

    if (form === 'login') {
        card.innerHTML = `
        <h2>Sign In</h2>
        <div id="auth-error" class="form-error"></div>
        <div class="form-group"><label>Email</label>
            <input type="email" id="auth-email" placeholder="you@example.com" autocomplete="email"></div>
        <div class="form-group"><label>Password</label>
            <input type="password" id="auth-password" placeholder="••••••••" autocomplete="current-password"></div>
        <button class="btn-primary" id="auth-submit">Sign In</button>
        <div class="auth-switch">No account? <a id="auth-switch">Register</a></div>`;

        document.getElementById('auth-submit').addEventListener('click', handleLogin);
        document.getElementById('auth-switch').addEventListener('click', () => renderAuthCard('register'));
        document.getElementById('auth-password').addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
    } else {
        card.innerHTML = `
        <h2>Create Account</h2>
        <div id="auth-error" class="form-error"></div>
        <div class="form-group"><label>Full Name</label>
            <input type="text" id="auth-name" placeholder="Dr. Jane Smith" autocomplete="name"></div>
        <div class="form-group"><label>Email</label>
            <input type="email" id="auth-email" placeholder="you@example.com" autocomplete="email"></div>
        <div class="form-group"><label>Password</label>
            <input type="password" id="auth-password" placeholder="Min. 8 characters" autocomplete="new-password"></div>
        <button class="btn-primary" id="auth-submit">Create Account</button>
        <div class="auth-switch">Already registered? <a id="auth-switch">Sign In</a></div>`;

        document.getElementById('auth-submit').addEventListener('click', handleRegister);
        document.getElementById('auth-switch').addEventListener('click', () => renderAuthCard('login'));
        document.getElementById('auth-password').addEventListener('keydown', e => { if (e.key === 'Enter') handleRegister(); });
    }

    setTimeout(() => card.querySelector('input')?.focus(), 50);
}

async function handleLogin() {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const errEl = document.getElementById('auth-error');
    const btn = document.getElementById('auth-submit');

    errEl.textContent = '';
    if (!email || !password) { errEl.textContent = 'Please fill in all fields.'; return; }
    btn.disabled = true; btn.textContent = 'Signing in…';

    try {
        const tokens = await apiRequest('POST', '/auth/login', { email, password });
        state.accessToken = tokens.access_token;
        state.refreshToken = tokens.refresh_token;
        state.user = await apiRequest('GET', '/auth/me');
        store.save();
        showApp();
    } catch (e) {
        errEl.textContent = e.message;
        btn.disabled = false; btn.textContent = 'Sign In';
    }
}

async function handleRegister() {
    const full_name = document.getElementById('auth-name').value.trim();
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const errEl = document.getElementById('auth-error');
    const btn = document.getElementById('auth-submit');

    errEl.textContent = '';
    if (!full_name || !email || !password) { errEl.textContent = 'Please fill in all fields.'; return; }
    if (password.length < 8) { errEl.textContent = 'Password must be at least 8 characters.'; return; }
    btn.disabled = true; btn.textContent = 'Creating account…';

    try {
        await apiRequest('POST', '/auth/register', { email, password, full_name });
        const tokens = await apiRequest('POST', '/auth/login', { email, password });
        state.accessToken = tokens.access_token;
        state.refreshToken = tokens.refresh_token;
        state.user = await apiRequest('GET', '/auth/me');
        store.save();
        showApp();
        showToast('Account created successfully!', 'success');
    } catch (e) {
        errEl.textContent = e.message;
        btn.disabled = false; btn.textContent = 'Create Account';
    }
}

// ─── Response text helpers ────────────────────────────────────
function getDisplayText(fullText) {
    if (state.settings.show_analysis !== false) return fullText;
    // Strip Analysis section — handles: ## Analysis, **Analysis**, **Analysis:**, Analysis:, Note: ...
    const match = fullText.match(/\n+(?:#{1,6}\s*\*{0,2}|\*{0,2})(?:Analysis|Note:)/i);
    if (match) return fullText.slice(0, match.index).trimEnd();
    return fullText;
}

// ─── Utils ────────────────────────────────────────────────────
function esc(str) {
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function truncate(str, n) {
    return str.length > n ? str.slice(0, n) + '…' : str;
}

function fmtDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

let toastTimer;
function showToast(msg, type = 'info') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = `toast ${type}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.add('hidden'), 3200);
}

// ─── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', initApp);
