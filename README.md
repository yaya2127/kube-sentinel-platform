# 🛡️ KUBE-Sentinel — Autonomous Kubernetes Mesh & Chaos Resilience Engine

Institutional-grade, cloud-native Kubernetes microservice mesh resilience and chaos engineering platform built with a **Monospaced Dark Slate Enterprise Interface**, 60 FPS interactive DAG topology graph, automated Chaos Monkey fault injection, real-time eBPF network span tracing, and self-healing watchdog.

---

## 🌟 Key Architecture & Capabilities

### 1. 🕸️ Kubernetes Microservice DAG Topology Canvas (`js/cluster.js`)
- 60 FPS HTML5 Canvas engine rendering continuous dependency graph nodes (`ingress`, `auth-service`, `payment-gateway`, `order-processor`, `redis-cluster`, `postgres-primary`).
- Real-time eBPF network packet pulse animations illustrating sub-millisecond inter-service gRPC / HTTP request spans.

### 2. 🔥 Chaos Monkey Fault Injection Engine (`js/app.js`)
- **Pod Kill Switch**: Simulates `SIGKILL` on pods to test K8s replica rescheduling & MTTR (Mean Time To Recovery).
- **Latency Injection (+180ms)**: Introduces artificial network delay across service mesh to verify timeout circuit breakers.
- **Packet Loss (30%)**: Drops TCP packets to test retries & exponential backoff protocols.
- **CPU Stress (99%)**: Simulates heavy CPU load to verify Horizontal Pod Autoscaler (HPA) triggers.

### 3. 🛡️ K8s Self-Healing Watchdog & Compliance Exporter
- Automated K8s Watchdog detecting crashed pods and rescheduling healthy replacement replicas in < 4 seconds.
- 1-Click Export of formal printable Kubernetes Resilience Compliance Audit Reports (.txt / PDF summary).

---

## 💻 Tech Stack & Standards

- **Core Microservices**: Go (Golang 1.22) & Kubernetes Client-Go APIs
- **Frontend Engine**: HTML5 Canvas, Vanilla ES6+, CSS3 Custom Properties
- **Design System**: Monospaced Enterprise Datadog/Grafana Slate Dark Theme
- **Cloud Standards**: Kubernetes v1.30, eBPF (Cilium/Istio), CNCF Chaos Engineering Specs, ISO 27001 Audit Compliance

---

## 🌐 Live Web Application & Deployment

- **Live Application**: [yaya2127.github.io/kube-sentinel-platform](https://yaya2127.github.io/kube-sentinel-platform/)
- **GitHub Repository**: [github.com/yaya2127/kube-sentinel-platform](https://github.com/yaya2127/kube-sentinel-platform)

---

## 📄 License

MIT License — Developed by **Yared Kinetibeb Tesfaye** (5th-Year Computer Engineering Senior @ Addis Ababa Science and Technology University).
