import { matchTasks, type ApprovedSynonym, type ApprovedTask, type MatchResult } from "@/lib/domain/taskMatching";
import { extractBriefing } from "@/lib/conversation/extractBriefing";
import type { BriefingCatalog, BriefingExtraction } from "@/lib/conversation/types";
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

export type AiBriefingInput = {
  transcript: string;
  catalog: BriefingCatalog;
};

export interface AiProvider {
  name: string;
  model: string;
  matchTasks(input: AiMatchInput): Promise<MatchResult>;
  extractPageFields(input: AiExtractInput): Promise<ExtractionResult>;
  extractBriefing(input: AiBriefingInput): Promise<BriefingExtraction>;
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
  async extractBriefing(input: AiBriefingInput): Promise<BriefingExtraction> {
    return extractBriefing({ ...input, provider: this.name, model: this.model });
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
    return extractPageFields({ ...input, provider: this.name, model: this.model });
  }
  async extractBriefing(input: AiBriefingInput): Promise<BriefingExtraction> {
    return extractBriefing({ ...input, provider: this.name, model: this.model });
  }
}

export function getAiProvider(): AiProvider {
  const which = process.env.AI_PROVIDER ?? "mock";
  if (which === "azure-openai") return new AzureOpenAiProvider();
  return new LocalLibraryAiProvider();
}
