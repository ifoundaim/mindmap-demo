import { describe, it, expect } from "vitest";
import { SessionBootstrapSchema, LogInsightSchema, LinkNodesSchema } from "../src/helix/schema.js";

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
});
