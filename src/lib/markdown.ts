import { cache } from "react";
import rehypePrettyCode, {
  type LineElement,
  type Options as RehypePrettyCodeOptions,
} from "rehype-pretty-code";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

const prettyCodeOptions: RehypePrettyCodeOptions = {
  theme: {
    dark: "github-dark-dimmed",
    light: "github-light",
  },
  keepBackground: false,
  defaultLang: {
    block: "plaintext",
    inline: "plaintext",
  },
  onVisitLine(line: LineElement) {
    if (line.children.length === 0) {
      line.children = [{ type: "text", value: " " }];
    }
  },
};

// Cached because interview answers are read often and recompiled rarely.
export const renderMarkdown = cache(async (source: string) => {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypePrettyCode, prettyCodeOptions)
    .use(rehypeStringify)
    .process(source);

  return String(file);
});
