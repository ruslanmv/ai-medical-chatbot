import { describe, it, expect, beforeEach } from "vitest";
import * as hs from "@/lib/health-store";

// Locks in Batches 2 + 3: guest data is ephemeral (sessionStorage) and a
// signed-in user's data is namespaced + isolated in localStorage, so a
// shared browser never leaks one person's medical data to the next.

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  hs.setStorageScope({ kind: "guest" });
});

describe("storage scope — guest ephemerality + per-user isolation", () => {
  it("guest data goes to sessionStorage under the bare key (never localStorage)", () => {
    hs.setStorageScope({ kind: "guest" });
    hs.saveMedication({ name: "Aspirin" } as any);
    expect(window.sessionStorage.getItem("medos_medications")).not.toBeNull();
    expect(window.localStorage.getItem("medos_medications")).toBeNull();
  });

  it("user data goes to localStorage under a per-user namespaced key", () => {
    hs.setStorageScope({ kind: "user", id: "alice" });
    hs.saveMedication({ name: "Aspirin" } as any);
    expect(window.localStorage.getItem("medos_medications__alice")).not.toBeNull();
    expect(window.sessionStorage.getItem("medos_medications")).toBeNull();
  });

  it("two users never see each other's data on the same browser", () => {
    hs.setStorageScope({ kind: "user", id: "alice" });
    hs.saveMedication({ name: "Aspirin" } as any);
    hs.setStorageScope({ kind: "user", id: "bob" });
    expect(hs.loadMedications()).toHaveLength(0); // bob sees nothing
    hs.setStorageScope({ kind: "user", id: "alice" });
    expect(hs.loadMedications()).toHaveLength(1); // alice still has hers
  });

  it("migrateLegacyToUser moves pre-namespacing bare keys into the user namespace", () => {
    window.localStorage.setItem(
      "medos_medications",
      JSON.stringify([{ id: "m1", name: "Old" }]),
    );
    hs.migrateLegacyToUser("alice");
    expect(window.localStorage.getItem("medos_medications")).toBeNull(); // bare key removed
    expect(window.localStorage.getItem("medos_medications__alice")).not.toBeNull();
    hs.setStorageScope({ kind: "user", id: "alice" });
    expect(hs.loadMedications()).toHaveLength(1);
  });

  it("clearGuestData wipes the guest silo but keeps a user's namespaced data", () => {
    hs.setStorageScope({ kind: "user", id: "alice" });
    hs.saveMedication({ name: "X" } as any);
    hs.setStorageScope({ kind: "guest" });
    hs.saveMedication({ name: "G" } as any);
    hs.clearGuestData();
    expect(window.sessionStorage.getItem("medos_medications")).toBeNull();
    hs.setStorageScope({ kind: "user", id: "alice" });
    expect(hs.loadMedications()).toHaveLength(1);
  });

  it("clearAllHealthData wipes only the active scope", () => {
    hs.setStorageScope({ kind: "user", id: "alice" });
    hs.saveMedication({ name: "X" } as any);
    hs.clearAllHealthData();
    expect(hs.loadMedications()).toHaveLength(0);
    expect(window.localStorage.getItem("medos_medications__alice")).toBeNull();
  });
});
