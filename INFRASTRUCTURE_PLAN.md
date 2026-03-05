## Infrastructure Overview and Improvement Roadmap

This project already ships with a production‑oriented deployment stack based on:

- **GitHub Actions** for CI/CD with reusable workflows.
- **Single‑server Docker orchestration** via `docker-compose.local.yml` (app, nginx, MongoDB, Redis, optional metrics stack with Prometheus + Grafana + Loki, etc.).
- **Blue/green deployments** implemented through `scripts/local-containers-run.sh` and GitHub Actions logic.
- **Automated TLS** provisioning and renewal using Certbot containers and shared Docker volumes.

For many small and medium‑sized projects, this setup is a strong baseline: it provides reproducible deploys, health checks, observability, and a safe way to roll out new versions without immediately breaking production.

However, there are two natural directions to evolve the infrastructure:

- **Plan A – “Hardened Single‑Server Stack”**: keep the current architecture (single VPS + Docker Compose), but make the underlying infrastructure reproducible and safer with Infrastructure as Code (Terraform), better secrets and access management, and clearer operational playbooks.
- **Plan B – “Cluster‑Ready Kubernetes Stack”**: gradually move to a multi‑node, Kubernetes‑based deployment with a proper ingress controller (Traefik or nginx), managed databases, and GitOps‑style workflows.

These plans are complementary:

- Plan A is a **low‑friction, high‑ROI improvement path** for teams that want more reliability and repeatability without a big operational jump.
- Plan B is a **long‑term option** for when you outgrow a single server in terms of scale, availability, or organizational requirements.

This document is intended to be used both:

- By humans as a **roadmap of recommended infrastructure improvements**.
- By AI agents as a **high‑level specification** of what to prepare when helping you implement or migrate to a specific deployment option (Plan A vs Plan B).

---

## Plan A – Hardened Single‑Server Stack (Terraform + Better Ops)

### Goal

Keep the existing single‑server + Docker Compose architecture, but make it:

- **Reproducible**: servers and DNS can be created from code.
- **Safer**: better secrets management and SSH practices.
- **Easier to operate**: documented procedures for common operations.

This plan assumes you are mostly happy with:

- A single (or very small number of) VPS instances.
- Docker Compose as the main orchestration layer.
- The current blue/green deploy logic baked into scripts and workflows.

### Core Changes

1. **Introduce Terraform for infrastructure**
   - Define:
     - VPS instances (compute) for `stage` and `prod`.
     - Security groups / firewall rules (SSH 22, HTTP 80, HTTPS 443).
     - DNS records for `nextjs-super-boilerplate.visn-ai.io` (and any other domains) via your DNS provider.
   - Store Terraform state remotely (e.g. S3/GCS + state locking).
   - Use environment‑specific workspaces or separate state files for `stage` and `prod`.

2. **Harden server access**
   - Replace **SSH password** authentication with:
     - SSH key pairs stored in a secure place (e.g. password‑protected private key in a secrets manager).
     - GitHub Actions using SSH keys instead of `server_password` in workflow secrets.
   - Enforce `AllowUsers`, disable root login where practical, and optionally limit SSH by IP.

3. **Formalize deploy environments**
   - Keep the existing GitHub Actions workflows, but:
     - Make `stage` and `prod` infrastructure/state clearly separated (Terraform variables and workspaces).
     - Ensure `.env.stage` and `.env.prod` are generated in a consistent way (from GitHub Secrets) and documented.
   - For AI agents: treat each environment as a separate target with its own Terraform variables and secrets.

4. **Improve secrets and config management**
   - Keep using GitHub Secrets as the primary source of truth, but:
     - Add a thin convention around naming (`WEB_ENV_STAGE`, `WEB_ENV_PROD`, etc.).
     - Optionally introduce SOPS or a cloud secret manager (AWS/GCP/Azure) if you need more control or key rotation.
   - Document how `.env.*` files are constructed and where DB credentials live.

5. **Operational playbooks**
   - Document and automate common operational tasks:
     - Disk cleanup (`./scripts/local-containers-run.sh clean` and `prune-images`).
     - Manual certificate renewal (`renew-certs`).
     - MongoDB volume reset for corrupted or mis‑configured databases.
   - For AI agents: reference these scripts as **first‑line tools** instead of ad‑hoc Docker commands.

6. **Monitoring & metrics strategy**
   - Decide environment‑by‑environment whether to enable the metrics stack:
     - For small VPS (1 vCPU) keep `metrics_enabled: false` in prod, use it only temporarily for diagnostics.
     - For larger servers (2+ vCPUs) keep metrics on full‑time.
   - Keep Grafana and Prometheus configuration under version control in this repo.

