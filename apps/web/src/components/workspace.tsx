"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  ArrowLeft,
  Plus,
  Search,
  RefreshCw,
  LogOut,
  Check,
  ArrowRight,
  SlidersHorizontal,
  FolderOpen,
  X,
  MoreHorizontal,
  LayoutList,
  Columns3,
  Download,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  projectStatuses,
  taskStatuses,
  priorities,
  projectSchema,
  taskSchema,
  createTaskSchema,
  registerSchema,
  credentialsSchema,
  progress,
  type Project,
  type Task,
  type Profile,
  type Dashboard,
  type AuthResponse,
} from "@project/contracts";
import { api } from "@/lib/api";
import { Headline } from "./headline";
import { TaskCollection } from "./task-collection";
import { FocusPanel } from "./focus-panel";
import {
  localDay,
  matchesDue,
  sortTasks,
  tasksCsv,
  type DueFilter,
  type TaskSort,
} from "@/lib/task-view";

const dateLabel = (v: string) =>
  new Date(`${v.slice(0, 10)}T12:00:00`).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
const taskBody = (t: Task) => ({
  name: t.name,
  description: t.description,
  status: t.status,
  priority: t.priority,
  due_date: t.due_date,
});
function Message({ children }: { children: React.ReactNode }) {
  return (
    <p className="message" role="alert">
      {children}
    </p>
  );
}
function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <FolderOpen size={36} strokeWidth={1} />
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}

function Auth({ register }: { register: boolean }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setNotice("");
    const f = new FormData(e.currentTarget);
    const input = {
      email: f.get("email"),
      password: f.get("password"),
      ...(register ? { fullName: f.get("fullName") } : {}),
    };
    const parsed = (register ? registerSchema : credentialsSchema).safeParse(
      input,
    );
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      const result = await api<AuthResponse>(
        `/auth/${register ? "register" : "login"}`,
        { method: "POST", body: JSON.stringify(parsed.data) },
      );
      if (result.user) {
        qc.clear();
        qc.setQueryData(["me"], result.user);
        router.replace("/dashboard");
      } else setNotice(result.message ?? "Check your email to continue.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <header className="topbar">
        <Link href="/login" className="brand">
          <span className="brand-mark">
            d<span>.</span>
          </span>
          <span>Daymark</span>
        </Link>
        <span className="edition">YOUR DAY. YOUR MARK.</span>
      </header>
      <main className="auth-main">
        <section className="auth-intro">
          <span className="eyebrow">LESS NOISE. MORE PROGRESS.</span>
          <Headline />
          <p className="intro-copy">
            A little space to think.
            <br />
            One place for every project and task.
          </p>
          <div className="auth-foot">
            <span className="tiny-dot" /> Your work. Wherever you are.
          </div>
        </section>
        <section className="auth-card">
          <span className="eyebrow">
            {register ? "MAKE YOURSELF AT HOME" : "YOUR WORKSPACE AWAITS"}
          </span>
          <h2>{register ? "Start something." : "Welcome back."}</h2>
          <p>
            {register
              ? "Create an account. Bring your projects together."
              : "Sign in to pick up where you left off."}
          </p>
          {/* Autofill extensions add fdprocessedid before hydration. Scope the escape hatch to form controls. */}
          <form onSubmit={submit}>
            {register && (
              <label>
                Full name
                <input
                  suppressHydrationWarning
                  name="fullName"
                  autoComplete="name"
                  required
                  maxLength={120}
                  placeholder="Your full name"
                />
              </label>
            )}
            <label>
              Email address
              <input
                suppressHydrationWarning
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
              />
            </label>
            <label>
              Password
              <span className="password-field">
                <input
                  suppressHydrationWarning
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={register ? "new-password" : "current-password"}
                  minLength={8}
                  maxLength={72}
                  required
                  placeholder="At least 8 characters"
                />
                <button
                  suppressHydrationWarning
                  type="button"
                  className="icon-button password-toggle"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>
            {error && <Message>{error}</Message>}
            {notice && (
              <p role="status" className="notice">
                {notice}
              </p>
            )}
            <button
              suppressHydrationWarning
              className="primary wide"
              disabled={busy}
            >
              {busy ? "Please wait…" : register ? "Create account" : "Sign in"}
              <ArrowUpRight size={18} />
            </button>
          </form>
          <p className="auth-switch">
            {register ? "Already have an account?" : "New around here?"}{" "}
            <Link href={register ? "/login" : "/register"}>
              {register ? "Sign in" : "Create an account"}{" "}
              <ArrowUpRight size={14} />
            </Link>
          </p>
        </section>
      </main>
      <footer className="page-footer">
        <span>DAYMARK</span>
        <span>ONE ACCOUNT. WEB + MOBILE.</span>
      </footer>
    </div>
  );
}

