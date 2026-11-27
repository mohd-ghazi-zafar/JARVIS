/**
 * JARVIS HUD Front-End Application Logic
 * Implements GPU-cached procedural tick geometry, atmospheric background,
 * mathematical boolean moon / 8-ray sun canvas morph, and real-time API bindings.
 */

// API Configuration (Reconciled with /api routing and fallback)
const API_BASE = window.location.origin.startsWith('http')
    ? `${window.location.origin}/api`
    : 'http://127.0.0.1:8000/api';

// State
let voiceEnabled = true;
let isShieldActive = false;
let currentIslandMode = 'moon'; // 'moon' or 'sun'

// ==========================================================================
// 1. Procedural Mathematical Ticks (120 Ticks, 3-Degree Intervals)
// ==========================================================================
function renderDialTicks() {
    const canvas = document.getElementById('ticks-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const center = { x: width / 2, y: height / 2 };
    const baseRadius = (Math.min(width, height) / 2) * 0.90;

    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < 120; i++) {
        const angle = (i * 3) * (Math.PI / 180);
        const isQuarter = (i % 30 === 0);
        const isMajor = (i % 10 === 0);

        let tickLength;
        let strokeWidth;
        let strokeColor;

        if (isQuarter) {
            tickLength = baseRadius * 0.12;
            strokeWidth = 2.5;
            strokeColor = 'rgba(245, 245, 220, 0.85)'; // Cream/Beige high alpha
        } else if (isMajor) {
            tickLength = baseRadius * 0.08;
            strokeWidth = 1.6;
            strokeColor = 'rgba(245, 245, 220, 0.55)'; // Mid alpha
        } else {
            tickLength = baseRadius * 0.03;
            strokeWidth = 0.8;
            strokeColor = 'rgba(245, 245, 220, 0.18)'; // Fine low alpha
        }

        const startX = center.x + baseRadius * Math.cos(angle);
        const startY = center.y + baseRadius * Math.sin(angle);
        const endX = center.x + (baseRadius - tickLength) * Math.cos(angle);
        const endY = center.y + (baseRadius - tickLength) * Math.sin(angle);

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
        ctx.lineCap = 'round';
        ctx.stroke();
    }
}

// ==========================================================================
// 2. Atmospheric Ambient Glow Canvas
// ==========================================================================
function renderAmbientGlow() {
    const canvas = document.getElementById('ambient-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const centerX = canvas.width / 2;
        const centerY = canvas.height * 0.45;
        const radius = Math.min(canvas.width, canvas.height) * 0.65;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const grad = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, radius);
        // Tertiary luxury accent (Saddle Brown #8B4513) at 0.12 alpha
        grad.addColorStop(0, 'rgba(139, 69, 19, 0.14)');
        grad.addColorStop(0.5, 'rgba(210, 180, 140, 0.05)');
        grad.addColorStop(1, 'transparent');

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    window.addEventListener('resize', resize);
    resize();
}

