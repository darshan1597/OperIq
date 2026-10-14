// UI automation must never load or contact services configured in server/.env.
process.env.EXECUTION_MODE = "sandbox";
process.env.JWT_SECRET = "operiq-test-secret-that-is-long-enough";
for (const name of ["MONGODB_URI", "OPENAI_API_KEY", "ARMORIQ_API_KEY", "MCP_SHARED_SECRET"])
  delete process.env[name];

await import("./index.js");
