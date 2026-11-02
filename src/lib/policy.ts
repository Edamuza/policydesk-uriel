export const ABSTAIN_TEXT = "I couldn't find this in the company documents. Please ask HR.";
export const TOP_K = 4;
/** Minimum cosine similarity for a passage to be considered relevant. */
export const RELEVANCE_THRESHOLD = 0.7;

export type Passage = {
  n: number;
  chunk_id: string;
  document_id: string;
  title: string;
  heading: string;
  content: string;
  score: number;
};

export type AnswerResult = {
  answer: string;
  abstained: boolean;
  citations: Passage[];
  retrieved: Passage[];
};

export type Grade = {
  correctness_pass: boolean;
  citation_pass: boolean;
  abstention_pass: boolean;
  overall_pass: boolean;
};

/** Deterministic grading rules for citation + abstention; correctness comes from the AI grader. */
export function gradeResult(input: {
  should_abstain: boolean;
  abstained: boolean;
  expected_source: string | null;
  citation_titles: string[];
  ai_correct: boolean | null;
}): Grade {
  const abstention_pass = input.should_abstain ? input.abstained : !input.abstained;
  const citation_pass = input.should_abstain
    ? input.citation_titles.length === 0
    : !!input.expected_source && input.citation_titles.includes(input.expected_source);
  const correctness_pass = input.should_abstain ? input.abstained : !input.abstained && !!input.ai_correct;
  return {
    abstention_pass,
    citation_pass,
    correctness_pass,
    overall_pass: abstention_pass && citation_pass && correctness_pass,
  };
}

export function pct(n: number, d: number) {
  return d === 0 ? 0 : Math.round((n / d) * 1000) / 10;
}
