#SOA

## 0. Initial Project Setup

1. **Repository and structure**

   * Decide mono-repo vs multi-repo (minimum: one repo for SOA backend).
   * Suggested folders:

     * `services/reminders-service`
     * `services/notification-service`
     * `services/integration-acl`
     * `infra/` (WSO2, Camunda, RabbitMQ, PostgreSQL, Keycloak or similar)
     * `docs/`

2. **Basic rules**

   * Branching convention: `main`, `develop`, `feature/*`.
   * Commit and PR conventions.
   * Global Definition of Done (see last section).

---

## 1. Requirements & Service Discovery Phase

1. **Business capabilities**

   * List key capabilities:

     * Reminders management
     * Notifications
     * Integration with LMS / institutional calendar
     * Authentication / authorization

2. **Core use cases**

   * Write clear use cases / user stories, e.g.:

     * Create a reminder.
     * Reminder reaches due time and triggers a notification.
     * Sync tasks/events from LMS or calendar into reminders.

3. **SOA service identification**

   * At minimum, define:

     * Reminders Service
     * Notification Service
     * Integration / ACL Service
     * Auth Service (or external IdP integration)

4. **Non-functional requirements**

   * Security (JWT/OAuth2).
   * Basic observability (logs, traces, metrics).
   * “Academic-level” scalability (nothing crazy, but coherent).

**Output:**
List of services with clear responsibilities and 3–5 well-defined use cases.

---

## 2. Architecture & Contracts Phase (API-First)

1. **Domain model and boundaries**

   * Define bounded contexts per service: who owns which data.

2. **Service contracts (OpenAPI)**

   * For each service:

     * Design main REST endpoints.
     * Request/response schemas.
     * Error schema using `application/problem+json`.

3. **Events and messaging**

   * Define events like:

     * `ReminderCreated`, `ReminderDue`, `NotificationSent`.
   * Specify the payload for each event.

4. **Integration topology**

   * Design:

     * API Gateway (WSO2).
     * BPMN flows in Camunda (timer for reminders).
     * RabbitMQ exchanges/queues.
     * ACL for LMS/calendar (e.g., Apache Camel).

**Output:**
`docs/architecture.md`, OpenAPI contracts, event schemas, and at least one high-level diagram (services + gateway + messaging + BPM).

---

## 3. Dev Infrastructure Phase (Dev Environment / Infra as Code)

1. **Dev environment with Docker Compose**

   * `infra/docker-compose.dev.yml` including:

     * PostgreSQL
     * RabbitMQ
     * Camunda 8 (broker + UI, minimal)
     * WSO2 API Manager (or stub)
     * (Optional) Keycloak or another IdP

2. **Service bootstrapping (stubs)**

   * Create empty service skeletons:

     * `services/reminders-service` (Node.js + TS)
     * `services/notification-service`
     * `services/integration-acl`
   * Each with:

     * Minimal server
     * `/health` endpoint

3. **Minimal CI (even if local/manual)**

   * Scripts:

     * `npm run lint`
     * `npm test`
   * A single command like `make dev-up` or `npm run dev:up` to bring up the stack.

**Output:**
Full stack comes up locally with `docker-compose`, and all services respond to `/health`.

---

## 4. Service Implementation Phase (service-by-service loop)

For **each** service, follow your SOA workflow (API-first, low coupling, tests first where possible).

### 4.1 Reminders Service

1. Apply the SOA workflow:

   * Validate the logic belongs here.
   * Start from OpenAPI spec.
   * Design internal flow.

2. Implement:

   * Domain model `Reminder` + domain layer.
   * CRUD endpoints: `POST/GET/PATCH/DELETE`.
   * Idempotency for `POST /reminders`.
   * Persistence with PostgreSQL.
   * RFC 7807 error handling (`application/problem+json`).

3. Testing:

   * Unit tests (business rules).
   * Component / API tests (black-box).
   * Integration tests (service + DB).

4. Document:

   * How to run only this service.
   * How to run its tests.

### 4.2 Notification Service

