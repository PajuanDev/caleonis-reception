import { randomBytes } from "node:crypto";

const PROVIDER_CREDENTIALS = new Set(["TWILIO_AUTH_TOKEN", "POLAR_WEBHOOK_SECRET"]);
const PLACEHOLDER_PREFIX = "replace-with-";

export function generateEnv(example, random = () => randomBytes(32).toString("hex")) {
  const generated = [];
  const output = example.split("\n").map((line) => {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line);
    if (!match || !match[2].startsWith(PLACEHOLDER_PREFIX)) return line;
    const [, key] = match;
    if (PROVIDER_CREDENTIALS.has(key)) return `${key}=`;
    generated.push(key);
    return `${key}=${random()}`;
  }).join("\n");
  return { output, generated };
}
