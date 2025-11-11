# Workflow

## SOA Best-Practices Workflow for the Reminders Service

### 0. Before coding: check architectural impact

1. Write in 2–3 sentences:

   * What business problem does this change solve?
   * Why does it belong in the **Reminders Service** and not another service?
2. Validate:

   * Does it increase **coupling** with another service?
   * Does it require this service to know another service’s internal details?

If yes to any of those, fix the design before touching code.

---

### 1. Always start from the contract (API First)

1. Update or define the **OpenAPI** spec:

   * New endpoints, parameters, status codes.
   * `Reminder` schema and error schema (`application/problem+json`).
2. Contract checklist:

   * [ ] Are responses coherent (`2xx`, `4xx`, `5xx`)?
   * [ ] Is the API consistent (names, routes, verbs)?
   * [ ] Are changes **backward compatible**? If not, did you version it (e.g. `/v2`)?

Only when the contract is clear → start implementation.

---

### 2. Design the internal service flow

For the Reminders Service, define the internal flow of each operation:

1. Steps:

   * Input validation.
   * Business logic.
   * Database access.
   * Simulated orchestration / messaging (via logs).
2. SOA rules:

   * No direct access to other services’ databases.
   * Cross-service communication only via HTTP or messaging (in this project: **simulated with logs**).
   * Idempotency on critical operations (`POST /reminders` with `Idempotency-Key`).

---

### 3. Implementation driven by contracts and tests

Recommended order:

1. Create/update:

   * Domain model `Reminder`.
   * Use cases / application services (don’t mix business logic into controllers).
2. Write first:

   * **Unit tests** for business logic (validations, rules).
   * **Component/contract tests** for the REST API (black-box).
3. Implement controllers and adapters:

   * Express/Fastify routes.
   * Input/output mappers.
   * Centralized error handling → `application/problem+json`.

Pre-commit checklist:

* [ ] All unit tests are green.
* [ ] All component/contract tests are green.
* [ ] Errors use RFC 7807.
* [ ] Idempotency is respected where required.

---

### 4. Versioning and compatibility

Simple rule for this project:

* **Non-breaking changes** (new optional fields, new endpoints):

  * Keep same version.
* **Breaking changes** (change meaning of fields, remove behavior):

  * New API version (`/v2/...`) or a new representation.

Before merging:

* [ ] Decide if the change is breaking or not.
* [ ] Document the decision in `README` or `docs/architecture-decisions.md`.

---

### 5. Minimal quality “pipeline” (even if manual)

Even for an academic project, enforce this:

1. **Before push**:

   * `npm run lint`
   * `npm test`
2. **Before calling a feature “done”**:

   * Check logs for errors and events:

     * Are “scheduler” events clearly logged when reminders are created?
     * Is `emitReminderDueEvent` logging meaningful messages?

If something fails, it’s not deliverable.

---

### 6. Keep documentation alive

For each significant change:

1. Update the service documentation:

   * Summary of impacted endpoints.
   * Request/response examples.
   * How to run the related tests.
2. If the change touches SOA concerns (coupling, messaging, idempotency), add 2–3 lines:

   * Which principle is applied.
   * Where it shows in the code (file/path).

---

### 7. Short “daily operation rule”

For each feature/change:

1. Validate fit: does it belong in this service and keep coupling low?
2. Adjust OpenAPI first.
3. Design a simple internal flow, no cross-service shortcuts.
4. Write tests (unit + component).
5. Implement respecting:

   * Idempotency.
   * Standard error responses (`problem+json`).
   * Clear service boundaries.
6. Run linters and tests.
7. Update minimal documentation.

If you want, next step is to turn this into `WORKFLOW_SOAREMINDERS.md` with a short intro and example sections.
