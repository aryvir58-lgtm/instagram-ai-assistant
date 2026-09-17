# Setup

## A) OpenAI API key

Create an API key in your OpenAI account and put it ONLY in:
API/.env

OPENAI_API_KEY=...

The server uses the OpenAI Responses API.

## B) Meta / Instagram

Create a Meta developer app and configure the Instagram API for a Professional Instagram account.

Put these server-side values in API/.env:
META_APP_ID=...
META_APP_SECRET=...
INSTAGRAM_REDIRECT_URI=https://YOUR-DOMAIN.com/auth/instagram/callback
INSTAGRAM_VERIFY_TOKEN=make-a-random-string

Configure your Meta app's OAuth redirect/callback URL to exactly match INSTAGRAM_REDIRECT_URI.

Configure the webhook callback URL:
https://YOUR-DOMAIN.com/webhooks/instagram

Use the same INSTAGRAM_VERIFY_TOKEN in the Meta webhook configuration.

Request only the permissions/capabilities currently offered by Meta for your app and account. Messaging requires the appropriate Meta permission and Instagram Professional-account setup.

## C) Database

For local development:
docker compose up -d

Then:
cd API
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev

## D) Dashboard

The API serves a tiny dashboard at:
http://localhost:3000

## E) Production

Deploy API + worker/database/redis on your hosting provider. Set all environment variables in the hosting provider, not in source code.

## What is intentionally NOT automated

The project does not use Instagram password login, browser cookie scraping, private endpoints, or unofficial automation. Unsupported likes/reactions/actions are not faked. The app only performs actions exposed by the official API and granted permissions.
