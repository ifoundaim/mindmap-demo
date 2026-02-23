import { describe, it, expect } from "vitest";
import {
  SessionBootstrapSchema,
  LogInsightSchema,
  LinkNodesSchema,
  RecallContextSchema,
  RecallContextOutputSchema,
  SetContextProfileSchema,
  GetContextProfileSchema,
  ImportCursorChatsSchema,
  ImportGitHistorySchema,
} from "../src/helix/schema.js";

describe("MCP contract schemas", () => {
  it("validates session bootstrap payload", () => {
    const parsed = SessionBootstrapSchema.parse({
      conversation_key: "c1",
      turn_key: "t1",
      message: "New strategic insight",
      tags: ["strategy"],
    });
    expect(parsed.conversation_key).toBe("c1");
  });

  it("rejects empty insight message", () => {
    expect(() =>
      LogInsightSchema.parse({
        conversation_key: "c1",
        turn_key: "t1",
        message: "",
      }),
    ).toThrow();
  });

  it("validates relationship type enum", () => {
    const parsed = LinkNodesSchema.parse({
      from_id: "a",
      to_id: "b",
      type: "supports_goal",
      weight: 0.5,
    });
    expect(parsed.type).toBe("supports_goal");
  });

  it("validates recall context payload", () => {
    const parsed = RecallContextSchema.parse({
      query: "How does purposepath connect to routeforge?",
      profile_id: "business_only",
      use_profile_filtering: true,
      top_k: 5,
      include_contradictions: true,
      include_actions: false,
      tags: ["startup"],
      sources: ["git_commit", "cursor_chat"],
    });
    expect(parsed.top_k).toBe(5);
  });

  it("validates recall context output schema", () => {
    const parsed = RecallContextOutputSchema.parse({
      query: "purposepath routeforge",
      matches: [
        {
          node_id: "purposepath",
          label: "PurposePath",
          relevance_score: 0.91,
          relationship_types: ["supports_goal"],
          summary: "Test summary",
          evidence: [
            {
              event_id: "ev-1",
              timestamp: new Date().toISOString(),
              source: "git_commit",
              excerpt: "Evidence excerpt",
              import_metadata: {
                repository: "mindmap-demo",
                commit_hash: "abc123",
              },
              capability: {
                labels: ["feature"],
                confidence: 0.8,
                reason: "Test reason",
              },
            },
          ],
        },
      ],
      contradictions: [],
      recommended_actions: [
        {
          nodeId: "purposepath",
          reason: "Amplify supports_goal",
          confidence: 0.7,
        },
      ],
      meta: {
        profile_applied: "business_only",
        top_k: 8,
        total_candidates: 10,
        dedupe_applied: true,
      },
    });
    expect(parsed.matches[0].node_id).toBe("purposepath");
  });

  it("validates set/get context profile schemas", () => {
    const setParsed = SetContextProfileSchema.parse({
      profile_id: "business_custom",
      label: "Business Custom",
      mode: "custom",
      tags: ["startup"],
      node_ids: ["purposepath"],
      event_ids: ["ev-1"],
      include_full_context: false,
      conversation_key: "conv-1",
    });
    expect(setParsed.profile_id).toBe("business_custom");

    const getParsed = GetContextProfileSchema.parse({
      conversation_key: "conv-1",
    });
    expect(getParsed.conversation_key).toBe("conv-1");
  });

  it("validates cursor chat import schema", () => {
    const parsed = ImportCursorChatsSchema.parse({
      conversation_key: "cursor-conv",
      workspace: "/Users/me/proj",
      chats: [
        {
          chat_id: "chat-1",
          title: "API planning",
          message: "Implement import endpoint for git history",
          tags: ["api", "import"],
          related_node_ids: ["engineering"],
        },
      ],
    });
    expect(parsed.chats).toHaveLength(1);
  });

  it("validates git history import schema", () => {
    const parsed = ImportGitHistorySchema.parse({
      conversation_key: "git-conv",
      repository: "mindmap-demo",
      branch: "main",
      commits: [
        {
          hash: "abc123",
          subject: "feat: add import endpoints",
          files: ["server/src/api/createApp.js"],
        },
      ],
    });
    expect(parsed.commits[0].hash).toBe("abc123");
  });
});
