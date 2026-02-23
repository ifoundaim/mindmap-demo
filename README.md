# Mind Map + Helix + MCP

This project includes:
- A React mind map explorer UI
- A Node API server for ingestion and graph analytics
- An MCP server for tool-based logging/querying from chat environments

## Environment Profiles

- Local/default template: `.env.example`
- Cloud Helix template: `.env.helix-cloud.example`

Copy one to `.env` and edit values before starting servers.

## Commands

- Frontend: `npm run dev`
- API server: `npm run dev:api`
- MCP server: `npm run dev:mcp`
- MCP HTTP server (for remote URL clients): `npm run dev:mcp:http`
- Tests: `npm test`

## ChatGPT "New App (Beta)" URL path

When ChatGPT asks for an MCP Server URL, use the HTTP MCP server (`dev:mcp:http`) and expose it through a trusted HTTPS tunnel/domain.

Typical flow:
- Start local server: `npm run dev:mcp:http`
- Expose `http://localhost:8788/mcp` with a tunnel provider that gives valid HTTPS
- Paste resulting `https://.../mcp` URL into ChatGPT app setup
