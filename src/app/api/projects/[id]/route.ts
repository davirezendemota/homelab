import { jsonResponse, errorJson } from "@/lib/api-utils";
import {
  deleteProject,
  parseProjectEnvironment,
  updateProject,
  type ProjectEnvironment,
} from "@/lib/projects";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const data = (await request.json()) as {
      name?: unknown;
      accessUrl?: unknown;
      environment?: unknown;
      containers?: unknown;
    };
    const patch: {
      name?: string;
      accessUrl?: string;
      environment?: ProjectEnvironment;
      containers?: string[];
    } = {};
    if ("name" in data) {
      patch.name = typeof data.name === "string" ? data.name : "";
    }
    if ("accessUrl" in data && typeof data.accessUrl === "string") {
      patch.accessUrl = data.accessUrl;
    }
    if ("environment" in data) {
      patch.environment = parseProjectEnvironment(data.environment);
    }
    if ("containers" in data && Array.isArray(data.containers)) {
      patch.containers = data.containers.map(String);
    }
    return jsonResponse(updateProject(id, patch));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao atualizar projeto";
    const status = message === "Projeto não encontrado" ? 404 : 400;
    return errorJson(message, status);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    deleteProject(id);
    return jsonResponse({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao apagar projeto";
    return errorJson(message, message === "Projeto não encontrado" ? 404 : 400);
  }
}
