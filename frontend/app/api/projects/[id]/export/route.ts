import { fetchBackendBinaryWithAuth, applyBackendBinaryResult } from "@/lib/auth/route-auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// Zip bytes, not the {success, message, data} envelope. The link that points
// here carries its own `download` attribute, so the filename is settled on the
// client and nothing has to survive the proxy.
export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const result = await fetchBackendBinaryWithAuth(request, `/projects/${id}/export`);
  // no-store: an export reflects the project as it is now, and a cached copy
  // would hand back the version from before the last edit.
  return applyBackendBinaryResult(request, result, "no-store");
}
