// Copies the pdf.js worker into /public so the PDF reader can load it
// from the same origin, without bundler-specific worker configuration.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

try {
  const pkg = require.resolve("pdfjs-dist/package.json");
  const src = join(dirname(pkg), "build", "pdf.worker.min.mjs");
  const destDir = join(process.cwd(), "public", "pdfjs");
  if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
  copyFileSync(src, join(destDir, "pdf.worker.min.mjs"));
  console.log("[atlas] pdf.js worker copied to public/pdfjs");
} catch (err) {
  console.warn("[atlas] pdf.js worker not copied:", err.message);
}
