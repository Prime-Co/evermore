# Security Specification: Evermore AI Firestore Rules

## 1. Data Invariants
1. **User Identity Invariant**: A user document in `/users/{userId}` can only be created or written by the authenticated user whose `request.auth.uid == userId`.
2. **Key Integrity**: Documents must not contain ghost fields (strict `hasOnly`).
3. **No Self-Privilege Escalation**: Users cannot create or modify documents in `/admins/{adminId}` or alter their own permissions.
4. **Immutable Identity**: `id` and `createdAt` cannot be altered on update.
5. **PII Isolation**: A user's profile in `/users/{userId}` is strictly private and can only be read (`get`) by the owner (`request.auth.uid == userId`) or a registered administrator.
6. **No Blanket Queries**: Querying `/users` via `list` is restricted to admins only; individual users cannot list all users.

## 2. The "Dirty Dozen" Payloads
1. **Payload 1 (Impersonation Write)**: An unauthenticated user attempts to create a profile at `/users/user123`.
2. **Payload 2 (Cross-User Write)**: User with UID `user_A` attempts to write to `/users/user_B`.
3. **Payload 3 (Cross-User Read)**: User with UID `user_A` attempts to read `/users/user_B`.
4. **Payload 4 (Admin Escalation)**: User with UID `user_A` attempts to create `/admins/user_A`.
5. **Payload 5 (Ghost Field Attack)**: User with UID `user_A` attempts to insert `{ "role": "admin", "isSuperAdmin": true }` into `/users/user_A`.
6. **Payload 6 (Oversized ID / Denial of Wallet)**: User attempts to write to document with a 500-character junk ID string.
7. **Payload 7 (Oversized Payload / Value Poisoning)**: User attempts to insert a 2MB string into `fullName`.
8. **Payload 8 (Invalid Status Shortcutting)**: User attempts to create an account with status `super_verified` not in the enum.
9. **Payload 9 (Blanket Scraping)**: Non-admin user attempts an unbounded `list` on `/users`.
10. **Payload 10 (Immutable ID Tampering)**: User attempts to update their user doc with a different `id` field.
11. **Payload 11 (Unverified Email Write)**: Attacker attempts to forge user document without a verified token when required.
12. **Payload 12 (Direct Root Collection Write)**: Attacker attempts to write to an undefined collection `/{document=**}`.

## 3. Test Runner Invariant
All 12 payloads must result in `PERMISSION_DENIED` under the generated `firestore.rules`.
