import { matchTasks, type ApprovedSynonym, type ApprovedTask, type MatchResult } from "@/lib/domain/taskMatching";
import { extractPageFields } from "@/lib/voice/extractPageFields";
import type { ExtractionResult, PageVoiceSchema } from "@/lib/voice/types";

export type AiMatchInput = {
  workTypeCode: string;
  text: string;
  approvedTasks: ApprovedTask[];
  approvedSynonyms: ApprovedSynonym[];
};

export type AiExtractInput = {
  transcript: string;
  schema: PageVoiceSchema;
};

export interface AiProvider {
  name: string;
  model: string;
  matchTasks(input: AiMatchInput): Promise<MatchResult>;
  extractPageFields(input: AiExtractInput): Promise<ExtractionResult>;
}

export class LocalLibraryAiProvider implements AiProvider {
  name = "local-library-matcher";
  model = "deterministic-v1";
  async matchTasks(input: AiMatchInput): Promise<MatchResult> {
    return matchTasks(input);
  }
  async extractPageFields(input: AiExtractInput): Promise<ExtractionResult> {
    return extractPageFields({ ...input, provider: this.name, model: this.model });
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
  async extractPageFields(input: AiExtractInput): Promise<ExtractionResult> {
    // Structured JSON extraction against the current page schema can be
    // swapped in here without changing the JRB workflow. Until credentials
    // and a constrained prompt are configured, use the same local extractor.
    return extractPageFields({ ...input, provider: this.name, model: this.model });
  }
}

export function getAiProvider(): AiProvider {
  const which = process.env.AI_PROVIDER ?? "mock";
  if (which === "azure-openai") return new AzureOpenAiProvider();
  return new LocalLibraryAiProvider();
}
