import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  type CipherGCM,
  type DecipherGCM,
} from "node:crypto";
import { serverEnv } from "@/lib/env";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;      // recommended for GCM
const TAG_LEN = 16;

function getKey(): Buffer {
  const hex = serverEnv.ENCRYPTION_KEY;
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(
      "ENCRYPTION_KEY must be 64 hex chars (32 bytes, AES-256).",
    );
  }
  return Buffer.from(hex, "hex");
}

/**
 * Encrypts `plaintext` with AES-256-GCM and returns a self-contained base64
 * string in the form `iv:authTag:ciphertext` (each part base64, joined by
 * colons). `plaintext` must be a string.
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv) as CipherGCM;
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    tag.toString("base64"),
    ct.toString("base64"),
  ].join(":");
}

export function decrypt(payload: string): string {
  const parts = payload.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid ciphertext payload");
  }
  const [ivB64, tagB64, ctB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const ct = Buffer.from(ctB64, "base64");
  if (iv.length !== IV_LEN || tag.length !== TAG_LEN) {
    throw new Error("Invalid ciphertext payload");
  }
  const key = getKey();
  const decipher = createDecipheriv(ALGO, key, iv) as DecipherGCM;
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString("utf8");
}

/**
 * Last-4 style mask for display: reveals prefix chars + last 4 of the plain
 * string without ever logging the secret itself.
 */
export function maskSecret(plain: string, prefix = 4): string {
  if (plain.length <= prefix + 4) {
    return "•".repeat(Math.max(0, plain.length - 4)) + plain.slice(-4);
  }
  return (
    plain.slice(0, prefix) +
    "•".repeat(Math.max(0, plain.length - prefix - 4)) +
    plain.slice(-4)
  );
}
