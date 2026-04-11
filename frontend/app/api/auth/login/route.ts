import { NextResponse } from "next/server";
import { applyAuthCookies } from "@/lib/auth/cookies";
import { postBackendAuth, type LoginRequestPayload, type TokenPair } from "@/lib/auth/backend";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as LoginRequestPayload | null;

  if (!body) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid login request.",
      },
      { status: 400 }
    );
  }

  const { status, payload } = await postBackendAuth<TokenPair>("/auth/login", body);

  if (!payload.success || !payload.data) {
    return NextResponse.json(payload, { status });
  }

  const response = NextResponse.json(
    {
      success: true,
      message: payload.message,
    },
    { status }
  );

  applyAuthCookies(response, payload.data);
  return response;
}
