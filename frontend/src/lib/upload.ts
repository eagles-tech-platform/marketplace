import { API_BASE_URL, ApiError, getAccessToken, refreshAccessToken } from "@/lib/api";

/** Uploads a single file and returns its public URL. */
export async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const send = (token: string | null) =>
    fetch(`${API_BASE_URL}/uploads`, {
      method: "POST",
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData, // browser sets the multipart boundary; don't set Content-Type
    });

  let res = await send(getAccessToken());
  if (res.status === 401) {
    const fresh = await refreshAccessToken();
    if (fresh) res = await send(fresh);
  }

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json().catch(() => ({})) : undefined;

  if (!res.ok) {
    throw new ApiError(body?.message || "Could not upload file.", res.status);
  }
  return body.url as string;
}
