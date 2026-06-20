import { describe, it, expect, beforeEach } from "vitest";
import * as hs from "@/lib/health-store";

// Locks in the full-thread persistence behind the inline recent-conversations
// list (ChatGPT/Claude-style resume): one growing entry per conversation,
// resumable via the stored thread, newest first.

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  hs.setStorageScope({ kind: "guest" });
});

const msg = (id: number, role: "user" | "ai", content: string): hs.ConversationMessage => ({
  id,
  role,
  content,
  timestamp: "t",
});

describe("conversation persistence (inline resume list)", () => {
  it("upserts a thread by id — one growing entry, not a new summary per turn", () => {
    hs.upsertConversation({
      id: "c1", date: "d1", preview: "hi", title: "hi", messageCount: 2,
      messages: [msg(1, "user", "hi"), msg(2, "ai", "hello")],
    });
    hs.upsertConversation({
      id: "c1", date: "d2", preview: "hi", title: "hi", messageCount: 4,
      messages: [msg(1, "user", "hi"), msg(2, "ai", "hello"), msg(3, "user", "more"), msg(4, "ai", "ok")],
    });
    const all = hs.loadHistory();
    expect(all).toHaveLength(1); // upserted in place
    expect(all[0].messageCount).toBe(4); // and updated
  });

  it("getConversation returns the full thread so a tap resumes it", () => {
    hs.upsertConversation({
      id: "c2", date: "d", preview: "headache", title: "headache", messageCount: 2,
      messages: [msg(1, "user", "headache"), msg(2, "ai", "tell me more")],
    });
    const conv = hs.getConversation("c2");
    expect(conv?.messages).toHaveLength(2);
    expect(conv?.messages?.[0].content).toBe("headache");
  });

  it("keeps the most recently updated conversation first", () => {
    hs.upsertConversation({ id: "a", date: "d", preview: "a", messageCount: 2, messages: [msg(1, "user", "a")] });
    hs.upsertConversation({ id: "b", date: "d", preview: "b", messageCount: 2, messages: [msg(1, "user", "b")] });
    hs.upsertConversation({ id: "a", date: "d", preview: "a", messageCount: 3, messages: [msg(1, "user", "a"), msg(2, "ai", "x")] });
    expect(hs.loadHistory()[0].id).toBe("a"); // re-touched -> back on top
  });
});
