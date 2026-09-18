import Fastify from "fastify";
import cors from "@fastify/cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import OpenAI from "openai";

dotenv.config();

const app = Fastify({ logger: true });
const port = Number(process.env.PORT || 3000);

let prisma: PrismaClient | null = null;

function getPrisma(): PrismaClient {
  if (!prisma) prisma = new PrismaClient();
  return prisma;
}

function getOpenAI(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

app.register(cors, { origin: true });

app.get("/health", async () => ({
  ok: true,
  service: "instagram-ai-assistant",
  openaiConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
  databaseConfigured: Boolean(process.env.DATABASE_URL?.trim())
}));

app.get("/", async (_req, reply) => {
  return reply.type("text/html").send(`<!doctype html>
<html>
<head><meta charset="utf-8"><title>Instagram AI Assistant</title></head>
<body style="font-family:Arial;max-width:900px;margin:40px auto;padding:20px">
<h1>Instagram AI Assistant</h1>
<p>Backend is running.</p>
<p><a href="/auth/instagram"><button style="padding:12px 18px">Connect Instagram</button></a></p>
<p>Health: <a href="/health">/health</a></p>
<p>Webhook: <code>/webhooks/instagram</code></p>
</body>
</html>`);
});

app.get("/auth/instagram", async (_req, reply) => {
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;
  const appId = process.env.META_APP_ID;

  if (!redirectUri || !appId) {
    return reply.code(503).send({
      error: "Instagram OAuth is not configured.",
      missing: [
        !appId ? "META_APP_ID" : null,
        !redirectUri ? "INSTAGRAM_REDIRECT_URI" : null
      ].filter(Boolean)
    });
  }

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "instagram_business_basic,instagram_business_manage_messages"
  });

  return reply.redirect(`https://www.instagram.com/oauth/authorize?${params.toString()}`);
});

app.get("/auth/instagram/callback", async (req, reply) => {
  const q = req.query as { code?: string; error?: string; error_description?: string };

  if (q.error) {
    return reply.code(400).send({
      error: q.error,
      description: q.error_description || "Instagram authorization failed."
    });
  }

  if (!q.code) return reply.code(400).send("Missing OAuth code.");

  return reply.type("text/html").send(`
    <h2>Instagram authorization received</h2>
    <p>The authorization code was received successfully.</p>
    <p>Token exchange still needs to be completed for the exact Meta login flow configured in your app.</p>
    <p>Do not paste access tokens into the browser or source code.</p>
  `);
});

app.get("/webhooks/instagram", async (req, reply) => {
  const q = req.query as Record<string, string>;
  if (
    q["hub.mode"] === "subscribe" &&
    q["hub.verify_token"] === process.env.INSTAGRAM_VERIFY_TOKEN
  ) {
    return reply.send(q["hub.challenge"]);
  }
  return reply.code(403).send("Verification failed");
});

app.post("/webhooks/instagram", async (req, reply) => {
  app.log.info({ event: req.body }, "Instagram webhook");
  return reply.send({ received: true });
});

app.post("/ai/reply-preview", async (req, reply) => {
  const body = req.body as { message?: string; context?: string };
  if (!body.message?.trim()) {
    return reply.code(400).send({ error: "message is required" });
  }

  const openai = getOpenAI();
  if (!openai) {
    return reply.code(503).send({
      error: "OPENAI_API_KEY is not configured in Railway Variables."
    });
  }

  try {
    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
      input: [
        {
          role: "system",
          content: "You are a friendly Instagram assistant. Reply briefly in natural Hinglish. Never invent facts. If unsure, say human help is needed."
        },
        {
          role: "user",
          content: `Context: ${body.context || "(none)"}\nUser message: ${body.message}`
        }
      ]
    });

    return { reply: response.output_text };
  } catch (error) {
    app.log.error(error, "OpenAI request failed");
    return reply.code(502).send({ error: "OpenAI request failed." });
  }
});

app.get("/api/conversations", async (_req, reply) => {
  if (!process.env.DATABASE_URL?.trim()) {
    return reply.code(503).send({ error: "DATABASE_URL is not configured." });
  }

  try {
    return await getPrisma().conversation.findMany({
      include: { messages: { orderBy: { createdAt: "asc" } } },
      orderBy: { lastMessageAt: "desc" }
    });
  } catch (error) {
    app.log.error(error, "Database request failed");
    return reply.code(503).send({ error: "Database is not ready." });
  }
});

app.setErrorHandler((error, _req, reply) => {
  app.log.error(error);
  return reply.code(500).send({ error: "Internal server error" });
});

app.listen({ port, host: "0.0.0.0" }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
