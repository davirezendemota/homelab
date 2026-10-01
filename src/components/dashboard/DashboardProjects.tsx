"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { useDashboardStatus } from "@/components/dashboard/DashboardStatusProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { dotStyle } from "@/lib/dashboard-view-model";
import { MoreHorizontal, Plus, Search } from "lucide-react";
import {
  environmentLabel,
  PROJECT_ENVIRONMENTS,
  type Project,
  type ProjectEnvironment,
} from "@/lib/project-model";

type EditorState =
  | { mode: "create" }
  | { mode: "edit"; project: Project };

async function fetchProjects(): Promise<Project[]> {
  const res = await fetch("/api/projects", { cache: "no-store" });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data = (await res.json()) as { projects: Project[] };
  return data.projects ?? [];
}

function stackDisplayName(stack: string) {
  return stack === "sem stack" ? "Sem stack" : stack;
}

function groupContainersByStack(
  containerNames: string[],
  stackByName: Map<string, string>,
): { stack: string; names: string[] }[] {
  const order: string[] = [];
  const map = new Map<string, string[]>();
  for (const name of containerNames) {
    const stack = stackByName.get(name) ?? "sem stack";
    if (!map.has(stack)) {
      map.set(stack, []);
      order.push(stack);
    }
    map.get(stack)!.push(name);
  }
  order.sort((a, b) => {
    if (a === "sem stack") return 1;
    if (b === "sem stack") return -1;
    return a.localeCompare(b, undefined, { sensitivity: "base" });
  });
  return order.map((stack) => ({ stack, names: map.get(stack)! }));
}

function ProjectContainerLine({
  name,
  status,
}: {
  name: string;
  status: string;
}) {
  const dot = dotStyle(status);
  return (
    <div className="project-container-line" title={name}>
      <span
        className="status-dot"
        style={{
          background: dot.dot,
          boxShadow: `0 0 0 3px ${dot.glow}`,
        }}
      />
      <span className="project-container-name">{name}</span>
    </div>
  );
}

