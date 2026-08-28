/* ==========================================================================
   KUBE-Sentinel — Main Application Orchestrator & Chaos Watchdog Engine
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Cluster Topology Canvas
  const clusterTopology = new ClusterTopology('topology-canvas');

  // K8s Microservice Pod Dataset
  let podsData = [
    { id: 'auth', name: 'auth-service', replicas: '2/2', status: 'Running', latency: 4.2, cpu: '12%', memory: '128Mi' },
    { id: 'payment', name: 'payment-gateway', replicas: '3/3', status: 'Running', latency: 12.8, cpu: '24%', memory: '256Mi' },
    { id: 'order', name: 'order-processor', replicas: '4/4', status: 'Running', latency: 8.5, cpu: '18%', memory: '512Mi' },
    { id: 'redis', name: 'redis-cluster', replicas: '3/3', status: 'Running', latency: 0.8, cpu: '5%', memory: '64Mi' },
    { id: 'db', name: 'postgres-primary', replicas: '1/1', status: 'Running', latency: 2.1, cpu: '15%', memory: '1024Mi' }
  ];

  let clusterUptime = 99.99;
  let activeChaos = null;

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

  // Render Pod Mesh Grid
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
        <div style="font-size:0.68rem; color:${isCrashed ? '#ef4444' : '#10b981'}; font-weight:700; margin-top:4px;">
          ● ${pod.status.toUpperCase()}
        </div>
      `;

      podMeshGrid.appendChild(node);
    });

    updateMetricsSummary();
  }

  // Update Summary Cards
  function updateMetricsSummary() {
    if (valTotalPods) valTotalPods.textContent = podsData.reduce((acc, p) => acc + parseInt(p.replicas.split('/')[0]), 0);
    const avgLat = podsData.reduce((acc, p) => acc + p.latency, 0) / podsData.length;
    if (valP99Latency) valP99Latency.textContent = `${avgLat.toFixed(1)}ms`;
    if (valUptime) valUptime.textContent = `${clusterUptime.toFixed(2)}%`;
    if (valActiveChaos) valActiveChaos.textContent = activeChaos ? activeChaos.toUpperCase() : 'NONE';
  }

  // Add eBPF Trace Log Entry
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

  // Chaos Experiment Handlers
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
        showToast("🔥 Chaos Experiment Initiated: Killed payment-gateway pods!");

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
        showToast("⚡ Latency Injection: Added +180ms delay across service mesh!");
      } else if (expType === 'packet-loss') {
        addTraceLog('order-processor', 'postgres-primary', 520.1, '504 Gateway Timeout');
        showToast("📡 Packet Loss Experiment: Dropped 30% TCP packets!");
      }

      renderPodMesh();
    });
  });

  // Heal Cluster Reset Button
  if (btnHealCluster) {
    btnHealCluster.addEventListener('click', () => {
      podsData.forEach(p => {
        p.status = 'Running';
        if (p.id === 'auth') p.replicas = '2/2';
        if (p.id === 'payment') p.replicas = '3/3';
        if (p.id === 'order') p.replicas = '4/4';
        p.latency = Math.random() * 10 + 2;
        clusterTopology.setPodStatus(p.id, 'healthy');
      });

      chaosCards.forEach(c => c.classList.remove('active'));
      activeChaos = null;
      clusterUptime = 99.99;
      renderPodMesh();
      showToast("🛡️ Cluster Healed! Reset all pods & cleared chaos injections.");
    });
  }

  // Export K8s Resilience Compliance Audit Report
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
${podsData.map(p => `• ${p.name.padEnd(20)} : ${p.status.padEnd(20)} [Replicas: ${p.replicas}] [Latency: ${p.latency.toFixed(1)}ms]`).join('\n')}

CLUSTER RESILIENCE METRICS:
-----------------------------------------------------------------
• Total Active Replicas  : ${podsData.reduce((acc, p) => acc + parseInt(p.replicas.split('/')[0]), 0)}
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
    toast.innerHTML = `<i class="fas fa-dharmachakra" style="color:#38bdf8;"></i> <span>${message}</span>`;
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
      addTraceLog('ingress', randomPod.name, randomPod.latency + (Math.random() - 0.5) * 2, '200 OK');
    }
  }, 3000);

  // Initial Render
  renderPodMesh();
});
