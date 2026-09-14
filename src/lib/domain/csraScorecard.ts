export type CsraScorecardItem = {
  number: number;
  statement: string;
  guidance: string;
  weight: number;
};

export const CSRA_SCORECARD_TITLE = "Pre-Job Safety Meeting Scorecard";
export const CSRA_SCORECARD_SOURCE = "CSRA pre-job safety meeting scorecard";

export const CSRA_SCORECARD_ITEMS: CsraScorecardItem[] = [
  {
    number: 1,
    weight: 4,
    statement: "Everyone performing the job was present at the meeting.",
    guidance:
      "Everyone performing the planned task was present for the entire pre-job meeting. If working alone, plans were discussed with a manager, mentor, or co-worker.",
  },
  {
    number: 2,
    weight: 4,
    statement: "The discussion was held as close to the work as reasonably possible.",
    guidance:
      "Meeting was held at or near where the work will be performed. Workspace was reviewed by the crew before starting the meeting.",
  },
  {
    number: 3,
    weight: 4,
    statement: "Work steps required to complete the job were identified and discussed.",
    guidance:
      "Crew identified and discussed the major work steps. Facilitator confirmed the major work steps and plans to address changes and provided corrections if necessary.",
  },
  {
    number: 4,
    weight: 3,
    statement: "Necessary tools and equipment were identified and discussed.",
    guidance:
      "Crew identified and discussed tools and equipment needed to safely complete the work. Facilitator confirmed that the crew had all necessary tools and equipment.",
  },
  {
    number: 5,
    weight: 5,
    statement: "Hazards associated with the job were identified and discussed.",
    guidance: "Crew identified and discussed hazards associated with their tasks.",
  },
  {
    number: 6,
    weight: 4,
    statement: "Hazards posed by the environment or surrounding work were identified and discussed.",
    guidance:
      "Crew identified and discussed the hazards created by other crews. Crew discussed how hazards they create may impact other crews. Crew identified and discussed hazards posed by the environment.",
  },
  {
    number: 7,
    weight: 5,
    statement: "Controls for each hazard were identified and discussed.",
    guidance: "Crew identified and discussed controls or management strategies associated with each identified hazard.",
  },
  {
    number: 8,
    weight: 5,
    statement: "All life-threatening hazards and their controls were emphasized.",
    guidance:
      "Crew emphasized all hazards with the potential to cause serious injury or fatality. Crew emphasized all controls for all hazards with potential to cause serious injury or fatality.",
  },
  {
    number: 9,
    weight: 3,
    statement: "Hazards and necessary controls were documented.",
    guidance: "Crew completed required pre-job documentation. Facilitator confirmed that pre-job documentation is readily accessible.",
  },
  {
    number: 10,
    weight: 3,
    statement: "All required permits were obtained and reviewed.",
    guidance: "Facilitator confirmed that all required work permits were obtained and readily accessible.",
  },
  {
    number: 11,
    weight: 4,
    statement: "Potential changes were identified and discussed and a plan to address change was created.",
    guidance:
      "Crew identified and discussed possible changes to the work and work environment. Crew discussed the impacts of those changes on the safety.",
  },
  {
    number: 12,
    weight: 4,
    statement: "The importance of stopping work to address an unexpected change, disruption, or hazard was discussed.",
    guidance:
      "Crew identified and discussed potential work conditions to use Stop Work Authority. Crew discussed the protocol for using Stop Work Authority.",
  },
  {
    number: 13,
    weight: 3,
    statement: "Emergency response plans were reviewed, including individual roles and responsibilities.",
    guidance:
      "Crew identified potential emergencies. Crew discussed the protocol to address emergencies. Crew discussed individual roles and responsibilities during an emergency.",
  },
  {
    number: 14,
    weight: 3,
    statement: "Crew actively demonstrated their understanding of their work steps, hazards, and controls.",
    guidance:
      "Crew verbally acknowledged the hazards and controls. Crew demonstrated that they understand the safety expectations. Facilitator confirmed that the crew members understand their roles and responsibilities.",
  },
  {
    number: 15,
    weight: 3,
    statement: "All crew members participated in the discussion by identifying hazards and controls.",
    guidance:
      "Crew was active in the conversation by identifying hazards and controls, voicing comments or concerns, and providing specific details.",
  },
];

export const CSRA_MAX_SCORE = CSRA_SCORECARD_ITEMS.reduce((sum, item) => sum + item.weight, 0);

export function csraWeightedScore(answers: Record<string, boolean | null | undefined>): number {
  return CSRA_SCORECARD_ITEMS.reduce((sum, item) => {
    const value = answers[String(item.number)];
    if (value === true) return sum + item.weight;
    return sum;
  }, 0);
}