function ProjectEditorModal({
  editor,
  allContainerNames,
  onClose,
  onSaved,
}: {
  editor: EditorState;
  allContainerNames: string[];
  onClose: () => void;
  onSaved: (project: Project) => void;
}) {
  const initialName =
    editor.mode === "edit" ? editor.project.name : "";
  const initialAccessUrl =
    editor.mode === "edit" ? editor.project.accessUrl : "";
  const initialEnvironment: ProjectEnvironment =
    editor.mode === "edit" ? editor.project.environment : "dev";
  const initialSelected =
    editor.mode === "edit" ? new Set(editor.project.containers) : new Set<string>();

  const [name, setName] = useState(initialName);
  const [accessUrl, setAccessUrl] = useState(initialAccessUrl);
  const [environment, setEnvironment] =
    useState<ProjectEnvironment>(initialEnvironment);
  const [selected, setSelected] = useState(initialSelected);
  const [filter, setFilter] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredNames = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return allContainerNames.filter(
      (n) => !q || n.toLowerCase().includes(q),
    );
  }, [allContainerNames, filter]);

  const toggle = (containerName: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(containerName)) next.delete(containerName);
      else next.add(containerName);
      return next;
    });
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const containers = allContainerNames.filter((n) => selected.has(n));
      if (editor.mode === "create") {
        const createRes = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, environment }),
        });
        if (!createRes.ok) {
          const body = (await createRes.json()) as { error?: string };
          throw new Error(body.error ?? "HTTP " + createRes.status);
        }
        const created = (await createRes.json()) as Project;
        const updateRes = await fetch(`/api/projects/${created.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, accessUrl, environment, containers }),
        });
        if (!updateRes.ok) {
          const body = (await updateRes.json()) as { error?: string };
          throw new Error(body.error ?? "HTTP " + updateRes.status);
        }
        onSaved(await updateRes.json());
      } else {
        const res = await fetch(`/api/projects/${editor.project.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, accessUrl, environment, containers }),
        });
        if (!res.ok) {
          const body = (await res.json()) as { error?: string };
          throw new Error(body.error ?? "HTTP " + res.status);
        }
        onSaved(await res.json());
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[min(82vh,760px)] w-full max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>
            {editor.mode === "create" ? "Novo projeto" : "Editar projeto"}
          </DialogTitle>
          <DialogDescription>Projeto</DialogDescription>
        </DialogHeader>
        <form className="project-editor-form flex min-h-0 flex-1 flex-col" onSubmit={onSubmit}>
          <div className="modal-body project-editor-body overflow-y-auto">
            {error ? <div className="project-editor-error">{error}</div> : null}
            <div className="project-field">
              <Label htmlFor="project-name">Nome</Label>
              <Input
                id="project-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Produção, Lab, Mídia…"
                required
                autoFocus
              />
            </div>
            <div className="project-field">
              <Label htmlFor="project-access-url">Link de acesso</Label>
              <Input
                id="project-access-url"
                value={accessUrl}
                onChange={(e) => setAccessUrl(e.target.value)}
                placeholder="https://…"
                type="url"
                inputMode="url"
                autoComplete="url"
              />
            </div>
            <div className="project-field">
              <Label htmlFor="project-environment">Ambiente</Label>
              <Select
                value={environment}
                onValueChange={(value) =>
                  setEnvironment(value as ProjectEnvironment)
                }
              >
                <SelectTrigger id="project-environment" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_ENVIRONMENTS.map((env) => (
                    <SelectItem key={env} value={env}>
                      {environmentLabel(env)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="project-field project-field-containers">
              <Label>Containers</Label>
              <div className="search-wrap project-picker-search relative">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  className="pl-9"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Filtrar containers…"
                  type="search"
                />
              </div>
              <div className="project-picker-list">
                {filteredNames.length === 0 ? (
                  <p className="project-picker-empty">Nenhum container.</p>
                ) : (
                  filteredNames.map((containerName) => (
                    <label
                      key={containerName}
                      className="settings-option project-picker-item flex cursor-pointer"
                    >
                      <Checkbox
                        checked={selected.has(containerName)}
                        onCheckedChange={() => toggle(containerName)}
                      />
                      <span className="settings-option-text">
                        <span className="settings-option-label">
                          {containerName}
                        </span>
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>
          <DialogFooter
            className="project-editor-footer shrink-0 !m-0 gap-3 bg-card sm:flex-row"
          >
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function reorderProjectList(
  projects: Project[],
  draggedId: string,
  targetId: string,
): Project[] {
  if (draggedId === targetId) return projects;
  const from = projects.findIndex((p) => p.id === draggedId);
  const to = projects.findIndex((p) => p.id === targetId);
  if (from === -1 || to === -1) return projects;
  const next = [...projects];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  if (next.every((p, i) => p.id === projects[i]?.id)) return projects;
  return next;
}

function isDragBlockedTarget(target: EventTarget | null) {
  return Boolean(
    target instanceof Element &&
      target.closest("a, button, [role='menu'], .project-card-menu-dropdown"),
  );
}

function ProjectCardMenu({
  projectName,
  onEdit,
  onDelete,
}: {
  projectName: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className="project-card-menu-trigger"
        draggable={false}
        aria-label={`Menu do projeto ${projectName}`}
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="project-card-btn"
            draggable={false}
          />
        }
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          draggable={false}
          onClick={() => {
            setOpen(false);
            onEdit();
          }}
        >
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          draggable={false}
          onClick={() => {
            setOpen(false);
            onDelete();
          }}
        >
          Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ProjectCard({
  project,
  statusByName,
  stackByName,
  onEdit,
  onDelete,
  isDragging,
  isDragOver,
  onCardDragStart,
  onCardDragEnd,
  onDragOverCard,
  onDropOnCard,
  onDragLeaveCard,
}: {
  project: Project;
  statusByName: Map<string, string>;
  stackByName: Map<string, string>;
  onEdit: () => void;
  onDelete: () => void;
  isDragging: boolean;
  isDragOver: boolean;
  onCardDragStart: (id: string) => void;
  onCardDragEnd: () => void;
  onDragOverCard: (id: string) => void;
  onDropOnCard: (id: string) => void;
  onDragLeaveCard: (id: string) => void;
}) {
  const stackGroups = useMemo(
    () => groupContainersByStack(project.containers, stackByName),
    [project.containers, stackByName],
  );
  const link = project.accessUrl.trim();

  return (
    <Card
      className={`project-card max-w-[280px] min-w-0 w-full gap-0 border border-border py-0 shadow-none ring-0${isDragging ? " is-dragging" : ""}${isDragOver ? " is-drag-over" : ""}`}
      draggable
      title="Arrastar para reordenar"
      onDragStart={(e) => {
        if (isDragBlockedTarget(e.target)) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", project.id);
        onCardDragStart(project.id);
      }}
      onDragEnd={onCardDragEnd}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        onDragOverCard(project.id);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDropOnCard(project.id);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        onDragLeaveCard(project.id);
      }}
    >
      <CardHeader className="project-card-head flex-row items-center gap-2 space-y-0 border-b px-4 py-3">
        <div className="project-card-title-block">
          <Badge
            variant="outline"
            className={`project-env-badge project-env-badge--${project.environment}`}
            title={`Ambiente: ${environmentLabel(project.environment)}`}
          >
            {environmentLabel(project.environment)}
          </Badge>
          <h2 className="project-card-title">
            {link ? (
              <a
                href={link}
                className="project-card-title-link"
                target="_blank"
                rel="noopener noreferrer"
                draggable={false}
                title={`Abrir ${link}`}
              >
                {project.name}
              </a>
            ) : (
              <span title={project.name}>{project.name}</span>
            )}
          </h2>
        </div>
        <ProjectCardMenu
          projectName={project.name}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </CardHeader>
      <CardContent className="project-card-body p-0">
        {project.containers.length === 0 ? (
          <p className="project-card-empty">Nenhum container.</p>
        ) : (
          stackGroups.map(({ stack, names }) => (
            <div key={stack} className="project-stack-block">
              <div className="project-stack-label" title={stackDisplayName(stack)}>
                {stackDisplayName(stack)}
              </div>
              <div className="project-stack-containers">
                {names.map((name) => (
                  <ProjectContainerLine
                    key={name}
                    name={name}
                    status={statusByName.get(name) ?? "unknown"}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardProjects() {
  const { data } = useDashboardStatus();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setProjects(await fetchProjects());
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const allContainerNames = useMemo(
    () => data.containers.map((c) => c.name),
    [data.containers],
  );

  const statusByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of data.containers) map.set(c.name, c.status);
    return map;
  }, [data.containers]);

  const stackByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of data.containers) map.set(c.name, c.stack);
    return map;
  }, [data.containers]);

  const persistProjectOrder = useCallback(
    async (ordered: Project[]) => {
      try {
        const res = await fetch("/api/projects", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: ordered.map((p) => p.id) }),
        });
        if (!res.ok) {
          const body = (await res.json()) as { error?: string };
          throw new Error(body.error ?? "HTTP " + res.status);
        }
        setLoadError(null);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : String(e));
        void load();
      }
    },
    [load],
  );

  const handleDropOnCard = useCallback(
    (targetId: string) => {
      if (!draggingId) return;
      setProjects((prev) => {
        const next = reorderProjectList(prev, draggingId, targetId);
        if (next === prev) return prev;
        void persistProjectOrder(next);
        return next;
      });
      setDraggingId(null);
      setDragOverId(null);
    },
    [draggingId, persistProjectOrder],
  );

  const onDelete = async (project: Project) => {
    if (!window.confirm(`Apagar o projeto "${project.name}"?`)) return;
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <section className="projects-section" aria-label="Projetos">
      <div className="projects-section-head">
        <div>
          <span className="projects-eyebrow">Projetos</span>
          <p className="projects-hint">
            Agrupe containers por contexto — arraste o card para reordenar.
          </p>
        </div>
        <Button
          type="button"
          className="project-new-btn"
          onClick={() => setEditor({ mode: "create" })}
        >
          <Plus className="size-4" />
          Novo projeto
        </Button>
      </div>
      {loadError ? (
        <div className="project-section-error">{loadError}</div>
      ) : null}
      <div className="projects-grid">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            statusByName={statusByName}
            stackByName={stackByName}
            isDragging={draggingId === project.id}
            isDragOver={
              dragOverId === project.id && draggingId !== project.id
            }
            onCardDragStart={setDraggingId}
            onCardDragEnd={() => {
              setDraggingId(null);
              setDragOverId(null);
            }}
            onDragOverCard={setDragOverId}
            onDropOnCard={handleDropOnCard}
            onDragLeaveCard={(id) => {
              setDragOverId((prev) => (prev === id ? null : prev));
            }}
            onEdit={() => setEditor({ mode: "edit", project })}
            onDelete={() => void onDelete(project)}
          />
        ))}
      </div>
      {editor ? (
        <ProjectEditorModal
          editor={editor}
          allContainerNames={allContainerNames}
          onClose={() => setEditor(null)}
          onSaved={(saved) => {
            setProjects((prev) => {
              const idx = prev.findIndex((p) => p.id === saved.id);
              if (idx === -1) return [...prev, saved];
              const next = [...prev];
              next[idx] = saved;
              return next;
            });
          }}
        />
      ) : null}
    </section>
  );
}

