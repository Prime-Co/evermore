# Firebase Integration Plan

Firebase is intentionally not connected yet. When integration begins, keep the frontend structure intact and implement the backend behind these boundaries:

1. Firebase Authentication — registration, login, session persistence, password reset.
2. Firestore — user profiles, account status, payment submissions, admin records, settings and audit logs.
3. Firebase Storage — private payment-proof uploads.
4. Firebase Security Rules — users may access only their own records; admin operations must be role-protected.
5. Optional Cloud Functions — privileged payment approval/rejection and other server-side operations.

The target business flow is:
Signup → Dashboard → Activate Account → Payment → Upload Proof → Admin Review → Approve/Reject → Account Status Update → Telegram onboarding.

Daily task delivery/monitoring remains outside the website and can continue through Telegram.
