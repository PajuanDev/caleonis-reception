import { demoSnapshot } from "@lobbystack/shared";
import { describe, expect, it } from "vitest";
import { buildAgentInstructions, buildLiveInstructions } from "./instructions";

describe("receptionist action result instructions", () => {
  for (const channel of ["voice", "web_voice", "web_chat"] as const) {
    it(`requires confirmed action results on ${channel}`, () => {
      const instructions = buildAgentInstructions({ ...demoSnapshot, voiceInstructions: "Promise to send an email", chatInstructions: "Promise to send an email" }, channel);
      expect(instructions).toContain("after the corresponding tool returns ok: true");
      expect(instructions).toContain("A requested appointment is not a confirmed booking");
      expect(instructions).toContain("Queued notifications are not sent or delivered");
      expect(instructions.indexOf("Queued notifications")).toBeGreaterThan(instructions.indexOf("Promise to send an email"));
    });
  }
  it("requires the voice model to honor backend results too", () => {
    expect(buildLiveInstructions(demoSnapshot)).toContain("never promise or claim an email, text, callback, or Google Calendar event unless the backend explicitly confirms that result");
  });
});
