"use client";

import Link from "next/link";
import { useRef, type ReactNode } from "react";

type MockInterviewLinkProps = {
  children: ReactNode;
  className?: string;
  href: string;
  scopeSlug: string;
};

export function MockInterviewLink({
  children,
  className,
  href,
  scopeSlug,
}: MockInterviewLinkProps) {
  const prewarmStartedRef = useRef(false);

  function triggerPrewarm() {
    if (prewarmStartedRef.current) {
      return;
    }

    prewarmStartedRef.current = true;
    void fetch("/api/interview/grounding/prewarm", {
      body: JSON.stringify({
        scopeSlug,
        scopeType: "topic",
      }),
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      keepalive: true,
      method: "POST",
    }).catch(() => {
      prewarmStartedRef.current = false;
    });
  }

  return (
    <Link href={href} className={className} onClick={triggerPrewarm}>
      {children}
    </Link>
  );
}