// ==========================================================================
// 3. Dynamic Island Insignia Icon (Boolean Moon vs. 8-Ray Sun)
// ==========================================================================
function renderIslandIcon(mode = 'moon') {
    const canvas = document.getElementById('island-icon-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const center = { x: w / 2, y: h / 2 };
    const iconColor = '#E6BE8A'; // Warm Gold / Tan

    ctx.clearRect(0, 0, w, h);

    if (mode === 'moon') {
        // Mathematical Crescent Moon via Boolean Difference (destination-out)
        // Draw to an offscreen buffer to perform exact clean composite
        const offCanvas = document.createElement('canvas');
        offCanvas.width = w;
        offCanvas.height = h;
        const offCtx = offCanvas.getContext('2d');

        const mainRadius = w * 0.42;
        const offset = mainRadius * 0.45;
        const shiftX = offset * 0.5;

        // Base circle
        offCtx.beginPath();
        offCtx.arc(center.x - shiftX, center.y, mainRadius, 0, Math.PI * 2);
        offCtx.fillStyle = iconColor;
        offCtx.fill();

        // Cutting circle with destination-out
        offCtx.globalCompositeOperation = 'destination-out';
        offCtx.beginPath();
        offCtx.arc(center.x - shiftX + offset, center.y, mainRadius, 0, Math.PI * 2);
        offCtx.fill();

        ctx.drawImage(offCanvas, 0, 0);
    } else {
        // 8-Ray Sun via Trigonometric Ray Projections (45 deg angular intervals)
        const sunRadius = w * 0.24;
        const rayStart = sunRadius * 1.3;
        const rayEnd = w * 0.48;

        ctx.beginPath();
        ctx.arc(center.x, center.y, sunRadius, 0, Math.PI * 2);
        ctx.fillStyle = iconColor;
        ctx.fill();

        ctx.lineWidth = 1.8;
        ctx.lineCap = 'round';
        ctx.strokeStyle = iconColor;

        for (let i = 0; i < 8; i++) {
            const angle = (i * 45) * (Math.PI / 180);
            const x1 = center.x + rayStart * Math.cos(angle);
            const y1 = center.y + rayStart * Math.sin(angle);
            const x2 = center.x + rayEnd * Math.cos(angle);
            const y2 = center.y + rayEnd * Math.sin(angle);

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
    }
}

// ==========================================================================
// 4. API Communication & Live Data Sync
// ==========================================================================
async function fetchTelemetry() {
    try {
        const res = await fetch(`${API_BASE}/telemetry`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.available) {
            document.getElementById('cpu-load-val').textContent = `${data.cpu_percent}%`;
            document.getElementById('ram-load-val').textContent = `${data.ram_percent}%`;
            document.getElementById('battery-load-val').textContent = data.battery_percent !== null ? `${data.battery_percent}%` : 'AC';
            document.getElementById('disk-load-val').textContent = `${data.disk_percent}%`;
        }
    } catch (err) {
        console.warn('Telemetry offline:', err);
    }
}

async function fetchCircadian() {
    try {
        const res = await fetch(`${API_BASE}/circadian`);
        if (!res.ok) return;
        const data = await res.json();
        
        document.getElementById('circadian-countdown').textContent = data.bedtime_countdown || '--:--:--';
        document.getElementById('core-countdown').textContent = `${data.bedtime_target} BEDTIME ANCHOR (${data.bedtime_countdown})`;
        
        const badge = document.getElementById('circadian-level-badge');
        badge.textContent = `LEVEL ${data.escalation_level}`;
        if (data.is_bedtime_breached) {
            badge.style.color = '#ff6b6b';
            badge.style.borderColor = '#ff6b6b';
            document.getElementById('core-status-pill').textContent = 'BEDTIME BREACH';
            document.getElementById('core-status-pill').style.color = '#ff6b6b';
        } else {
            badge.style.color = 'var(--text-cream)';
            badge.style.borderColor = 'rgba(245, 245, 220, 0.08)';
            document.getElementById('core-status-pill').textContent = 'NOMINAL';
            document.getElementById('core-status-pill').style.color = 'var(--accent-tan)';
        }
    } catch (err) {
        console.warn('Circadian offline:', err);
    }
}

async function fetchShield() {
    try {
        const res = await fetch(`${API_BASE}/shield/status`);
        if (!res.ok) return;
        const data = await res.json();
        isShieldActive = data.active;

        const toggleBtn = document.getElementById('shield-toggle-btn');
        const statusText = document.getElementById('shield-status-text');
        const modeLabel = document.getElementById('shield-mode-label');
        const breachCount = document.getElementById('shield-breach-count');

        breachCount.textContent = data.breaches_detected_total;
        modeLabel.textContent = data.mode;

        if (isShieldActive) {
            statusText.textContent = 'ACTIVE';
            statusText.style.color = 'var(--accent-gold)';
            toggleBtn.textContent = 'DISENGAGE SHIELD';
            toggleBtn.classList.add('active');
            currentIslandMode = 'sun';
            renderIslandIcon('sun');
            document.getElementById('island-label').textContent = 'SHIELD ACTIVE';
        } else {
            statusText.textContent = 'DISENGAGED';
            statusText.style.color = 'var(--text-cream)';
            toggleBtn.textContent = 'ENGAGE SHIELD';
            toggleBtn.classList.remove('active');
            currentIslandMode = 'moon';
            renderIslandIcon('moon');
            document.getElementById('island-label').textContent = 'CIRCADIAN ANCHOR';
        }
    } catch (err) {
        console.warn('Shield offline:', err);
    }
}

async function fetchTasks() {
    try {
        const res = await fetch(`${API_BASE}/tasks`);
        if (!res.ok) return;
        const data = await res.json();
        
        const taskList = document.getElementById('task-list');
        taskList.innerHTML = '';

        const tasks = data.tasks || [];
        const metrics = data.metrics || { completion_rate_pct: 0, completed_today: 0, total_today: 0 };

        document.getElementById('task-completion-rate').textContent = `${metrics.completion_rate_pct}% DONE`;
        document.getElementById('adherence-score-text').textContent = `${metrics.completion_rate_pct}%`;
        document.getElementById('tasks-done-text').textContent = `${metrics.completed_today} / ${metrics.total_today}`;

        if (tasks.length === 0) {
            taskList.innerHTML = '<li class="task-item" style="justify-content:center; opacity:0.5;">No active tasks in queue.</li>';
            return;
        }

        tasks.forEach(t => {
            const li = document.createElement('li');
            li.className = `task-item ${t.status === 'completed' ? 'completed' : ''}`;
            li.innerHTML = `
                <div style="display:flex; align-items:center; gap:8px;">
                    <button class="task-item-complete-btn" data-id="${t.id}">&#10003;</button>
                    <span>${t.title}</span>
                </div>
                <span class="task-item-priority">P${t.priority} (U:${t.urgency_score})</span>
            `;
            taskList.appendChild(li);
        });

        // Add event listeners for task completion buttons
        taskList.querySelectorAll('.task-item-complete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const taskId = parseInt(e.currentTarget.getAttribute('data-id'));
                await completeTask(taskId);
            });
        });
    } catch (err) {
        console.warn('Tasks offline:', err);
    }
}

