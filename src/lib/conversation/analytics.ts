import type { ConversationFact } from "./types";

export type FactQuery = {
  category?: string;
  keyIncludes?: string;
  valueIncludes?: string;
  origin?: ConversationFact["origin"];
  backendOnly?: boolean;
};

export function queryConversationFacts(facts: ConversationFact[], query: FactQuery = {}) {
  return facts.filter((fact) => {
    if (query.category && fact.category !== query.category) return false;
    if (query.keyIncludes && !fact.key.toLowerCase().includes(query.keyIncludes.toLowerCase())) return false;
    if (query.valueIncludes && !String(fact.value).toLowerCase().includes(query.valueIncludes.toLowerCase())) return false;
    if (query.origin && fact.origin !== query.origin) return false;
    if (query.backendOnly && fact.displayOnJrb) return false;
    return true;
  });
}
