type JwtPayload = {
  exp?: number;
};

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return atob(`${normalized}${padding}`);
}

export function isJwtExpired(token: string, bufferSeconds = 30) {
  try {
    const [, payloadSegment] = token.split(".");

    if (!payloadSegment) {
      return true;
    }

    const payload = JSON.parse(decodeBase64Url(payloadSegment)) as JwtPayload;

    if (typeof payload.exp !== "number") {
      return true;
    }

    return payload.exp <= Math.floor(Date.now() / 1000) + bufferSeconds;
  } catch {
    return true;
  }
}
