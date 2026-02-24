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

## 2026-02-22 (Automatic transcript/git sync worker)

- Added an environment-gated auto-sync worker that periodically imports git history and Cursor local transcript turns, with checkpoint persistence to avoid re-importing processed lines.
- Wired auto-sync into API startup and surfaced status/trigger endpoints (`/api/import/status` now includes `auto_sync`; added `POST /api/import/auto-sync/run`).
- Updated the UI auto-import panel with a one-click `Run auto-sync now` action and auto-sync state visibility.
- Added regression coverage for transcript extraction/checkpoint behavior and API auto-sync status/run flows; documented configuration in `.env` example files.

## 2026-02-22 (3D HUD + datapoint orbit interactions)

- Added 3D node HUD support in `MindMapExplorer`/`MindMap3DView`, including selected-node summaries (details/tags/relationship highlights) and in-canvas controls for focus and datapoint expansion.
- Implemented ephemeral mini datapoint nodes in the 3D graph adapter, sourced from node metadata (tags/detail snippets) and relationship overlay records, with bounded count and distinct styling.
- Added interaction safeguards so datapoint mini-node clicks update HUD focus without replacing the right-panel parent selection.
- Expanded frontend regression tests to cover HUD visibility, datapoint expand/hide behavior, and parent-selection continuity in 3D mode.

## 2026-02-22 (Auto-sync default path hardening + diagnostics)

- Hardened `AutoSyncService` preflight logic to validate auto-detected default git/cursor paths before sync, with source-specific diagnostics and `success`/`partial`/`failed` run results.
- Updated auto-sync run endpoint semantics to return failure payloads when both defaults are unavailable, while preserving partial-success behavior for single-source availability.
- Improved `MindMapExplorer` auto-import UX by surfacing exact auto-sync failure details and detected default paths directly in the panel.
- Added regression coverage for missing-default scenarios, partial success/failure API semantics, and frontend diagnostics rendering.
