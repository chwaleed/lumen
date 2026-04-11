import { NextResponse } from "next/server";
import { applyAuthCookies } from "@/lib/auth/cookies";
import { postBackendAuth, type LoginRequestPayload, type SignupRequestPayload, type TokenPair, type UserResponse } from "@/lib/auth/backend";

type SignupRouteResponse = {
  sessionEstablished: boolean;
  user: UserResponse | null;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as SignupRequestPayload | null;

  if (!body) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid signup request.",
      },
      { status: 400 }
    );
  }

  const signupResult = await postBackendAuth<UserResponse>("/auth/signup", body);

  if (!signupResult.payload.success) {
    return NextResponse.json(signupResult.payload, { status: signupResult.status });
  }

  const loginPayload: LoginRequestPayload = {
    email: body.email,
    password: body.password,
  };
  const loginResult = await postBackendAuth<TokenPair>("/auth/login", loginPayload);

  if (!loginResult.payload.success || !loginResult.payload.data) {
    return NextResponse.json(
      {
        success: true,
        message: "Account created successfully. Please log in to continue.",
        data: {
          sessionEstablished: false,
          user: signupResult.payload.data,
        } satisfies SignupRouteResponse,
      },
      { status: signupResult.status }
    );
  }

  const response = NextResponse.json(
    {
      success: true,
      message: "Account created successfully.",
      data: {
        sessionEstablished: true,
        user: signupResult.payload.data,
      } satisfies SignupRouteResponse,
    },
    { status: signupResult.status }
  );

  applyAuthCookies(response, loginResult.payload.data);
  return response;
}
