import { fetchBackendWithAuth, applyBackendAuthResult } from "@/lib/auth/route-auth";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const result = await fetchBackendWithAuth(request, `/projects/${id}`);
  return applyBackendAuthResult(request, result);
}
