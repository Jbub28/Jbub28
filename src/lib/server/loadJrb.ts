import { prisma } from "@/lib/db";

export async function loadJrb(id: string) {
  return prisma.jrbRecord.findUnique({
    where: { id },
    include: {
      workType: true,
      employeeInCharge: true,
      supervisor: true,
      createdBy: true,
      operatingArea: true,
      versions: {
        orderBy: { versionNumber: "desc" },
        include: {
          taskSelections: { include: { task: { include: { activity: { include: { workType: true } }, versions: true } } } },
          conditions: true,
          environmental: true,
          predeparture: true,
          walkdowns: true,
          crewMembers: true,
          acknowledgments: true,
          questions: true,
          postJobReviews: true,
          jobSteps: { orderBy: { sequence: "asc" } },
          exposures: {
            include: {
              exposure: { include: { icon: true } },
              directControlSelections: { include: { directControl: true, verifications: true } },
              notUsed: true,
              alternativeControls: { include: { category: true } },
            },
          },
          aiRecommendations: true,
          briefingAssessment: true,
          conversationSessions: { orderBy: { createdAt: "desc" }, take: 5, include: { facts: true } },
        },
      },
      stopWorkEvents: { orderBy: { createdAt: "desc" } },
      rebriefEvents: { orderBy: { createdAt: "desc" } },
    },
  });
}
