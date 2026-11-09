import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { config } from "./config";

export function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

export function saveBuffer(userId: number, originalName: string, buffer: Buffer): string {
  const dir = path.join(config.uploadsDir, String(userId));
  ensureDir(dir);
  const safeExt = path.extname(originalName).toLowerCase().replace(/[^.a-z0-9]/g, "").slice(0, 10);
  const name = `${Date.now()}-${crypto.randomBytes(12).toString("hex")}${safeExt}`;
  const full = path.join(dir, name);
  fs.writeFileSync(full, buffer, { mode: 0o600 });
  return full;
}

export function saveText(userId: number, originalName: string, text: string): string {
  return saveBuffer(userId, `${originalName}.txt`, Buffer.from(text, "utf8"));
}

export function readFileBuffer(storagePath: string): Buffer {
  const resolved = path.resolve(storagePath);
  const root = path.resolve(config.uploadsDir);
  if (!resolved.startsWith(root + path.sep)) {
    throw new Error("Chemin de fichier privé invalide");
  }
  return fs.readFileSync(resolved);
}

export function deleteFileQuietly(storagePath: string | null) {
  if (!storagePath) return;
  try {
    const resolved = path.resolve(storagePath);
    const root = path.resolve(config.uploadsDir);
    if (resolved.startsWith(root + path.sep) && fs.existsSync(resolved)) fs.unlinkSync(resolved);
  } catch {
    // ignoré
  }
}

export function sha256(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}
