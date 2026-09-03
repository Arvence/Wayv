import { z } from "zod";

const environmentSchema = z.object({
  DATABASE_URL: z.string().url().refine((value) => value.startsWith("postgres://") || value.startsWith("postgresql://"), "DATABASE_URL must use the postgres or postgresql protocol"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const parsedEnvironment = environmentSchema.safeParse({
  DATABASE_URL: process.env.DATABASE_URL,
  NODE_ENV: process.env.NODE_ENV,
});

if (!parsedEnvironment.success) {
  throw new Error(`Invalid environment variables: ${JSON.stringify(parsedEnvironment.error.flatten().fieldErrors)}`);
}

export const env = parsedEnvironment.data;
