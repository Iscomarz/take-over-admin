# Proposal: Stripe Dispute & Refund Automated Webhooks

## Intent

Automate the lifecycle transitions of tickets (`activo`, `suspendido`, `cancelado`, `reembolsado`) in response to Stripe dispute and refund webhook events. This eliminates human latency, guarantees instant door blockage upon chargeback initiation, and safely reinstates access if a dispute is resolved in favor of the business.

---

## Background & Motivation

Currently, when a cardholder files a dispute with their bank (e.g., claiming unrecognized purchase / fraud), the admin must manually find the sale and toggle the ticket status in the admin dashboard. 

Automating this via Stripe webhooks ensures:
1. **Zero latency door protection**: The moment Stripe emits `charge.dispute.created`, the tickets are immediately flagged as `suspendido`. If the event is occurring or starts before an admin checks email, the QR code is already blocked at the door scanner.
2. **Automated resolution handling**: If the merchant submits evidence and wins the dispute (`charge.dispute.closed` with status `won`), the tickets automatically revert to `activo`. If lost, they become `cancelado`.
3. **Refund consistency**: When a refund is processed directly in Stripe, tickets transition to `reembolsado` without manual double-entry.

---

## Scope

### In Scope

- **Webhook Route**: Create `/src/routes/api/stripe/webhook/+server.js` using raw request body verification via `stripe.webhooks.constructEvent(payload, sig, endpointSecret)`.
- **Environment Configuration**: Add `STRIPE_WEBHOOK_SECRET` to environment variables (`.env` and Vercel project settings).
- **Stripe Event Handlers**:
  - `charge.dispute.created`:
    - Extract `dispute.charge` or `dispute.payment_intent`.
    - Look up `mPago` matching `idTransaccionStripe` or `checkout_session`.
    - Find linked `mVenta` and all associated `ticket` records.
    - Update `ticket.estado = 'suspendido'` and `ticket.motivo_cancelacion = 'Disputa Stripe [id]: ' || dispute.reason`.
  - `charge.dispute.closed`:
    - If `dispute.status === 'won'` or funds reinstated: revert `ticket.estado = 'activo'` with note `'Disputa ganada/resuelta'`.
    - If `dispute.status === 'lost'`: set `ticket.estado = 'cancelado'` with note `'Disputa perdida/aceptada'`.
  - `charge.refunded`:
    - Mark all linked tickets as `estado = 'reembolsado'` and log refund ID.
- **Idempotency & Audit Logging**:
  - Store processed webhook event IDs to prevent duplicate processing on Stripe retries.

### Out of Scope

- Automated evidence submission to Stripe (requires human documentation like signed waivers, IP matching, or email correspondence).
- Direct bank transfer / SPEI dispute handling (Stripe credit/debit card disputes only).

---

## Technical Architecture & Flow

```
[Customer files Chargeback with Bank]
                   │
                   ▼
       [Stripe Webhook Event]
       (charge.dispute.created)
                   │
                   ▼
  [POST /api/stripe/webhook]
   • Verify signature using STRIPE_WEBHOOK_SECRET
   • Parse dispute object & charge ID
                   │
                   ▼
        [Supabase Service Role]
   1. SELECT idpago FROM "mPago" WHERE "idTransaccionStripe" = charge_id
   2. SELECT idventa FROM "mVenta" WHERE "idPago" = idpago
   3. UPDATE "ticket"
      SET estado = 'suspendido',
          motivo_cancelacion = 'Disputa Stripe: ' || dispute.reason,
          updated_at = NOW()
      WHERE "idVenta" = idventa
                   │
                   ▼
       [Door Validation Protected]
   • QR Scanner shows: "⛔ Boleto Suspendido / En Disputa"
   • Access prohibited immediately
```

---

## Capabilities (Specs Contract)

### New Capabilities
- `stripe-dispute-webhooks`: End-to-end webhook listener handling `charge.dispute.created`, `charge.dispute.closed`, `charge.dispute.funds_reinstated`, and `charge.refunded`.

### Modified Capabilities
- `ticket-status-management`: Enhanced to support automated updates triggered by server service role alongside manual UI overrides.

---

## Implementation Checklist (Next Session)

1. [ ] **Dependencies & Config**: Ensure `STRIPE_WEBHOOK_SECRET` is added to `.env` and Vercel.
2. [ ] **Route Handler**: Implement `POST` in `src/routes/api/stripe/webhook/+server.js`.
   - Remember SvelteKit raw body requirement: use `request.text()` (not `request.json()`) to verify cryptographic signature.
3. [ ] **Database Lookup Helper**: Create service function in `src/services/stripe-service.js` or directly in webhook to map `charge_id` -> `mPago` -> `mVenta` -> `ticket`.
4. [ ] **Stripe Dashboard Configuration**: Add webhook endpoint URL `https://admin.takeover.lat/api/stripe/webhook` with the 4 target dispute/refund events.
5. [ ] **Testing with Stripe CLI**: Run `stripe listen --forward-to localhost:5173/api/stripe/webhook` and `stripe trigger charge.dispute.created` to verify end-to-end behavior locally.

---

## Rollback Plan

- **Endpoints**: Remove or disable the webhook URL in the Stripe Dashboard.
- **Code**: Delete `src/routes/api/stripe/webhook/+server.js`. Manual ticket state management remains 100% operational as implemented.
