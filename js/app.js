/* ==========================================================================
   KUBE-Sentinel — Application Orchestrator, AI Advisor & Interactive Features
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Cluster Topology Canvas
  const clusterTopology = new ClusterTopology('topology-canvas');

  // Initial K8s Microservice Pod Dataset
  let podsData = [
    { id: 'auth', name: 'auth-service', replicas: '2/2', status: 'Running', latency: 4.2, cpu: '12%', memory: '128Mi' },
    { id: 'payment', name: 'payment-gateway', replicas: '3/3', status: 'Running', latency: 12.8, cpu: '24%', memory: '256Mi' },
    { id: 'order', name: 'order-processor', replicas: '4/4', status: 'Running', latency: 8.5, cpu: '18%', memory: '512Mi' },
    { id: 'redis', name: 'redis-cluster', replicas: '3/3', status: 'Running', latency: 0.8, cpu: '5%', memory: '64Mi' },
    { id: 'db', name: 'postgres-primary', replicas: '1/1', status: 'Running', latency: 2.1, cpu: '15%', memory: '1024Mi' }
  ];

  let clusterUptime = 99.99;
  let activeChaos = null;
  let chartHistory = Array(40).fill(5.5);

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

  // Interactive AI Advisor & Scaler Elements
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

    // Draw Grid Lines
    chartCtx.strokeStyle = '#e2e8f0';
    chartCtx.lineWidth = 1;
    for (let y = 30; y < h; y += 30) {
      chartCtx.beginPath();
      chartCtx.moveTo(0, y);
      chartCtx.lineTo(w, y);
      chartCtx.stroke();
    }

    // Draw Latency Trend Line
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

    // Fill Gradient below curve
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

  // 3. Update Metrics & AI Advisor Recommendations
  function updateMetricsSummary() {
    const totalReplicas = podsData.reduce((acc, p) => acc + parseInt(p.replicas.split('/')[0] || 1), 0);
    if (valTotalPods) valTotalPods.textContent = totalReplicas;
    if (lblReplicaCount) lblReplicaCount.textContent = `${totalReplicas} Replicas`;

    const avgLat = podsData.reduce((acc, p) => acc + p.latency, 0) / podsData.length;
    if (valP99Latency) valP99Latency.textContent = `${avgLat.toFixed(1)}ms`;
    if (valUptime) valUptime.textContent = `${clusterUptime.toFixed(2)}%`;
    if (valActiveChaos) valActiveChaos.textContent = activeChaos ? activeChaos.toUpperCase() : 'NONE';

    // Push new point to chart history
    chartHistory.shift();
    chartHistory.push(avgLat);
    drawTelemetryChart();

    // AI Advisor Smart Recommendations Logic
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
        aiText.textContent = 'AI Watchdog analyzer reports zero pod restarts in last 60 minutes. Mesh latency is stable at p95 < 8ms.';
      }
    }
  }

  // 4. Add eBPF Trace Log Entry
  function addTraceLog(from, to, spanMs, status) {
    if (!traceLogBox) return;
    const line = document.createElement('div');
    line.className = 'trace-line';
    const statusClass = status === '200 OK' ? 'span-ok' : status.includes('503') ? 'span-err' : 'span-warn';

    line.innerHTML = `[${new Date().toLocaleTimeString()}] <span class="${statusClass}">${status}</span> trace_id=${Math.random().toString(36).substring(7)} span=${spanMs.toFixed(1)}ms [${from} -> ${to}]`;
    traceLogBox.prepend(line);

    if (traceLogBox.children.length > 30) {
      traceLogBox.removeChild(traceLogBox.lastChild);
    }
  }

  // 5. Chaos Monkey Experiments
  chaosCards.forEach(card => {
    card.addEventListener('click', () => {
      const expType = card.getAttribute('data-experiment');
      chaosCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      activeChaos = expType;

      if (expType === 'pod-kill') {
        const target = podsData[1]; // payment-gateway
        target.status = 'CrashLoopBackOff (Kill)';
        target.replicas = '0/3';
        clusterTopology.setPodStatus('payment', 'crashed');
        addTraceLog('ingress', 'payment-gateway', 250.0, '503 Service Unavailable');
        showToast("🔥 Chaos Experiment: Killed payment-gateway pods!");

        // Auto-Healing Watchdog
        setTimeout(() => {
          target.status = 'Running';
          target.replicas = '3/3';
          clusterTopology.setPodStatus('payment', 'healthy');
          renderPodMesh();
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

  // 6. Interactive Replica Scaler Slider
  if (scalerSlider) {
    scalerSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      podsData[0].replicas = `${Math.ceil(val / 3)}/${Math.ceil(val / 3)}`;
      podsData[2].replicas = `${Math.ceil(val / 2)}/${Math.ceil(val / 2)}`;
      renderPodMesh();
    });
  }

  // 7. Apply AI Fix Button
  if (btnApplyAiFix) {
    btnApplyAiFix.addEventListener('click', () => {
      podsData.forEach(p => {
        p.status = 'Running';
        p.latency = Math.random() * 5 + 2;
      });
      activeChaos = null;
      chaosCards.forEach(c => c.classList.remove('active'));
      renderPodMesh();
      showToast("✨ AI Auto-Optimizer: Rebalanced mesh proxy routing & cleared anomalies!");
    });
  }

  // 8. Deploy Pod Modal Handlers
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
      showToast(`🚀 Successfully Deployed Microservice Pod: ${name} (${reps} Replicas)`);
    });
  }

  // 9. Heal Cluster Button
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
      showToast("🛡️ Cluster Healed! Reset all pods & cleared chaos injections.");
    });
  }

  // 10. Export K8s Resilience Compliance Audit Report
  if (btnExportAudit) {
    btnExportAudit.addEventListener('click', () => {
      const auditSummary = `
=================================================================
KUBE-SENTINEL KUBERNETES RESILIENCE & CHAOS COMPLIANCE AUDIT
Cluster Namespace : Production-US-East-1 (k8s-v1.30.2)
Timestamp         : ${new Date().toLocaleString()}
=================================================================

KUBERNETES POD MESH STATUS:
-----------------------------------------------------------------
${podsData.map(p => `• ${p.name.padEnd(22)} : ${p.status.padEnd(20)} [Replicas: ${p.replicas}] [Latency: ${p.latency.toFixed(1)}ms]`).join('\n')}

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

  // Periodic eBPF Span & Chart Updater
  setInterval(() => {
    if (!activeChaos) {
      const randomPod = podsData[Math.floor(Math.random() * podsData.length)];
      addTraceLog('ingress', randomPod.name, randomPod.latency + (Math.random() - 0.5) * 2, '200 OK');
      updateMetricsSummary();
    }
  }, 2500);

  // Initial Render & Draw
  renderPodMesh();
  drawTelemetryChart();
});
