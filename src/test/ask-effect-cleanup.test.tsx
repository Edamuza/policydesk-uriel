import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Route as IndexRoute } from "@/routes/index";

const { askMock } = vi.hoisted(() => ({ askMock: vi.fn() }));

vi.mock("@/lib/api.functions", () => ({ askQuestion: askMock }));

// Chromium 152 makes Element.scrollIntoView() resolve to a Promise. React treats
// whatever an effect returns as its cleanup function, so an effect written as
// `() => el.scrollIntoView(...)` stores a Promise and crashes the route on the
// next re-render. The test mimics that browser behaviour.
function mimicChromiumScrollIntoView() {
  Element.prototype.scrollIntoView = function scrollIntoView() {
    return Promise.resolve();
  };
}

const AskPage = IndexRoute.options.component as React.ComponentType;

async function ask(text: string) {
  const box = screen.getByLabelText("Your question");
  await act(async () => {
    fireEvent.change(box, { target: { value: text } });
    fireEvent.keyDown(box, { key: "Enter" });
  });
}

describe("Ask page effect cleanup", () => {
  it("renders the answer and survives a second question when scrollIntoView returns a Promise", async () => {
    mimicChromiumScrollIntoView();
    askMock.mockResolvedValue({
      ok: true,
      answer: "You get 10 days of sick leave per year. [1]",
      citations: [
        {
          n: 1,
          title: "Leave Policy",
          heading: "Sick Leave",
          content: "Employees are entitled to 10 paid sick leave days per year.",
          score: 0.912,
        },
      ],
      abstained: false,
    });

    render(
      <QueryClientProvider client={new QueryClient()}>
        <AskPage />
      </QueryClientProvider>,
    );

    await ask("How many sick leave days do I get?");

    expect(screen.getByText(/^You get 10 days of sick leave per year/)).toBeInTheDocument();
    const marker = screen.getByLabelText("Show citation 1");
    expect(marker).toBeInTheDocument();

    // Opening the citation reveals the passage it came from.
    await act(async () => {
      fireEvent.click(marker);
    });
    expect(await screen.findByText(/10 paid sick leave days per year/)).toBeInTheDocument();
    expect(screen.getByText("§ Sick Leave")).toBeInTheDocument();
    expect(screen.getByText("Leave Policy")).toBeInTheDocument();

    // This re-render runs the previous effect's cleanup — the crash QA reported.
    await ask("Do I need approval before working overtime?");

    await waitFor(() => expect(screen.getAllByText(/^You get 10 days of sick leave per year/)).toHaveLength(2));
    expect(screen.queryByText("This page didn't load")).not.toBeInTheDocument();
  });
});
