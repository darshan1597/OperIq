import test from "node:test";
import assert from "node:assert/strict";
import { allowRoles } from "../middleware/auth.middleware.js";
import { canRun } from "../services/tool.service.js";

test("human role middleware permits listed roles and rejects unlisted roles", () => {
  const middleware = allowRoles("owner", "manager");
  let continued = false;
  middleware({ user: { role: "manager" } }, {}, () => { continued = true; });
  assert.equal(continued, true);

  let response;
  middleware(
    { user: { role: "staff" } },
    {
      status(code) { response = { code }; return this; },
      json(body) { response.body = body; return this; },
    },
    () => assert.fail("staff access should not continue"),
  );
  assert.equal(response.code, 403);
  assert.match(response.body.error, /permission/i);
});

test("platform tools are isolated to the admin agent", () => {
  assert.equal(canRun("admin", "admin_read_platform_health"), true);
  assert.equal(canRun("admin", "admin_pause_business_ai"), true);
  assert.equal(canRun("coordinator", "admin_read_platform_health"), false);
  assert.equal(canRun("access", "admin_pause_business_ai"), false);
});
