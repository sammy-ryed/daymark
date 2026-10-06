import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  useWindowDimensions,
  Alert,
  AppState,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "../src/session";
import {
  confirmDiscard,
  Button,
  Card,
  Choices,
  Field,
  Brand,
  DateField,
  Sheet,
  localDate,
  rem,
  s,
  colors,
} from "../src/ui";
import {
  registerSchema,
  projectSchema,
  credentialsSchema,
  taskSchema,
  createTaskSchema,
  taskStatuses,
  projectStatuses,
  priorities,
  type AuthResponse,
  type Project,
  type Task,
  type Dashboard,
  type Profile,
} from "@project/contracts";

export default function Home() {
  const session = useSession();
  if (session.loading)
    return (
      <SafeAreaView style={s.screen}>
        <View style={s.content}>
          <ActivityIndicator color={colors.ink} />
          <Text>Opening your workspace…</Text>
        </View>
      </SafeAreaView>
    );
  return session.user ? <Work key={session.user.id} /> : <Auth />;
}
function Auth() {
  const { api, authenticate, message, retry } = useSession();
  const [register, setRegister] = useState(false);
  const [fullName, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    const parsed = (register ? registerSchema : credentialsSchema).safeParse({
      email,
      password,
      ...(register ? { fullName } : {}),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await authenticate(
        await api<AuthResponse>(`/auth/${register ? "register" : "login"}`, {
          method: "POST",
          body: JSON.stringify(parsed.data),
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <SafeAreaView style={s.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.content}
        >
          <Brand />
          <Text style={[s.title, { fontSize: 52 }]}>
            Your work.{`\n`}In focus
            <Text style={{ color: colors.coral }}>.</Text>
          </Text>
          <Text style={s.subtitle}>One place for every project and task.</Text>
          <Card>
            <Text style={s.itemTitle}>
              {register ? "Start something." : "Welcome back."}
            </Text>
            {register && (
              <Field
                label="Full name"
                value={fullName}
                onChangeText={setName}
                autoComplete="name"
              />
            )}
            <Field
              label="Email address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete={register ? "new-password" : "current-password"}
            />
            {error ? (
              <Text accessibilityRole="alert" style={s.error}>
                {error}
              </Text>
            ) : null}
            {message ? <Text style={s.error}>{message}</Text> : null}
            <Button primary disabled={busy} onPress={submit}>
              {busy ? "Please wait…" : register ? "Create account" : "Sign in"}
            </Button>
            <Button
              onPress={() => {
                setRegister(!register);
                setError("");
              }}
            >
              {register ? "Already registered? Sign in" : "Create an account"}
            </Button>
            {!register && (
              <Button
                onPress={() =>
                  Linking.openURL(
                    "https://daymark-by-sammy.vercel.app/forgot-password",
                  ).catch(() =>
                    setError(
                      "Could not open your browser. Visit the Daymark website to reset your password.",
                    ),
                  )
                }
              >
                Forgot password?
              </Button>
            )}
            {message && <Button onPress={retry}>Retry connection</Button>}
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
function Work() {
  const { user, api, logout } = useSession();
  const { width, fontScale } = useWindowDimensions();
  const lastLoaded = useRef(0);
  const loadingRequest = useRef(false);
  const [projectEditor, setProjectEditor] = useState<{
    project?: Project;
  } | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(30);
  const [tab, setTab] = useState("Overview");
  const accountLeave = useRef<((leave: () => void) => void) | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<Dashboard | null>(null);
  const [selected, setSelected] = useState<Project | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [editor, setEditor] = useState<{ task?: Task } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(
    () => setVisibleCount(30),
    [tab, selected?.id, search, status, priority],
  );
  const load = useCallback(async () => {
    if (loadingRequest.current) return;
    loadingRequest.current = true;
    setRefreshing(true);
    try {
      const {
        projects: p,
        tasks: t,
        dashboard: d,
      } = await api<{
        projects: Project[];
        tasks: Task[];
        dashboard: Dashboard;
      }>("/workspace");
      lastLoaded.current = Date.now();
      setProjects(p);
      setTasks(t);
      setStats(d);
      setError("");
      setSelected((old) =>
        old ? (p.find((v) => v.id === old.id) ?? null) : null,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      loadingRequest.current = false;
      setRefreshing(false);
    }
  }, [api]);
  useEffect(() => {
    void load();
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active" && Date.now() - lastLoaded.current > 60000)
        void load();
    });
    return () => listener.remove();
  }, [load]);
  const go = (value: string) => {
    if (value === tab && !selected) return;
    const leave = () => {
      setTab(value);
      setFiltersOpen(false);
      setSelected(null);
      setSearch("");
      setStatus("");
      setPriority("");
    };
    if (tab === "Account" && accountLeave.current) accountLeave.current(leave);
    else leave();
  };
  useEffect(() => {
    const back = BackHandler.addEventListener("hardwareBackPress", () => {
      if (tab === "Account") {
        go("Overview");
        return true;
      }
      if (selected) {
        setSelected(null);
        return true;
      }
      return false;
    });
    return () => back.remove();
  }, [tab, selected]);
  const taskView = tab === "Tasks" || Boolean(selected);
  async function complete(t: Task) {
    setBusy(true);
    const previous = tasks;
    const nextStatus = t.status === "Completed" ? "Pending" : "Completed";
    setTasks((items) =>
      items.map((item) =>
        item.id === t.id ? { ...item, status: nextStatus } : item,
      ),
    );
    try {
      await api(`/tasks/${t.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...taskSchema.parse(tBody(t)),
          status: t.status === "Completed" ? "Pending" : "Completed",
        }),
      });
      await load();
    } catch (e) {
      setTasks(previous);
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function remove(t: Task) {
    Alert.alert("Delete task?", `“${t.name}” will be permanently deleted.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          setBusy(true);
          api(`/tasks/${t.id}`, { method: "DELETE" })
            .then(load)
            .catch((e) => setError(e.message))
            .finally(() => setBusy(false));
        },
      },
    ]);
  }
  const shownTasks = tasks.filter(
    (t) =>
      (!selected || t.project_id === selected.id) &&
      t.name.toLowerCase().includes(search.toLowerCase()) &&
      (!status || t.status === status) &&
      (!priority || t.priority === priority),
  );
  return (
    <SafeAreaView style={s.screen}>
      <View
        style={[
          s.row,
          { padding: 16, borderBottomWidth: 1, borderBottomColor: colors.line },
        ]}
      >
        <Brand />
        <Text style={s.small}>Your workspace</Text>
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={load}
            tintColor={colors.ink}
          />
        }
      >
        {selected && (
          <Button
            onPress={() => {
              setSelected(null);
              setStatus("");
            }}
          >
            ← All projects
          </Button>
        )}
        <Text style={s.title}>{selected?.name ?? `${tab}.`}</Text>
        <Text style={s.subtitle}>
          {selected?.description ??
            (tab === "Overview"
              ? `Welcome back, ${user?.fullName.split(" ")[0] || "there"}.`
              : tab === "Projects"
                ? "Make room for your next idea."
                : tab === "Tasks"
                  ? "One small step at a time."
                  : "Make Daymark yours.")}
        </Text>
        {error ? (
          <>
            <Text style={s.error} accessibilityRole="alert">
              {error}
            </Text>
            <Button onPress={load}>Try again</Button>
          </>
        ) : null}
        {tab === "Overview" && (
          <>
            <View style={s.wrap}>
              {[
                ["Projects", stats?.totalProjects],
                [
                  "Open tasks",
                  tasks.filter((t) => t.status !== "Completed").length,
                ],
                ["Completed", stats?.completedTasks],
                ["In progress", stats?.projectsInProgress],
              ].map(([label, value]) => (
                <View
                  key={String(label)}
                  style={[
                    s.metric,
                    (width < 350 || fontScale > 1.3) && { flexBasis: "100%" },
                  ]}
                >
                  <Text style={s.small}>{label}</Text>
                  <Text style={s.metricNumber}>{stats ? value : "..."}</Text>
                </View>
              ))}
            </View>
            <View style={s.row}>
              <Text style={s.itemTitle}>Up next</Text>
              <Button onPress={() => go("Tasks")}>All tasks</Button>
            </View>
            {tasks
              .filter((t) => t.status !== "Completed")
              .sort((a, b) => a.due_date.localeCompare(b.due_date))
              .slice(0, 3)
              .map((t) => (
                <Card key={t.id}>
                  <Text style={s.eyebrow}>
                    {t.due_date < localDate()
                      ? "OVERDUE"
                      : t.due_date === localDate()
                        ? "DUE TODAY"
                        : "COMING UP"}
                  </Text>
                  <Text style={s.itemTitle}>{t.name}</Text>
                  <Text style={s.small}>
                    {t.projects?.name} · {t.due_date}
                  </Text>
                  <Button primary disabled={busy} onPress={() => complete(t)}>
                    Mark done
                  </Button>
                </Card>
              ))}
            {stats && !tasks.some((t) => t.status !== "Completed") && (
              <Card>
                <Text style={s.itemTitle}>A little breathing room.</Text>
                <Text style={s.subtitle}>
                  You're all caught up. Start a task when you're ready.
                </Text>
              </Card>
            )}
            <View style={s.wrap}>
              <Button
                primary
                onPress={() =>
                  projects.length ? setEditor({}) : setProjectEditor({})
                }
              >
                {projects.length ? "New task" : "Create first project"}
              </Button>
              <Button onPress={() => go("Projects")}>View projects</Button>
            </View>
          </>
        )}
        {tab === "Account" && <Account leaveRef={accountLeave} />}
        {(tab === "Projects" || tab === "Tasks") && (
          <>
            <Field
              label={`Search ${taskView ? "tasks" : "projects"}`}
              value={search}
              onChangeText={setSearch}
              placeholder="Find something…"
            />
            <Button onPress={() => setFiltersOpen(!filtersOpen)}>
              {filtersOpen
                ? "Hide filters"
                : `Filters${status || priority ? " (active)" : ""}`}
            </Button>
            {filtersOpen && (status || priority) && (
              <Button
                onPress={() => {
                  setStatus("");
                  setPriority("");
                }}
              >
                Clear filters
              </Button>
            )}
            {filtersOpen && (
              <Choices
                label="Status"
                values={["", ...(taskView ? taskStatuses : projectStatuses)]}
                value={status}
                onChange={setStatus}
              />
            )}
            {taskView && (
              <>
                {filtersOpen && (
                  <Choices
                    label="Priority"
                    values={["", ...priorities]}
                    value={priority}
                    onChange={setPriority}
                  />
                )}
                <Button
                  primary
                  onPress={() =>
                    projects.length ? setEditor({}) : setProjectEditor({})
                  }
                >
                  ＋ New task
                </Button>
              </>
            )}
            {!taskView && (
              <Button primary onPress={() => setProjectEditor({})}>
                New project
              </Button>
            )}
            {selected && (
              <Card>
                <Text>{selected.status}</Text>
                <Button onPress={() => setProjectEditor({ project: selected })}>
                  Edit project
                </Button>
                <Text style={s.small}>
                  {selected.start_date} to {selected.end_date}
                </Text>
                <Text style={s.small}>
                  Created {selected.created_at.slice(0, 10)}
                </Text>
              </Card>
            )}
            {taskView
              ? shownTasks.slice(0, visibleCount).map((t) => (
                  <Card key={t.id}>
                    <Text style={s.itemTitle}>{t.name}</Text>
                    <Text style={s.subtitle}>{t.description}</Text>
                    <Text style={s.small}>
                      {t.projects?.name} · Due {t.due_date}
                    </Text>
                    <Text style={s.small}>
                      {t.status} / {t.priority} priority
                    </Text>
                    <View style={s.wrap}>
                      <Button
                        primary={t.status !== "Completed"}
                        disabled={busy}
                        onPress={() => complete(t)}
                      >
                        {t.status === "Completed" ? "Reopen task" : "Mark done"}
                      </Button>
                      <Button onPress={() => setEditor({ task: t })}>
                        Edit
                      </Button>
                      <Button disabled={busy} onPress={() => remove(t)}>
                        Delete
                      </Button>
                    </View>
                  </Card>
                ))
              : projects
                  .filter(
                    (p) =>
                      p.name.toLowerCase().includes(search.toLowerCase()) &&
                      (!status || p.status === status),
                  )
                  .slice(0, visibleCount)
                  .map((p) => (
                    <Card key={p.id}>
                      <Text style={s.eyebrow}>{p.status.toUpperCase()}</Text>
                      <Text style={s.itemTitle}>{p.name}</Text>
                      <Text style={s.subtitle}>{p.description}</Text>
                      <Text style={s.small}>Due {p.end_date}</Text>
                      <ProjectProgress
                        tasks={tasks.filter((t) => t.project_id === p.id)}
                      />
                      <Button
                        onPress={() => {
                          setSelected(p);
                          setSearch("");
                          setStatus("");
                        }}
                      >
                        View project ↗
                      </Button>
                    </Card>
                  ))}
            {(taskView
              ? shownTasks.length
              : projects.filter(
                  (p) =>
                    p.name.toLowerCase().includes(search.toLowerCase()) &&
                    (!status || p.status === status),
                ).length) > visibleCount && (
              <Button onPress={() => setVisibleCount((v) => v + 30)}>
                Show more
              </Button>
            )}
            {taskView && !shownTasks.length && !refreshing && (
              <Text style={s.subtitle}>
                No tasks here yet. Add one or adjust your filters.
              </Text>
            )}
            {!taskView &&
              !projects.filter(
                (p) =>
                  p.name.toLowerCase().includes(search.toLowerCase()) &&
                  (!status || p.status === status),
              ).length && (
                <Text style={s.subtitle}>
                  No projects match. Create a project or clear your filters.
                </Text>
              )}
          </>
        )}
      </ScrollView>
      <View
        style={[
          s.row,
          { padding: 8, borderTopWidth: 1, borderTopColor: colors.line },
        ]}
      >
        {["Overview", "Projects", "Tasks", "Account"].map((v) => (
          <Button compact key={v} primary={tab === v} onPress={() => go(v)}>
            {v}
          </Button>
        ))}
      </View>
      {projectEditor && (
        <ProjectEditor
          project={projectEditor.project}
          close={() => setProjectEditor(null)}
          saved={load}
        />
      )}
      {editor && (
        <TaskEditor
          task={editor.task}
          projects={projects}
          projectId={selected?.id}
          close={() => setEditor(null)}
          saved={load}
        />
      )}
    </SafeAreaView>
  );
}
const tBody = (t: Task) => ({
  name: t.name,
  description: t.description,
  status: t.status,
  priority: t.priority,
  due_date: t.due_date,
});
function TaskEditor({
  task,
  projects,
  projectId,
  close,
  saved,
}: {
  task?: Task;
  projects: Project[];
  projectId?: string;
  close: () => void;
  saved: () => Promise<void>;
}) {
  const { api } = useSession();
  const [name, setName] = useState(task?.name ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [status, setStatus] = useState(task?.status ?? "Pending");
  const [priority, setPriority] = useState(task?.priority ?? "Medium");
  const [due, setDue] = useState(task?.due_date ?? localDate());
  const [project, setProject] = useState(projectId ?? projects[0]?.id ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const initial = useRef(
    JSON.stringify({ name, description, status, priority, due, project }),
  );
  const dirty =
    JSON.stringify({ name, description, status, priority, due, project }) !==
    initial.current;
  async function submit() {
    const parsed = (task ? taskSchema : createTaskSchema).safeParse({
      name,
      description,
      status,
      priority,
      due_date: due,
      ...(!task ? { project_id: project } : {}),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      await api(`/tasks${task ? "/" + task.id : ""}`, {
        method: task ? "PUT" : "POST",
        body: JSON.stringify(parsed.data),
      });
      close();
      void saved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Sheet
      title={task ? "Edit task" : "New task"}
      dirty={dirty}
      busy={busy}
      close={close}
      footer={
        <Button primary disabled={busy || !projects.length} onPress={submit}>
          {busy ? "Saving..." : "Save task"}
        </Button>
      }
    >
      <Field
        label="Task name"
        value={name}
        onChangeText={setName}
        maxLength={120}
      />
      <Field
        label="Description"
        value={description}
        onChangeText={setDescription}
        multiline
        maxLength={4000}
      />
      {!task && (
        <Choices
          label="Project"
          values={projects.map((p) => p.id)}
          labels={Object.fromEntries(projects.map((p) => [p.id, p.name]))}
          value={project}
          onChange={setProject}
        />
      )}
      <Choices
        label="Status"
        values={taskStatuses}
        value={status}
        onChange={(v) => setStatus(v as typeof status)}
      />
      <Choices
        label="Priority"
        values={priorities}
        value={priority}
        onChange={(v) => setPriority(v as typeof priority)}
      />
      <DateField label="Due date" value={due} onChange={setDue} />
      {task && (
        <Text style={s.small}>Created {task.created_at.slice(0, 10)}</Text>
      )}
      {error && (
        <Text style={s.error} accessibilityRole="alert">
          {error}
        </Text>
      )}
    </Sheet>
  );
}
function ProjectProgress({ tasks }: { tasks: Task[] }) {
  const done = tasks.filter((t) => t.status === "Completed").length;
  const value = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  return (
    <View style={{ gap: rem(0.5) }}>
      <Text style={s.small}>
        {done} of {tasks.length} tasks completed
      </Text>
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: value }}
        style={s.progressTrack}
      >
        <View
          style={{
            height: "100%",
            width: `${value}%`,
            backgroundColor: colors.coral,
          }}
        />
      </View>
    </View>
  );
}
function Account({
  leaveRef,
}: {
  leaveRef: React.RefObject<((leave: () => void) => void) | null>;
}) {
  const { user, api, logout, updateProfile } = useSession();
  const [name, setName] = useState(user?.fullName ?? "");
  const isDirty = name !== (user?.fullName ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    leaveRef.current = (leave) => {
      if (!busy) confirmDiscard(isDirty, leave);
    };
    return () => {
      leaveRef.current = null;
    };
  }, [isDirty, busy, leaveRef]);
  async function save() {
    const parsed = registerSchema
      .pick({ fullName: true })
      .safeParse({ fullName: name });
    if (!parsed.success) {
      setMessage(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const profile = await api<Profile>("/auth/profile", {
        method: "PATCH",
        body: JSON.stringify(parsed.data),
      });
      updateProfile(profile);
      setMessage("Profile saved.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Card>
        <Text style={s.eyebrow}>YOUR PROFILE</Text>
        <Field
          label="Display name"
          value={name}
          onChangeText={setName}
          maxLength={120}
          autoComplete="name"
        />
        <Text style={s.label}>Email address</Text>
        <Text selectable style={s.subtitle}>
          {user?.email}
        </Text>
        <Text style={s.small}>
          Changes appear on your phone and the Daymark website.
        </Text>
        {message && (
          <Text accessibilityLiveRegion="polite" style={s.subtitle}>
            {message}
          </Text>
        )}
        <Button primary disabled={busy} onPress={save}>
          {busy ? "Saving..." : "Save profile"}
        </Button>
      </Card>
      <Card>
        <Text style={s.itemTitle}>Account & security</Text>
        <Button
          onPress={() =>
            Linking.openURL(
              "https://daymark-by-sammy.vercel.app/forgot-password",
            ).catch(() =>
              setMessage("Open the Daymark website to reset your password."),
            )
          }
        >
          Reset password
        </Button>
        <Button
          onPress={() =>
            Alert.alert(
              "Sign out of Daymark?",
              "Your work is saved to your account.",
              [
                { text: "Stay here", style: "cancel" },
                {
                  text: "Sign out",
                  onPress: () => confirmDiscard(isDirty, () => void logout()),
                },
              ],
            )
          }
        >
          Sign out
        </Button>
      </Card>
    </>
  );
}
function ProjectEditor({
  project,
  close,
  saved,
}: {
  project?: Project;
  close: () => void;
  saved: () => Promise<void>;
}) {
  const { api } = useSession();
  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [status, setStatus] = useState(project?.status ?? "Not Started");
  const [start, setStart] = useState(project?.start_date ?? localDate());
  const [end, setEnd] = useState(project?.end_date ?? localDate());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const initial = useRef(
    JSON.stringify({ name, description, status, start, end }),
  );
  const dirty =
    JSON.stringify({ name, description, status, start, end }) !==
    initial.current;
  async function save() {
    const parsed = projectSchema.safeParse({
      name,
      description,
      status,
      start_date: start,
      end_date: end,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api(`/projects${project ? "/" + project.id : ""}`, {
        method: project ? "PUT" : "POST",
        body: JSON.stringify(parsed.data),
      });
      close();
      void saved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Sheet
      title={project ? "Edit project" : "New project"}
      dirty={dirty}
      busy={busy}
      close={close}
      footer={
        <Button primary disabled={busy} onPress={save}>
          {busy ? "Saving..." : project ? "Save changes" : "Create project"}
        </Button>
      }
    >
      <Text style={s.subtitle}>Give your work a place to start.</Text>
      <Field
        label="Project name"
        value={name}
        onChangeText={setName}
        maxLength={120}
        placeholder="What are you working on?"
      />
      <Field
        label="Description"
        value={description}
        onChangeText={setDescription}
        multiline
        maxLength={4000}
        placeholder="Goals, context, or a few useful details"
      />
      <Choices
        label="Status"
        values={projectStatuses}
        value={status}
        onChange={(v) => setStatus(v as typeof status)}
      />
      <DateField label="Start date" value={start} onChange={setStart} />
      <DateField label="End date" value={end} onChange={setEnd} />
      {error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
    </Sheet>
  );
}
