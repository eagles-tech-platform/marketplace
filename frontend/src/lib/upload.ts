import { API_BASE_URL, ApiError } from "@/lib/api";

/** Uploads a single file and returns its public URL. */
export async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE_URL}/uploads`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json().catch(() => ({})) : undefined;

  if (!res.ok) {
    throw new ApiError(body?.message || "Could not upload file.", res.status);
  }
  return body.url as string;
}
