import { z } from "zod";

const environmentSchema = z.object({
  DATABASE_URL: z.string().url().refine((value) => value.startsWith("postgres://") || value.startsWith("postgresql://"), "DATABASE_URL must use the postgres or postgresql protocol"),
  AUTH_COOKIE_SECRET: z.string().min(32),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DEMO_AUTH_ENABLED: z.preprocess(
    (value) => value === "true",
    z.boolean().default(false),
  ),
});

const parsedEnvironment = environmentSchema.safeParse({
  DATABASE_URL: process.env.DATABASE_URL,
  AUTH_COOKIE_SECRET: process.env.AUTH_COOKIE_SECRET,
  NODE_ENV: process.env.NODE_ENV,
  DEMO_AUTH_ENABLED: process.env.DEMO_AUTH_ENABLED,
});

if (!parsedEnvironment.success) {
  throw new Error(`Invalid environment variables: ${JSON.stringify(parsedEnvironment.error.flatten().fieldErrors)}`);
}

export const env = parsedEnvironment.data;
