import { describe, expect, test } from "bun:test";
import { isJwtExpired } from "@/lib/auth/jwt";

function makeToken(payload: Record<string, unknown>) {
  const segment = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `header.${segment}.signature`;
}

const nowInSeconds = () => Math.floor(Date.now() / 1000);

describe("isJwtExpired", () => {
  test("treats a valid token well beyond the buffer as live", () => {
    expect(isJwtExpired(makeToken({ exp: nowInSeconds() + 3600 }))).toBe(false);
  });

  test("treats an elapsed expiry as expired", () => {
    expect(isJwtExpired(makeToken({ exp: nowInSeconds() - 1 }))).toBe(true);
  });

  // The buffer exists so a token cannot expire mid-flight on the way to the API.
  test("treats a token expiring inside the default buffer as expired", () => {
    expect(isJwtExpired(makeToken({ exp: nowInSeconds() + 10 }))).toBe(true);
  });

  test("treats a token expiring just past the buffer as live", () => {
    expect(isJwtExpired(makeToken({ exp: nowInSeconds() + 60 }))).toBe(false);
  });

  test("honours a custom buffer", () => {
    const token = makeToken({ exp: nowInSeconds() + 60 });

    expect(isJwtExpired(token, 120)).toBe(true);
    expect(isJwtExpired(token, 5)).toBe(false);
  });

  // Anything unreadable must fail closed, otherwise a junk cookie reads as a live session.
  test.each([
    ["an empty string", ""],
    ["a token with no payload segment", "header"],
    ["a token whose payload is not base64", "header.!!!not-base64!!!.signature"],
    ["a token whose payload is not JSON", `header.${Buffer.from("nope").toString("base64url")}.sig`],
  ])("fails closed for %s", (_label, token) => {
    expect(isJwtExpired(token)).toBe(true);
  });

  test("fails closed when exp is missing or not a number", () => {
    expect(isJwtExpired(makeToken({}))).toBe(true);
    expect(isJwtExpired(makeToken({ exp: "soon" }))).toBe(true);
  });
});
