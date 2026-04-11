import { fetchBackendWithAuth, applyBackendAuthResult } from "@/lib/auth/route-auth";

export async function GET(request: Request) {
  const result = await fetchBackendWithAuth(request, "/projects");
  return applyBackendAuthResult(request, result);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body) {
    return Response.json(
      {
        success: false,
        message: "Invalid project request.",
      },
      { status: 400 }
    );
  }

  const result = await fetchBackendWithAuth(request, "/projects", {
    method: "POST",
    body,
  });
  return applyBackendAuthResult(request, result);
}
