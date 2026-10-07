import { fetchBackendBinaryWithAuth, applyBackendBinaryResult } from "@/lib/auth/route-auth";

type RouteContext = {
  params: Promise<{
    id: string;
    jobId: string;
  }>;
};

// Returns PDF bytes, not the {success, message, data} envelope: the viewer loads
// this URL directly, so base64 in JSON would cost a third more payload and a
// decode step before anything could render.
export async function GET(request: Request, context: RouteContext) {
  const { id, jobId } = await context.params;
  const result = await fetchBackendBinaryWithAuth(request, `/projects/${id}/compile/${jobId}/pdf`);
  return applyBackendBinaryResult(request, result);
}
