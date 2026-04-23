import { fetchBackendWithAuth, applyBackendAuthResult } from "@/lib/auth/route-auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body) {
    return Response.json(
      {
        success: false,
        message: "Invalid upload request.",
      },
      { status: 400 }
    );
  }

  const result = await fetchBackendWithAuth(request, "/uploads/presigned-url", {
    method: "POST",
    body,
  });
  return applyBackendAuthResult(request, result);
}
