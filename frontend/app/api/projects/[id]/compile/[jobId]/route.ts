import { fetchBackendWithAuth, applyBackendAuthResult } from "@/lib/auth/route-auth";

type RouteContext = {
  params: Promise<{
    id: string;
    jobId: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { id, jobId } = await context.params;
  const result = await fetchBackendWithAuth(request, `/projects/${id}/compile/${jobId}`);
  return applyBackendAuthResult(request, result);
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id, jobId } = await context.params;
  const result = await fetchBackendWithAuth(request, `/projects/${id}/compile/${jobId}`, {
    method: "DELETE",
  });
  return applyBackendAuthResult(request, result);
}
