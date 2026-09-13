import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export const ALLOWED_UPLOAD_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export function validateUpload(input: { mimeType: string; sizeBytes: number }) {
  if (!ALLOWED_UPLOAD_TYPES.has(input.mimeType)) {
    return { ok: false as const, message: "That file type is not allowed." };
  }
  if (input.sizeBytes > MAX_UPLOAD_BYTES) {
    return { ok: false as const, message: "That file is too large." };
  }
  return { ok: true as const };
}

export type StoredFile = { storageKey: string; mimeType: string; sizeBytes: number };

export interface StorageProvider {
  name: string;
  save(input: { buffer: Buffer; mimeType: string; originalName: string }): Promise<StoredFile>;
}

export class LocalStorageProvider implements StorageProvider {
  name = "local";
  async save(input: { buffer: Buffer; mimeType: string; originalName: string }): Promise<StoredFile> {
    const check = validateUpload({ mimeType: input.mimeType, sizeBytes: input.buffer.length });
    if (!check.ok) {
      throw Object.assign(new Error(check.message), { status: 400 });
    }
    const key = `${randomUUID()}${path.extname(input.originalName) || ""}`;
    const dir = path.join(process.cwd(), "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, key), input.buffer);
    return { storageKey: key, mimeType: input.mimeType, sizeBytes: input.buffer.length };
  }
}

export class AzureBlobStorageProvider implements StorageProvider {
  name = "azure-blob";
  async save(input: { buffer: Buffer; mimeType: string; originalName: string }): Promise<StoredFile> {
    if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
      return new LocalStorageProvider().save(input);
    }
    return new LocalStorageProvider().save(input);
  }
}

export function getStorageProvider(): StorageProvider {
  const which = process.env.STORAGE_PROVIDER ?? "local";
  if (which === "azure") return new AzureBlobStorageProvider();
  return new LocalStorageProvider();
}

export function malwareScanHook(_file: StoredFile): "pending" | "clean" | "blocked" {
  const provider = process.env.MALWARE_SCAN_PROVIDER ?? "none";
  if (provider === "none") return "pending";
  return "pending";
}
