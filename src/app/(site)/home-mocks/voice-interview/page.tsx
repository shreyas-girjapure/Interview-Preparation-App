import type { Metadata } from "next";

import { VoiceInterviewMockShowcase } from "./_components/voice-interview-mock-showcase";

export const metadata: Metadata = {
  title: "Voice Interview Mock | Interview Prep",
  description:
    "Review route for the AI voice interview mock states before live UI implementation.",
};

export default function VoiceInterviewMockPage() {
  return <VoiceInterviewMockShowcase />;
}
