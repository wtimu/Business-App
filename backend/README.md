# Wi-Fi Billing Backend

This service powers the Uganda Wi-Fi billing platform. It exposes a REST API for package discovery, mobile money order creation, payment reconciliation via signed webhooks, voucher issuance, and SMS dispatch.

## Stack

- Node.js + Express + TypeScript
- Prisma (PostgreSQL)
- Redis + BullMQ for background jobs
- Pino logging with request identifiers
- Vitest + Supertest for tests
- Swagger UI served at `/docs`

## Getting started

```bash
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

The server listens on `http://localhost:4000` by default.

### Docker services

A Postgres and Redis stack is provided in the project root `docker-compose.yml`. Start it with:

```bash
docker compose up -d
```

Ensure the `DATABASE_URL` and `REDIS_URL` env vars point to the compose services.

### Running tests

#### Unit tests

```bash
npm test
```

#### Manual end-to-end walkthrough

1. With the backend running locally, create an order either from the frontend or using `curl`:
   ```bash
   curl -X POST http://localhost:4000/api/v1/orders \
     -H "Content-Type: application/json" \
     -d '{
       "packageId": "<package-id>",
       "msisdn": "0700000000",
       "provider": "MTN"
     }'
   ```
   Note the `orderId` and `providerTxRef` from the response.
2. Simulate the provider callback to move the order to `PAID`:
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
3. Poll the order endpoint to confirm the voucher assignment:
   ```bash
   curl http://localhost:4000/api/v1/orders/<orderId>
   ```
   The response should include `status: "PAID"` and the voucher code. The SMS worker logs the dispatched message to the console by default.

## Payment provider callbacks

- MTN callback URL: `POST /api/v1/webhooks/mtn`
- Airtel callback URL: `POST /api/v1/webhooks/airtel`

Both endpoints verify HMAC signatures using the configured secrets, record the webhook payload, and enqueue a reconciliation job. The background worker updates order status, generates a voucher, and enqueues an SMS job.

## SMS provider

The default implementation logs SMS payloads. Implementers can supply a production integration by calling `setSmsProvider` with a class that implements the `SmsProvider` interface.

## Admin access

Seeded admin user:

- Email: `admin@example.com`
- Password: `ChangeMe123!`

Authenticate via `POST /api/v1/admin/login` to receive a JWT for accessing protected admin endpoints.
