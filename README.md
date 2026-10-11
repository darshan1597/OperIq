# OpsDesk

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

Copy `client/.env.example` to `client/.env` for Firebase's public web configuration. Add the Firebase Admin service-account values from `server/.env.example` to `server/.env`. In Firebase Authentication, enable the Google provider and add your local and deployed domains to Authorized domains. Firebase verifies Google identity; OpsDesk then issues its own JWT and keeps workspace data in the OpsDesk database.

Open http://127.0.0.1:5173. API: http://127.0.0.1:4000.

The client and server are independent npm projects. Each has its own `package.json`, `package-lock.json`, and `node_modules` directory.

Run backend tests from `server/` with `npm test`. Run the production UI build or UI regression tests from `client/` with `npm run build` or `npm test`.

UI regression checks require Google Chrome. They check all existing pages, global search, workflow request entry, and mobile overflow. The client test runner starts both applications or reuses running development servers; screenshots are saved under the ignored `client/.local/` directory.

## Styling and branding

Application components use Tailwind utility classes directly in their React `className` values. Dynamic status classes are written as complete Tailwind class strings so the build can discover them without a generated style file. `client/src/index.css` contains only the Tailwind entry directives, fonts, shared design variables, browser defaults, and the spinner keyframe. Preflight remains disabled to preserve the existing native control geometry.

`client/src/pages/components/Brand.jsx` renders the generated transparent symbol from `client/public/brand/opsdesk-symbol.png`; the navy/orange `opsdesk` wordmark is separate, selectable React text. No product name is embedded in the image.

For a future styling migration, run `npm run visual:before` from `client/`, then compare with `npm run visual:after`. The script freezes workspace data and compares computed styles, element bounds, and screenshots across all pages, dialogs, and responsive widths. It excludes the intentional brand replacement and allows at most two RGB levels of Chromium compositing noise in screenshots; computed styles and bounds must match exactly. Local captures and reports live in ignored `client/.local/tailwind-parity/`.

After building the client, `npm start` from `server/` serves the UI and API at port 4000. Set `MONGODB_URI` in `server/.env` to use MongoDB. Without it, records persist to `server/.local/state.json`; this fallback is explicitly displayed in Settings. MongoDB connection failures do not silently fall back.

## What works

- Responsive owner dashboard, searchable customer directory, calendar list, staff availability, task board, message drafts, compensation decisions, and exportable execution records.
- Three sandbox workflow rehearsals: enquiry to appointment proposal, staff coverage coordination, and complaint follow-up with compensation request.
- Booking constraints: qualified available staff, business hours, staff/customer conflicts, and explicit customer acceptance. Pending proposals reserve availability. Acceptance rechecks all constraints.
- Customer messages remain drafts. Financial approvals record sandbox decisions; they do not execute payments.
- Live model planning with role-specific tool boundaries and ArmorIQ capture-plan / intent-token / proxy-invoke integration.
- Real MCP tools available via authenticated Streamable HTTP (`POST /mcp`) or stdio (`npm run mcp` from `server/`).

## Honest integration status

**Default sandbox mode is not an AI execution demo or proof of ArmorIQ enforcement.** It runs predefined rehearsal plans so the workspace can be explored without credentials. Custom prompt interpretation requires live mode. No fake ArmorIQ trace is generated.

Live integration has not been verified against an ArmorIQ account. No credentials are included. To complete the hackathon proof:

1. Configure `JWT_SECRET`, `MONGODB_URI`, `OPENAI_API_KEY`, `ARMORIQ_API_KEY`, and `MCP_SHARED_SECRET` in `server/.env`. An OpenAI-compatible endpoint can be set with `OPENAI_BASE_URL` and `OPENAI_MODEL`. The signed-in account email is passed to ArmorIQ for each invocation.
2. Register `opsdesk-mcp` in ArmorIQ using a reachable HTTPS `/mcp` endpoint and the header `Authorization: Bearer <MCP_SHARED_SECRET>`. The development server binds to loopback; use a suitable development tunnel/reverse proxy. Set a strong `JWT_SECRET`; users register and sign in to access their isolated workspace.
3. Configure ArmorIQ policy to permit intended operations and deny customer exports/cancellations. The code captures only permitted plan steps, mints a short-lived intent token, then invokes through the ArmorIQ proxy. Remote MCP execution occurs exactly once; the application does not repeat it locally.
4. Set `EXECUTION_MODE=live` and restart. Run a workflow, optionally enabling the unplanned export probe. Record an actual successful allowed call and an actual ArmorIQ denial, including the dashboard trace. Unexpected export permission is reported as **Unexpectedly allowed**, not relabeled a block.
5. A policy hold is recorded with its ArmorIQ delegation ID. Resolve it in ArmorIQ. Automatic hold continuation and an in-app ArmorIQ approval interface are not implemented; do not confuse the separate sandbox compensation inbox with ArmorIQ approval.

Application role denials are labeled **Application role boundary**. ArmorIQ proxy errors are failures, not fabricated security blocks. Missing credentials in live mode fail closed without sandbox fallback.

## Architecture and current limits

`client/`: React, React Router, Vite, Tailwind, and Lucide. `client/src/main.jsx` only mounts the router and application; `App.jsx` contains the shared workspace shell and route table; every workspace view has its own module under `client/src/pages/`; reusable UI lives under `client/src/pages/components/`. `server/`: Express, Mongoose, MCP SDK, ArmorIQ SDK, and an OpenAI-compatible planner.

The coordinator produces a structured plan; customer, operations, and resolution executors have different application tool permissions. They share one model. Native cryptographic sub-agent delegation is **not implemented**. This is an initial functional foundation, not a finished autonomous business platform.

OpsDesk uses email/password authentication with expiring JWT sessions. Each account receives an isolated workspace in MongoDB or the local development store. Customer acceptance buttons remain sandbox controls in the owner UI rather than authenticated customer links. External messaging, payment processing, automatic rescheduling, realtime customer negotiation, and production deployment are not included.

The MCP shared secret trusts its holder to call tools; give it only to the configured ArmorIQ proxy. Do not share it with customers or the model. All sample records use synthetic customer data. Run only sandbox financial workflows. The in-process serial mutation queue prevents local races; multiple API processes against the same workspace require database transactions/optimistic concurrency before deployment. Do not run stdio and HTTP MCP writers simultaneously against the same local file.

SDK references: https://docs.armoriq.ai/sdk and https://docs.armoriq.ai/platform/sdk-cli/typescript-sdk. These currently differ in some API details; this project's installed package is the implementation reference.

## Hackathon checklist still to complete

- Verify live ArmorIQ integration with a registered MCP server and real allow/block evidence.
- Implement native scoped delegation and approval continuation if included in the pitch.
- Record a 90-second demo and publish your repository with setup instructions.
- Disclose pre-existing dependencies and confirm development falls within your official hackathon window.
