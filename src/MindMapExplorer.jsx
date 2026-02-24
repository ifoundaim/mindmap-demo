import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import MindMap2DView from "./components/MindMap2DView";
import { buildForceGraphData, buildSelectedDatapoints } from "./utils/graph3d";

/**
 * Hymn — 12-Month Mind Map Explorer (Interactive)
 * - Pan/zoom SVG tree
 * - Click node to inspect
 * - Double-click node to collapse/expand
 * - Search + jump-to results (auto-expands path)
 * - Export visible tree JSON
 *
 * Notes:
 * This is a best-effort reconstruction from our last ~12 months of chat context.
 * You can edit DATA below to add/remove nodes, or paste in your own.
 */

// ---------------------------
// 1) DATA (edit me)
// ---------------------------

const DATA = {
  id: "root",
  label: "Hymn — Topics & Learnings (last ~12 months)",
  tags: ["root"],
  details:
    "Interactive mind map of subjects, projects, preferences, workflows, and recurring themes across our last ~12 months of chats.",
  children: [
    {
      id: "core-arc",
      label: "Core arc",
      tags: ["identity", "strategy"],
      details:
        "The through-line: build mission-driven creative tech, ship real products, refine aesthetics + narrative systems, and align personal growth with impact.",
      children: [
        {
          id: "core-arc-mission",
          label: "Mission / Values",
          tags: ["values"],
          details:
            "Repeated value signals: justice/equity, creator pathways, impact measurement, consciousness-first worldview.",
          children: [
            {
              id: "values-impact-accounting",
              label: "Impact accounting as core belief",
              tags: ["values"],
              details:
                "Quote: Measuring social & environmental impact will become as important as financial accounting; capital must serve wellbeing and ancestral legacies.",
            },
            {
              id: "values-creator-pathways",
              label: "Creator pathways (artists respected + paid)",
              tags: ["values", "routeforge"],
              details:
                "Positioning preference: honor illustrators; build pay pathways; avoid preachy claims; avoid framing training as outright theft while staying respectful.",
            },
            {
              id: "values-consciousness",
              label: "Consciousness as fundamental",
              tags: ["philosophy"],
              details:
                "You want consciousness to be the base layer of your philosophy + storytelling; it should emerge naturally through lived understanding.",
            },
          ],
        },
        {
          id: "core-arc-identity",
          label: "Identity / Archetypes",
          tags: ["identity"],
          details:
            "Hero-of-justice aspiration; reconcile shadow; protagonist council; romantic archetype standards.",
          children: [
            {
              id: "protagonist-council",
              label: "Inner protagonist council",
              tags: ["identity", "story"],
              details:
                "A self-guidance system using admired protagonists + philosophical/spiritual figures.",
              children: [
                {
                  id: "council-anime",
                  label: "Anime protagonists",
                  tags: ["anime", "identity"],
                  details:
                    "Deku, Naruto, Luffy, Isagi Yoichi, Yami Yugi (Atem). Themes: perseverance, freedom, strategic vision, inner conflict → growth.",
                },
                {
                  id: "council-figures",
                  label: "Historical / spiritual figures",
                  tags: ["identity"],
                  details:
                    "Steve Jobs, Walt Disney, Marcus Aurelius; plus celestial members: Jesus, Buddha, Krishna.",
                },
              ],
            },
            {
              id: "romantic-archetype",
              label: "Romantic archetype",
              tags: ["relationships"],
              details:
                "You seek a romantic tone blending bravery, emotional strength, playful confidence; inspired by Howl + Shoya Ishida; longing for devotion + emotional safety.",
            },
            {
              id: "shadow-work",
              label: "Shadow work",
              tags: ["psychology"],
              details:
                "Exploration of selfish base instincts vs heroic ideals; integrate, don't repress.",
            },
          ],
        },
      ],
    },

    {
      id: "startups",
      label: "Startups & ventures",
      tags: ["startup"],
      details:
        "Your ecosystem: PurposePath, RouteForge, VibeCode School, incubator/accelerator programs, and related product experiments.",
      children: [
        {
          id: "purposepath",
          label: "PurposePath",
          tags: ["startup", "purposepath"],
          details:
            "Core concept: story engine + canonical character/style systems + creator-friendly IP/provenance direction.",
          children: [
            {
              id: "pp-story-engine",
              label: "Story Engine (UX + tech)",
              tags: ["product", "story"],
              details:
                "Engine builds canonical character sheets + style profiles; supports media generation from the start; story progression evolves canonical data.",
              children: [
                {
                  id: "ask-seek-knock",
                  label: "Ask • Seek • Knock ritual prompts",
                  tags: ["product", "ux"],
                  details:
                    "Ask: What question aches in your soul? Seek: What are you looking for? Knock: Are you ready to become?",
                },
                {
                  id: "pp-media-tools",
                  label: "Media tools available from start",
                  tags: ["product", "tools"],
                  details:
                    "OST, image/video, voice narration available from the beginning; users can generate media at every major scene.",
                },
                {
                  id: "pp-canon-evolves",
                  label: "Canon evolves with choices",
                  tags: ["product"],
                  details:
                    "All characters + beats shaped by increasingly robust user-derived data; automation becomes more fluid as costs drop.",
                },
              ],
            },
            {
              id: "pp-sim-video",
              label: "Investor simulation video",
              tags: ["pitch", "media"],
              details:
                "You wanted a step-by-step storyboard pack demonstrating the Story Engine user experience for investors/collaborators.",
            },
            {
              id: "pp-firebase-storage",
              label: "Firebase Storage blocker",
              tags: ["engineering"],
              details:
                "Firebase Storage enablement blocked by past-due Google Payments; you wanted a reminder to return once funding is acquired.",
            },
          ],
        },

        {
          id: "routeforge",
          label: "RouteForge",
          tags: ["startup", "routeforge"],
          details:
            "Provenance + distribution layer: attribution, royalty tracking, creator-friendly flows; messaging sensitive to artist concerns.",
          children: [
            {
              id: "rf-messaging",
              label: "Messaging constraints",
              tags: ["brand", "values"],
              details:
                "Keep aligned with your view on training data; don't state controversial positions outright; emphasize respect + pay pathways.",
            },
          ],
        },

        {
          id: "vibecode-school",
          label: "VibeCode School",
          tags: ["brand", "education"],
          details:
            "Video-first build-in-public channel; episode scripts; checklists; sophisticated blue palette preference.",
          children: [
            {
              id: "vcs-episode-scripting",
              label: "Episode scripting",
              tags: ["writing"],
              details:
                "You asked for intros + audit-report segments, especially around shipping the YMG app; mention collaborators and what's been vibecoded so far.",
            },
            {
              id: "vcs-visual-style",
              label: "Visual style requests",
              tags: ["design"],
              details:
                "Wanted a stylized image (VibeCode School blue colors) and checklist-style graphics.",
            },
          ],
        },

        {
          id: "incubators",
          label: "Incubators & partnerships (RISE / NEST)",
          tags: ["startup", "partnership"],
          details:
            "PCMX partnership + Russ Stoddard; Idea-to-business launch program; social enterprise incubator; pricing + audience.",
          children: [
            {
              id: "rise-program",
              label: "RISE incubator (program design)",
              tags: ["program"],
              details:
                "Boise/Treasure Valley founders; $2500 price point; applications + Meta ads + funnels + content.",
            },
            {
              id: "rise-persona",
              label: "Target persona",
              tags: ["marketing"],
              details:
                "25-45, skilled pro, employed, hesitant to quit job, ambitious, impact-minded, progressive, ethics/community.",
            },
            {
              id: "goat-allegory",
              label: "GOAT story allegory",
              tags: ["story", "marketing"],
              details:
                "GOAT = Greatest of All Time founders; golden scales = justice/equity; parables (turtle wisdom, trampling snake = defeating destructive practices).",
            },
            {
              id: "nest-program",
              label: "NEST incubator (phoenix founders)",
              tags: ["program"],
              details:
                "Aligned values; targets transformation from person -> founder.",
            },
          ],
        },

        {
          id: "yc-accel",
          label: "Accelerators & funding",
          tags: ["startup", "funding"],
          details:
            "YC application impulses; accelerator in Paris (Anomalie); seed-funding logic to attract technical cofounder.",
          children: [
            {
              id: "yc-application",
              label: "Y Combinator app context",
              tags: ["funding"],
              details:
                "You felt an impulse to apply; wanted market-size framing for AI interactive storytelling tools.",
            },
            {
              id: "market-sizing",
              label: "Market sizing narrative",
              tags: ["funding", "market"],
              details:
                "You wanted to mention projected multi-billion market growth; consumer + creator sides; trend toward personalized generative narrative.",
            },
            {
              id: "anomalie-paris",
              label: "Anomalie (Paris) application",
              tags: ["funding"],
              details: "You were applying with PurposePath story engine.",
            },
          ],
        },

        {
          id: "ymg",
          label: "Your Mom's Garage (YMG) app",
          tags: ["product", "engineering"],
          details:
            "Audit plan, Supabase stability, UX features, email confirmations, terms of service, zip-radius search, profiles, TestFlight.",
          children: [
            {
              id: "ymg-audit",
              label: "Audit + stability checklist",
              tags: ["engineering"],
              details:
                "Test all buttons; posting; filtering/sorting; chat actions; login/username; clean data; confirm post-new-item email via Resend.",
            },
            {
              id: "ymg-features",
              label: "Planned feature additions",
              tags: ["product"],
              details:
                "Terms of Service + required checkbox; zip code required; radius search; seller/buyer profiles w/ ratings; web profiles at /@username.",
            },
            {
              id: "ymg-deploy",
              label: "Testing + deployment",
              tags: ["engineering"],
              details: "TestFlight setup; app icons; domain/web URL management.",
            },
          ],
        },
      ],
    },

    {
      id: "engineering",
      label: "Engineering & tooling",
      tags: ["engineering"],
      details:
        "Hands-on dev questions: Supabase, staging, email, CSV import, Xcode workflows, agent prompting, and tool selection.",
      children: [
        {
          id: "supabase",
          label: "Supabase",
          tags: ["engineering", "backend"],
          details:
            "Auth, SMTP, confirmation links, table backups, staging clones, CSV imports, and DB hygiene.",
          children: [
            {
              id: "smtp-mailjet",
              label: "Custom SMTP (Mailjet)",
              tags: ["auth"],
              details:
                "Wired SMTP; permission issues (developer vs admin); then updated settings; confirmation link dead issue surfaced.",
            },
            {
              id: "dead-confirm-link",
              label: "Dead confirmation link debugging",
              tags: ["auth", "debug"],
              details:
                "You ran into dead confirmation links; needed changes to redirect/site URL settings and/or auth email templates.",
            },
            {
              id: "csv-import",
              label: "CSV import (zip_lookup)",
              tags: ["data"],
              details:
                "Prepared CSV for Supabase import with lat/lng float types; worked through import steps and type mapping.",
            },
            {
              id: "table-backups-staging",
              label: "Backups + staging clone",
              tags: ["data", "ops"],
              details:
                "Needed duplicate table backups (chat_messages) and a true staging clone; used SQL/terminal guidance.",
            },
          ],
        },
        {
          id: "xcode",
          label: "Xcode",
          tags: ["engineering", "apple"],
          details: "Simulator selection + debug console interaction questions.",
          children: [
            {
              id: "xcode-simulator",
              label: "Choosing a simulated device",
              tags: ["apple"],
              details:
                "You installed device simulators and needed guidance selecting the target device.",
            },
            {
              id: "xcode-debug-console",
              label: "Debug console input",
              tags: ["apple", "debug"],
              details:
                "You couldn't find where to type commands; clarified UI areas vs log view.",
            },
          ],
        },
        {
          id: "agent-workflows",
          label: "Agent workflows (Cursor / prompts)",
          tags: ["engineering", "workflow"],
          details:
            "You asked for prompts that instruct other agents with full scope and to output full copy-pasteable files.",
        },
        {
          id: "claude-trials",
          label: "Tool scouting: Claude / Claude Code trials",
          tags: ["tools"],
          details:
            "You asked to find current free trials for Claude and Claude Code.",
        },
      ],
    },

    {
      id: "creative-pipeline",
      label: "Creative pipeline (image / video / music)",
      tags: ["creative"],
      details:
        "Generative stack, prompt frameworks, consistency protocols, character canon, and brand aesthetics.",
      children: [
        {
          id: "gen-tools",
          label: "Generative tools stack",
          tags: ["tools"],
          details:
            "Tools mentioned across work: Midjourney, Stable Diffusion, Suno, ElevenLabs, Vertex AI / Veo, Vidu, Flora AI, Socra.AI.",
        },
        {
          id: "prompt-frameworks",
          label: "Prompt frameworks + consistency rules",
          tags: ["design", "workflow"],
          details:
            "You standardized a Midjourney best-practices prompt skeleton with semicolons, weights, ordered sections, default negatives, and aspect-ratio locks.",
          children: [
            {
              id: "mj-skeleton",
              label: "Midjourney prompt skeleton",
              tags: ["midjourney"],
              details:
                "Order: Subject; Action; Environment; Camera; Look; Negative; then params (e.g., --ar 16:9 --v 6 --style raw --s 140-200).",
            },
            {
              id: "aspect-ratio-lock",
              label: "Aspect ratio rules",
              tags: ["design"],
              details:
                "Most story visuals: 16:9 default; some styles (Celestial Vow) use 9:16; cursor not included in UI images.",
            },
            {
              id: "post-gen-review",
              label: "Post-generation self-review requirement",
              tags: ["workflow"],
              details:
                "After every image generation: analyze drift vs visual lock protocol and re-render if necessary.",
            },
          ],
        },

        {
          id: "style-profiles",
          label: "Named style profiles",
          tags: ["design"],
          details:
            "You created multiple style profiles to lock look/feel across projects.",
          children: [
            {
              id: "limbo-polish",
              label: "Limbo Polish",
              tags: ["design"],
              details:
                "Semi-realistic anime, crisp weighted outlines, 2-3 tone cel shading, high-key white liminal studio, minimal holographic accents.",
            },
            {
              id: "arcadia-city-polish",
              label: "Arcadia City Polish",
              tags: ["design"],
              details:
                "Eco-future kawaii city: warm golden lighting, white/teal skyscrapers with greenery, joyful tone, 16:9.",
            },
            {
              id: "celestial-vow-polish",
              label: "Celestial Vow Polish",
              tags: ["design"],
              details:
                "Limbo Polish variant: 9:16, calm suit figure, pink-gold holographic moon motif w/ single woman silhouette, minimal stars/laurel.",
            },
          ],
        },

        {
          id: "characters",
          label: "Characters + canon continuity",
          tags: ["story"],
          details:
            "You built a detailed continuity system for recurring characters, designs, and lore.",
          children: [
            {
              id: "kai",
              label: "Kai (protagonist avatar)",
              tags: ["story", "canon"],
              details:
                "Kai embodies the Visionary Dreamer archetype; consistent appearance rules + turnarounds; used across simulation scenes.",
            },
            {
              id: "codex",
              label: "Codex (AI companion)",
              tags: ["story", "canon"],
              details:
                "Floating archivist; seraphic guardian in battle mode; chest emblem (gold cross in charcoal circle), no mouth (emotion via eyes/panel), tail color lock.",
            },
            {
              id: "npc-companion",
              label: "NPC companion (young woman)",
              tags: ["story", "canon"],
              details:
                "Consistent look: amber eyes, beauty mark under left eye, long black hair in loose braid, tan shawl + muted gray tunic, gentle grounded presence.",
            },
            {
              id: "kyuutonatsu",
              label: "Kyuutonatsu (canon v1)",
              tags: ["canon", "design"],
              details:
                "Full spec: indigo denim safari set, gold buttons/stitching, white sneakers, gold pendant, Limbo Polish default, 16:9 studio minimalism.",
            },
            {
              id: "canon-consent",
              label: "Canon constraints / consent",
              tags: ["ethics"],
              details:
                "You opted out of using a specific person's image in AI product contexts; switched to a consented canon character until further notice.",
            },
          ],
        },

        {
          id: "music-artwork",
          label: "Song artwork + emblem design",
          tags: ["music", "design"],
          details:
            "Iterated on sacred emblem covers (flamel/crucifix/dove/crown), hyperpop variants, skyline vs ultra-minimal icon covers, and animation prompts.",
          children: [
            {
              id: "flamel-emblem",
              label: "Flamel-inspired crucifix emblem",
              tags: ["design"],
              details:
                "Key issue: serpent distortion; preferred minimalist geometric ribbon/kundalini curve (no head, no scales) for clean symmetry.",
            },
            {
              id: "hyperpop-variant",
              label: "Hyperpop influence",
              tags: ["music", "design"],
              details:
                "Wanted more hyperpop shimmer (edge-based), pixel-glints, but keep emblem logo-grade and not warped.",
            },
            {
              id: "vidu-prompts",
              label: "Vidu animation prompts",
              tags: ["video"],
              details:
                "Created under-400-char motion prompts: background shimmer, birds, subtle emblem movement; dove natural motion.",
            },
          ],
        },

        {
          id: "suno-music",
          label: "Suno music production",
          tags: ["music"],
          details:
            "Remixes, vocal styling constraints, lyric iteration, and motif continuity.",
          children: [
            {
              id: "suno-robot-vocals",
              label: "Robotic/vocoder vocal constraint",
              tags: ["music"],
              details:
                "Preference: male vocals layered with a clearly synthetic robotic/vocoder effect to avoid mimicking human vocalists.",
            },
            {
              id: "lyrics-rules",
              label: "Lyric constraints / preferences",
              tags: ["music", "prefs"],
              details:
                "No famous rap artist references; don't mention orthodox boxing stance; avoid overuse of word 'flame'.",
            },
            {
              id: "line-sabbath-air",
              label: "Favorite lyric line",
              tags: ["music"],
              details:
                "Line you liked: 'Lord give us love like Sabbath air / Let imagination be our prayer'.",
            },
          ],
        },
      ],
    },

    {
      id: "writing-story",
      label: "Writing, story, and mythology",
      tags: ["writing", "story"],
      details:
        "Cyberpunk myth arcs, emotional lexicon mapping, and story-as-product worldview.",
      children: [
        {
          id: "cyberpunk-future",
          label: "Cyberpunk technoptimist story (10-15 yrs future)",
          tags: ["story"],
          details:
            "A future-forward setting; optimism, tech culture, and meaning-making through narrative.",
        },
        {
          id: "macloed-legend",
          label: "MacLeod/Vigen legend inspiration",
          tags: ["story", "myth"],
          details:
            "Ugly wolf ascends into immortality to become worthy of the fairy princess; cyberpunk adaptation target.",
        },
        {
          id: "emotion-lexicon",
          label: "Visual + musical + linguistic emotional lexicon",
          tags: ["writing", "design"],
          details:
            "Goal: map emotional experiences to symbols and aesthetics to help audiences access unspoken feelings.",
        },
      ],
    },

    {
      id: "personal-growth",
      label: "Personal growth & psychology",
      tags: ["psychology"],
      details:
        "Habits, motivation, mental health framing, relationship dynamics, and self-concept evolution.",
      children: [
        {
          id: "executive-function",
          label: "Executive function + dopamine regulation",
          tags: ["habits"],
          details:
            "You noticed lowered executive function; identified pornography as a contributor; wanted stronger willpower + systems.",
        },
        {
          id: "diagnoses-framing",
          label: "Autism + depression framing",
          tags: ["mental-health"],
          details:
            "Preference: not defined by diagnoses; language that honors nonlinear thinking, sensory depth, mythic perception, intense empathy.",
        },
        {
          id: "accountability-app",
          label: "AI accountability app idea",
          tags: ["product", "habits"],
          details:
            "Integrates biometrics + financial data; challenges poor decisions; adapts to valid deviations; community improvement scores.",
        },
        {
          id: "self-concept",
          label: "Status/self-worth loop",
          tags: ["psychology"],
          details:
            "You sometimes perceive yourself as low-status due to income; also recognize evidence of progress and long-term potential.",
        },
      ],
    },

    {
      id: "relationships",
      label: "Relationships & social dynamics",
      tags: ["relationships"],
      details:
        "Partner criteria, founder-identity resonance, modern dating tensions, and desire for a co-creative romantic union.",
      children: [
        {
          id: "partner-journey",
          label: "Partner who believes in the journey",
          tags: ["relationships"],
          details:
            "You prefer a partner who invests emotionally in your trajectory, not just current income; shared growth + cofounder vibe.",
        },
        {
          id: "gender-culture",
          label: "Men/women cultural expectations",
          tags: ["relationships", "research"],
          details:
            "Explored psychological, sociological, and biological perspectives to understand expectation clashes and improve outcomes.",
        },
      ],
    },

    {
      id: "wellness",
      label: "Wellness & lifestyle",
      tags: ["wellness"],
      details: "Training, nutrition, recovery, and sustainable performance.",
      children: [
        {
          id: "fitness",
          label: "Fitness",
          tags: ["wellness"],
          details:
            "Weights 4-5 days/week; boxing training; defined muscular build (not stereotypical bodybuilder).",
        },
        {
          id: "vegan",
          label: "Vegan performance nutrition",
          tags: ["wellness"],
          details:
            "Vegan for animal ethics; selective eating optimized for physical + cognitive performance.",
        },
        {
          id: "injury",
          label: "Shoulder injury recovery",
          tags: ["wellness"],
          details:
            "Right shoulder pinched-nerve type injury (late Dec); chiropractor relief; movement not fully restored initially.",
        },
      ],
    },

    {
      id: "research-exploration",
      label: "Research & exploration",
      tags: ["research"],
      details:
        "Market scans, weekly motif research, entertainment suggestions, and speculative/science+consciousness exploration.",
      children: [
        {
          id: "weekly-x-scan",
          label: "Weekly @ifoundaim motif scan",
          tags: ["research", "music"],
          details:
            "Plan: scan recent posts, extract symbols/themes, create a 'What moved' brief, bridge motifs across productions.",
        },
        {
          id: "kdrama-anime",
          label: "Kdrama/anime recommendations",
          tags: ["entertainment"],
          details:
            "You watched Netflix 'Start-Up' and wanted similar shows (kdramas/anime) that inspire founder energy.",
        },
        {
          id: "astrology",
          label: "Astrology reflection",
          tags: ["astrology"],
          details:
            "Natal details (Nov 4 1991, 3:00 AM, Albuquerque) + transit questions used as reflective frameworks.",
        },
        {
          id: "telepathy-consciousness",
          label: "Telepathy + consciousness (science/speculation)",
          tags: ["philosophy", "research"],
          details:
            "Explored quantum nonlocality metaphors, heart electromagnetic field coherence, mirror neurons, brainwave sync, meditation effects.",
        },
        {
          id: "writers-substances",
          label: "Writers + substance use research",
          tags: ["research"],
          details:
            "Looked at notable writers and how alcohol/drugs related to creativity and personal cost.",
        },
      ],
    },

    {
      id: "preferences",
      label: "Preferences & constraints (important)",
      tags: ["prefs"],
      details:
        "Constraints that repeatedly matter in outputs: aesthetics, language choices, and content boundaries.",
      children: [
        {
          id: "color-gold",
          label: "Favorite color: gold over dark grey/black",
          tags: ["prefs", "design"],
          details:
            "You often prefer gold layered over dark charcoal/near-black backgrounds.",
        },
        {
          id: "no-flame-overuse",
          label: "Avoid overusing the word 'flame'",
          tags: ["prefs", "music"],
          details:
            "You asked to avoid overuse of the word 'flame' in lyrics.",
        },
        {
          id: "no-rap-refs",
          label: "No famous rap artist references",
          tags: ["prefs", "music"],
          details:
            "You requested lyrics not reference famous rap artists.",
        },
        {
          id: "copy-paste-files",
          label: "Code updates: full copy-pasteable files",
          tags: ["prefs", "engineering"],
          details:
            "You prefer receiving full files rather than diffs for easier implementation.",
        },
      ],
    },
  ],
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8787";
const EDGE_TYPES = [
  "supports_goal",
  "influences",
  "depends_on",
  "conflicts_with",
  "same_theme_as",
  "blocks",
  "enables",
];
const EVIDENCE_SOURCES = ["mcp_initial", "mcp_explicit", "import", "cursor_chat", "git_commit", "git_diff"];

const MindMap3DView = lazy(() => import("./components/MindMap3DView"));

// ---------------------------
// 2) Helpers
// ---------------------------

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function flattenTree(node, parentId = null, depth = 0, out = []) {
  out.push({
    id: node.id,
    label: node.label,
    tags: node.tags || [],
    details: node.details || "",
    parentId,
    depth,
  });
  (node.children || []).forEach((c) => flattenTree(c, node.id, depth + 1, out));
  return out;
}

function buildIdMap(node, map = new Map(), parent = null) {
  map.set(node.id, { node, parent });
  (node.children || []).forEach((c) => buildIdMap(c, map, node.id));
  return map;
}

function computeTreeLayout(
  root,
  collapsedMap,
  { nodeW = 210, nodeH = 44, levelGap = 120, siblingGap = 18 } = {},
) {
  // Very simple tidy-tree-ish layout: assign y by DFS order, x by depth.
  // Collapsed nodes hide children.
  const visible = [];

  function visit(n, depth, parentId) {
    const isCollapsed = collapsedMap.get(n.id) === true;
    visible.push({ id: n.id, node: n, depth, parentId });
    if (!isCollapsed) {
      (n.children || []).forEach((c) => visit(c, depth + 1, n.id));
    }
  }

  visit(root, 0, null);

  // Assign y positions by ordering in visible list within each depth.
  // We'll space by siblingGap + nodeH, but keep global y ordering by traversal.
  const positions = new Map();
  let y = 0;

  for (const v of visible) {
    positions.set(v.id, {
      x: v.depth * levelGap,
      y,
      depth: v.depth,
      parentId: v.parentId,
    });
    y += nodeH + siblingGap;
  }

  // Normalize: center vertically around 0
  const totalH = y - siblingGap;
  for (const [id, p] of positions.entries()) {
    positions.set(id, { ...p, y: p.y - totalH / 2 });
  }

  // Determine bounds
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of positions.values()) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }

  // Build visible edges
  const edges = [];
  for (const v of visible) {
    if (v.parentId) edges.push([v.parentId, v.id]);
  }

  return {
    visibleIds: visible.map((v) => v.id),
    positions,
    edges,
    bounds: { minX, maxX, minY, maxY, totalH },
    metrics: { nodeW, nodeH, levelGap, siblingGap },
  };
}

