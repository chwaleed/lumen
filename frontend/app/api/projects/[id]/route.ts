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

export async function PATCH(request: Request, context: RouteContext) {
  const body = await request.json().catch(() => null);

  if (!body) {
    return Response.json(
      {
        success: false,
        message: "Invalid project update request.",
      },
      { status: 400 }
    );
  }

  const { id } = await context.params;
  const result = await fetchBackendWithAuth(request, `/projects/${id}`, {
    method: "PATCH",
    body,
  });
  return applyBackendAuthResult(request, result);
}
