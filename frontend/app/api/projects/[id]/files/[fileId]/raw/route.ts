import { fetchBackendBinaryWithAuth, applyBackendBinaryResult } from "@/lib/auth/route-auth";

type RouteContext = {
  params: Promise<{ id: string; fileId: string }>;
};

// Image and asset bytes, proxied so the browser never sees the object store.
// The entry's own S3 URL would only load from a public bucket, which would
// make every project's figures readable by anyone holding the key.
export async function GET(request: Request, context: RouteContext) {
  const { id, fileId } = await context.params;
  const result = await fetchBackendBinaryWithAuth(
    request,
    `/projects/${id}/files/${fileId}/raw`
  );
  return applyBackendBinaryResult(request, result, "private, max-age=60");
}
