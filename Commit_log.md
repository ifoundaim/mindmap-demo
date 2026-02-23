# Commit Log

## 2026-02-22

- Initialized the project as a Vite + React app and integrated the full interactive `MindMapExplorer` UI.
- Added backend graph infrastructure (in-memory + Helix adapter), ingestion/dedupe pipeline, analytics, and HTTP API routes.
- Implemented MCP tooling (`session_bootstrap`, `log_insight`, `link_nodes`, `find_connections`, `recommend_next_actions`) for stdio and HTTP transports.
- Added relationship overlay + insights panel in the UI and wired API integration.
- Added environment templates for local/cloud Helix setups, tests (contract/regression/integration), observability counters, and run scripts.
- Added Option A remote URL support via MCP HTTP server entrypoint for ChatGPT "New App" URL onboarding.
