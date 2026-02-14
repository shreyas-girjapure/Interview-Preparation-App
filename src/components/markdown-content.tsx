import { cn } from "@/lib/utils";
import { renderMarkdown } from "@/lib/markdown";

type MarkdownContentProps = {
  source: string;
  className?: string;
};

export async function MarkdownContent({
  source,
  className,
}: MarkdownContentProps) {
  const html = await renderMarkdown(source);

  return (
    <div
      className={cn(
        "interview-prose prose prose-neutral max-w-none md:prose-lg",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
