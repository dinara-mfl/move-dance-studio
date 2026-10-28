# Verification report

Verified locally on 28 October 2026 with Node 24.8.0.

## Automated

`npm test`: **8 tests passed**.

- Rolling schedule keeps the same class identity, style, instructor and studio.
- Replayed payment fulfillment grants a pass only once and rejects mismatched ownership.
- Booking consumes one credit; duplicate booking leaves the balance unchanged.
- Cancellation checks ownership and returns a credit only once.
- Missing/expired credits cannot reserve a class.
- The thirteenth reservation is rejected for a twelve-place class without consuming credit.
- Late cancellation is rejected.
- Started/unknown classes are rejected without consuming credit.

`npm run build`: successful Vite production build.

HTTP smoke checks: built homepage returns 200; `/api/health` reports demo mode; protected `/api/me` returns 503 in demo mode, as designed.

## Browser checks

- Desktop homepage, imagery, schedule and account inspected.
- Demo login → four-class pass purchase → reservation → three remaining credits.
- Cancellation → four remaining credits.
- Simulated PayPal selection and purchase.
- Production build booking flow repeated successfully.
- Style filter and empty state inspected.
- Mobile navigation and schedule tested at 390 × 844; no horizontal overflow.
- Production-page console check showed no errors from the production origin. Development hot-reload errors appeared during component restructuring; the final production flow was tested separately.
- README screenshots captured from the running application.

## Not verified

Real Google/Apple/Microsoft callbacks, Stripe sandbox webhooks, PayPal sandbox captures and Resend inbox delivery require the owner's configured provider accounts. Automated tests verify local business invariants, not external-provider success. A full accessibility audit, load test and production security review were not performed.
