import { fetchBackendWithAuth, applyBackendAuthResult } from "@/lib/auth/route-auth";

type RouteContext = {
  params: Promise<{
    id: string;
    jobId: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { id, jobId } = await context.params;
  const result = await fetchBackendWithAuth(request, `/projects/${id}/compile/${jobId}/log`);
  return applyBackendAuthResult(request, result);
}
