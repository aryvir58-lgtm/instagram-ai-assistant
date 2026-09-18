import Fastify from "fastify";
import cors from "@fastify/cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import OpenAI from "openai";

dotenv.config();
const app = Fastify({ logger: true });
const prisma = new PrismaClient();

const getOpenAI = () => {\n  const apiKey = process.env.OPENAI_API_KEY;\n  if (!apiKey) return null;\n  return new OpenAI({ apiKey });\n};
const port = Number(process.env.PORT || 3000);

app.register(cors, { origin: true });

app.get("/", async (_req, reply) => {
  return reply.type("text/html").send(`<!doctype html>
<html><head><meta charset="utf-8"><title>Instagram AI Assistant</title>
<style>body{font-family:Arial;max-width:900px;margin:40px auto;padding:20px}button{padding:12px 18px}pre{background:#f4f4f4;padding:15px}</style>
</head><body>
<h1>Instagram AI Assistant</h1>
<p>Backend is running.</p>
<p><a href="/auth/instagram"><button>Connect Instagram</button></a></p>
<p>Webhook: <code>/webhooks/instagram</code></p>
</body></html>`);
});

app.get("/auth/instagram", async (_req, reply) => {
  const redirect = encodeURIComponent(process.env.INSTAGRAM_REDIRECT_URI || "");
  const appId = process.env.META_APP_ID || "";
  // Meta's exact authorization URL/permission set can change; configure according to the current Meta documentation for your app.
  const url = `https://www.instagram.com/oauth/authorize?client_id=${appId}&redirect_uri=${redirect}&response_type=code&scope=instagram_business_basic,instagram_business_manage_messages`;
  return reply.redirect(url);
});

app.get("/auth/instagram/callback", async (req, reply) => {
  const q = req.query as { code?: string };
  if (!q.code) return reply.code(400).send("Missing OAuth code.");

  // Token exchange is intentionally kept in one place. Depending on the Meta API version/login flow
  // selected in your Meta app, use the current documented token exchange endpoint and fields here.
  return reply.type("text/html").send(`
  <h2>Instagram authorization returned</h2>
  <p>Authorization code received. Complete the token exchange for the current Meta API flow in <code>src/services/instagram.ts</code>.</p>
  <p>Do not paste access tokens into the browser or source code.</p>`);
});

app.get("/webhooks/instagram", async (req, reply) => {
  const q = req.query as Record<string,string>;
  if (q["hub.mode"] === "subscribe" &&
      q["hub.verify_token"] === process.env.INSTAGRAM_VERIFY_TOKEN) {
    return reply.send(q["hub.challenge"]);
  }
  return reply.code(403).send("Verification failed");
});

app.post("/webhooks/instagram", async (req, reply) => {
  app.log.info({ event: req.body }, "Instagram webhook");
  // Production: validate Meta's webhook signature, normalize the event, persist it,
  // deduplicate by event/message ID, then enqueue it for processing.
  return reply.send({ received: true });
});

app.post("/ai/reply-preview", async (req, reply) => {
  const body = req.body as { message?: string; context?: string };
  if (!body.message) return reply.code(400).send({ error: "message is required" });

  const openai = getOpenAI();\n  if (!openai) {\n    return reply.code(503).send({ error: "OPENAI_API_KEY is not configured in Railway Variables." });\n  }\n\n  const response = await openai.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
    input: [
      { role: "system", content: "You are a friendly Instagram assistant. Reply briefly in natural Hinglish. Never invent facts. If unsure, say human help is needed." },
      { role: "user", content: `Context: ${body.context || "(none)"}\nUser message: ${body.message}` }
    ]
  });

  return { reply: response.output_text };
});

app.get("/api/conversations", async () => {
  return prisma.conversation.findMany({
    include: { messages: { orderBy: { createdAt: "asc" } } },
    orderBy: { lastMessageAt: "desc" }
  });
});

app.listen({ port, host: "0.0.0.0" }).catch(err => {
  app.log.error(err);
  process.exit(1);
});