### Outcomes

With Plan A in place:

- You can **recreate the infrastructure** (servers, DNS, firewall) with Terraform.
- The deployment flow (GitHub Actions → server → Docker Compose) remains unchanged but is **more predictable**.
- Operational knowledge is captured in scripts and documentation, making it easier for humans and AI agents to diagnose and fix issues.

---

## Plan B – Cluster‑Ready Kubernetes Stack (K8s + Ingress + GitOps)

### Goal

Evolve from the single‑server Docker Compose deployment to a **Kubernetes‑based** architecture that supports:

- Multiple nodes / higher availability.
- Native primitives for rolling updates, canaries, and scaling.
- Stronger separation of concerns between infrastructure, platform, and application code.

Plan B is intentionally **more complex** and should usually be considered after most of Plan A is stable (Terraform, secrets, basic ops).

### Core Changes

1. **Define the Kubernetes platform**
   - Choose a Kubernetes flavor:
     - Managed cluster (EKS, GKE, AKS, etc.).
     - Or self‑managed cluster on top of cloud VMs or bare metal (only if you have strong ops expertise).
   - Use Terraform to create:
     - The cluster itself.
     - Networking (VPC/VNet, subnets, security groups, load balancers).
     - DNS zone and records for your domains.

2. **Introduce an Ingress controller (Traefik or nginx‑ingress)**
   - Replace the current nginx + Certbot logic with:
     - A Kubernetes Ingress controller (Traefik is a good option; nginx‑ingress is also fine).
     - **cert-manager** to manage Let’s Encrypt certificates via Kubernetes resources.
   - Configure:
     - `Ingress` resources mapping `nextjs-super-boilerplate.visn-ai.io` to the app service.
     - HTTP → HTTPS redirects, TLS, and potentially path‑based routing for multiple apps.

3. **Package the app for Kubernetes**
   - Create Kubernetes manifests or a Helm chart for:
     - `Deployment` + `Service` for the Next.js app image.
     - Optional `StatefulSet` or external managed services for MongoDB/Redis (prefer managed DBs where possible).
   - Move the current Docker Compose concerns into K8s equivalents:
     - Resource limits/requests → `resources` in Pod specs.
     - Health checks → Kubernetes `livenessProbe` / `readinessProbe`.
   - For blue/green / rolling updates:
     - Use Deployment `strategy` (RollingUpdate) or a dedicated tool (Argo Rollouts, Flagger) for canary/blue‑green.

4. **Observability stack in Kubernetes**
   - Replace the Docker Compose metrics stack with:
     - Prometheus (or Prometheus Operator).
     - Grafana.
     - Loki + Promtail or another logging solution.
   - Expose dashboards similarly to how Grafana is currently exposed, but via Ingress.

5. **CI/CD adjustments**
   - Keep GitHub Actions as CI but adjust deploy steps:
     - Build and push Docker image (GHCR or another registry).
     - Apply manifests via `kubectl` or use a GitOps tool (Argo CD / Flux) that watches a separate config repo.
   - For AI agents:
     - Treat deploys as updates to Kubernetes manifests or Helm values, not as `scp` + remote Docker Compose commands.

6. **Migration strategy from Compose to Kubernetes**
   - Start with a **stage cluster**:
     - Deploy the app and supporting services in parallel to existing stage on Docker Compose.
     - Smoke‑test endpoints, TLS, and scaling behavior.
   - Gradually move prod traffic:
     - Either switch DNS to point to the new Ingress.
     - Or use a traffic‑splitting layer / canary mechanism to migrate gradually.

### Outcomes

With Plan B in place:

- The app runs on a **clustered**, more fault‑tolerant platform.
- Deployments are expressed in **Kubernetes resources** (YAML/Helm), making it easier to:
  - Scale horizontally.
  - Integrate with service mesh, policy engines, and advanced security controls.
- The ingress + cert‑manager stack replaces custom nginx + Certbot scripting, reducing custom operational logic.

---

## How to Use This Document with Agents

- When asking an AI agent to help with **incremental improvements** on the existing stack, reference **Plan A** and this repo’s current scripts and workflows.
- When exploring or preparing for a **Kubernetes migration**, reference **Plan B** and ask the agent to:
  - Propose concrete Terraform modules and Kubernetes manifests.
  - Map current Docker Compose services to Kubernetes resources.
  - Design a safe migration path that preserves blue/green semantics and monitoring.

This file is the single source of truth for high‑level infrastructure evolution decisions for this project.