export function Workspace() {
  const path = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const auth = path === "/login" || path === "/register";
  const [sessionMessage, setSessionMessage] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [due, setDue] = useState<DueFilter>("");
  const [projectFilter, setProjectFilter] = useState("");
  const [sort, setSort] = useState<TaskSort>("due");
  const [view, setView] = useState<"list" | "board">("list");
  const [toast, setToast] = useState("");
  const [today, setToday] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const [modal, setModal] = useState<{
    kind: "project" | "task";
    item?: Project | Task;
    status?: Task["status"];
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    kind: "project" | "task";
    item: Project | Task;
  } | null>(null);
  const [actionError, setActionError] = useState("");
  const [acting, setActing] = useState(false);
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<Profile>("/auth/me"),
    enabled: !auth,
  });
  useEffect(() => {
    const expired = () => {
      qc.clear();
      setSessionMessage("Your session has expired. Please sign in again.");
      router.replace("/login");
    };
    window.addEventListener("session-expired", expired);
    return () => window.removeEventListener("session-expired", expired);
  }, [qc, router]);
  useEffect(() => {
    setSearch("");
    setStatus("");
    setPriority("");
    setProjectFilter("");
    const initialDue = new URLSearchParams(window.location.search).get("due");
    setDue(
      initialDue === "today" ||
        initialDue === "overdue" ||
        initialDue === "week"
        ? initialDue
        : "",
    );
    setActionError("");
  }, [path]);
  useEffect(() => {
    const updateDay = () => setToday(localDay());
    updateDay();
    const timer = window.setInterval(updateDay, 60_000);
    try {
      if (localStorage.getItem("daymark.task-view.v1") === "board")
        setView("board");
    } catch {}
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (auth) return;
    const shortcut = (event: KeyboardEvent) => {
      if (
        !event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        modal ||
        deleteTarget
      )
        return;
      if (event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        setModal({
          kind:
            path === "/tasks" || path.startsWith("/projects/")
              ? "task"
              : "project",
        });
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [auth, path, modal, deleteTarget]);
  const enabled = !auth && Boolean(me.data);
  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: () => api<Project[]>("/projects"),
    enabled,
  });
  const tasks = useQuery({
    queryKey: ["tasks"],
    queryFn: () => api<Task[]>("/tasks"),
    enabled,
  });
  const stats = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<Dashboard>("/dashboard"),
    enabled,
  });
  const selectedId = path.startsWith("/projects/")
    ? path.split("/")[2]
    : undefined;
  const selected = projects.data?.find((p) => p.id === selectedId);
  const taskView = path === "/tasks" || Boolean(selectedId);
  const overview = path === "/dashboard";
  const allProjects = projects.data ?? [];
  const allTasks = tasks.data ?? [];
  const filteredProjects = allProjects
    .filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) &&
        (!status || p.status === status),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : sort === "newest"
          ? b.created_at.localeCompare(a.created_at)
          : a.end_date.localeCompare(b.end_date),
    );
  const filteredTasks = sortTasks(
    allTasks.filter(
      (t) =>
        (!selectedId || t.project_id === selectedId) &&
        t.name.toLowerCase().includes(search.toLowerCase()) &&
        (!status || t.status === status) &&
        (!priority || t.priority === priority) &&
        (!projectFilter || t.project_id === projectFilter) &&
        matchesDue(t, due, today),
    ),
    sort,
  );
  const reload = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["projects"] }),
      qc.invalidateQueries({ queryKey: ["tasks"] }),
      qc.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
  async function logout() {
    setActing(true);
    try {
      await api("/auth/logout", { method: "POST" });
      qc.clear();
      router.replace("/login");
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setActing(false);
    }
  }
  async function complete(task: Task) {
    return changeStatus(
      task,
      task.status === "Completed" ? "Pending" : "Completed",
    );
  }
  async function changeStatus(task: Task, nextStatus: Task["status"]) {
    const focusedControl = document.activeElement?.id;
    setActing(true);
    setActionError("");
    try {
      await api(`/tasks/${task.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...taskBody(task),
          status: nextStatus,
        }),
      });
      await reload();
      if (focusedControl === `task-status-${task.id}`) {
        requestAnimationFrame(() =>
          document.getElementById(focusedControl)?.focus(),
        );
      }
      setToast(
        nextStatus === "Completed"
          ? "Task completed. One step forward."
          : `Task moved to ${nextStatus.toLowerCase()}.`,
      );
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setActing(false);
    }
  }
  async function remove() {
    if (!deleteTarget) return;
    setActing(true);
    setActionError("");
    try {
      await api(`/${deleteTarget.kind}s/${deleteTarget.item.id}`, {
        method: "DELETE",
      });
      setDeleteTarget(null);
      setToast(
        `${deleteTarget.kind === "project" ? "Project" : "Task"} deleted.`,
      );
      if (
        deleteTarget.kind === "project" &&
        selectedId === deleteTarget.item.id
      )
        router.push("/projects");
      await reload();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setActing(false);
    }
  }
  function chooseView(value: "list" | "board") {
    setView(value);
    try {
      localStorage.setItem("daymark.task-view.v1", value);
    } catch {}
  }
  function chooseDue(value: DueFilter) {
    setDue(value);
    const url = new URL(window.location.href);
    if (value) url.searchParams.set("due", value);
    else url.searchParams.delete("due");
    window.history.replaceState(window.history.state, "", url);
  }
  function exportTasks() {
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + tasksCsv(filteredTasks)], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "daymark-tasks.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast("Your current task view was exported.");
  }
  if (auth)
    return (
      <>
        {sessionMessage && (
          <p className="session-message" role="status">
            {sessionMessage}
          </p>
        )}
        <Auth key={path} register={path === "/register"} />
      </>
    );
  if (me.isPending)
    return (
      <main className="empty" aria-busy="true">
        <span className="brand-mark">d.</span>
        <p>Opening your workspace…</p>
      </main>
    );
  if (me.error)
    return (
      <main className="empty">
        <h1>Let’s get you connected.</h1>
        <Message>{me.error.message}</Message>
        <button onClick={() => me.refetch()}>Try again</button>
        <Link href="/login">Go to sign in</Link>
      </main>
    );
  const loading = projects.isPending || tasks.isPending || stats.isPending;
  const dataError = projects.error || tasks.error || stats.error;
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="topbar">
        <Link className="brand" href="/dashboard">
          <span className="brand-mark">
            d<span>.</span>
          </span>
          <span>Daymark</span>
        </Link>
        <nav aria-label="Main navigation">
          {[
            ["/dashboard", "Overview"],
            ["/projects", "Projects"],
            ["/tasks", "Tasks"],
          ].map(([href, label]) => (
            <Link
              key={href}
              aria-current={
                path === href || (href === "/projects" && !!selectedId)
                  ? "page"
                  : undefined
              }
              href={href}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="user-tools">
          <span className="avatar" title={me.data?.fullName}>
            {me.data?.fullName?.slice(0, 1).toUpperCase() || "P"}
          </span>
          <button
            className="icon-button"
            title="Sign out"
            aria-label="Sign out"
            onClick={logout}
            disabled={acting}
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>
      <main id="main" className="workspace">
        <div className="section-label">
          <span>
            {overview
              ? "YOUR WORK, AT A GLANCE"
              : taskView
                ? "THE DETAILS MAKE THE DIFFERENCE"
                : "ROOM FOR YOUR NEXT IDEA"}
          </span>
          <span>Personal workspace</span>
        </div>
        <section className="page-heading">
          {selectedId && (
            <Link className="back-link" href="/projects">
              <ArrowLeft size={16} /> All projects
            </Link>
          )}
          <div className="heading-row">
            <div>
              <h1>
                {selected?.name ??
                  (selectedId
                    ? "Project"
                    : overview
                      ? "Overview."
                      : taskView
                        ? "Every task."
                        : "Your projects.")}
              </h1>
              <p>
                {selected?.description ||
                  (overview
                    ? `Welcome back${me.data?.fullName ? ", " + me.data.fullName.split(" ")[0] : ""}. Make room for what matters.`
                    : taskView
                      ? "Small steps. Meaningful progress."
                      : "From the first idea to the final detail.")}
              </p>
            </div>
            <button
              className="primary"
              title="Create new (Alt + N)"
              onClick={() =>
                setModal({
                  kind: taskView && allProjects.length ? "task" : "project",
                })
              }
            >
              <Plus size={18} />
              {taskView && allProjects.length ? "New task" : "New project"}
            </button>
          </div>
        </section>
        {actionError && <Message>{actionError}</Message>}
        {dataError && (
          <div className="notice">
            <Message>{dataError.message}</Message>
            <button onClick={reload}>Retry loading</button>
          </div>
        )}
        {loading ? (
          <div className="loading-state" role="status">
            <span className="sr-only">Loading your projects and tasks…</span>
            <div className="skeleton skeleton-heading" />
            <div className="skeleton-grid">
              {[1, 2, 3].map((i) => (
                <div className="skeleton skeleton-card" key={i} />
              ))}
            </div>
          </div>
        ) : (
          <>
            {overview && (
              <section className="stats-grid" aria-label="Workspace statistics">
                {[
                  ["Total Projects", stats.data?.totalProjects],
                  ["Total Tasks", stats.data?.totalTasks],
                  ["Completed Tasks", stats.data?.completedTasks],
                  ["Pending Tasks", stats.data?.pendingTasks],
                  ["Projects In Progress", stats.data?.projectsInProgress],
                ].map(([label, value], i) => (
                  <article key={label} className="stat">
                    <div>
                      <span className="eyebrow">0{i + 1}</span>
                      <ArrowUpRight size={17} />
                    </div>
                    <strong>{value ?? "0"}</strong>
                    <span>{label}</span>
                  </article>
                ))}
              </section>
            )}
            {overview && (
              <FocusPanel
                tasks={allTasks}
                today={today}
                busy={acting}
                edit={(item) => setModal({ kind: "task", item })}
                complete={complete}
                create={() =>
                  setModal({ kind: allProjects.length ? "task" : "project" })
                }
              />
            )}
            {selected && (
              <div className="project-summary">
                <span className="status-pill">{selected.status}</span>
                <span>
                  {dateLabel(selected.start_date)} —{" "}
                  {dateLabel(selected.end_date)}
                </span>
                <span>Created {dateLabel(selected.created_at)}</span>
                <button
                  onClick={() => setModal({ kind: "project", item: selected })}
                >
                  Edit project
                </button>
                <button
                  onClick={() =>
                    setDeleteTarget({ kind: "project", item: selected })
                  }
                >
                  Delete project
                </button>
              </div>
            )}
            {selectedId && !selected && !dataError ? (
              <Empty
                title="Project not found"
                body="It may have been deleted. Return to your projects to continue."
              />
            ) : (
              <>
                <div className="collection-heading">
                  <h2>
                    {overview
                      ? "Projects by deadline"
                      : taskView
                        ? "Tasks"
                        : "All projects"}{" "}
                    <span>
                      {taskView
                        ? filteredTasks.length
                        : filteredProjects.length}
                    </span>
                  </h2>
                  <div className="collection-actions">
                    {overview && (
                      <Link href="/projects">
                        View all projects <ArrowUpRight size={16} />
                      </Link>
                    )}
                    {taskView && (
                      <>
                        <div
                          className="view-switch"
                          role="group"
                          aria-label="Task layout"
                        >
                          <button
                            aria-pressed={view === "list"}
                            onClick={() => chooseView("list")}
                          >
                            <LayoutList size={16} /> List
                          </button>
                          <button
                            aria-pressed={view === "board"}
                            onClick={() => chooseView("board")}
                          >
                            <Columns3 size={16} /> Board
                          </button>
                        </div>
                        <button
                          className="icon-button"
                          aria-label="Export filtered tasks as CSV"
                          title="Export tasks"
                          disabled={!filteredTasks.length}
                          onClick={exportTasks}
                        >
                          <Download size={17} />
                        </button>
                      </>
                    )}
                    <button
                      className="icon-button"
                      aria-label="Refresh workspace"
                      disabled={projects.isFetching || tasks.isFetching}
                      onClick={reload}
                    >
                      <RefreshCw size={17} />
                    </button>
                  </div>
                </div>
                {!overview && (
                  <div className="filters">
                    <label className="search-field">
                      <Search size={18} />
                      <span className="sr-only">
                        Search {taskView ? "tasks" : "projects"}
                      </span>
                      <input
                        ref={searchRef}
                        type="search"
                        title="Search (Alt + K)"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={`Find a ${taskView ? "task" : "project"}…`}
                      />
                    </label>
                    <label className="select-filter">
                      <SlidersHorizontal size={16} />
                      <span className="sr-only">Filter by status</span>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                      >
                        <option value="">All statuses</option>
                        {(taskView ? taskStatuses : projectStatuses).map(
                          (s) => (
                            <option key={s}>{s}</option>
                          ),
                        )}
                      </select>
                    </label>
                    {taskView && (
                      <label className="select-filter">
                        <span className="sr-only">Filter by priority</span>
                        <select
                          value={priority}
                          onChange={(e) => setPriority(e.target.value)}
                        >
                          <option value="">All priorities</option>
                          {priorities.map((p) => (
                            <option key={p}>{p}</option>
                          ))}
                        </select>
                      </label>
                    )}
                    {taskView && (
                      <label className="select-filter">
                        <span className="sr-only">Filter by due date</span>
                        <select
                          value={due}
                          onChange={(e) =>
                            chooseDue(e.target.value as DueFilter)
                          }
                        >
                          <option value="">Any due date</option>
                          <option value="overdue">Overdue</option>
                          <option value="today">Due today</option>
                          <option value="week">Next 7 days</option>
                        </select>
                      </label>
                    )}
                    {taskView && !selectedId && (
                      <label className="select-filter">
                        <span className="sr-only">Filter by project</span>
                        <select
                          value={projectFilter}
                          onChange={(e) => setProjectFilter(e.target.value)}
                        >
                          <option value="">All projects</option>
                          {allProjects.map((p) => (
                            <option value={p.id} key={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <label className="select-filter">
                      <span className="sr-only">Sort order</span>
                      <select
                        value={sort}
                        onChange={(e) => setSort(e.target.value as TaskSort)}
                      >
                        <option value="due">Due date</option>
                        {taskView && <option value="priority">Priority</option>}
                        <option value="newest">Newest first</option>
                        <option value="name">Name A to Z</option>
                      </select>
                    </label>
                    {(search || status || priority || due || projectFilter) && (
                      <button
                        className="text-button"
                        onClick={() => {
                          setSearch("");
                          setStatus("");
                          setPriority("");
                          chooseDue("");
                          setProjectFilter("");
                        }}
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                )}
                {taskView ? (
                  <>
                    {filteredTasks.length || view === "board" ? (
                      <TaskCollection
                        tasks={filteredTasks}
                        view={view}
                        today={today}
                        busy={acting}
                        edit={(item) => setModal({ kind: "task", item })}
                        remove={(item) =>
                          setDeleteTarget({ kind: "task", item })
                        }
                        changeStatus={changeStatus}
                        create={(status) =>
                          setModal({
                            kind: allProjects.length ? "task" : "project",
                            status,
                          })
                        }
                      />
                    ) : (
                      <Empty
                        title={
                          search || status || priority || due || projectFilter
                            ? "No tasks match this view."
                            : "Your next step starts here."
                        }
                        body={
                          search || status || priority || due || projectFilter
                            ? "Try a different filter, or clear them to see every task."
                            : allProjects.length
                              ? "Add a task, set a deadline, and keep your work moving."
                              : "Create a project to start organizing your tasks."
                        }
                        action={
                          <button
                            className="primary"
                            onClick={() =>
                              setModal({
                                kind: allProjects.length ? "task" : "project",
                              })
                            }
                          >
                            {allProjects.length
                              ? "Add a task"
                              : "Create a project"}
                            <Plus size={16} />
                          </button>
                        }
                      />
                    )}
                  </>
                ) : (
                  <div className="project-grid">
                    {(overview
                      ? filteredProjects.slice(0, 6)
                      : filteredProjects
                    ).map((p, i) => {
                      const pt = allTasks.filter((t) => t.project_id === p.id);
                      const percent = progress(pt);
                      return (
                        <article className="project-card" key={p.id}>
                          <div className="card-top">
                            <FolderOpen size={21} strokeWidth={1.5} />
                            <span className="status-pill">{p.status}</span>
                          </div>
                          <Link
                            href={`/projects/${p.id}`}
                            className="project-title"
                          >
                            <h3>{p.name}</h3>
                            <ArrowUpRight size={26} />
                          </Link>
                          <p className="description">
                            {p.description || "Every project starts somewhere."}
                          </p>
                          <div className="progress-meta">
                            <span>
                              {
                                pt.filter((t) => t.status === "Completed")
                                  .length
                              }{" "}
                              of {pt.length} tasks complete
                            </span>
                            <span>{percent}%</span>
                          </div>
                          <progress
                            value={percent}
                            max={100}
                            aria-label={`${p.name} progress`}
                          />
                          <div className="card-footer">
                            <span>Due {dateLabel(p.end_date)}</span>
                            <button
                              className="icon-button"
                              aria-label={`Edit ${p.name}`}
                              onClick={() =>
                                setModal({ kind: "project", item: p })
                              }
                            >
                              <MoreHorizontal size={20} />
                            </button>
                          </div>
                        </article>
                      );
                    })}
                    {!filteredProjects.length && (
                      <Empty
                        title={
                          search || status
                            ? "Nothing here yet."
                            : "Good work starts with an idea."
                        }
                        body={
                          search || status
                            ? "Try a different search or status."
                            : "Create your first project. Break it into tasks. Make it happen."
                        }
                        action={
                          <button
                            className="primary"
                            onClick={() => setModal({ kind: "project" })}
                          >
                            Create a project <ArrowUpRight size={18} />
                          </button>
                        }
                      />
                    )}
                  </div>
                )}
              </>
            )}
            {overview && (
              <div className="closing-note">
                <span>ONE THING AT A TIME.</span>
                <p>
                  Progress is a collection
                  <br />
                  of small beginnings.
                </p>
                <Link href="/tasks">
                  Find your next step <ArrowRight size={18} />
                </Link>
              </div>
            )}
          </>
        )}
      </main>
      <footer className="page-footer">
        <span>DAYMARK</span>
        <span>MADE FOR MAKING PROGRESS.</span>
      </footer>
      <div className="toast-region" role="status" aria-live="polite">
        {toast && (
          <div className="toast">
            <Check size={18} />
            <span>{toast}</span>
            <button
              className="icon-button"
              aria-label="Dismiss notification"
              onClick={() => setToast("")}
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>
      {modal && (
        <Editor
          kind={modal.kind}
          item={modal.item}
          projects={allProjects}
          projectId={selectedId || projectFilter || undefined}
          defaultStatus={modal.status}
          close={() => setModal(null)}
          saved={async () => {
            await reload();
            setToast(
              `${modal.kind === "project" ? "Project" : "Task"} ${modal.item ? "updated" : "created"}.`,
            );
          }}
        />
      )}
      {deleteTarget && (
        <Dialog
          title={`Delete ${deleteTarget.kind}?`}
          close={() => setDeleteTarget(null)}
        >
          <p>
            “{deleteTarget.item.name}” will be permanently deleted.
            {deleteTarget.kind === "project"
              ? " All of its tasks will also be deleted."
              : ""}
          </p>
          {actionError && <Message>{actionError}</Message>}
          <div className="form-actions">
            <button onClick={() => setDeleteTarget(null)}>Keep it</button>
            <button className="primary" onClick={remove} disabled={acting}>
              {acting ? "Deleting…" : "Delete permanently"}
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}

function Dialog({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const dialog = ref.current;
    dialog?.showModal();
    dialog?.querySelector<HTMLElement>("input, textarea, select")?.focus();
    return () => {
      dialog?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      aria-labelledby="dialog-title"
    >
      <div className="dialog-head">
        <h2 id="dialog-title">{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={close}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function Editor({
  kind,
  item,
  projects,
  projectId,
  defaultStatus,
  close,
  saved,
}: {
  kind: "project" | "task";
  item?: Project | Task;
  projects: Project[];
  projectId?: string;
  defaultStatus?: Task["status"];
  close: () => void;
  saved: () => Promise<unknown>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const p = item as Project | undefined;
  const t = item as Task | undefined;
  const today = localDay();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    const schema =
      kind === "project" ? projectSchema : item ? taskSchema : createTaskSchema;
    const parsed = schema.safeParse(f);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api(`/${kind}s${item ? "/" + item.id : ""}`, {
        method: item ? "PUT" : "POST",
        body: JSON.stringify(parsed.data),
      });
      await saved();
      close();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title={`${item ? "Edit" : "New"} ${kind}`}
      close={() => {
        if (!busy) close();
      }}
    >
      {kind === "task" && !projects.length ? (
        <Empty
          title="First, a project."
          body="Create a project before adding its tasks."
        />
      ) : (
        <form onSubmit={submit}>
          <label>
            {kind === "project" ? "Project" : "Task"} name
            <input
              name="name"
              defaultValue={item?.name}
              required
              maxLength={120}
              autoFocus
              placeholder="Give it a name"
            />
          </label>
          <label>
            Description
            <textarea
              name="description"
              defaultValue={item?.description}
              rows={3}
              maxLength={4000}
              placeholder="A little context goes a long way."
            />
          </label>
          {kind === "task" && !item && (
            <label>
              Project
              <select
                name="project_id"
                defaultValue={projectId ?? projects[0]?.id}
              >
                {projects.map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="form-grid">
            <label>
              Status
              <select
                name="status"
                defaultValue={
                  item?.status ??
                  (kind === "project"
                    ? "Not Started"
                    : (defaultStatus ?? "Pending"))
                }
              >
                {(kind === "project" ? projectStatuses : taskStatuses).map(
                  (s) => (
                    <option key={s}>{s}</option>
                  ),
                )}
              </select>
            </label>
            {kind === "task" && (
              <label>
                Priority
                <select name="priority" defaultValue={t?.priority ?? "Medium"}>
                  {priorities.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <div className="form-grid">
            {kind === "project" ? (
              <>
                <label>
                  Start date
                  <input
                    type="date"
                    name="start_date"
                    defaultValue={p?.start_date ?? today}
                    required
                  />
                </label>
                <label>
                  End date
                  <input
                    type="date"
                    name="end_date"
                    defaultValue={p?.end_date ?? today}
                    required
                  />
                </label>
              </>
            ) : (
              <label>
                Due date
                <input
                  type="date"
                  name="due_date"
                  defaultValue={t?.due_date ?? today}
                  required
                />
              </label>
            )}
          </div>
          {item && (
            <p className="small">Created {dateLabel(item.created_at)}</p>
          )}
          {error && <Message>{error}</Message>}
          <div className="form-actions">
            <button type="button" disabled={busy} onClick={close}>
              Cancel
            </button>
            <button className="primary" disabled={busy}>
              {busy ? "Saving…" : item ? "Save changes" : `Create ${kind}`}
              <ArrowUpRight size={18} />
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
