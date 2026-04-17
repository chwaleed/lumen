import { fetchBackendWithAuth, applyBackendAuthResult } from "@/lib/auth/route-auth";

type RouteContext = {
  params: Promise<{
    id: string;
    fileId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const body = await request.json().catch(() => null);

  if (!body) {
    return Response.json(
      {
        success: false,
        message: "Invalid snapshot creation request.",
      },
      { status: 400 }
    );
  }

  const { id, fileId } = await context.params;
  const result = await fetchBackendWithAuth(request, `/projects/${id}/files/${fileId}/snapshots`, {
    method: "POST",
    body,
  });
  return applyBackendAuthResult(request, result);
}
