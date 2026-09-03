import { createHmac, timingSafeEqual } from "crypto";

import { env } from "@/server/env";

function createSignature(userId: string) {
  return createHmac("sha256", env.AUTH_COOKIE_SECRET)
    .update(userId)
    .digest("hex");
}

export function createUserCookie(userId: string) {
  return signUserId(userId);
}

export function readUserCookie(cookie: string) {
  return verifyUserCookie(cookie);
}

export function signUserId(userId: string) {
  return `${userId}.${createSignature(userId)}`;
}

export function verifyUserCookie(value: string) {
  const separatorIndex = value.lastIndexOf(".");

  if (separatorIndex === -1) {
    return null;
  }

  const userId = value.slice(0, separatorIndex);
  const signature = value.slice(separatorIndex + 1);

  if (!userId || !signature) {
    return null;
  }

  const expectedSignature = createSignature(userId);

  const signatureBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  if (signatureBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  return userId;
}
