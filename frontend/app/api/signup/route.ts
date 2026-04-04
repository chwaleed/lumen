import { NextResponse } from "next/server";

const DEFAULT_BACKEND_URL = "http://backend:9000";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
    };

    const backendUrl = process.env.BACKEND_URL ?? DEFAULT_BACKEND_URL;
    const response = await fetch(`${backendUrl}/auth/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: body.name,
        email: body.email,
        password: body.password,
      }),
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({
      success: false,
      message: "Invalid response from backend.",
    }));

    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Unable to reach backend service.",
      },
      { status: 502 }
    );
  }
}
