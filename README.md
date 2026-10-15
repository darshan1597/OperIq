# OperIQ

A MERN operations workspace for service businesses. Coordinate customer enquiries, appointment proposals, staff tasks, and complaint resolution from one dashboard.

## Run locally

Requires Node.js 22+ and npm.

```powershell
cd server
npm install
Copy-Item .env.example .env
npm run dev
```

In a second terminal:

```powershell
cd client
npm install
npm run dev
```

Copy `client/.env.example` to `client/.env` for Firebase's public web configuration. Add the Firebase Admin service-account values from `server/.env.example` to `server/.env`. In Firebase Authentication, enable the Google provider and add your local and deployed domains to Authorized domains. Firebase verifies Google identity; OperIQ then issues its own JWT and keeps workspace data in the OperIQ database.

Open http://127.0.0.1:5173. API: http://127.0.0.1:4000.

The client and server are independent npm projects. Each has its own `package.json`, `package-lock.json`, and `node_modules` directory.

Run backend tests from `server/` with `npm test`. Run the production UI build or UI regression tests from `client/` with `npm run build` or `npm test`.

UI regression checks require Google Chrome. They check all existing pages, global search, workflow request entry, and mobile overflow. The client test runner starts both applications or reuses running development servers; screenshots are saved under the ignored `client/.local/` directory.

## Styling and branding

Application components use Tailwind utility classes directly in their React `className` values. Dynamic status classes are written as complete Tailwind class strings so the build can discover them without a generated style file. `client/src/index.css` contains only the Tailwind entry directives, fonts, shared design variables, browser defaults, and the spinner keyframe. Preflight remains disabled to preserve the existing native control geometry.

`client/src/pages/components/Brand.jsx` renders the generated transparent symbol from `client/public/brand/operiq-symbol.png`; the navy/orange `operiq` wordmark is separate, selectable React text. No product name is embedded in the image.

For a future styling migration, run `npm run visual:before` from `client/`, then compare with `npm run visual:after`. The script freezes workspace data and compares computed styles, element bounds, and screenshots across all pages, dialogs, and responsive widths. It excludes the intentional brand replacement and allows at most two RGB levels of Chromium compositing noise in screenshots; computed styles and bounds must match exactly. Local captures and reports live in ignored `client/.local/tailwind-parity/`.

After building the client, `npm start` from `server/` serves the UI and API at port 4000. Set `MONGODB_URI` in `server/.env` to use MongoDB. Without it, records persist to `server/.local/state.json`; this fallback is explicitly displayed in Settings. MongoDB connection failures do not silently fall back.

## What works

- Responsive owner dashboard, searchable customer directory, calendar list, staff availability, task board, message drafts, compensation decisions, and exportable execution records.
- Shared-workspace human access with Owner, Manager, Receptionist, and Staff roles. Owners can ask the Access agent to assign explicit roles or balance unspecified invitations by current role counts. The resulting `create_and_send_member_invites` call is sent through ArmorIQ; after authorization, it creates pending records and emails secure links through Nodemailer and Gmail. Accepted links create the actual member account. Server middleware enforces each role; non-owners cannot read invitation tokens, and staff responses contain only their own schedule, customers, tasks, and availability record.
- Three sandbox workflow rehearsals: enquiry to appointment proposal, staff coverage coordination, and complaint follow-up with compensation request.
- Booking constraints: qualified available staff, business hours, staff/customer conflicts, and explicit customer acceptance. Pending proposals reserve availability. Acceptance rechecks all constraints.
- Customer messages remain drafts. Financial approvals record sandbox decisions; they do not execute payments.
- Customer chat separates information from actions. Information-only questions use published business knowledge. Refund and booking requests invoke `submit_customer_request` through ArmorIQ, while private database requests invoke `export_customers` so an actual ArmorIQ BLOCK is recorded. Private export results are never returned to the public chat even if policy is misconfigured.
- Live model planning with role-specific application tool boundaries, ArmorIQ capture-plan, short-lived intent tokens, policy-aware proxy invocation, and automatic continuation after an ArmorIQ approval.
- Real MCP tools available via authenticated Streamable HTTP (`POST /mcp`) or stdio (`npm run mcp` from `server/`).

