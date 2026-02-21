<!-- instructions:  after you complete a prompt, archive it above, create a nice comp sci summary of details and move the old prompt below above to the archive.
 New prompts are posted below. -->

---

## Archived Prompts

### Prompt #1 - App Feature Overview Document
**Status:** Completed
**Output:** `docs/app-feature-overview.md`

**Original Prompt:**
> Create an app feature overview markdown file that describes a cute little app called ramzee. This app is like twitter but for students at the university of rhode island. Describe basic features such Bleats instead Tweets and Huffs instead of Likes. Think of other cute things like that.

**CS Summary:**
Created comprehensive product specification document defining Ramzee's feature set and terminology mapping. Document establishes core domain language (Bleats, Huffs, Rebaa, Graze) that will inform data model naming conventions and API endpoint design. Feature categories include: social graph management (Flock/Graze system), content creation (Bleats with media support), engagement metrics (Huffs, Rebaa), group functionality (Herds), real-time messaging (Barn Chat), and gamification layer (Wool Awards, Rhody Points). Authentication scoped to URI email domain validation. Document serves as functional requirements baseline for future sprint planning and user story derivation.

---

### Prompt #2 - Software Architecture Specification
**Status:** Completed
**Output:** `docs/architecture-specification.md`

**Original Prompt:**
> Polish and improve the next prompt act as the worlds leading tech entrepreneur out of silicon valley. Take /docs/app-feature-overview.md and create a world-class software engineering and architecture specification markdown document.

**CS Summary:**
Delivered enterprise-grade technical architecture specification covering 13 major domains. **System Design:** Event-driven microservices architecture with domain isolation (User, Bleat, Feed, Barn, Notify, Herd, Search, Media, Gamify, Moderate services). **Data Layer:** PostgreSQL 16 with table partitioning for temporal data, Redis Cluster for feed fan-out-on-write pattern, Elasticsearch for full-text search, Kafka for async event streaming. **API Design:** RESTful endpoints with cursor-based pagination, consistent response envelopes, rate limiting at 100 req/min/user. **Real-Time:** WebSocket gateway with Redis Pub/Sub for live updates across feed, messaging, and notifications. **Security:** Zero-trust architecture with JWT (ES256) access tokens (15-min TTL), rotating refresh tokens, Argon2id password hashing, URI email domain validation. **Infrastructure:** AWS EKS deployment with Terraform IaC, GitHub Actions CI/CD, horizontal pod autoscaling. **Observability:** OpenTelemetry distributed tracing, Prometheus metrics, structured JSON logging to OpenSearch. **Mobile:** Native iOS (Swift/SwiftUI) and Android (Kotlin/Compose) with clean architecture, offline-first sync. **Scalability:** Multi-campus expansion roadmap with campus-aware sharding strategy and feature flag system. Document includes complete database schemas, Kubernetes manifests, performance budgets, testing pyramid, and Architecture Decision Records (ADRs).

---

### Prompt #3 - Product Backlog & Sprint Planning
**Status:** Completed
**Output:** `docs/product-backlog.md`

**Original Prompt:**
> Polish and improve the next prompt act as the worlds leading tech entrepreneur out of silicon valley. Use the architecture-specification.md file to create user epics, stories, sprints and testing backlog.md file. Design this for a team of 5 to 8 software engineers.

**CS Summary:**
Delivered comprehensive Agile product backlog optimized for a 5-8 engineer team using 2-week sprints. **Structure:** 13 epics spanning Foundation (E0) through Polish & Launch (E13), containing 100+ user stories with story point estimates totaling ~544 points. **Team Model:** 6-person core team (Tech Lead, 2 Backend, iOS, Frontend, Full-Stack) with optional +2 scaling (Android, DevOps). **Sprint Planning:** 12-sprint roadmap with velocity assumptions of 45-55 points/sprint for 6 engineers, detailed sprint breakdowns for Sprints 1-2 with assignee mapping. **Story Format:** Each story includes acceptance criteria with specific technical requirements, enabling autonomous developer execution. **Testing Strategy:** Comprehensive testing backlog covering unit tests (80-90% coverage targets), 94+ integration tests across 7 API suites, 7 E2E Playwright flows for critical paths, performance benchmarks (1000 RPS, P99 < 200ms), and security testing requirements (Snyk, CodeQL, OWASP ZAP). **Quality Gates:** Three-tier Definition of Done (Story, Sprint, Release) ensuring consistent delivery standards. Document enables immediate sprint planning and backlog grooming sessions.

---

## Active Prompts

*No active prompts. Add new prompts below this line.*
