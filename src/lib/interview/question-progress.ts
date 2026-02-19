import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  type QuestionProgressState,
  toQuestionProgressState,
} from "@/lib/interview/question-progress-state";

type UserQuestionProgressRow = {
  question_id: string;
  is_read: boolean;
  review_status: "got_it" | "review_later" | null;
};

export async function listViewerQuestionProgressStates(questionIds: string[]) {
  const uniqueQuestionIds = Array.from(new Set(questionIds.filter(Boolean)));

  if (!uniqueQuestionIds.length) {
    return {
      isAuthenticated: false,
      statesByQuestionId: {} as Record<string, QuestionProgressState>,
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        isAuthenticated: false,
        statesByQuestionId: {} as Record<string, QuestionProgressState>,
      };
    }

    const { data, error } = await supabase
      .from("user_question_progress")
      .select("question_id, is_read, review_status")
      .eq("user_id", user.id)
      .in("question_id", uniqueQuestionIds)
      .returns<UserQuestionProgressRow[]>();

    if (error) {
      console.warn("Failed to fetch question progress states", error);
      return {
        isAuthenticated: true,
        statesByQuestionId: {} as Record<string, QuestionProgressState>,
      };
    }

    const statesByQuestionId: Record<string, QuestionProgressState> = {};

    for (const row of data ?? []) {
      statesByQuestionId[row.question_id] = toQuestionProgressState(row);
    }

    return {
      isAuthenticated: true,
      statesByQuestionId,
    };
  } catch (error) {
    console.warn("Unable to read question progress states", error);
    return {
      isAuthenticated: false,
      statesByQuestionId: {} as Record<string, QuestionProgressState>,
    };
  }
}