async function completeTask(taskId) {
    try {
        await fetch(`${API_BASE}/tasks/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task_id: taskId })
        });
        fetchTasks();
    } catch (err) {
        console.error('Error completing task:', err);
    }
}

async function addTask(title, priority = 2) {
    if (!title.trim()) return;
    try {
        await fetch(`${API_BASE}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, priority })
        });
        document.getElementById('new-task-input').value = '';
        fetchTasks();
    } catch (err) {
        console.error('Error adding task:', err);
    }
}

async function toggleShield() {
    try {
        const nextState = !isShieldActive;
        await fetch(`${API_BASE}/shield/toggle?enabled=${nextState}&label=Work%20Session%20Focus`, {
            method: 'POST'
        });
        fetchShield();
    } catch (err) {
        console.error('Error toggling shield:', err);
    }
}

async function fetchEveningSummary() {
    try {
        const res = await fetch(`${API_BASE}/analytics/summary`);
        if (!res.ok) return;
        const data = await res.json();
        
        document.getElementById('strictness-level-text').textContent = `LEVEL ${data.operational_strictness_level}`;
        document.getElementById('adherence-score-text').textContent = `${data.today_adherence_score_pct}%`;
        
        const modal = document.getElementById('brief-modal');
        const modalContent = document.getElementById('modal-content');
        modalContent.textContent = data.executive_summary;
        modal.classList.add('open');
    } catch (err) {
        console.error('Error fetching analytics summary:', err);
    }
}

async function executeCommand(cmdText) {
    if (!cmdText.trim()) return;
    const outputElem = document.getElementById('console-output');
    outputElem.textContent = `Dispatching: "${cmdText}"...`;

    try {
        const res = await fetch(`${API_BASE}/command`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: cmdText, voice: voiceEnabled })
        });
        const data = await res.json();
        outputElem.textContent = data.speech || 'Command executed.';

        // Refresh widgets in parallel
        fetchTelemetry();
        fetchCircadian();
        fetchShield();
        fetchTasks();
    } catch (err) {
        outputElem.textContent = `Execution failed: ${err.message}`;
    }
}

// ==========================================================================
// 5. DOM Initialization & Event Bindings
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial Renderings
    renderDialTicks();
    renderAmbientGlow();
    renderIslandIcon('moon');

    // 2. Dynamic Island Expansion
    const island = document.getElementById('dynamic-island');
    island.addEventListener('click', () => {
        island.classList.toggle('expanded');
        toggleShield();
    });

    // 3. Center Core Click
    document.getElementById('dial-core-btn').addEventListener('click', () => {
        executeCommand('report status');
    });

    // 4. Shield Toggle Button
    document.getElementById('shield-toggle-btn').addEventListener('click', toggleShield);

    // 5. Add Task
    const taskInput = document.getElementById('new-task-input');
    const taskBtn = document.getElementById('add-task-btn');
    taskBtn.addEventListener('click', () => addTask(taskInput.value));
    taskInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addTask(taskInput.value);
    });

    // 6. Evening Brief Modal
    document.getElementById('summary-brief-btn').addEventListener('click', fetchEveningSummary);
    document.getElementById('modal-close-btn').addEventListener('click', () => {
        document.getElementById('brief-modal').classList.remove('open');
    });

    // 7. Console CLI Execution
    const cliInput = document.getElementById('cli-input');
    const cliSendBtn = document.getElementById('cli-send-btn');
    const cliVoiceBtn = document.getElementById('cli-voice-btn');

    cliSendBtn.addEventListener('click', () => {
        executeCommand(cliInput.value);
        cliInput.value = '';
    });
    cliInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            executeCommand(cliInput.value);
            cliInput.value = '';
        }
    });

    cliVoiceBtn.addEventListener('click', () => {
        voiceEnabled = !voiceEnabled;
        cliVoiceBtn.textContent = voiceEnabled ? 'VOICE: ON' : 'VOICE: OFF';
        cliVoiceBtn.classList.toggle('active', voiceEnabled);
    });

    // 8. Polling Loop (1000ms updates)
    fetchTelemetry();
    fetchCircadian();
    fetchShield();
    fetchTasks();

    setInterval(fetchTelemetry, 2500);
    setInterval(fetchCircadian, 1000);
    setInterval(fetchShield, 3000);
    setInterval(fetchTasks, 3000);
});
