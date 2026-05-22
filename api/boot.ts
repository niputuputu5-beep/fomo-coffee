import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import fs from "fs/promises";
import path from "path";
import { appRouter } from "./router";
import { createContext } from "./context";
import { authenticateRequest } from "./auth-router";
import { env } from "./lib/env";

const app = new Hono<{ Bindings: HttpBindings }>();
const productImageDir = path.resolve(process.cwd(), "uploads", "product-images");
const allowedImageTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
]);

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));
app.use("/uploads/*", serveStatic({ root: process.cwd() }));
app.post("/api/uploads/product-image", async (c) => {
  const auth = await authenticateRequest(c.req.raw.headers).catch(() => null);
  if (!auth) {
    return c.json({ error: "Unauthenticated" }, 401);
  }
  if (!["owner", "admin"].includes(auth.user.role)) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const form = await c.req.formData();
  const file = form.get("image");
  if (!(file instanceof File)) {
    return c.json({ error: "File gambar wajib diunggah." }, 400);
  }
  if (!allowedImageTypes.has(file.type)) {
    return c.json({ error: "Format gambar harus JPG, PNG, WEBP, atau GIF." }, 400);
  }
  if (file.size > 5 * 1024 * 1024) {
    return c.json({ error: "Ukuran gambar maksimal 5 MB." }, 400);
  }

  await fs.mkdir(productImageDir, { recursive: true });
  const extension = allowedImageTypes.get(file.type);
  const filename = `${crypto.randomUUID()}${extension}`;
  const destination = path.join(productImageDir, filename);
  await fs.writeFile(destination, Buffer.from(await file.arrayBuffer()));

  return c.json({ url: `/uploads/product-images/${filename}` });
});
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
