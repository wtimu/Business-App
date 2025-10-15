# Uganda Wi-Fi Billing Platform

This repository contains a full-stack implementation of a production-ready Wi-Fi billing platform targeting Uganda Mobile Money providers (MTN and Airtel).

## Structure

- `backend/` – Node.js + TypeScript service exposing REST APIs, payment reconciliation workers, Prisma schema, and Swagger docs.
- `frontend/` – React + Vite + Tailwind client for customers and a minimal admin console.
- `docker-compose.yml` – Postgres and Redis services for local development.

## Getting Started

1. Start infrastructure services:
   ```bash
   docker compose up -d
   ```
2. Configure the backend:
   ```bash
   cd backend
   cp .env.example .env
   npm install
   npm run prisma:generate
   npm run prisma:migrate
   npm run prisma:seed
   npm run dev
   ```
3. In another terminal start the frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
4. Visit `http://localhost:5173` for the customer flow or `http://localhost:5173/admin` for the admin dashboard (use the seeded credentials `admin@example.com` / `ChangeMe123!`).

## Payment Flow Overview

1. Customer selects a Wi-Fi package and provider, then submits their mobile number.
2. Backend creates a pending order, triggers the Mobile Money provider, and returns polling info.
3. Providers call back via secure webhooks. Signatures are verified before enqueuing reconciliation jobs.
4. Background workers mark orders paid, generate vouchers, and dispatch SMS notifications.

## Testing the App

There are two layers of testing you can run locally:

1. **Automated backend tests**
   ```bash
   cd backend
   npm test
   ```
   These cover helpers such as MSISDN normalization and webhook signature validation.

2. **End-to-end manual flow**
   1. Start the Docker services and both apps as described in [Getting Started](#getting-started).
   2. Create an order from the customer UI (or `POST /api/v1/orders`). The order will remain in `PENDING` until a webhook is received.
   3. Simulate a successful provider callback from a separate terminal. Replace the placeholders below with the values returned from the order response.
      ```bash
      curl -X POST http://localhost:4000/api/v1/webhooks/mtn \
        -H "Content-Type: application/json" \
        -H "X-Signature: test-signature" \
        -d '{
          "reference": "<providerTxRef>",
          "status": "SUCCESS",
          "amount": 2000,
          "msisdn": "256700000000"
        }'
      ```
      The webhook worker will mark the order as paid, mint a voucher, and enqueue an SMS job. You can view the updated state by polling `GET /api/v1/orders/<orderId>` or watching the frontend order status.
   4. To simulate Airtel, call `/api/v1/webhooks/airtel` with the equivalent payload.

   > **Note**: In production you must supply real HMAC signatures. The development build accepts the `test-signature` header for convenience.

## Development Notes

- Webhooks are served at `/api/v1/webhooks/mtn` and `/api/v1/webhooks/airtel`; use tools like `ngrok` to expose them in sandbox mode.
- Swagger documentation is available at `http://localhost:4000/docs`.
- To plug in a real SMS provider, implement the `SmsProvider` interface in `backend/src/sms` and register it via `setSmsProvider`.

## Environment Variables

See `backend/.env.example` for all required configuration values (Mobile Money credentials, JWT secret, Redis connection, etc.).

## Screenshots

Frontend styling leverages TailwindCSS with responsive layouts for both the customer flow and admin dashboard.
