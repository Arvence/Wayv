import { vi } from "vitest";

vi.stubEnv("NODE_ENV", "test");
vi.stubEnv("DATABASE_URL", "postgresql://app:app@localhost:5433/fullstack_project");
vi.stubEnv("AUTH_COOKIE_SECRET", "development-auth-cookie-secret-32chars");
