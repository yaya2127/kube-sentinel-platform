/* ==========================================================================
   KUBE-Sentinel — Main Application Orchestrator & Interactive CLI / Audio Engine
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Cluster Topology Canvas
  const clusterTopology = new ClusterTopology('topology-canvas');

  // K8s Environment Datasets
  const envDatasets = {
    prod: [
      { id: 'auth', name: 'auth-service', replicas: '2/2', status: 'Running', latency: 4.2, cpu: '12%', memory: '128Mi' },
      { id: 'payment', name: 'payment-gateway', replicas: '3/3', status: 'Running', latency: 12.8, cpu: '24%', memory: '256Mi' },
      { id: 'order', name: 'order-processor', replicas: '4/4', status: 'Running', latency: 8.5, cpu: '18%', memory: '512Mi' },
      { id: 'redis', name: 'redis-cluster', replicas: '3/3', status: 'Running', latency: 0.8, cpu: '5%', memory: '64Mi' },
      { id: 'db', name: 'postgres-primary', replicas: '1/1', status: 'Running', latency: 2.1, cpu: '15%', memory: '1024Mi' }
    ],
    staging: [
      { id: 'auth', name: 'auth-service-staging', replicas: '1/1', status: 'Running', latency: 8.5, cpu: '30%', memory: '256Mi' },
      { id: 'payment', name: 'payment-mock', replicas: '1/1', status: 'Running', latency: 18.2, cpu: '15%', memory: '128Mi' },
      { id: 'order', name: 'order-worker-dev', replicas: '2/2', status: 'Running', latency: 14.1, cpu: '40%', memory: '256Mi' }
    ],
    dr: [
      { id: 'auth', name: 'auth-service-dr', replicas: '4/4', status: 'Standby', latency: 1.2, cpu: '2%', memory: '64Mi' },
      { id: 'payment', name: 'payment-gateway-dr', replicas: '4/4', status: 'Standby', latency: 1.5, cpu: '2%', memory: '64Mi' }
    ]
  };

  let currentEnv = 'prod';
  let podsData = JSON.parse(JSON.stringify(envDatasets.prod));

  let clusterUptime = 99.99;
  let activeChaos = null;
  let chartHistory = Array(40).fill(5.5);
  let audioEnabled = true;

  // Web Audio API Audio Synthesizer
  let audioCtx = null;
  function playSound(type) {
    if (!audioEnabled) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      const now = audioCtx.currentTime;

      if (type === 'trace') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(640, now);
        gain.gain.setValueAtTime(0.02, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'alarm') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.linearRampToValueAtTime(440, now + 0.3);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'success') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.1);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      }
    } catch(e) {}
  }

  // DOM Elements
  const valTotalPods = document.getElementById('val-total-pods');
  const valP99Latency = document.getElementById('val-p99-latency');
  const valUptime = document.getElementById('val-uptime');
  const valActiveChaos = document.getElementById('val-active-chaos');

  const podMeshGrid = document.getElementById('pod-mesh-grid');
  const traceLogBox = document.getElementById('trace-log-box');
  const chaosCards = document.querySelectorAll('.chaos-card');
  const btnExportAudit = document.getElementById('btn-export-audit');
  const btnHealCluster = document.getElementById('btn-heal-cluster');
  const toastContainer = document.getElementById('toast-container');

  const btnToggleAudio = document.getElementById('btn-toggle-audio');
  const iconAudio = document.getElementById('icon-audio');
  const selectK8sEnv = document.getElementById('select-k8s-env');
  const overlayNamespace = document.getElementById('overlay-namespace');
  const lblHeaderStatus = document.getElementById('lbl-header-status');

  // Terminal Elements
  const btnOpenTerminal = document.getElementById('btn-open-terminal');
  const terminalBackdrop = document.getElementById('terminal-backdrop');
  const btnCloseTerminal = document.getElementById('btn-close-terminal');
  const terminalInput = document.getElementById('terminal-input');
  const terminalOutputBox = document.getElementById('terminal-output-box');

  // eBPF Inspector Elements
  const inspectorBackdrop = document.getElementById('inspector-backdrop');
  const btnCloseInspector = document.getElementById('btn-close-inspector');
  const inspectorContentBox = document.getElementById('inspector-content-box');
  const btnReplayPacket = document.getElementById('btn-replay-packet');
  let selectedTraceData = null;

  // AI Advisor & Scaler Elements
  const aiTitle = document.getElementById('ai-recommendation-title');
  const aiText = document.getElementById('ai-recommendation-text');
  const btnApplyAiFix = document.getElementById('btn-apply-ai-fix');
  const scalerSlider = document.getElementById('scaler-slider');
  const lblReplicaCount = document.getElementById('lbl-replica-count');

  // Modal Elements
  const btnDeployModal = document.getElementById('btn-deploy-modal');
  const modalBackdrop = document.getElementById('deploy-modal-backdrop');
  const btnCloseModal = document.getElementById('btn-close-deploy-modal');
  const btnConfirmDeploy = document.getElementById('btn-confirm-deploy');
  const inputPodName = document.getElementById('input-pod-name');
  const selectPodReplicas = document.getElementById('select-pod-replicas');

  // 1. Telemetry Canvas Chart Initialization
  const telemetryCanvas = document.getElementById('telemetry-chart-canvas');
  let chartCtx = null;
  if (telemetryCanvas) {
    const rect = telemetryCanvas.parentElement.getBoundingClientRect();
    telemetryCanvas.width = rect.width;
    telemetryCanvas.height = rect.height;
    chartCtx = telemetryCanvas.getContext('2d');
  }

  function drawTelemetryChart() {
    if (!chartCtx || !telemetryCanvas) return;
    const w = telemetryCanvas.width;
    const h = telemetryCanvas.height;

    chartCtx.clearRect(0, 0, w, h);

    chartCtx.strokeStyle = '#e2e8f0';
    chartCtx.lineWidth = 1;
    for (let y = 30; y < h; y += 30) {
      chartCtx.beginPath();
      chartCtx.moveTo(0, y);
      chartCtx.lineTo(w, y);
      chartCtx.stroke();
    }

    chartCtx.beginPath();
    chartCtx.lineWidth = 2.5;
    chartCtx.strokeStyle = '#0284c7';

    const step = w / (chartHistory.length - 1);
    chartHistory.forEach((val, i) => {
      const x = i * step;
      const y = h - (val / 300) * (h - 20) - 10;
      if (i === 0) chartCtx.moveTo(x, y);
      else chartCtx.lineTo(x, y);
    });
    chartCtx.stroke();

    chartCtx.lineTo(w, h);
    chartCtx.lineTo(0, h);
    const grad = chartCtx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(2, 132, 199, 0.15)');
    grad.addColorStop(1, 'rgba(2, 132, 199, 0.0)');
    chartCtx.fillStyle = grad;
    chartCtx.fill();
  }

  // 2. Render Pod Mesh Grid
  function renderPodMesh() {
    if (!podMeshGrid) return;
    podMeshGrid.innerHTML = '';

    podsData.forEach(pod => {
      const node = document.createElement('div');
      const isCrashed = pod.status !== 'Running';

      node.className = `pod-node ${isCrashed ? 'crashed' : 'running'}`;
      node.innerHTML = `
        <div class="pod-name">${pod.name}</div>
        <div class="pod-status-text">
          <span>Replicas: ${pod.replicas}</span> | <span>Latency: ${pod.latency.toFixed(1)}ms</span>
        </div>
        <div style="font-size:0.72rem; color:${isCrashed ? '#dc2626' : '#059669'}; font-weight:800; margin-top:4px;">
          ● ${pod.status.toUpperCase()}
        </div>
      `;

      podMeshGrid.appendChild(node);
    });

    updateMetricsSummary();
  }

  // 3. Update Summary Cards & AI Recommendations
  function updateMetricsSummary() {
    const totalReplicas = podsData.reduce((acc, p) => acc + parseInt(p.replicas.split('/')[0] || 1), 0);
    if (valTotalPods) valTotalPods.textContent = totalReplicas;
    if (lblReplicaCount) lblReplicaCount.textContent = `${totalReplicas} Replicas`;
    if (lblHeaderStatus) lblHeaderStatus.textContent = `CLUSTER HEALTHY (${totalReplicas} REPLICAS ONLINE)`;

    const avgLat = podsData.reduce((acc, p) => acc + p.latency, 0) / podsData.length;
    if (valP99Latency) valP99Latency.textContent = `${avgLat.toFixed(1)}ms`;
    if (valUptime) valUptime.textContent = `${clusterUptime.toFixed(2)}%`;
    if (valActiveChaos) valActiveChaos.textContent = activeChaos ? activeChaos.toUpperCase() : 'NONE';

    chartHistory.shift();
    chartHistory.push(avgLat);
    drawTelemetryChart();

    if (aiTitle && aiText) {
      if (activeChaos === 'pod-kill') {
        aiTitle.textContent = 'Critical: Pod Crash Loop Detected!';
        aiTitle.style.color = '#dc2626';
        aiText.textContent = 'payment-gateway pod replicas dropped to 0/3. AI Watchdog auto-scaling replacement pods in namespace.';
      } else if (activeChaos === 'latency-spike') {
        aiTitle.textContent = 'Warning: Mesh Latency Exceeding SLA Target (+180ms)';
        aiTitle.style.color = '#d97706';
        aiText.textContent = 'High gRPC propagation delay. AI recommends tuning Envoy proxy buffer timeout & enabling replica caching.';
      } else {
        aiTitle.textContent = 'Cluster Operating Within Optimal SLA Limits';
        aiTitle.style.color = '#0f172a';
        aiText.textContent = `AI Watchdog analyzer reports zero pod restarts in ${currentEnv.toUpperCase()} namespace. Latency stable at p95 < 8ms.`;
      }
    }
  }

  // 4. Add eBPF Trace Log Entry (Interactive Clickable)
  function addTraceLog(from, to, spanMs, status) {
    if (!traceLogBox) return;
    const line = document.createElement('div');
    line.className = 'trace-line';
    line.style.cursor = 'pointer';
    const statusClass = status === '200 OK' ? 'span-ok' : status.includes('503') ? 'span-err' : 'span-warn';
    const traceId = Math.random().toString(36).substring(7);

    line.innerHTML = `[${new Date().toLocaleTimeString()}] <span class="${statusClass}">${status}</span> trace_id=${traceId} span=${spanMs.toFixed(1)}ms [${from} -> ${to}]`;
    
    // Interactive eBPF Inspection on Click
    line.addEventListener('click', () => {
      selectedTraceData = { traceId, from, to, spanMs, status };
      if (inspectorContentBox) {
        inspectorContentBox.innerHTML = `
<span style="color:#38bdf8;">// eBPF Packet Telemetry Header Inspection</span>
{
  "trace_id": "${traceId}",
  "source_pod": "${from}",
  "destination_pod": "${to}",
  "status_code": "${status}",
  "span_duration_ms": ${spanMs.toFixed(2)},
  "protocol": "gRPC / HTTP/2",
  "cilium_security_identity": 4092,
  "tls_handshake": "mTLS Enabled (Istio Mesh)",
  "payload_bytes": 1024
}
        `;
      }
      if (inspectorBackdrop) inspectorBackdrop.style.display = 'flex';
      playSound('success');
    });

    traceLogBox.prepend(line);
    playSound('trace');

    if (traceLogBox.children.length > 30) {
      traceLogBox.removeChild(traceLogBox.lastChild);
    }
  }

  // 5. Audio Toggle
  if (btnToggleAudio) {
    btnToggleAudio.addEventListener('click', () => {
      audioEnabled = !audioEnabled;
      btnToggleAudio.innerHTML = audioEnabled ? 
        `<i class="fas fa-volume-high" id="icon-audio"></i> Audio On` : 
        `<i class="fas fa-volume-xmark" id="icon-audio"></i> Audio Muted`;
      showToast(audioEnabled ? "🔊 Web Audio Feedback Enabled" : "🔇 Web Audio Feedback Muted");
    });
  }

  // 6. Environment Selector Switcher
  if (selectK8sEnv) {
    selectK8sEnv.addEventListener('change', (e) => {
      currentEnv = e.target.value;
      podsData = JSON.parse(JSON.stringify(envDatasets[currentEnv] || envDatasets.prod));
      if (overlayNamespace) overlayNamespace.textContent = `NAMESPACE: ${currentEnv}`;
      renderPodMesh();
      playSound('success');
      showToast(`🌐 Switched Cluster Namespace to: ${currentEnv.toUpperCase()}`);
    });
  }

  // 7. Interactive kubectl CLI Terminal Drawer
  if (btnOpenTerminal && terminalBackdrop) {
    btnOpenTerminal.addEventListener('click', () => {
      terminalBackdrop.style.display = 'flex';
      if (terminalInput) terminalInput.focus();
    });
  }

  if (btnCloseTerminal && terminalBackdrop) {
    btnCloseTerminal.addEventListener('click', () => {
      terminalBackdrop.style.display = 'none';
    });
  }

  if (terminalInput) {
    terminalInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const rawCmd = terminalInput.value.trim();
        terminalInput.value = '';
        if (!rawCmd) return;

        const cmdLine = document.createElement('div');
        cmdLine.innerHTML = `<span style="color:#10b981;">admin@k8s-sentinel:~$</span> ${rawCmd}`;
        terminalOutputBox.appendChild(cmdLine);

        const outLine = document.createElement('div');
        outLine.style.marginBottom = '8px';

        const cmd = rawCmd.toLowerCase();
        if (cmd === 'help') {
          outLine.innerHTML = `
Available kubectl Commands:
  <span style="color:#f59e0b;">kubectl get pods</span>               - Output active pod replica matrix
  <span style="color:#f59e0b;">kubectl scale --replicas=N</span>     - Scale pods dynamically
  <span style="color:#f59e0b;">kubectl chaos kill &lt;pod&gt;</span>        - Trigger pod kill chaos experiment
  <span style="color:#f59e0b;">kubectl top nodes</span>              - View CPU & Memory usage stats
  <span style="color:#f59e0b;">clear</span>                          - Reset terminal output
          `;
        } else if (cmd.includes('get pods')) {
          outLine.innerHTML = podsData.map(p => `<span style="color:#38bdf8;">${p.name.padEnd(24)}</span> ${p.replicas.padEnd(10)} <span style="color:#10b981;">${p.status}</span> ${p.latency.toFixed(1)}ms`).join('<br/>');
        } else if (cmd.includes('scale')) {
          podsData.forEach(p => p.replicas = '5/5');
          renderPodMesh();
          outLine.innerHTML = `<span style="color:#10b981;">deployment.apps scaled all microservice replicas to 5.</span>`;
        } else if (cmd.includes('top nodes')) {
          outLine.innerHTML = `
NODE               CPU(cores)   CPU%   MEMORY(bytes)   MEMORY%
node-master-01     220m         11%    2048Mi          25%
node-worker-alpha  680m         34%    4096Mi          50%
node-worker-beta   410m         20%    3072Mi          37%
          `;
        } else if (cmd === 'clear') {
          terminalOutputBox.innerHTML = '';
          return;
        } else {
          outLine.innerHTML = `<span style="color:#ef4444;">Error: command not recognized. Type 'help' for guidance.</span>`;
        }

        terminalOutputBox.appendChild(outLine);
        terminalOutputBox.scrollTop = terminalOutputBox.scrollHeight;
        playSound('trace');
      }
    });
  }

  // 8. eBPF Inspector Replay Button
  if (btnCloseInspector && inspectorBackdrop) {
    btnCloseInspector.addEventListener('click', () => {
      inspectorBackdrop.style.display = 'none';
    });
  }

  if (btnReplayPacket) {
    btnReplayPacket.addEventListener('click', () => {
      if (selectedTraceData) {
        addTraceLog(selectedTraceData.from, selectedTraceData.to, selectedTraceData.spanMs, selectedTraceData.status);
        playSound('success');
        showToast(`⚡ Replayed gRPC Trace Request: [${selectedTraceData.from} -> ${selectedTraceData.to}]`);
        if (inspectorBackdrop) inspectorBackdrop.style.display = 'none';
      }
    });
  }

  // 9. Chaos Monkey Experiments
  chaosCards.forEach(card => {
    card.addEventListener('click', () => {
      const expType = card.getAttribute('data-experiment');
      chaosCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      activeChaos = expType;
      playSound('alarm');

      if (expType === 'pod-kill') {
        const target = podsData[1];
        if (target) {
          target.status = 'CrashLoopBackOff (Kill)';
          target.replicas = '0/3';
          clusterTopology.setPodStatus('payment', 'crashed');
        }
        addTraceLog('ingress', 'payment-gateway', 250.0, '503 Service Unavailable');
        showToast("🔥 Chaos Experiment: Killed payment-gateway pods!");

        setTimeout(() => {
          if (target) {
            target.status = 'Running';
            target.replicas = '3/3';
            clusterTopology.setPodStatus('payment', 'healthy');
          }
          renderPodMesh();
          playSound('success');
          showToast("🛡️ K8s Self-Healing Watchdog: Rescheduled payment-gateway pods!");
        }, 4000);
      } else if (expType === 'latency-spike') {
        podsData.forEach(p => p.latency += 180.0);
        addTraceLog('auth-service', 'order-processor', 285.4, '429 Rate Limited');
        showToast("⚡ Latency Injection: Added +180ms delay across mesh!");
      } else if (expType === 'packet-loss') {
        addTraceLog('order-processor', 'postgres-primary', 520.1, '504 Gateway Timeout');
        showToast("📡 Packet Loss: Dropped 30% TCP packets!");
      }

      renderPodMesh();
    });
  });

  // 10. Interactive Replica Scaler Slider
  if (scalerSlider) {
    scalerSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      podsData[0].replicas = `${Math.ceil(val / 3)}/${Math.ceil(val / 3)}`;
      if (podsData[2]) podsData[2].replicas = `${Math.ceil(val / 2)}/${Math.ceil(val / 2)}`;
      renderPodMesh();
    });
  }

  // 11. Apply AI Fix Button
  if (btnApplyAiFix) {
    btnApplyAiFix.addEventListener('click', () => {
      podsData.forEach(p => {
        p.status = 'Running';
        p.latency = Math.random() * 5 + 2;
      });
      activeChaos = null;
      chaosCards.forEach(c => c.classList.remove('active'));
      renderPodMesh();
      playSound('success');
      showToast("✨ AI Auto-Optimizer: Rebalanced mesh proxy routing & cleared anomalies!");
    });
  }

  // 12. Deploy Pod Modal Handlers
  if (btnDeployModal && modalBackdrop) {
    btnDeployModal.addEventListener('click', () => {
      modalBackdrop.style.display = 'flex';
    });
  }

  if (btnCloseModal && modalBackdrop) {
    btnCloseModal.addEventListener('click', () => {
      modalBackdrop.style.display = 'none';
    });
  }

  if (btnConfirmDeploy) {
    btnConfirmDeploy.addEventListener('click', () => {
      const name = inputPodName.value.trim() || `microservice-${Date.now().toString().slice(-4)}`;
      const reps = selectPodReplicas.value || '3';

      podsData.push({
        id: `pod-${Date.now()}`,
        name: name,
        replicas: `${reps}/${reps}`,
        status: 'Running',
        latency: 3.5,
        cpu: '8%',
        memory: '128Mi'
      });

      renderPodMesh();
      modalBackdrop.style.display = 'none';
      inputPodName.value = '';
      playSound('success');
      showToast(`🚀 Successfully Deployed Microservice Pod: ${name} (${reps} Replicas)`);
    });
  }

  // 13. Heal Cluster Button
  if (btnHealCluster) {
    btnHealCluster.addEventListener('click', () => {
      podsData.forEach(p => {
        p.status = 'Running';
        if (p.id === 'auth') p.replicas = '2/2';
        if (p.id === 'payment') p.replicas = '3/3';
        if (p.id === 'order') p.replicas = '4/4';
        p.latency = Math.random() * 6 + 2;
        clusterTopology.setPodStatus(p.id, 'healthy');
      });

      chaosCards.forEach(c => c.classList.remove('active'));
      activeChaos = null;
      clusterUptime = 99.99;
      renderPodMesh();
      playSound('success');
      showToast("🛡️ Cluster Healed! Reset all pods & cleared chaos injections.");
    });
  }

  // 14. Export Compliance Audit
  if (btnExportAudit) {
    btnExportAudit.addEventListener('click', () => {
      const auditSummary = `
=================================================================
KUBE-SENTINEL KUBERNETES RESILIENCE & CHAOS COMPLIANCE AUDIT
Cluster Namespace : ${currentEnv.toUpperCase()} (k8s-v1.30.2)
Timestamp         : ${new Date().toLocaleString()}
=================================================================

KUBERNETES POD MESH STATUS:
-----------------------------------------------------------------
${podsData.map(p => `• ${p.name.padEnd(24)} : ${p.status.padEnd(20)} [Replicas: ${p.replicas}] [Latency: ${p.latency.toFixed(1)}ms]`).join('\n')}

CLUSTER RESILIENCE METRICS:
-----------------------------------------------------------------
• Total Active Replicas  : ${podsData.reduce((acc, p) => acc + parseInt(p.replicas.split('/')[0] || 1), 0)}
• Cluster SLA Uptime %  : ${clusterUptime.toFixed(2)}%
• Active Chaos Injection : ${activeChaos ? activeChaos.toUpperCase() : 'NONE'}
• eBPF Span Tracing      : OPERATIONAL (Zero Packet Loss Target)

Audit Compliance Sign-off: ______________________________________
=================================================================
      `;

      const blob = new Blob([auditSummary], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `KUBE_Sentinel_Resilience_Audit_${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);

      playSound('success');
      showToast("Generated & Downloaded K8s Resilience Compliance Audit Report 📄");
    });
  }

  // Toast Notifications
  function showToast(message) {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fas fa-dharmachakra" style="color:#0284c7;"></i> <span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  // Periodic eBPF Span Simulator
  setInterval(() => {
    if (!activeChaos) {
      const randomPod = podsData[Math.floor(Math.random() * podsData.length)];
      if (randomPod) {
        addTraceLog('ingress', randomPod.name, randomPod.latency + (Math.random() - 0.5) * 2, '200 OK');
        updateMetricsSummary();
      }
    }
  }, 2800);

  // Initial Render & Draw
  renderPodMesh();
  drawTelemetryChart();
});
