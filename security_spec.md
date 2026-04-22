# Security Specification: Multitenant POS Audit

## 1. Data Invariants
- **Tenant Isolation:** A document belonging to `companyA` must never be readable or writable by a user belonging to `companyB`.
- **Identity Integrity:** The `staff.userId` or `enterprise.ownerId` must match the `request.auth.uid`.
- **Role-Based Access Control (RBAC):** Only `owner` or `manager` roles (verified via `staff` collection lookup) can modify financial data (products, sales records).
- **Immutable Timestamps:** `createdAt` and `startTime` cannot be changed after creation.
- **Strict Schema:** All writes must match the exact key set and types defined in `firebase-blueprint.json`.

## 2. The "Dirty Dozen" (Audit Attack Payloads)

1.  **Identity Spoofing (Cross-Tenant Write):**
    - Payload: `{ id: 'shop-1', enterpriseId: 'victim-ent', name: 'Malicious' }` sent using auth token for `attacker-ent`.
    - Expected Result: `PERMISSION_DENIED`
2.  **Privilege Escalation:**
    - Payload: `{ role: 'owner' }` sent by a user with `role: 'waiter'` to their own `staff` document.
    - Expected Result: `PERMISSION_DENIED`
3.  **PII Scraper (Cross-Tenant List):**
    - Query: `db.collection('staff').where('active', '==', true)` without filtering by `enterpriseId`.
    - Expected Result: `PERMISSION_DENIED` (Rules must enforce `resource.data.enterpriseId == request.auth.token.companyId`).
4.  **Ghost Field Injection:**
    - Payload: `{ id: 'pro-1', ..., name: 'Burger', isVerifiedByAdmin: true }` (where `isVerifiedByAdmin` is not in schema).
    - Expected Result: `PERMISSION_DENIED`
5.  **Timestamp Backdating:**
    - Payload: `{ ..., createdAt: 1000000000 }` (attempting to set an old date on creation).
    - Expected Result: `PERMISSION_DENIED` (Must use `request.time`).
6.  **Resource Poisoning (ID Spam):**
    - Document ID: `junk-character-sequence-of-1MB`
    - Expected Result: `PERMISSION_DENIED` (via `isValidId()`).
7.  **Inventory Theft (Negative Stock):**
    - Payload: `{ stock: -100 }`
    - Expected Result: `PERMISSION_DENIED` (Validation helper must check `val >= 0`).
8.  **Order Outcome Override:**
    - Payload: `{ status: 'cancelled' }` on an order already marked as `delivered`.
    - Expected Result: `PERMISSION_DENIED` (Terminal state locking).
9.  **Master Key Brute Force:**
    - Payload: `{ used: true }` on a random `masterKeys` ID.
    - Expected Result: `PERMISSION_DENIED` (Only `isAdmin` can list/read unused keys generally, or if used, only owner).
10. **Shadow Administrator:**
    - Payload: Creating a document in a non-existent `/admins/` collection to trigger `isAdmin()` helper.
    - Expected Result: `PERMISSION_DENIED` (Only global super-admin can create admins).
11. **Relational Orphan:**
    - Payload: Creating a `Product` for a `shopId` that doesn't exist in that enterprise.
    - Expected Result: `PERMISSION_DENIED` (via `exists()` check).
12. **PII Leak via Metadata:**
    - Payload: Reading `users/{userId}` of a different user.
    - Expected Result: `PERMISSION_DENIED` (Isolate PII to `isOwner`).

## 3. Audit Success Criteria
- All collections must have a default-deny layer.
- `allow list` must have explicit `resource.data.enterpriseId` checks.
- `allow update` must use `hasOnly()` for field-level security.
- `isValid[Entity]` must be present in every write operation.
