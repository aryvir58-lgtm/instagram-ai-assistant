# Instagram AI Assistant — Starter

This is a ready-to-run starter for an Instagram Professional-account automation dashboard.

Included:
- Node.js + TypeScript API
- OAuth callback placeholder/configuration
- Instagram webhook verification/receiver
- PostgreSQL + Prisma schema
- OpenAI reply generation
- Simple web dashboard
- Docker Compose for local PostgreSQL/Redis

IMPORTANT:
1. Instagram/Meta credentials are NOT included. Create your own Meta app and Instagram Professional account.
2. OpenAI API key is NOT included.
3. Some Instagram actions are only available when Meta exposes them through the current API/permissions.
4. Never put Meta or OpenAI secrets in the Android APK or browser code.

Quick start:
1. Copy .env.example to .env
2. Fill values
3. npm install
4. npx prisma generate
5. npx prisma migrate dev --name init
6. npm run dev

See SETUP.md for exact API/key placement.