1. RabbitMQ consumer for `reminder_due` queue.
2. Logic to construct notification messages.
3. Mock or real integration with FCM/APNs.
4. Tests:

   * Unit tests (message formatting, basic logic).
   * Integration tests (queue consumption).
5. Clear logs to verify E2E behavior.

### 4.3 Integration / ACL Service

1. Routes/connectors to LMS and institutional calendar.
2. Transform external events → internal commands (`CreateReminder`, etc.).
3. Ensure business logic stays inside Reminders Service, not here.
4. Integration tests simulating external payloads.

### 4.4 Security / Auth (minimal viable)

1. Integrate with API Gateway or IdP.
2. Validate JWT in services.
3. Basic authorization by roles/claims.

---

## 5. SOA Integration Phase (wire everything together)

1. **API Gateway (WSO2)**

   * Import Reminders OpenAPI.
   * Configure:

     * Rate limiting.
     * JWT validation.
     * CORS.

2. **Camunda**

   * Deploy BPMN model for the reminders process.
   * Implement workers to:

     * Schedule reminders.
     * Emit events to RabbitMQ when timers fire.

3. **RabbitMQ**

   * Configure exchanges and queues for `reminder_due` and DLX.
   * Define retry/backoff policies.

**Output:**
A full end-to-end flow at integration level (even if semi-manual):
create reminder → Camunda schedules → RabbitMQ receives `reminder_due` → Notification Service consumes it.

---

## 6. Global Testing Phase (Testing Strategy)

1. **Unit tests**

   * Cover domain logic inside each service.

2. **Contract / component tests**

   * Verify APIs comply with OpenAPI (Dredd/Postman, or Jest + Supertest aligned with the spec).

3. **Integration tests**

   * Real services + PostgreSQL + RabbitMQ.
   * Include failure scenarios (DB down, queue down).

4. **End-to-End (E2E) tests**

   * Full scenario:

     * User creates a reminder through API Gateway.
     * It gets scheduled in Camunda.
     * `reminder_due` message lands in RabbitMQ.
     * Notification Service “sends” the notification (mock/log assertion).

5. **Basic smoke/performance (academic level)**

   * Load a moderate number of reminders.
   * Verify system remains responsive and behaves correctly.

---

## 7. Observability & Operations Phase

1. **OpenTelemetry**

   * Instrument at least:

     * Incoming HTTP requests.
     * DB calls.
     * Message publish/consume operations.

2. **Logging**

   * Use correlation IDs per request/flow.
   * Log `info`/`warn`/`error` with enough context.

3. **Basic metrics**

   * Number of reminders created / due / failed.
   * Number of notifications sent / failed.

4. **Minimal dashboard**

   * Even for academic purposes, define:

     * A simple dashboard or
     * At least saved queries or views to check system health.

---

## 8. Documentation & Final Deliverable Phase

1. **Installation guide**

   * Requirements (Node, Docker, etc.).
   * Commands to bring up the whole stack (`docker-compose`).

2. **Execution guide**

   * How to call APIs (curl/Postman examples).
   * How to trigger full E2E scenarios.

3. **Testing guide**

   * Commands for unit / integration / E2E tests.
   * What “success” looks like (expected outputs / logs).

4. **Architecture document**

   * Service diagram.
   * Justification of SOA decisions (low coupling, idempotency, messaging, ACL, orchestration).

5. **Limitations and future work**

   * What was simplified for academic reasons.
   * What you would do differently in a real production system.

---

## Global Definition of Done (for the whole project)

Before you declare the project “implemented”:

* [ ] All services run locally via `docker-compose`.
* [ ] The main E2E use case works from end to end.
* [ ] Unit and component tests pass.
* [ ] There are at least:

  * Some integration tests.
  * One documented E2E flow.
* [ ] Architecture and contracts are documented.
* [ ] You can clearly explain how SOA is applied:

  * Low coupling
  * Explicit contracts
  * Messaging and orchestration
  * Separation of concerns via services and ACL.

You can now turn this into a Copilot prompt like:
“Generate boilerplate folders, scripts, and base files following this workflow for the AI Companion SOA project.”
