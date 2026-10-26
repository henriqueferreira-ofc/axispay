import { describe, expect, test } from "bun:test";
import { accessDestination, validPasskeyChallenge } from "./passkey-policy";

describe("Passkey access", () => {
  test("auth redirect returns to the app rather than looping", () => {
    expect(accessDestination("/auth")).toBe("/");
    expect(accessDestination("/auth?redirect=%2Fauth")).toBe("/");
    expect(accessDestination("/relatorios")).toBe("/relatorios");
  });
  test("external destinations cannot be used", () => {
    expect(accessDestination("//evil.example")).toBe("/");
    expect(accessDestination("https://evil.example")).toBe("/");
  });
  const expected = { origin: "https://cash-craft-vista.lovable.app", rpID: "cash-craft-vista.lovable.app" };
  const challenge = { origin: expected.origin, rp_id: expected.rpID, expires_at: "2026-10-26T11:10:00Z" };
  test("expired challenges cannot authenticate", () => {
    expect(validPasskeyChallenge(challenge, expected, Date.parse("2026-10-26T11:09:00Z"))).toBe(true);
    expect(validPasskeyChallenge(challenge, expected, Date.parse("2026-10-26T11:10:00Z"))).toBe(false);
  });
  test("challenge must belong to this origin and RP", () => {
    expect(validPasskeyChallenge({ ...challenge, origin: "https://evil.example" }, expected, 0)).toBe(false);
    expect(validPasskeyChallenge({ ...challenge, rp_id: "evil.example" }, expected, 0)).toBe(false);
  });
  test("consumed or nonexistent challenge cannot authenticate", () => {
    expect(validPasskeyChallenge(null, expected, 0)).toBe(false);
  });
});