## Live ArmorIQ integration

OperIQ is configured for live ArmorIQ enforcement through the registered `operiq-mcp-v4` server. The current server advertises 24 tools. The live diagnostic verifies plan capture, short-lived intent-token issuance, Merkle proof use, proxy invocation, and a verified MCP result. No credentials are included in this repository.

To reproduce the integration:

1. Configure `JWT_SECRET`, `MONGODB_URI`, `OPENAI_API_KEY`, `ARMORIQ_API_KEY`, and `MCP_SHARED_SECRET` in `server/.env`. An OpenAI-compatible endpoint can be set with `OPENAI_BASE_URL` and `OPENAI_MODEL`. The signed-in account email is passed to ArmorIQ for each invocation.
2. Register the MCP server in ArmorIQ using a reachable HTTPS `/mcp` endpoint and the header `Authorization: Bearer <MCP_SHARED_SECRET>`. For local development, use a suitable tunnel/reverse proxy. Set `ARMORIQ_MCP_NAME` to the registered server name.
3. Configure ArmorIQ policies for the intended tools. Allow read and preparation tools, hold consequential execution tools such as `admin_pause_business_ai`, and block private exports such as `export_customers` and `admin_export_platform_registry`. The coordinator captures the complete plan and mints a short-lived intent token before invoking through the ArmorIQ proxy. Agent-specific tool boundaries are validated by OperIQ before that invocation.
4. Set `EXECUTION_MODE=live` and restart. Run a workflow, optionally enabling the unplanned export probe. Record an actual successful allowed call and an actual ArmorIQ denial, including the dashboard trace. Unexpected export permission is reported as **Unexpectedly allowed**, not relabeled a block.
5. A policy hold is recorded with its ArmorIQ delegation ID. Resolve it in ArmorIQ. The pending invocation remains fail-closed and the workflow automatically continues from that exact step after approval. The separate compensation inbox represents business approval records and must not be presented as the ArmorIQ approval interface.

Held invocations are persisted as durable governance jobs. Their short-lived intent tokens are encrypted with `GOVERNANCE_JOB_SECRET` (or `JWT_SECRET` when the separate key is omitted). A leased recovery worker checks pending delegations after a server restart, rejects expired or denied approvals, and atomically claims approved jobs before resuming them. Keep this encryption key stable across deployments; changing it makes existing pending jobs unrecoverable.

Application role denials are labeled **Application role boundary**. ArmorIQ proxy errors are failures, not fabricated security blocks. Missing credentials in live mode fail closed without sandbox fallback.

## Architecture and current limits

`client/`: React, React Router, Vite, Tailwind, and Lucide for the business dashboard and public customer portal. `admin/`: a separate React, Router, Vite, and Tailwind application for platform monitoring. `server/`: Express, Mongoose, MCP SDK, ArmorIQ SDK, and an OpenAI-compatible planner.

The coordinator produces a structured plan; customer, operations, resolution, and access executors have different application tool permissions. They share one model. In live mode, the installed ArmorIQ SDK captures the plan, issues a short-lived intent token, and routes MCP calls through policy enforcement.

OperIQ uses email/password authentication with expiring JWT sessions. Each account receives an isolated workspace in MongoDB or the local development store. Customer acceptance buttons remain sandbox controls in the owner UI rather than authenticated customer links. External messaging, payment processing, automatic rescheduling, realtime customer negotiation, and production deployment are not included.

The MCP shared secret trusts its holder to call tools; give it only to the configured ArmorIQ proxy. Do not share it with customers or the model. All sample records use synthetic customer data. Run only sandbox financial workflows. The in-process serial mutation queue prevents local races; multiple API processes against the same workspace require database transactions/optimistic concurrency before deployment. Do not run stdio and HTTP MCP writers simultaneously against the same local file.

SDK references: https://docs.armoriq.ai/sdk and https://docs.armoriq.ai/platform/sdk-cli/typescript-sdk. These currently differ in some API details; this project's installed package is the implementation reference.

## Demo preparation

See [DEMO.md](./DEMO.md) for the final allow, hold, block, audit, and backup-recording checklist.
