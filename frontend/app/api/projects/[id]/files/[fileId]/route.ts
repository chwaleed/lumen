import { fetchBackendWithAuth, applyBackendAuthResult } from "@/lib/auth/route-auth";

type RouteContext = {
  params: Promise<{
    id: string;
    fileId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const body = await request.json().catch(() => null);

  if (!body) {
    return Response.json(
      {
        success: false,
        message: "Invalid file update request.",
      },
      { status: 400 }
    );
  }

  const { id, fileId } = await context.params;
  const result = await fetchBackendWithAuth(request, `/projects/${id}/files/${fileId}`, {
    method: "PATCH",
    body,
  });
  return applyBackendAuthResult(request, result);
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id, fileId } = await context.params;
  const result = await fetchBackendWithAuth(request, `/projects/${id}/files/${fileId}`, {
    method: "DELETE",
  });
  return applyBackendAuthResult(request, result);
}
