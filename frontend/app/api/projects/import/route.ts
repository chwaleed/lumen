import { fetchBackendWithAuth, applyBackendAuthResult } from "@/lib/auth/route-auth";

type ImportedProject = {
  project: { id: number; name: string; created_at: string; updated_at: string };
  imported: string[];
  skipped: string[];
};

// The zip travels as the raw request body, not as multipart: the browser can
// put a File straight into fetch's body, and the backend would otherwise need
// python-multipart for this one endpoint.
export async function POST(request: Request) {
  const body = await request.arrayBuffer();

  if (body.byteLength === 0) {
    return Response.json(
      { success: false, message: "Choose a .zip file to import.", data: null },
      { status: 400 }
    );
  }

  const fileName = new URL(request.url).searchParams.get("file_name") ?? "";
  const result = await fetchBackendWithAuth<ImportedProject>(
    request,
    `/projects/import?file_name=${encodeURIComponent(fileName)}`,
    {
      method: "POST",
      body: Buffer.from(body),
      contentType: "application/zip",
    }
  );

  return applyBackendAuthResult(request, result);
}
