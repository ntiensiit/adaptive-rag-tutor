"use client";

import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

type Props = { content: string; className?: string };

export function AcademicMarkdown({ content, className }: Props) {
  const body = (
    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
      {content}
    </ReactMarkdown>
  );
  if (!className) return body;
  const result = <div className={className}>{body}</div>;
  return result;
}
