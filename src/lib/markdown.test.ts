import { describe, expect, it } from "vitest";

import { renderMarkdown } from "@/lib/markdown";

describe("renderMarkdown", () => {
  it("renders highlighted JavaScript code blocks", async () => {
    const html = await renderMarkdown("```js\nconst value = 42;\n```");

    expect(html).toContain("data-rehype-pretty-code-figure");
    expect(html).toContain('data-language="js"');
    expect(html).toContain("data-line");
    expect(html).toContain("--shiki-light");
  });

  it("renders highlighted Apex code blocks", async () => {
    const html = await renderMarkdown(
      "```apex\npublic with sharing class AccountService {}\n```",
    );

    expect(html).toContain("data-rehype-pretty-code-figure");
    expect(html).toContain('data-language="apex"');
    expect(html).toContain("AccountService");
    expect(html).toContain("--shiki-dark");
  });

  it("does not emit raw script tags from markdown input", async () => {
    const html = await renderMarkdown("Hello <script>alert('xss')</script>");

    expect(html).not.toContain("<script>");
    expect(html).toContain("alert('xss')");
  });
});