function matchesQuery(node, q) {
  if (!q) return false;
  const t = q.toLowerCase();
  const inLabel = (node.label || "").toLowerCase().includes(t);
  const inDetails = (node.details || "").toLowerCase().includes(t);
  const inTags = (node.tags || []).some((x) => (x || "").toLowerCase().includes(t));
  return inLabel || inDetails || inTags;
}

function getPathToRoot(idMap, id) {
  const path = [];
  let cur = id;
  while (cur) {
    path.push(cur);
    const entry = idMap.get(cur);
    if (!entry) break;
    cur = entry.parent;
  }
  return path.reverse();
}

function exportVisibleSubtree(root, collapsedMap) {
  function prune(n) {
    const isCollapsed = collapsedMap.get(n.id) === true;
    const kids = isCollapsed ? [] : (n.children || []).map(prune);
    return {
      id: n.id,
      label: n.label,
      tags: n.tags || [],
      details: n.details || "",
      children: kids,
    };
  }
  return prune(root);
}

function slugifyProfileId(input) {
  return String(input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function csvToList(input) {
  return String(input || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function uniqueStrings(values) {
  return Array.from(new Set((values || []).map((x) => String(x || "").trim()).filter(Boolean)));
}

// ---------------------------
// 3) UI
// ---------------------------

function TagPill({ t, onClick }) {
  return (
    <button
      onClick={() => onClick?.(t)}
      className="rounded-full border px-2 py-1 text-xs hover:bg-neutral-100"
      title={`Filter by tag: ${t}`}
    >
      {t}
    </button>
  );
}

export default function MindMapExplorer() {
  const [root] = useState(() => deepClone(DATA));
  const idMap = useMemo(() => buildIdMap(root), [root]);
  const flat = useMemo(() => flattenTree(root), [root]);

  // Collapsed state per node
  const [collapsed, setCollapsed] = useState(() => {
    const m = new Map();
    // Start slightly collapsed for readability
    [
      "style-profiles",
      "characters",
      "music-artwork",
      "suno-music",
      "supabase",
      "incubators",
      "ymg",
    ].forEach((id) => m.set(id, true));
    return m;
  });

  // View transform
  const [tx, setTx] = useState(120);
  const [ty, setTy] = useState(0);
  const [scale, setScale] = useState(1);
  const [viewMode, setViewMode] = useState("2d");
  const [focusNodeId, setFocusNodeId] = useState(null);
  const [datapointsExpanded, setDatapointsExpanded] = useState(false);
  const [activeDatapointId, setActiveDatapointId] = useState(null);

  const [selectedId, setSelectedId] = useState("root");
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState(null);
  const [overlayEnabled, setOverlayEnabled] = useState(true);
  const [edgeTypeFilter, setEdgeTypeFilter] = useState(() => new Set(EDGE_TYPES));
  const [sourceFilter, setSourceFilter] = useState(() => new Set(EVIDENCE_SOURCES));
  const [connectionData, setConnectionData] = useState([]);
  const [insights, setInsights] = useState({ top_bridges: [], contradictions: [], timeline: [] });
  const [actions, setActions] = useState([]);
  const [apiError, setApiError] = useState("");
  const [profiles, setProfiles] = useState([]);
  const [activeProfileId, setActiveProfileId] = useState("full_context");
  const [recallData, setRecallData] = useState(null);
  const [recallLoading, setRecallLoading] = useState(false);
  const [customProfileName, setCustomProfileName] = useState("");
  const [customProfileTags, setCustomProfileTags] = useState("");
  const [customProfileNodeIds, setCustomProfileNodeIds] = useState("");
  const [profileStatus, setProfileStatus] = useState("");
  const [editorLabel, setEditorLabel] = useState("");
  const [editorTags, setEditorTags] = useState("");
  const [editorNodeIds, setEditorNodeIds] = useState([]);
  const [editorEventIds, setEditorEventIds] = useState([]);
  const [profileSearchKeyword, setProfileSearchKeyword] = useState("");
  const [profileSearchType, setProfileSearchType] = useState("all");
  const [profileSearchResults, setProfileSearchResults] = useState([]);
  const [profileSearchLoading, setProfileSearchLoading] = useState(false);
  const [cursorImportText, setCursorImportText] = useState("");
  const [gitRepoPath, setGitRepoPath] = useState(".");
  const [gitBranch, setGitBranch] = useState("");
  const [gitCommitLimit, setGitCommitLimit] = useState(15);
  const [importLoading, setImportLoading] = useState(false);
  const [importStatusMessage, setImportStatusMessage] = useState("");
  const [importStats, setImportStats] = useState(null);

  const svgRef = useRef(null);
  const dragging = useRef({ on: false, x: 0, y: 0, tx0: 0, ty0: 0 });

  useEffect(() => {
    if (viewMode === "3d") {
      setFocusNodeId(selectedId || "root");
    } else {
      setFocusNodeId(null);
    }
  }, [viewMode, selectedId]);

  useEffect(() => {
    setDatapointsExpanded(false);
    setActiveDatapointId(null);
  }, [selectedId]);

  const layout = useMemo(() => {
    return computeTreeLayout(root, collapsed);
  }, [root, collapsed]);

  const visibleSet = useMemo(() => new Set(layout.visibleIds), [layout.visibleIds]);

  const selected = useMemo(() => {
    const entry = idMap.get(selectedId);
    return entry?.node || root;
  }, [idMap, selectedId, root]);

  const selectedPath = useMemo(() => getPathToRoot(idMap, selectedId), [idMap, selectedId]);

  const allTags = useMemo(() => {
    const s = new Set();
    flat.forEach((n) => (n.tags || []).forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [flat]);

  const searchResults = useMemo(() => {
    const q = query.trim();
    if (!q && !tagFilter) return [];

    let results = flat;
    if (q) results = results.filter((n) => matchesQuery(n, q));
    if (tagFilter) results = results.filter((n) => (n.tags || []).includes(tagFilter));

    // Prefer shallower matches first, then label
    results = results
      .slice()
      .sort((a, b) => a.depth - b.depth || a.label.localeCompare(b.label));

    return results.slice(0, 80);
  }, [flat, query, tagFilter]);

  const refreshProfiles = useCallback(async () => {
    const profileRes = await fetch(`${API_BASE}/api/mcp/list-context-profiles`);
    if (!profileRes.ok) return;
    const body = await profileRes.json();
    const nextProfiles = body.profiles || [];
    setProfiles(nextProfiles);
    if (nextProfiles.length && !nextProfiles.find((p) => p.profile_id === activeProfileId)) {
      setActiveProfileId(nextProfiles[0].profile_id);
    }
  }, [activeProfileId]);

  useEffect(() => {
    async function loadInsights() {
      try {
        const [insightsRes, actionsRes] = await Promise.all([
          fetch(`${API_BASE}/api/graph/insights`),
          fetch(`${API_BASE}/api/mcp/recommend-next-actions?limit=6`),
        ]);
        if (insightsRes.ok) {
          setInsights(await insightsRes.json());
        }
        if (actionsRes.ok) {
          const body = await actionsRes.json();
          setActions(body.actions || []);
        }
        await refreshProfiles();
        setApiError("");
      } catch {
        setApiError("Graph API unavailable. Start `npm run dev:api` for relationship analytics.");
      }
    }
    loadInsights();
  }, [refreshProfiles]);

  useEffect(() => {
    async function loadConnections() {
      if (!overlayEnabled || !selectedId) {
        setConnectionData([]);
        return;
      }
      try {
        const typeQuery = Array.from(edgeTypeFilter).join(",");
        const response = await fetch(
          `${API_BASE}/api/graph/connections?nodeId=${encodeURIComponent(selectedId)}&limit=20&types=${encodeURIComponent(typeQuery)}`,
        );
        if (!response.ok) return;
        const body = await response.json();
        setConnectionData(body.matches || []);
      } catch {
        setConnectionData([]);
      }
    }
    loadConnections();
  }, [selectedId, edgeTypeFilter, overlayEnabled]);

  useEffect(() => {
    async function loadRecallContext() {
      const q = query.trim();
      if (!q) {
        setRecallData(null);
        return;
      }
      try {
        setRecallLoading(true);
        const response = await fetch(`${API_BASE}/api/mcp/recall-context`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            query: q,
            profile_id: activeProfileId,
            use_profile_filtering: true,
            top_k: 8,
            include_contradictions: true,
            include_actions: true,
            sources: Array.from(sourceFilter),
            conversation_key: "mindmap-explorer-ui",
          }),
        });
        if (!response.ok) return;
        const body = await response.json();
        setRecallData(body);
      } catch {
        setRecallData(null);
      } finally {
        setRecallLoading(false);
      }
    }
    loadRecallContext();
  }, [query, activeProfileId, sourceFilter]);

  useEffect(() => {
    async function persistActiveProfile() {
      if (!activeProfileId) return;
      const selectedProfile = (profiles || []).find((p) => p.profile_id === activeProfileId);
      if (!selectedProfile) return;
      try {
        await fetch(`${API_BASE}/api/mcp/set-context-profile`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            profile_id: selectedProfile.profile_id,
            label: selectedProfile.label || selectedProfile.profile_id,
            mode: selectedProfile.mode || "custom",
            tags: selectedProfile.tags || [],
            node_ids: selectedProfile.node_ids || [],
            event_ids: selectedProfile.event_ids || [],
            include_full_context: Boolean(selectedProfile.include_full_context),
            conversation_key: "mindmap-explorer-ui",
          }),
        });
      } catch {
        // Profile persistence is best-effort for local UI sessions.
      }
    }
    persistActiveProfile();
  }, [activeProfileId, profiles]);

  useEffect(() => {
    const active = (profiles || []).find((p) => p.profile_id === activeProfileId);
    if (!active) {
      setEditorLabel("");
      setEditorTags("");
      setEditorNodeIds([]);
      setEditorEventIds([]);
      return;
    }
    setEditorLabel(active.label || active.profile_id);
    setEditorTags((active.tags || []).join(", "));
    setEditorNodeIds(uniqueStrings(active.node_ids || []));
    setEditorEventIds(uniqueStrings(active.event_ids || []));
  }, [activeProfileId, profiles]);

  function toggleCollapse(id) {
    setCollapsed((prev) => {
      const next = new Map(prev);
      next.set(id, !(next.get(id) === true));
      return next;
    });
  }

  function expandPathTo(id) {
    const path = getPathToRoot(idMap, id);
    setCollapsed((prev) => {
      const next = new Map(prev);
      // Expand all ancestors so target becomes visible.
      for (const pid of path) next.set(pid, false);
      return next;
    });
  }

  function jumpTo(id) {
    setSelectedId(id);
    expandPathTo(id);
    if (viewMode === "3d") {
      setFocusNodeId(id);
      return;
    }
    const pos = layout.positions.get(id);
    if (pos) {
      setTx(240 - pos.x * scale);
      setTy(-pos.y * scale);
    }
  }

  function resetView() {
    if (viewMode === "3d") {
      setFocusNodeId("root");
      return;
    }
    setTx(120);
    setTy(0);
    setScale(1);
  }

  function expandAll() {
    setCollapsed(new Map());
  }

  function collapseAll() {
    const m = new Map();
    // Collapse everything except root level
    flat.forEach((n) => {
      if (n.id !== "root" && n.depth >= 1) m.set(n.id, true);
    });
    // But keep top categories open for navigation
    [
      "core-arc",
      "startups",
      "engineering",
      "creative-pipeline",
      "writing-story",
      "personal-growth",
      "relationships",
      "wellness",
      "research-exploration",
      "preferences",
    ].forEach((id) => m.set(id, false));
    setCollapsed(m);
  }

  function exportJSON() {
    const visibleTree = exportVisibleSubtree(root, collapsed);
    const blob = new Blob([JSON.stringify(visibleTree, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hymn-mindmap-visible.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function saveCustomProfile() {
    const label = customProfileName.trim();
    const generatedId = slugifyProfileId(label);
    if (!label || !generatedId) {
      setProfileStatus("Enter a valid profile name.");
      return;
    }
    try {
      const payload = {
        profile_id: generatedId,
        label,
        mode: "custom",
        tags: csvToList(customProfileTags),
        node_ids: csvToList(customProfileNodeIds),
        event_ids: [],
        include_full_context: false,
        conversation_key: "mindmap-explorer-ui",
      };
      const response = await fetch(`${API_BASE}/api/mcp/set-context-profile`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        setProfileStatus("Could not save profile.");
        return;
      }
      await refreshProfiles();
      setActiveProfileId(generatedId);
      setCustomProfileName("");
      setCustomProfileTags("");
      setCustomProfileNodeIds("");
      setProfileStatus(`Saved profile: ${generatedId}`);
    } catch {
      setProfileStatus("Could not save profile.");
    }
  }

  async function searchProfileDatapoints() {
    const q = profileSearchKeyword.trim();
    if (!q) {
      setProfileSearchResults([]);
      return;
    }
    try {
      setProfileSearchLoading(true);
      const response = await fetch(
        `${API_BASE}/api/graph/search-datapoints?query=${encodeURIComponent(q)}&limit=20&type=${encodeURIComponent(
          profileSearchType,
        )}&sources=${encodeURIComponent(Array.from(sourceFilter).join(","))}`,
      );
      if (!response.ok) {
        setProfileSearchResults([]);
        return;
      }
      const body = await response.json();
      setProfileSearchResults(body.matches || []);
    } catch {
      setProfileSearchResults([]);
    } finally {
      setProfileSearchLoading(false);
    }
  }

  function addNodeIdToEditor(nodeId) {
    setEditorNodeIds((prev) => uniqueStrings([...prev, nodeId]));
  }

  function removeNodeIdFromEditor(nodeId) {
    setEditorNodeIds((prev) => prev.filter((x) => x !== nodeId));
  }

  function addEventIdToEditor(eventId) {
    setEditorEventIds((prev) => uniqueStrings([...prev, eventId]));
  }

  function removeEventIdFromEditor(eventId) {
    setEditorEventIds((prev) => prev.filter((x) => x !== eventId));
  }

  async function saveActiveProfileEdits() {
    if (!activeProfileId) return;
    const selectedProfile = (profiles || []).find((p) => p.profile_id === activeProfileId);
    if (!selectedProfile) return;
    try {
      const response = await fetch(`${API_BASE}/api/mcp/set-context-profile`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          profile_id: activeProfileId,
          label: editorLabel.trim() || activeProfileId,
          mode: selectedProfile.mode || "custom",
          tags: uniqueStrings(csvToList(editorTags)),
          node_ids: uniqueStrings(editorNodeIds),
          event_ids: uniqueStrings(editorEventIds),
          include_full_context: Boolean(selectedProfile.include_full_context),
          conversation_key: "mindmap-explorer-ui",
        }),
      });
      if (!response.ok) {
        setProfileStatus("Could not save profile edits.");
        return;
      }
      await refreshProfiles();
      setProfileStatus(`Saved edits to ${activeProfileId}`);
    } catch {
      setProfileStatus("Could not save profile edits.");
    }
  }

  async function refreshImportStatus() {
    try {
      const response = await fetch(`${API_BASE}/api/import/status`);
      if (!response.ok) return;
      const body = await response.json();
      setImportStats(body);
    } catch {
      setImportStats(null);
    }
  }

  async function importCursorNotes() {
    const lines = String(cursorImportText || "")
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
    if (!lines.length) {
      setImportStatusMessage("Add at least one Cursor chat note line.");
      return;
    }
    try {
      setImportLoading(true);
      const chats = lines.map((line, index) => ({
        chat_id: "manual-cursor-import",
        turn_index: index,
        title: "Manual Cursor import",
        message: line,
        tags: ["cursor", "manual_import"],
        related_node_ids: [],
      }));
      const response = await fetch(`${API_BASE}/api/import/cursor-chats`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          conversation_key: "mindmap-explorer-ui",
          workspace: "mindmap-demo",
          chats,
        }),
      });
      if (!response.ok) {
        setImportStatusMessage("Cursor import failed.");
        return;
      }
      const body = await response.json();
      setImportStatusMessage(
        `Cursor import: ${body.imported || 0} added, ${body.skipped_duplicates || 0} skipped.`,
      );
      await refreshImportStatus();
      setCursorImportText("");
    } catch {
      setImportStatusMessage("Cursor import failed.");
    } finally {
      setImportLoading(false);
    }
  }

  async function importRecentGitCommits() {
    try {
      setImportLoading(true);
      const response = await fetch(`${API_BASE}/api/import/git-history`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          conversation_key: "mindmap-explorer-ui",
          repository: "mindmap-demo",
          repo_path: gitRepoPath.trim() || ".",
          branch: gitBranch.trim() || undefined,
          limit: Number(gitCommitLimit) || 15,
        }),
      });
      if (!response.ok) {
        setImportStatusMessage("Git import failed.");
        return;
      }
      const body = await response.json();
      setImportStatusMessage(
        `Git import: ${body.imported || 0} added, ${body.skipped_duplicates || 0} skipped.`,
      );
      await refreshImportStatus();
    } catch {
      setImportStatusMessage("Git import failed.");
    } finally {
      setImportLoading(false);
    }
  }

  async function runAutoSyncNow() {
    try {
      setImportLoading(true);
      const response = await fetch(`${API_BASE}/api/import/auto-sync/run`, {
        method: "POST",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body?.ok === false) {
        const detail = body?.error || body?.status?.last_error || "Auto-sync run failed.";
        setImportStatusMessage(`Auto-sync run failed: ${detail}`);
        await refreshImportStatus();
        return;
      }
      const result = body?.status?.last_result || "success";
      if (result === "partial") {
        setImportStatusMessage(
          `Auto-sync partial success: ${body?.status?.last_error || "some sources unavailable."}`,
        );
      } else {
        setImportStatusMessage("Auto-sync run completed.");
      }
      await refreshImportStatus();
    } catch {
      setImportStatusMessage("Auto-sync run failed.");
    } finally {
      setImportLoading(false);
    }
  }

  // Pan/zoom handlers
  useEffect(() => {
    if (viewMode !== "2d") return undefined;
    const svg = svgRef.current;
    if (!svg) return undefined;

    function onWheel(e) {
      e.preventDefault();
      const delta = -e.deltaY;
      const factor = delta > 0 ? 1.08 : 0.92;
      const nextScale = clamp(scale * factor, 0.35, 2.2);

      // Zoom around mouse point
      const rect = svg.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      // Convert mouse point to world coords
      const wx = (mx - tx) / scale;
      const wy = (my - ty) / scale;

      const ntx = mx - wx * nextScale;
      const nty = my - wy * nextScale;

      setScale(nextScale);
      setTx(ntx);
      setTy(nty);
    }

    function onMouseDown(e) {
      // Only pan if background or edge area
      if (e.button !== 0) return;
      dragging.current = {
        on: true,
        x: e.clientX,
        y: e.clientY,
        tx0: tx,
        ty0: ty,
      };
    }

    function onMouseMove(e) {
      if (!dragging.current.on) return;
      const dx = e.clientX - dragging.current.x;
      const dy = e.clientY - dragging.current.y;
      setTx(dragging.current.tx0 + dx);
      setTy(dragging.current.ty0 + dy);
    }

    function onMouseUp() {
      dragging.current.on = false;
    }

    svg.addEventListener("wheel", onWheel, { passive: false });
    svg.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      svg.removeEventListener("wheel", onWheel);
      svg.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [tx, ty, scale, viewMode]);

  const nodeW = layout.metrics.nodeW;
  const nodeH = layout.metrics.nodeH;

  function nodeStyle(id, n) {
    const isSel = id === selectedId;
    const isPath = selectedPath.includes(id);
    const isCollapsed = collapsed.get(id) === true;

    const isMatch = query.trim()
      ? matchesQuery(n, query.trim())
      : tagFilter
        ? (n.tags || []).includes(tagFilter)
        : false;

    const base = {
      fill: "white",
      stroke: "#111827", // neutral-900
      strokeWidth: 1,
    };

    if (isMatch) {
      base.strokeWidth = 2;
      base.stroke = "#0ea5e9"; // sky-500
    }

    if (isPath) {
      base.strokeWidth = 2;
      base.stroke = "#f59e0b"; // amber-500
    }

    if (isSel) {
      base.strokeWidth = 3;
      base.stroke = "#22c55e"; // green-500
    }

    if (isCollapsed) {
      base.fill = "#f8fafc"; // slate-50
    }

    return base;
  }

  const edges = useMemo(() => {
    return layout.edges
      .filter(([a, b]) => visibleSet.has(a) && visibleSet.has(b))
      .map(([a, b]) => {
        const pa = layout.positions.get(a);
        const pb = layout.positions.get(b);
        if (!pa || !pb) return null;
        const x1 = pa.x + nodeW;
        const y1 = pa.y + nodeH / 2;
        const x2 = pb.x;
        const y2 = pb.y + nodeH / 2;
        // Simple cubic for nicer elbow
        const mx = (x1 + x2) / 2;
        const d = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
        return { a, b, d };
      })
      .filter(Boolean);
  }, [layout, visibleSet, nodeW, nodeH]);

  const overlayEdges = useMemo(() => {
    if (!overlayEnabled) return [];
    return connectionData
      .map((m) => {
        const from = layout.positions.get(m.from_id);
        const to = layout.positions.get(m.to_id);
        if (!from || !to) return null;
        if (!visibleSet.has(m.from_id) || !visibleSet.has(m.to_id)) return null;
        const x1 = from.x + nodeW / 2;
        const y1 = from.y + nodeH / 2;
        const x2 = to.x + nodeW / 2;
        const y2 = to.y + nodeH / 2;
        return {
          id: `${m.from_id}-${m.type}-${m.to_id}`,
          x1,
          y1,
          x2,
          y2,
          type: m.type,
          score: m.score || 0,
        };
      })
      .filter(Boolean);
  }, [connectionData, layout.positions, nodeH, nodeW, overlayEnabled, visibleSet]);

  const visibleConnectionData = useMemo(() => {
    return connectionData.filter((m) => visibleSet.has(m.from_id) && visibleSet.has(m.to_id));
  }, [connectionData, visibleSet]);

  const nodeLabelById = useMemo(() => {
    const map = new Map();
    flat.forEach((n) => {
      map.set(n.id, n.label || n.id);
    });
    return map;
  }, [flat]);

  const datapointEntries = useMemo(() => {
    return buildSelectedDatapoints({
      selectedNode: selected,
      connectionData: visibleConnectionData,
      nodeLabelById,
      maxItems: 12,
    });
  }, [selected, visibleConnectionData, nodeLabelById]);

  const selectedHudData = useMemo(() => {
    const details = String(selected?.details || "");
    const detailSnippet = details.length > 220 ? `${details.slice(0, 220)}...` : details;
    const relationHighlights = visibleConnectionData.slice(0, 5).map((row) => {
      const fromLabel = nodeLabelById.get(row.from_id) || row.from_id;
      const toLabel = nodeLabelById.get(row.to_id) || row.to_id;
      return {
        id: `${row.from_id}:${row.type}:${row.to_id}`,
        label: `${row.type}: ${fromLabel} -> ${toLabel}`,
      };
    });
    const activeDatapoint =
      datapointEntries.find((x) => x.id === activeDatapointId) || datapointEntries[0] || null;

    return {
      nodeId: selected?.id,
      title: selected?.label || "Selected node",
      details: detailSnippet,
      tags: selected?.tags || [],
      depth: selectedPath.length ? selectedPath.length - 1 : 0,
      relationships: relationHighlights,
      datapoints: datapointEntries,
      activeDatapoint,
    };
  }, [selected, selectedPath.length, visibleConnectionData, nodeLabelById, datapointEntries, activeDatapointId]);

  const visibleNodes = useMemo(() => {
    return layout.visibleIds
      .map((id) => {
        const entry = idMap.get(id);
        const n = entry?.node;
        const p = layout.positions.get(id);
        if (!n || !p) return null;
        return { id, n, p };
      })
      .filter(Boolean);
  }, [layout.visibleIds, idMap, layout.positions]);

  const forceGraphData = useMemo(() => {
    return buildForceGraphData({
      visibleNodes,
      treeEdges: layout.edges,
      connectionData: visibleConnectionData,
      overlayEnabled,
      selectedNodeId: selectedId,
      datapointsExpanded,
      datapointEntries,
    });
  }, [
    visibleNodes,
    layout.edges,
    visibleConnectionData,
    overlayEnabled,
    selectedId,
    datapointsExpanded,
    datapointEntries,
  ]);

  const help =
    viewMode === "2d"
      ? "Controls: drag background to pan • scroll to zoom • click node to inspect • double-click node to collapse/expand • use search to jump."
      : "Controls: drag to orbit • scroll to zoom • right-drag to pan • click node to inspect • double-click node to collapse/expand.";

  return (
    <div className="flex h-[92vh] w-full bg-white text-neutral-900">
      {/* Left panel */}
      <div className="w-[360px] overflow-auto border-r p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">Mind Map Explorer</div>
            <div className="mt-1 text-xs text-neutral-600">{help}</div>
            <div className="mt-2 inline-flex items-center gap-2 rounded-md border px-2 py-1 text-[11px]">
              <span className="font-semibold">Profile</span>
              <select
                value={activeProfileId}
                onChange={(e) => setActiveProfileId(e.target.value)}
                className="rounded border px-1 py-[2px] text-[11px]"
              >
                {(profiles || []).map((p) => (
                  <option key={p.profile_id} value={p.profile_id}>
                    {p.label || p.profile_id}
                  </option>
                ))}
                {!profiles.length ? <option value="full_context">full_context</option> : null}
              </select>
            </div>
            <div className="mt-2 rounded-md border p-2 text-[11px]">
              <div className="font-semibold">Create custom profile</div>
              <input
                value={customProfileName}
                onChange={(e) => setCustomProfileName(e.target.value)}
                placeholder="Name (e.g. Business Ops)"
                className="mt-1 w-full rounded border px-2 py-1"
              />
              <input
                value={customProfileTags}
                onChange={(e) => setCustomProfileTags(e.target.value)}
                placeholder="Tags CSV (e.g. startup, funding)"
                className="mt-1 w-full rounded border px-2 py-1"
              />
              <input
                value={customProfileNodeIds}
                onChange={(e) => setCustomProfileNodeIds(e.target.value)}
                placeholder="Node IDs CSV (optional)"
                className="mt-1 w-full rounded border px-2 py-1"
              />
              <div className="mt-1 flex items-center gap-2">
                <button
                  onClick={saveCustomProfile}
                  className="rounded border px-2 py-1 hover:bg-neutral-100"
                >
                  Save profile
                </button>
                <button
                  onClick={refreshProfiles}
                  className="rounded border px-2 py-1 hover:bg-neutral-100"
                >
                  Refresh
                </button>
              </div>
              {profileStatus ? <div className="mt-1 text-neutral-600">{profileStatus}</div> : null}
            </div>
            <div className="mt-2 rounded-md border p-2 text-[11px]">
              <div className="font-semibold">Edit active profile</div>
              <input
                value={editorLabel}
                onChange={(e) => setEditorLabel(e.target.value)}
                placeholder="Profile label"
                className="mt-1 w-full rounded border px-2 py-1"
              />
              <input
                value={editorTags}
                onChange={(e) => setEditorTags(e.target.value)}
                placeholder="Tags CSV"
                className="mt-1 w-full rounded border px-2 py-1"
              />
              <input
                value={profileSearchKeyword}
                onChange={(e) => setProfileSearchKeyword(e.target.value)}
                placeholder="Search DB keywords for datapoints"
                className="mt-1 w-full rounded border px-2 py-1"
              />
              <select
                value={profileSearchType}
                onChange={(e) => setProfileSearchType(e.target.value)}
                className="mt-1 w-full rounded border px-2 py-1"
              >
                <option value="all">All (nodes + evidence)</option>
                <option value="nodes">Nodes only</option>
                <option value="evidence">Evidence only</option>
              </select>
              <div className="mt-1 flex items-center gap-2">
                <button
                  onClick={searchProfileDatapoints}
                  className="rounded border px-2 py-1 hover:bg-neutral-100"
                >
                  {profileSearchLoading ? "Searching..." : "Search datapoints"}
                </button>
                <button
                  onClick={saveActiveProfileEdits}
                  className="rounded border px-2 py-1 hover:bg-neutral-100"
                >
                  Save active profile
                </button>
              </div>
              <div className="mt-2 max-h-28 overflow-auto rounded border p-1">
                {(profileSearchResults || []).length ? (
                  profileSearchResults.map((row) => {
                    const isNode = row.kind === "node";
                    const id = isNode ? row.node_id : row.event_id;
                    const added = isNode ? editorNodeIds.includes(id) : editorEventIds.includes(id);
                    return (
                      <div key={`${row.kind}-${id}`} className="mb-1 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate font-medium">
                            {row.label || id}{" "}
                            <span className="rounded border px-1 py-[1px] text-[9px] uppercase">
                              {row.kind}
                            </span>
                          </div>
                          <div className="truncate text-[10px] text-neutral-600">{id}</div>
                        </div>
                        <button
                          onClick={() => {
                            if (isNode) {
                              if (added) removeNodeIdFromEditor(id);
                              else addNodeIdToEditor(id);
                            } else if (added) removeEventIdFromEditor(id);
                            else addEventIdToEditor(id);
                          }}
                          className="rounded border px-2 py-1"
                        >
                          {added ? "Remove" : "Add"}
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-neutral-500">No search results yet.</div>
                )}
              </div>
              <div className="mt-2 rounded border p-1">
                <div className="mb-1 font-medium">Node IDs in active profile</div>
                <div className="flex flex-wrap gap-1">
                  {(editorNodeIds || []).length ? (
                    editorNodeIds.map((nodeId) => (
                      <button
                        key={nodeId}
                        onClick={() => removeNodeIdFromEditor(nodeId)}
                        className="rounded border px-1 py-[2px] text-[10px] hover:bg-neutral-100"
                        title="Remove from active profile"
                      >
                        {nodeId} x
                      </button>
                    ))
                  ) : (
                    <div className="text-neutral-500">None selected.</div>
                  )}
                </div>
              </div>
              <div className="mt-2 rounded border p-1">
                <div className="mb-1 font-medium">Event IDs in active profile</div>
                <div className="flex flex-wrap gap-1">
                  {(editorEventIds || []).length ? (
                    editorEventIds.map((eventId) => (
                      <button
                        key={eventId}
                        onClick={() => removeEventIdFromEditor(eventId)}
                        className="rounded border px-1 py-[2px] text-[10px] hover:bg-neutral-100"
                        title="Remove from active profile"
                      >
                        {eventId} x
                      </button>
                    ))
                  ) : (
                    <div className="text-neutral-500">None selected.</div>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-2 rounded-md border p-2 text-[11px]">
              <div className="font-semibold">Auto import context</div>
              <textarea
                value={cursorImportText}
                onChange={(e) => setCursorImportText(e.target.value)}
                placeholder="Paste Cursor chat lines (one per line)"
                className="mt-1 h-20 w-full rounded border px-2 py-1"
              />
              <div className="mt-1 grid grid-cols-2 gap-1">
                <input
                  value={gitRepoPath}
                  onChange={(e) => setGitRepoPath(e.target.value)}
                  placeholder="Repo path (default .)"
                  className="w-full rounded border px-2 py-1"
                />
                <input
                  value={gitBranch}
                  onChange={(e) => setGitBranch(e.target.value)}
                  placeholder="Branch (optional)"
                  className="w-full rounded border px-2 py-1"
                />
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={gitCommitLimit}
                  onChange={(e) => setGitCommitLimit(Number(e.target.value))}
                  placeholder="Commit limit"
                  className="w-full rounded border px-2 py-1"
                />
              </div>
              <div className="mt-1 flex items-center gap-2">
                <button
                  onClick={importCursorNotes}
                  className="rounded border px-2 py-1 hover:bg-neutral-100"
                  disabled={importLoading}
                >
                  {importLoading ? "Working..." : "Import cursor notes"}
                </button>
                <button
                  onClick={importRecentGitCommits}
                  className="rounded border px-2 py-1 hover:bg-neutral-100"
                  disabled={importLoading}
                >
                  {importLoading ? "Working..." : "Import git commits"}
                </button>
                <button
                  onClick={refreshImportStatus}
                  className="rounded border px-2 py-1 hover:bg-neutral-100"
                >
                  Refresh import status
                </button>
                <button
                  onClick={runAutoSyncNow}
                  className="rounded border px-2 py-1 hover:bg-neutral-100"
                  disabled={importLoading}
                >
                  {importLoading ? "Working..." : "Run auto-sync now"}
                </button>
              </div>
              {importStatusMessage ? (
                <div className="mt-1 text-neutral-600">{importStatusMessage}</div>
              ) : null}
              {importStats ? (
                <div className="mt-1 text-neutral-600">
                  Evidence: {importStats.evidence || 0} • Nodes: {importStats.nodes || 0}
                  {importStats.auto_sync ? (
                    <span>
                      {" "}
                      • Auto-sync:{" "}
                      {importStats.auto_sync.enabled
                        ? importStats.auto_sync.running
                          ? "running"
                          : "enabled"
                        : "disabled"}
                    </span>
                  ) : null}
                </div>
              ) : null}
              {importStats?.auto_sync?.paths ? (
                <div className="mt-1 text-neutral-600">
                  Git path: {importStats.auto_sync.paths.git_repo_path || "(auto)"} • Cursor path:{" "}
                  {importStats.auto_sync.paths.cursor_transcripts_dir || "(auto)"}
                </div>
              ) : null}
              {importStats?.auto_sync?.last_error ? (
                <div className="mt-1 text-amber-700">{importStats.auto_sync.last_error}</div>
              ) : null}
            </div>
          </div>
          <button
            onClick={exportJSON}
            className="rounded-md border px-3 py-2 text-xs hover:bg-neutral-50"
            title="Download a JSON export of the currently visible (expanded) tree"
          >
            Export JSON
          </button>
        </div>

        <div className="mt-4 space-y-2">
          <label className="text-xs font-medium">Search</label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try: supabase, hyperpop, Kai, YC, canon, telepathy…"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setQuery("");
                setTagFilter(null);
              }}
              className="rounded-md border px-3 py-2 text-xs hover:bg-neutral-50"
            >
              Clear
            </button>
            <button
              onClick={resetView}
              className="rounded-md border px-3 py-2 text-xs hover:bg-neutral-50"
            >
              Reset view
            </button>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={expandAll}
              className="rounded-md border px-3 py-2 text-xs hover:bg-neutral-50"
            >
              Expand all
            </button>
            <button
              onClick={collapseAll}
              className="rounded-md border px-3 py-2 text-xs hover:bg-neutral-50"
            >
              Collapse all
            </button>
          </div>

          <div className="pt-2">
            <div className="mb-2 text-xs font-medium">Relationship overlay</div>
            <button
              onClick={() => setOverlayEnabled((x) => !x)}
              className="rounded-md border px-3 py-2 text-xs hover:bg-neutral-50"
            >
              {overlayEnabled ? "Disable overlay" : "Enable overlay"}
            </button>
            <div className="mt-2 flex flex-wrap gap-2">
              {EDGE_TYPES.map((type) => {
                const on = edgeTypeFilter.has(type);
                return (
                  <button
                    key={type}
                    onClick={() =>
                      setEdgeTypeFilter((prev) => {
                        const next = new Set(prev);
                        if (next.has(type)) next.delete(type);
                        else next.add(type);
                        return next;
                      })
                    }
                    className={`rounded-full border px-2 py-1 text-[11px] ${
                      on ? "bg-neutral-100" : ""
                    }`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2">
            <div className="mb-2 text-xs font-medium">Evidence sources</div>
            <div className="flex flex-wrap gap-2">
              {EVIDENCE_SOURCES.map((source) => {
                const on = sourceFilter.has(source);
                return (
                  <button
                    key={source}
                    onClick={() =>
                      setSourceFilter((prev) => {
                        const next = new Set(prev);
                        if (next.has(source)) next.delete(source);
                        else next.add(source);
                        if (!next.size) return new Set(EVIDENCE_SOURCES);
                        return next;
                      })
                    }
                    className={`rounded-full border px-2 py-1 text-[11px] ${
                      on ? "bg-neutral-100" : ""
                    }`}
                    title="Toggle source filter for recall and datapoint search"
                  >
                    {source}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-3">
            <div className="mb-2 text-xs font-medium">Tag filter</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setTagFilter(null)}
                className={`rounded-full border px-2 py-1 text-xs hover:bg-neutral-100 ${
                  tagFilter === null ? "bg-neutral-100" : ""
                }`}
              >
                All
              </button>
              {allTags.map((t) => (
                <TagPill
                  key={t}
                  t={t}
                  onClick={(x) => setTagFilter((prev) => (prev === x ? null : x))}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="text-xs font-medium">Results</div>
          <div className="mt-1 text-xs text-neutral-600">
            {query.trim() || tagFilter
              ? `${searchResults.length} matches (showing up to 80)`
              : "Type a search or select a tag to see matches."}
          </div>

          <div className="mt-2 space-y-1">
            {searchResults.map((r) => {
              const isVisible = visibleSet.has(r.id);
              return (
                <button
                  key={r.id}
                  onClick={() => jumpTo(r.id)}
                  className={`w-full rounded-md border px-3 py-2 text-left text-sm hover:bg-neutral-50 ${
                    r.id === selectedId ? "border-green-500" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate font-medium">{r.label}</div>
                    <div className="text-[11px] text-neutral-500">
                      {isVisible ? "visible" : "hidden"}
                    </div>
                  </div>
                  <div className="mt-1 truncate text-xs text-neutral-600">
                    {(r.tags || []).slice(0, 4).join(" · ")}
                    {(r.tags || []).length > 4 ? " …" : ""}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Center canvas */}
      <div className="relative flex-1">
        <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
          <div className="rounded-md border bg-white px-3 py-2 text-xs">
            {viewMode === "2d"
              ? `Zoom: ${(scale * 100).toFixed(0)}% • Nodes: ${layout.visibleIds.length}`
              : `3D view • Nodes: ${layout.visibleIds.length}`}
          </div>
          <div className="rounded-md border bg-white px-3 py-2 text-xs text-neutral-600">
            {viewMode === "2d"
              ? "Tip: double-click a node to collapse/expand"
              : "Tip: drag to orbit and double-click to collapse/expand"}
          </div>
          <div className="rounded-md border bg-white px-2 py-1 text-xs">
            <div className="inline-flex rounded-md border">
              <button
                data-testid="toggle-2d"
                onClick={() => setViewMode("2d")}
                className={`px-2 py-1 ${viewMode === "2d" ? "bg-neutral-100" : ""}`}
              >
                2D
              </button>
              <button
                data-testid="toggle-3d"
                onClick={() => setViewMode("3d")}
                className={`border-l px-2 py-1 ${viewMode === "3d" ? "bg-neutral-100" : ""}`}
              >
                3D
              </button>
            </div>
          </div>
        </div>

        {viewMode === "2d" ? (
          <MindMap2DView
            svgRef={svgRef}
            tx={tx}
            ty={ty}
            scale={scale}
            edges={edges}
            overlayEdges={overlayEdges}
            visibleNodes={visibleNodes}
            collapsed={collapsed}
            nodeW={nodeW}
            nodeH={nodeH}
            nodeStyle={nodeStyle}
            onSelectNode={setSelectedId}
            onToggleCollapse={toggleCollapse}
          />
        ) : (
          <Suspense
            fallback={
              <div className="flex h-full w-full items-center justify-center bg-neutral-50 text-sm text-neutral-600">
                Loading 3D map...
              </div>
            }
          >
            <MindMap3DView
              graphData={forceGraphData}
              selectedId={selectedId}
              selectedPathIds={selectedPath}
              onSelectNode={setSelectedId}
              onToggleCollapse={toggleCollapse}
              focusNodeId={focusNodeId}
              selectedHudData={selectedHudData}
              datapointsExpanded={datapointsExpanded}
              onExpandDatapoints={() => setDatapointsExpanded(true)}
              onHideDatapoints={() => {
                setDatapointsExpanded(false);
                setActiveDatapointId(null);
              }}
              onFocusSelected={() => setFocusNodeId(selectedId)}
              onSelectDatapoint={setActiveDatapointId}
              activeDatapointId={activeDatapointId}
            />
          </Suspense>
        )}
      </div>

      {/* Right panel */}
      <div className="w-[420px] overflow-auto border-l p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm text-neutral-500">Selected</div>
            <div className="text-xl font-semibold leading-tight">{selected.label}</div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {((selected.children || []).length > 0 || selectedId === "root") && (
              <button
                onClick={() => toggleCollapse(selectedId)}
                className="rounded-md border px-3 py-2 text-xs hover:bg-neutral-50"
                disabled={selectedId === "root" && (root.children || []).length === 0}
                title="Collapse/expand selected"
              >
                {collapsed.get(selectedId) === true ? "Expand" : "Collapse"}
              </button>
            )}
            <button
              onClick={() => {
                const path = selectedPath.join(" → ");
                navigator.clipboard.writeText(path);
              }}
              className="rounded-md border px-3 py-2 text-xs hover:bg-neutral-50"
              title="Copy breadcrumb path"
            >
              Copy path
            </button>
          </div>
        </div>

        <div className="mt-3">
          <div className="text-xs font-medium">Breadcrumb</div>
          <div className="mt-1 break-words text-xs text-neutral-600">
            {selectedPath.map((id, idx) => {
              const node = idMap.get(id)?.node;
              return (
                <span key={id}>
                  <button
                    onClick={() => jumpTo(id)}
                    className="underline hover:no-underline"
                    title="Jump to node"
                  >
                    {node?.label || id}
                  </button>
                  {idx < selectedPath.length - 1 ? " → " : ""}
                </span>
              );
            })}
          </div>
        </div>

        <div className="mt-4">
          <div className="text-xs font-medium">Details</div>
          <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
            {selected.details || "(No details yet — add a details field in DATA.)"}
          </div>
        </div>

        <div className="mt-4">
          <div className="text-xs font-medium">Tags</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {(selected.tags || []).length ? (
              selected.tags.map((t) => (
                <button
                  key={t}
                  onClick={() => setTagFilter((prev) => (prev === t ? null : t))}
                  className={`rounded-full border px-2 py-1 text-xs hover:bg-neutral-100 ${
                    tagFilter === t ? "bg-neutral-100" : ""
                  }`}
                >
                  {t}
                </button>
              ))
            ) : (
              <div className="text-xs text-neutral-500">(none)</div>
            )}
          </div>
        </div>

        <div className="mt-5">
          <div className="text-xs font-medium">Children</div>
          <div className="mt-2 space-y-2">
            {(selected.children || []).length ? (
              (selected.children || []).map((c) => {
                const hidden = collapsed.get(selectedId) === true;
                return (
                  <div key={c.id} className="rounded-md border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium">{c.label}</div>
                        <div className="mt-1 text-xs text-neutral-600">
                          {(c.tags || []).slice(0, 6).join(" · ")}
                          {(c.tags || []).length > 6 ? " …" : ""}
                        </div>
                      </div>
                      <button
                        onClick={() => jumpTo(c.id)}
                        className="rounded-md border px-2 py-1 text-xs hover:bg-neutral-50"
                        title={
                          hidden
                            ? "This branch is collapsed; jump will expand path."
                            : "Jump to node"
                        }
                      >
                        Jump
                      </button>
                    </div>
                    <div className="mt-2 line-clamp-3 text-xs text-neutral-600">
                      {c.details || ""}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-xs text-neutral-500">(none)</div>
            )}
          </div>
        </div>

        <div className="mt-6 border-t pt-4">
          <div className="text-xs font-medium">Graph insights</div>
          {apiError ? (
            <div className="mt-2 text-xs text-amber-700">{apiError}</div>
          ) : (
            <div className="mt-2 space-y-2">
              <div className="rounded-md border p-2">
                <div className="text-[11px] font-semibold">Top bridges</div>
                <div className="mt-1 text-xs text-neutral-700">
                  {(insights.top_bridges || [])
                    .slice(0, 4)
                    .map((b) => `${b.nodeId} (${b.degree})`)
                    .join(" • ") || "(none yet)"}
                </div>
              </div>
              <div className="rounded-md border p-2">
                <div className="text-[11px] font-semibold">Contradictions</div>
                <div className="mt-1 text-xs text-neutral-700">
                  {(insights.contradictions || []).length} edges marked conflicts_with
                </div>
              </div>
              <div className="rounded-md border p-2">
                <div className="text-[11px] font-semibold">Next actions</div>
                <div className="mt-1 text-xs text-neutral-700">
                  {(actions || [])
                    .slice(0, 3)
                    .map((a) => `${a.reason} -> ${a.nodeId}`)
                    .join(" • ") || "(none yet)"}
                </div>
              </div>
              <div className="rounded-md border p-2">
                <div className="text-[11px] font-semibold">Profile-scoped recall</div>
                <div className="mt-1 text-xs text-neutral-700">
                  Active profile: <span className="font-semibold">{activeProfileId}</span>
                </div>
                <div className="mt-1 text-xs text-neutral-700">
                  {recallLoading
                    ? "Loading recall..."
                    : recallData
                      ? `${(recallData.matches || []).length} matches • ${(
                          recallData.contradictions || []
                        ).length} contradictions • ${Array.from(sourceFilter).length} sources`
                      : "Type in Search to run recall_context"}
                </div>
                {recallData ? (
                  <div className="mt-2 space-y-1">
                    {(recallData.matches || []).slice(0, 3).map((m) => (
                      <div key={m.node_id} className="rounded border px-2 py-1">
                        <div className="text-[11px] font-medium">
                          {m.label}{" "}
                          <span className="rounded bg-neutral-100 px-1 py-[1px] text-[10px]">
                            {((m.relevance_score || 0) * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="mt-1 text-[10px] text-neutral-600">
                          {(m.relationship_types || []).slice(0, 3).join(" · ") || "no relationships"}
                        </div>
                        <div className="mt-1 text-[10px] text-neutral-600">
                          {(m.evidence || [])
                            .slice(0, 2)
                            .map((ev) => {
                              const cap = ev.capability?.labels?.[0];
                              return `${ev.source}${cap ? ` (${cap})` : ""}`;
                            })
                            .join(" • ") || "no evidence"}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 border-t pt-4">
          <div className="text-xs font-medium">How to extend this map</div>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-neutral-600">
            <li>
              In <span className="font-mono">DATA</span>, add nodes under the right branch (id, label,
              details, tags, children).
            </li>
            <li>Keep ids unique. You can copy/paste a node block and edit.</li>
            <li>
              Use tags to make filtering easier (e.g.,{" "}
              <span className="font-mono">engineering</span>,
              <span className="font-mono">music</span>, <span className="font-mono">canon</span>).
            </li>
            <li>
              If you want a different layout (radial, mind-map style), tell me and I'll swap the
              renderer.
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
