import { fetchBackendWithAuth, applyBackendAuthResult } from "@/lib/auth/route-auth";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const rootFileId = new URL(request.url).searchParams.get("root_file_id");
  const query = rootFileId ? `?root_file_id=${encodeURIComponent(rootFileId)}` : "";

  const result = await fetchBackendWithAuth(request, `/projects/${id}/compile${query}`, {
    method: "POST",
  });
  return applyBackendAuthResult(request, result);
}
