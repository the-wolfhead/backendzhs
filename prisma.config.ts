import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations", // optional but recommended
  },
  datasource: {
    url: env("DATABASE_URL"), // preferred
    // or hardcode temporarily while debugging:
    // url: "postgresql://admin_01:wJo3E5B6XrZAPmaxqT2xmMLa2sbhwLUR@dpg-d3gp2oe3jp1c73eve48g-a:5432/zhs_db",
  },
});