import { describe, expect, it } from "vitest";
import { gradeResult, pct } from "@/lib/policy";
import { chunkDocument } from "@/lib/chunker";
import { SEED_DOCUMENTS, SEED_TESTS } from "@/lib/seed-data";

const SRC = "Leave Policy";

describe("grading rules", () => {
  it("abstain item passes only when the assistant abstained", () => {
    expect(gradeResult({ should_abstain: true, abstained: true, expected_source: null, citation_titles: [], ai_correct: null }).overall_pass).toBe(true);
    expect(gradeResult({ should_abstain: true, abstained: false, expected_source: null, citation_titles: [SRC], ai_correct: true }).abstention_pass).toBe(false);
  });
  it("answerable item fails abstention if it abstained", () => {
    expect(gradeResult({ should_abstain: false, abstained: true, expected_source: SRC, citation_titles: [], ai_correct: null }).abstention_pass).toBe(false);
  });
  it("citation passes when at least one citation is from the expected document", () => {
    expect(gradeResult({ should_abstain: false, abstained: false, expected_source: SRC, citation_titles: ["Other", SRC], ai_correct: true }).citation_pass).toBe(true);
    expect(gradeResult({ should_abstain: false, abstained: false, expected_source: SRC, citation_titles: ["Other"], ai_correct: true }).citation_pass).toBe(false);
  });
  it("pct rounds to one decimal", () => {
    expect(pct(2, 3)).toBe(66.7);
    expect(pct(0, 0)).toBe(0);
  });
});

describe("seed data", () => {
  it("has 15 tests, 3 of which should abstain", () => {
    expect(SEED_TESTS).toHaveLength(15);
    expect(SEED_TESTS.filter((t) => t.should_abstain)).toHaveLength(3);
  });
  it("chunks keep their section heading and stay under 800 chars", () => {
    for (const d of SEED_DOCUMENTS) {
      for (const c of chunkDocument(d.content, d.title)) {
        expect(c.heading).not.toBe("");
        expect(c.content.length).toBeLessThanOrEqual(800);
      }
    }
  });
});
