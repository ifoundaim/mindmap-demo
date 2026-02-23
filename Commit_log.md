# Commit Log

## 2026-02-22

- Initialized the project as a Vite + React app and integrated the full interactive `MindMapExplorer` UI.
- Added backend graph infrastructure (in-memory + Helix adapter), ingestion/dedupe pipeline, analytics, and HTTP API routes.
- Implemented MCP tooling (`session_bootstrap`, `log_insight`, `link_nodes`, `find_connections`, `recommend_next_actions`) for stdio and HTTP transports.
- Added relationship overlay + insights panel in the UI and wired API integration.
- Added environment templates for local/cloud Helix setups, tests (contract/regression/integration), observability counters, and run scripts.
- Added Option A remote URL support via MCP HTTP server entrypoint for ChatGPT "New App" URL onboarding.

## 2026-02-22 (Profile-aware memory + profile editor enhancements)

- Implemented hybrid profile-aware memory across schema/store/service/API/MCP/UI, including default + custom profiles, auto-assignment, profile-scoped recall, and policy guardrails.
- Added profile observability counters and regression coverage for profile contracts, service behavior, and API flows.
- Added in-app profile creation/editing tools with keyword search over graph datapoints, plus node- and event-level (`event_ids`) profile curation and save flows.

## 2026-02-22 (Auto import + capability context + UI controls)

- Added source-aware context import support for Cursor chat entries and git commit history, including new API routes (`/api/import/cursor-chats`, `/api/import/git-history`, `/api/import/status`) and importer normalization/enrichment flows.
- Extended evidence schema/storage/recall to carry import metadata and capability-confidence annotations, plus source filtering support across recall and datapoint search.
- Updated `MindMapExplorer` with evidence source filters and an in-app auto-import panel (manual Cursor note import + recent git import + import status refresh).
- Added regression coverage for import schemas, importer service behavior, API integration, and frontend import controls/endpoints.
