import { matchTasks, type ApprovedSynonym, type ApprovedTask, type MatchResult } from "@/lib/domain/taskMatching";

export type AiMatchInput = {
  workTypeCode: string;
  text: string;
  approvedTasks: ApprovedTask[];
  approvedSynonyms: ApprovedSynonym[];
};

export interface AiProvider {
  name: string;
  model: string;
  matchTasks(input: AiMatchInput): Promise<MatchResult>;
}

export class LocalLibraryAiProvider implements AiProvider {
  name = "local-library-matcher";
  model = "deterministic-v1";
  async matchTasks(input: AiMatchInput): Promise<MatchResult> {
    return matchTasks(input);
  }
}

export class AzureOpenAiProvider implements AiProvider {
  name = "azure-openai";
  model = process.env.AZURE_OPENAI_DEPLOYMENT ?? "unknown";
  async matchTasks(input: AiMatchInput): Promise<MatchResult> {
    if (!process.env.AZURE_OPENAI_ENDPOINT || !process.env.AZURE_OPENAI_API_KEY) {
      return {
        suggestions: [],
        followUpQuestion: null,
        followUpOptions: [],
        unmatched: true,
        message: "The suggestion service is not available. Select a task from the library.",
      };
    }
    return matchTasks(input);
  }
}

export function getAiProvider(): AiProvider {
  const which = process.env.AI_PROVIDER ?? "mock";
  if (which === "azure-openai") return new AzureOpenAiProvider();
  return new LocalLibraryAiProvider();
}
