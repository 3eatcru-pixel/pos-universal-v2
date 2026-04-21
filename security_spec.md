# Firestore Security Specification for RestManager POS

## Data Invariants
- An order must belong to an enterprise and a shop.
- Only employees of an enterprise can view its data.
- PINs and Master Keys are sensitive and must be protected.
- Backups are only accessible to the enterprise they belong to.
- Timestamps must correspond to the server time.

## The Dirty Dozen Payloads (Targeting Logic Leaks)

1. **Privilege Escalation:** Anonymous user trying to create a staff member with 'owner' role.
2. **Master Key Snipe:** Authenticated user trying to read all `masterKeys` to find an unused one.
3. **Enterprise Hijack:** User A trying to update User B's `enterprise` name.
4. **Shadow Order:** User trying to update an order's `total` after it's been delivered.
5. **PII Leak:** User A trying to read User B's staff profile (specifically `phone` or `pin`).
6. **Stock Manipulation:** Waiter trying to update `currentStock` in `inventory` without manager role permissions.
7. **Phantom Reservation:** User creating a reservation with a `dateTime` in the past.
8. **ID Poisoning:** Creating a shop with a 2MB string as the Document ID.
9. **Relational Sync Break:** Creating an order for a `shopId` that doesn't exist in the system.
10. **Immutable Field Attack:** Attempting to change the `enterpriseId` of a product after creation.
11. **Timestamp Spoof:** Sending a `createdAt` value from 1970 to bypass sorting logic.
12. **Bulk Delete:** Attempting to delete the entire `orders` collection via a list query exploit.

## Verification
These payloads must be rejected by the rules with `PERMISSION_DENIED`.
I will now generate the hardened `firestore.rules` and save to `DRAFT_firestore.rules` for audit.
