export const PROJECT_ENVIRONMENTS = ["dev", "homolog", "producao"] as const;

export type ProjectEnvironment = (typeof PROJECT_ENVIRONMENTS)[number];

export type Project = {
  id: string;
  name: string;
  accessUrl: string;
  environment: ProjectEnvironment;
  containers: string[];
};

export function environmentLabel(environment: ProjectEnvironment): string {
  if (environment === "homolog") return "Homolog";
  if (environment === "producao") return "Produção";
  return "Dev";
}

export function parseProjectEnvironment(raw: unknown): ProjectEnvironment {
  if (raw === "homolog" || raw === "producao" || raw === "dev") return raw;
  return "dev";
}
