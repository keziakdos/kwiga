import fs from "node:fs";
import path from "node:path";

export function loadEnv() {
  const file = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

export async function prompt(question: string, opts: { hidden?: boolean } = {}): Promise<string> {
  process.stdout.write(question);
  if (!opts.hidden) {
    return new Promise((resolve) => {
      let data = "";
      const onData = (chunk: Buffer) => {
        data += chunk.toString();
        if (data.includes("\n")) {
          process.stdin.off("data", onData);
          process.stdin.pause();
          resolve(data.trim());
        }
      };
      process.stdin.resume();
      process.stdin.on("data", onData);
    });
  }
  return new Promise((resolve) => {
    const stdin = process.stdin;
    (stdin as unknown as { setRawMode: (v: boolean) => void }).setRawMode(true);
    stdin.resume();
    let data = "";
    const onData = (chunk: Buffer) => {
      const str = chunk.toString();
      for (const ch of str) {
        if (ch === "\n" || ch === "\r") {
          stdin.off("data", onData);
          (stdin as unknown as { setRawMode: (v: boolean) => void }).setRawMode(false);
          stdin.pause();
          process.stdout.write("\n");
          resolve(data);
          return;
        }
        if (ch === "\u0003") process.exit(1);
        if (ch === "\u007f" || ch === "\b") {
          data = data.slice(0, -1);
        } else {
          data += ch;
        }
      }
    };
    stdin.on("data", onData);
  });
}

export function assertStrongPassword(pw: string): string | null {
  if (pw.length < 12) return "Le mot de passe doit contenir au moins 12 caractères.";
  if (!/[a-z]/.test(pw)) return "Ajoutez au moins une minuscule.";
  if (!/[A-Z]/.test(pw)) return "Ajoutez au moins une majuscule.";
  if (!/[0-9]/.test(pw)) return "Ajoutez au moins un chiffre.";
  return null;
}
