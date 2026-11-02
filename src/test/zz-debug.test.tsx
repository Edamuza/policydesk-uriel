import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Route as IndexRoute } from "@/routes/index";

const { askMock } = vi.hoisted(() => ({ askMock: vi.fn() }));
vi.mock("@/lib/api.functions", () => ({ askQuestion: askMock }));

describe("debug", () => {
  it("shows what happens after Enter", async () => {
    Element.prototype.scrollIntoView = function () { return Promise.resolve(); };
    askMock.mockResolvedValue({ ok: true, answer: "ANSWERTEXT", citations: [], abstained: false });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <IndexRoute.options.component />
      </QueryClientProvider>,
    );
    const box = screen.getByLabelText("Your question");
    fireEvent.change(box, { target: { value: "hello?" } });
    console.log("VALUE AFTER CHANGE:", (box as HTMLTextAreaElement).value);
    fireEvent.keyDown(box, { key: "Enter" });
    console.log("MOCK CALLS:", askMock.mock.calls.length, JSON.stringify(askMock.mock.calls[0] ?? null));
    await new Promise((r) => setTimeout(r, 200));
    console.log("BODY:", document.body.textContent?.slice(0, 400));
    expect(true).toBe(true);
  });
});
