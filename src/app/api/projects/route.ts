import { jsonResponse, errorJson } from "@/lib/api-utils";
import {
  createProject,
  listProjects,
  parseProjectEnvironment,
  reorderProjects,
} from "@/lib/projects";

export const runtime = "nodejs";

export async function GET() {
  return jsonResponse({ projects: listProjects() });
}

export async function POST(request: Request) {
  try {
    const data = (await request.json()) as {
      name?: unknown;
      accessUrl?: unknown;
      environment?: unknown;
    };
    const name = typeof data?.name === "string" ? data.name : "";
    const accessUrl =
      typeof data?.accessUrl === "string" ? data.accessUrl : "";
    const environment = parseProjectEnvironment(data?.environment);
    return jsonResponse(createProject(name, accessUrl, environment), 201);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao criar projeto";
    return errorJson(message, 400);
  }
}

export async function PATCH(request: Request) {
  try {
    const data = (await request.json()) as { order?: unknown };
    if (!Array.isArray(data.order)) {
      return errorJson("Campo order deve ser um array de ids", 400);
    }
    const order = data.order.map(String);
    return jsonResponse({ projects: reorderProjects(order) });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao reordenar projetos";
    return errorJson(message, 400);
  }
}
