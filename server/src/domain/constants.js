export const NODE_STATUS = ["idea", "active", "blocked", "validated"];

export const EDGE_TYPES = [
  "supports_goal",
  "influences",
  "depends_on",
  "conflicts_with",
  "same_theme_as",
  "blocks",
  "enables",
];

export const SOURCE_TYPES = ["mcp_initial", "mcp_explicit", "import"];

export const DEFAULT_EDGE_TYPE = "same_theme_as";

export const FIXED_CONTEXT_PROFILE_IDS = ["business_only", "music_only", "full_context"];

export const DEFAULT_CONTEXT_PROFILES = [
  {
    profile_id: "business_only",
    label: "Business only",
    mode: "fixed",
    tags: ["business", "startup", "funding", "product", "engineering", "routeforge", "purposepath"],
    node_ids: ["startups", "purposepath", "routeforge", "incubators", "yc-accel", "ymg"],
    event_ids: [],
    include_full_context: false,
  },
  {
    profile_id: "music_only",
    label: "Music only",
    mode: "fixed",
    tags: ["music", "suno", "creative", "lyrics", "audio", "design"],
    node_ids: ["creative-pipeline", "music-artwork", "suno-music", "line-sabbath-air"],
    event_ids: [],
    include_full_context: false,
  },
  {
    profile_id: "full_context",
    label: "Full context",
    mode: "fixed",
    tags: [],
    node_ids: [],
    event_ids: [],
    include_full_context: true,
  },
];
