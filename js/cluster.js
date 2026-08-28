/* ==========================================================================
   KUBE-Sentinel — Interactive Kubernetes Cluster DAG Topology Canvas (Light Theme)
   ========================================================================== */

class ClusterTopology {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.packets = [];
    this.animId = null;

    // K8s Cluster Pod Node Positions
    this.nodes = [
      { id: 'ingress', name: 'K8s Ingress Controller', x: 0.15, y: 0.5, status: 'healthy', color: '#0284c7' },
      { id: 'auth', name: 'auth-service (2/2)', x: 0.38, y: 0.28, status: 'healthy', color: '#059669' },
      { id: 'payment', name: 'payment-gateway (3/3)', x: 0.38, y: 0.72, status: 'healthy', color: '#059669' },
      { id: 'order', name: 'order-processor (4/4)', x: 0.65, y: 0.35, status: 'healthy', color: '#059669' },
      { id: 'redis', name: 'redis-cluster (3/3)', x: 0.85, y: 0.25, status: 'healthy', color: '#7c3aed' },
      { id: 'db', name: 'postgres-primary (1/1)', x: 0.85, y: 0.70, status: 'healthy', color: '#2563eb' }
    ];

    this.edges = [
      { from: 'ingress', to: 'auth' },
      { from: 'ingress', to: 'payment' },
      { from: 'auth', to: 'order' },
      { from: 'payment', to: 'order' },
      { from: 'order', to: 'redis' },
      { from: 'order', to: 'db' }
    ];

    this.initCanvas();
    window.addEventListener('resize', () => this.initCanvas());
    this.start();
  }

  initCanvas() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width * (window.devicePixelRatio || 1);
    this.canvas.height = rect.height * (window.devicePixelRatio || 1);
    this.ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    this.width = rect.width;
    this.height = rect.height;
  }

  setPodStatus(podId, status) {
    const node = this.nodes.find(n => n.id === podId);
    if (node) {
      node.status = status;
      node.color = status === 'crashed' ? '#dc2626' : status === 'degraded' ? '#d97706' : '#059669';
    }
  }

  spawnPacket() {
    const edge = this.edges[Math.floor(Math.random() * this.edges.length)];
    const fromNode = this.nodes.find(n => n.id === edge.from);
    const toNode = this.nodes.find(n => n.id === edge.to);
    if (fromNode && toNode) {
      this.packets.push({
        fromX: fromNode.x * this.width,
        fromY: fromNode.y * this.height,
        toX: toNode.x * this.width,
        toY: toNode.y * this.height,
        progress: 0,
        speed: 0.015 + Math.random() * 0.01,
        color: fromNode.status === 'crashed' || toNode.status === 'crashed' ? '#dc2626' : '#0284c7'
      });
    }
  }

  draw() {
    // Clear Canvas with crisp light studio background
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Draw Topology Connections (Edges)
    this.edges.forEach(edge => {
      const fromNode = this.nodes.find(n => n.id === edge.from);
      const toNode = this.nodes.find(n => n.id === edge.to);
      if (!fromNode || !toNode) return;

      const fx = fromNode.x * this.width;
      const fy = fromNode.y * this.height;
      const tx = toNode.x * this.width;
      const ty = toNode.y * this.height;

      this.ctx.beginPath();
      this.ctx.lineWidth = 2;
      this.ctx.strokeStyle = fromNode.status === 'crashed' || toNode.status === 'crashed' ? 'rgba(220, 38, 38, 0.35)' : 'rgba(2, 132, 199, 0.25)';
      this.ctx.moveTo(fx, fy);
      this.ctx.lineTo(tx, ty);
      this.ctx.stroke();
    });

    // Draw eBPF Packets
    if (Math.random() < 0.35) this.spawnPacket();

    for (let i = this.packets.length - 1; i >= 0; i--) {
      const p = this.packets[i];
      p.progress += p.speed;

      if (p.progress >= 1) {
        this.packets.splice(i, 1);
        continue;
      }

      const px = p.fromX + (p.toX - p.fromX) * p.progress;
      const py = p.fromY + (p.toY - p.fromY) * p.progress;

      this.ctx.beginPath();
      this.ctx.arc(px, py, 4.5, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color;
      this.ctx.shadowBlur = 6;
      this.ctx.shadowColor = p.color;
      this.ctx.fill();
    }

    // Draw K8s Pod Nodes
    this.nodes.forEach(node => {
      const nx = node.x * this.width;
      const ny = node.y * this.height;

      // Outer Ring Pulse
      this.ctx.beginPath();
      this.ctx.arc(nx, ny, 24, 0, Math.PI * 2);
      this.ctx.fillStyle = node.status === 'crashed' ? 'rgba(220, 38, 38, 0.12)' : 'rgba(2, 132, 199, 0.08)';
      this.ctx.fill();

      // Core Node Circle
      this.ctx.beginPath();
      this.ctx.arc(nx, ny, 15, 0, Math.PI * 2);
      this.ctx.fillStyle = node.color;
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = node.color;
      this.ctx.fill();

      // Node Label (High-contrast slate dark font)
      this.ctx.font = '700 12px "JetBrains Mono", monospace';
      this.ctx.fillStyle = '#0f172a';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(node.name, nx, ny + 34);
    });

    this.animId = requestAnimationFrame(() => this.draw());
  }

  start() {
    if (!this.animId) {
      this.animId = requestAnimationFrame(() => this.draw());
    }
  }

  stop() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }
}
