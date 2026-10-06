import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "../src/session";
import { Button, Card, Choices, Field, s, colors } from "../src/ui";
import {
  registerSchema,
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
          <Text style={s.eyebrow}>DAYMARK</Text>
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
            {message && <Button onPress={retry}>Retry connection</Button>}
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
function Work() {
  const { user, api, logout } = useSession();
  const [tab, setTab] = useState("Overview");
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
  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [p, t, d] = await Promise.all([
        api<Project[]>("/projects"),
        api<Task[]>("/tasks"),
        api<Dashboard>("/dashboard"),
      ]);
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
      setRefreshing(false);
    }
  }, [api]);
  useEffect(() => {
    void load();
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") void load();
    });
    return () => listener.remove();
  }, [load]);
  const go = (value: string) => {
    setTab(value);
    setSelected(null);
    setSearch("");
    setStatus("");
    setPriority("");
  };
  const taskView = tab === "Tasks" || Boolean(selected);
  async function complete(t: Task) {
    setBusy(true);
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
        <Text style={{ fontSize: 25, fontWeight: "700" }}>
          p<Text style={{ color: colors.coral }}>m</Text>
        </Text>
        <Text style={s.eyebrow}>PERSONAL WORKSPACE</Text>
      </View>
      <ScrollView
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
            `Welcome back, ${user?.fullName.split(" ")[0] ?? "there"}.`}
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
            {[
              ["Total Projects", stats?.totalProjects],
              ["Total Tasks", stats?.totalTasks],
              ["Completed Tasks", stats?.completedTasks],
              ["Pending Tasks", stats?.pendingTasks],
              ["Projects In Progress", stats?.projectsInProgress],
            ].map(([name, value]) => (
              <Card key={String(name)}>
                <View style={s.row}>
                  <Text>{name}</Text>
                  <Text style={s.title}>{value ?? "..."}</Text>
                </View>
              </Card>
            ))}
            <Button primary onPress={() => go("Projects")}>
              Explore your projects ↗
            </Button>
          </>
        )}
        {tab === "Account" && (
          <Card>
            <Text style={s.itemTitle}>{user?.fullName}</Text>
            <Text>{user?.email}</Text>
            <Text style={s.small}>
              The same account connects your web and mobile workspace.
            </Text>
            <Button onPress={logout}>Sign out</Button>
          </Card>
        )}
        {(tab === "Projects" || tab === "Tasks") && (
          <>
            <Field
              label={`Search ${taskView ? "tasks" : "projects"}`}
              value={search}
              onChangeText={setSearch}
              placeholder="Find something…"
            />
            <Choices
              label="Status"
              values={["", ...(taskView ? taskStatuses : projectStatuses)]}
              value={status}
              onChange={setStatus}
            />
            {taskView && (
              <>
                <Choices
                  label="Priority"
                  values={["", ...priorities]}
                  value={priority}
                  onChange={setPriority}
                />
                <Button primary onPress={() => setEditor({})}>
                  ＋ New task
                </Button>
              </>
            )}
            {selected && (
              <Card>
                <Text>{selected.status}</Text>
                <Text style={s.small}>
                  {selected.start_date} to {selected.end_date}
                </Text>
                <Text style={s.small}>
                  Created {selected.created_at.slice(0, 10)}
                </Text>
              </Card>
            )}
            {taskView
              ? shownTasks.map((t) => (
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
                      <Button disabled={busy} onPress={() => complete(t)}>
                        {t.status === "Completed" ? "Reopen" : "Complete"}
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
                  .map((p) => (
                    <Card key={p.id}>
                      <Text style={s.eyebrow}>{p.status.toUpperCase()}</Text>
                      <Text style={s.itemTitle}>{p.name}</Text>
                      <Text style={s.subtitle}>{p.description}</Text>
                      <Text style={s.small}>Due {p.end_date}</Text>
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
            {taskView && !shownTasks.length && (
              <Text style={s.subtitle}>
                No tasks here yet. Add one or adjust your filters.
              </Text>
            )}
            {!taskView && !projects.length && (
              <Text style={s.subtitle}>
                Create your first project in the web app, then pull to refresh.
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
  const [due, setDue] = useState(
    task?.due_date ?? new Date().toLocaleDateString("en-CA"),
  );
  const [project, setProject] = useState(projectId ?? projects[0]?.id ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
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
      await saved();
      close();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal visible animationType="none" onRequestClose={close}>
      <SafeAreaView style={s.screen}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.content}
          >
            <View style={s.row}>
              <Text style={s.title}>{task ? "Edit task" : "New task"}</Text>
              <Button onPress={close}>Close</Button>
            </View>
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
              <>
                <Text style={s.label}>Project</Text>
                {projects.map((p) => (
                  <Button
                    primary={project === p.id}
                    key={p.id}
                    onPress={() => setProject(p.id)}
                  >
                    {p.name}
                  </Button>
                ))}
              </>
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
            <Field
              label="Due date (YYYY-MM-DD)"
              value={due}
              onChangeText={setDue}
              placeholder="2026-10-20"
            />
            {task && (
              <Text style={s.small}>
                Created {task.created_at.slice(0, 10)}
              </Text>
            )}
            {error && (
              <Text style={s.error} accessibilityRole="alert">
                {error}
              </Text>
            )}
            <Button
              primary
              disabled={busy || !projects.length}
              onPress={submit}
            >
              {busy ? "Saving…" : "Save task"}
            </Button>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
