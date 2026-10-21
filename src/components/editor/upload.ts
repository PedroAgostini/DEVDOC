import imageCompression from "browser-image-compression";
import { createClient } from "@/lib/supabase/client";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "image/gif"];

/** Compresses and uploads an image; returns the app URL that goes into the markdown. */
export async function uploadImage(docId: string, file: File | Blob, fileName = "imagem"): Promise<string> {
  if (!ACCEPTED.includes(file.type)) {
    throw new Error(`${fileName}: use PNG, JPG, WEBP ou GIF.`);
  }
  if (file.size > MAX_BYTES) {
    throw new Error(`${fileName} passa de 10 MB. Reduza a imagem e tente de novo.`);
  }

  let blob: Blob = file;
  if (file.type !== "image/gif") {
    const asFile = file instanceof File ? file : new File([file], fileName, { type: file.type });
    blob = await imageCompression(asFile, {
      maxSizeMB: 1.5,
      maxWidthOrHeight: 2200,
      useWebWorker: true,
      fileType: "image/webp",
      initialQuality: 0.86,
    });
  }

  const ext = blob.type === "image/gif" ? "gif" : "webp";
  const name = `${crypto.randomUUID()}.${ext}`;
  const { error } = await createClient()
    .storage.from("doc-images")
    .upload(`${docId}/${name}`, blob, { contentType: blob.type, upsert: false });
  if (error) throw new Error(`Não foi possível enviar ${fileName}: ${error.message}`);
  return `/api/img/${docId}/${name}`;
}

export function imageFiles(list: FileList | File[] | null | undefined) {
  return Array.from(list ?? []).filter((f) => f.type.startsWith("image/"));
}
