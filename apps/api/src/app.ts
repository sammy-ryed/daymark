import { requestQuery } from "./request-query";
import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import {
  createClient,
  type SupabaseClient,
  type User,
  type Session,
} from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { z, ZodError } from "zod";
import {
  credentialsSchema,
  registerSchema,
  projectSchema,
  taskSchema,
  createTaskSchema,
  projectFilterSchema,
  taskFilterSchema,
} from "@project/contracts";

type Config = {
  url: string;
  key: string;
  webOrigin: string;
  production?: boolean;
  vercelProxy?: boolean;
};
class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
declare global {
  namespace Express {
    interface Request {
      db: SupabaseClient;
      user: User;
      token: string;
    }
  }
}
type AuthRequest = Request;
const safeUser = (user: User) => ({
  id: user.id,
  email: user.email ?? "",
  fullName: String(user.user_metadata?.full_name ?? ""),
});
const cookieName = "project_session";
const refreshCookieName = "project_refresh";
const projectColumns =
  "id,owner_id,name,description,status,start_date,end_date,created_at,updated_at";
const taskColumns =
  "id,project_id,name,description,status,priority,due_date,created_at,updated_at,projects(name)";

export function createApp(config: Config) {
  const app = express();
  if (config.vercelProxy) app.set("trust proxy", 1);
  const configured = Boolean(config.url && config.key);
  const client = (token?: string) =>
    createClient(config.url, config.key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      ...(token
        ? { global: { headers: { Authorization: `Bearer ${token}` } } }
        : {}),
    });
  const cookieOptions = {
    httpOnly: true,
    secure: Boolean(config.production),
    sameSite: "lax" as const,
    path: "/api",
  };
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin: config.webOrigin,
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization", "X-Project-Client"],
    }),
  );
  app.use(express.json({ limit: "32kb" }), cookieParser());
  app.use((req, res, next) => {
    const id = randomUUID();
    res.setHeader("X-Request-ID", id);
    res.setHeader("Cache-Control", "no-store");
    const start = Date.now();
    res.on("finish", () =>
      console.info(
        JSON.stringify({
          requestId: id,
          method: req.method,
          path: req.path,
          status: res.statusCode,
          durationMs: Date.now() - start,
        }),
      ),
    );
    next();
  });
  app.get("/api/health", (_req, res) => res.json({ status: "ok", configured }));
  app.use("/api", (req, _res, next) => {
    if (!configured)
      return next(
        new HttpError(
          503,
          "Supabase is not connected yet. Complete the server setup to continue.",
        ),
      );
    // Cookie-authenticated writes require a same-origin custom header plus a trusted Origin.
    // Mobile bearer requests do not rely on ambient cookies.
    const nativeRequest =
      !req.get("origin") &&
      req.get("X-Project-Client") === "mobile" &&
      !req.cookies[cookieName];
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      !req.headers.authorization &&
      !nativeRequest
    ) {
      if (
        req.get("origin") !== config.webOrigin ||
        req.get("X-Project-Client") !== "web"
      )
        return next(new HttpError(403, "This request origin is not allowed."));
    }
    next();
  });
  app.use(
    "/api/auth",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 30,
      skip: (req) => req.method === "GET",
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: {
        message: "Too many authentication attempts. Please try again later.",
      },
    }),
  );
  const issue = (
    req: Request,
    res: Response,
    session: Session | null,
    user: User | null,
  ) => {
    if (!session || !user)
      return res.status(202).json({
        message: "Check your email to confirm your account, then sign in.",
      });
    if (req.get("X-Project-Client") === "mobile")
      return res.json({
        user: safeUser(user),
        accessToken: session.access_token,
        expiresAt: session.expires_at,
      });
    res.cookie(cookieName, session.access_token, {
      ...cookieOptions,
      maxAge: session.expires_in * 1000,
    });
    res.cookie(refreshCookieName, session.refresh_token, {
      ...cookieOptions,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    return res.json({ user: safeUser(user) });
  };
  app.post("/api/auth/register", async (req, res) => {
    const values = registerSchema.parse(req.body);
    const { data, error } = await client().auth.signUp({
      email: values.email,
      password: values.password,
      options: { data: { full_name: values.fullName } },
    });
    if (error)
      throw new HttpError(
        error.status === 429 ? 429 : 400,
        "Unable to register. Check your details or try signing in.",
      );
    res.status(201);
    issue(req, res, data.session, data.user);
  });
  app.post("/api/auth/login", async (req, res) => {
    const values = credentialsSchema.parse(req.body);
    const { data, error } = await client().auth.signInWithPassword(values);
    if (error)
      throw new HttpError(
        error.status === 429 ? 429 : 401,
        "Sign-in failed. Check your email, password, and email confirmation.",
      );
    issue(req, res, data.session, data.user);
  });
  app.post("/api/auth/forgot-password", async (req, res) => {
    const { email } = credentialsSchema.pick({ email: true }).parse(req.body);
    const { error } = await client().auth.resetPasswordForEmail(email, {
      redirectTo: `${config.webOrigin}/reset-password`,
    });
    if (error && error.status !== 400)
      throw new HttpError(
        error.status === 429 ? 429 : 502,
        "Unable to send a reset link right now. Please try again later.",
      );
    res
      .status(202)
      .json({
        message:
          "If this email has an account, a password reset link is on its way. Check your inbox and spam folder.",
      });
  });
  app.post("/api/auth/reset-password", async (req, res) => {
    const input = z
      .object({
        accessToken: z.string().min(20).max(10000),
        refreshToken: z.string().min(10).max(1000),
        password: credentialsSchema.shape.password,
      })
      .strict()
      .parse(req.body);
    const auth = client().auth;
    const { error: sessionError } = await auth.setSession({
      access_token: input.accessToken,
      refresh_token: input.refreshToken,
    });
    if (sessionError)
      throw new HttpError(
        400,
        "This reset link has expired. Request a new link to continue.",
      );
    const { error } = await auth.updateUser({ password: input.password });
    if (error)
      throw new HttpError(
        400,
        "Unable to update your password. Choose a different password or request a new link.",
      );
    await auth.signOut({ scope: "global" });
    res.clearCookie(cookieName, cookieOptions);
    res.clearCookie(refreshCookieName, cookieOptions);
    res.json({ message: "Password updated. Sign in with your new password." });
  });
  app.use("/api", async (req, res, next) => {
    let token =
      req.headers.authorization?.replace(/^Bearer\s+/i, "") ||
      req.cookies[cookieName];
    // Refresh only cookie sessions. Bearer sessions remain controlled by the mobile client.
    if (
      !req.headers.authorization &&
      req.cookies[refreshCookieName] &&
      (!token ||
        (() => {
          try {
            return (
              JSON.parse(
                Buffer.from(token.split(".")[1], "base64url").toString(),
              ).exp <
              Date.now() / 1000 + 30
            );
          } catch {
            return true;
          }
        })())
    ) {
      const { data, error } = await client().auth.refreshSession({
        refresh_token: req.cookies[refreshCookieName],
      });
      if (error || !data.session) {
        res.clearCookie(cookieName, cookieOptions);
        res.clearCookie(refreshCookieName, cookieOptions);
        throw new HttpError(
          401,
          "Your session has expired. Please sign in again.",
        );
      }
      token = data.session.access_token;
      res.cookie(cookieName, token, {
        ...cookieOptions,
        maxAge: data.session.expires_in * 1000,
      });
      res.cookie(refreshCookieName, data.session.refresh_token, {
        ...cookieOptions,
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
    }
    if (!token) throw new HttpError(401, "Please sign in to continue.");
    const db = client(token);
    const { data, error } = await db.auth.getUser(token);
    if (error || !data.user) {
      res.clearCookie(cookieName, cookieOptions);
      throw new HttpError(
        401,
        "Your session has expired. Please sign in again.",
      );
    }
    Object.assign(req, { db, user: data.user, token });
    next();
  });
  app.get("/api/auth/me", (req, res) =>
    res.json(safeUser((req as AuthRequest).user)),
  );
  app.patch("/api/auth/profile", async (req, res) => {
    const { fullName } = registerSchema
      .pick({ fullName: true })
      .strict()
      .parse(req.body);
    // GoTrue's user endpoint accepts the verified user's JWT; no admin credential is used.
    const response = await fetch(`${config.url}/auth/v1/user`, {
      method: "PUT",
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${req.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: { full_name: fullName } }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok)
      throw new HttpError(
        502,
        "Your profile could not be saved. Please try again.",
      );
    res.json(safeUser((await response.json()) as User));
  });
  app.post("/api/auth/logout", async (req, res) => {
    const { db, token } = req as AuthRequest;
    const { error } = await db.auth.admin.signOut(token, "local");
    res.clearCookie(cookieName, cookieOptions);
    res.clearCookie(refreshCookieName, cookieOptions);
    if (error)
      throw new HttpError(
        502,
        "Unable to confirm server logout. Please retry.",
      );
    res.status(204).end();
  });
  const check = (error: { code?: string; message: string } | null) => {
    if (!error) return;
    if (error.code === "23503" || error.code === "42501")
      throw new HttpError(404, "Project or task not found.");
    if (error.code === "23514" || error.code === "22P02")
      throw new HttpError(400, "Please check the supplied values.");
    console.error(
      JSON.stringify({ event: "database_error", code: error.code }),
    );
    throw new HttpError(
      502,
      "The database could not complete this request. Please try again.",
    );
  };
  const id = (req: Request) => z.uuid().parse(req.params.id);
  app.get("/api/workspace", async (req, res) => {
    // Read in pages so PostgREST's default row cap cannot silently hide work.
    const readAll = async (table: "projects" | "tasks", columns: string) => {
      const rows: unknown[] = [];
      for (let offset = 0; ; offset += 500) {
        let query = req.db
          .from(table)
          .select(columns)
          .order("id")
          .range(offset, offset + 499);
        if (table === "projects") query = query.eq("owner_id", req.user.id);
        const { data, error } = await query;
        check(error);
        rows.push(...(data ?? []));
        if (!data || data.length < 500) return rows;
      }
    };
    const [projects, tasks, result] = await Promise.all([
      readAll("projects", projectColumns),
      readAll("tasks", taskColumns),
      req.db.rpc("dashboard_stats"),
    ]);
    check(result.error);
    res.json({
      user: safeUser(req.user),
      projects,
      tasks,
      dashboard: result.data,
    });
  });
  const ownProject = async (req: AuthRequest, projectId: string) => {
    const { data, error } = await req.db
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("owner_id", req.user.id)
      .maybeSingle();
    check(error);
    if (!data) throw new HttpError(404, "Project not found.");
  };
  app.get("/api/projects", async (req, res) => {
    const r = req as AuthRequest;
    const f = projectFilterSchema.parse(requestQuery(req.url));
    let query = r.db
      .from("projects")
      .select(projectColumns)
      .eq("owner_id", r.user.id)
      .order("created_at", { ascending: false });
    if (f.search)
      query = query.ilike("name", `%${f.search.replace(/[\\%_]/g, "\\$&")}%`);
    if (f.status) query = query.eq("status", f.status);
    const { data, error } = await query;
    check(error);
    res.json(data);
  });
  app.get("/api/projects/:id", async (req, res) => {
    const r = req as AuthRequest;
    const { data, error } = await r.db
      .from("projects")
      .select(projectColumns)
      .eq("id", id(req))
      .eq("owner_id", r.user.id)
      .maybeSingle();
    check(error);
    if (!data) throw new HttpError(404, "Project not found.");
    res.json(data);
  });
  app.post("/api/projects", async (req, res) => {
    const r = req as AuthRequest;
    const input = projectSchema.parse(req.body);
    const { data, error } = await r.db
      .from("projects")
      .insert({ ...input, owner_id: r.user.id })
      .select(projectColumns)
      .single();
    check(error);
    res.status(201).json(data);
  });
  app.put("/api/projects/:id", async (req, res) => {
    const r = req as AuthRequest;
    const input = projectSchema.parse(req.body);
    const { data, error } = await r.db
      .from("projects")
      .update(input)
      .eq("id", id(req))
      .eq("owner_id", r.user.id)
      .select(projectColumns)
      .maybeSingle();
    check(error);
    if (!data) throw new HttpError(404, "Project not found.");
    res.json(data);
  });
  app.delete("/api/projects/:id", async (req, res) => {
    const r = req as AuthRequest;
    const { data, error } = await r.db
      .from("projects")
      .delete()
      .eq("id", id(req))
      .eq("owner_id", r.user.id)
      .select("id")
      .maybeSingle();
    check(error);
    if (!data) throw new HttpError(404, "Project not found.");
    res.status(204).end();
  });
  app.get("/api/tasks", async (req, res) => {
    const r = req as AuthRequest;
    const f = taskFilterSchema.parse(requestQuery(req.url));
    let query = r.db
      .from("tasks")
      .select(taskColumns)
      .order("created_at", { ascending: false });
    if (f.projectId) {
      await ownProject(r, f.projectId);
      query = query.eq("project_id", f.projectId);
    }
    if (f.search)
      query = query.ilike("name", `%${f.search.replace(/[\\%_]/g, "\\$&")}%`);
    if (f.status) query = query.eq("status", f.status);
    if (f.priority) query = query.eq("priority", f.priority);
    const { data, error } = await query;
    check(error);
    res.json(data);
  });
  app.get("/api/tasks/:id", async (req, res) => {
    const { data, error } = await (req as AuthRequest).db
      .from("tasks")
      .select(taskColumns)
      .eq("id", id(req))
      .maybeSingle();
    check(error);
    if (!data) throw new HttpError(404, "Task not found.");
    res.json(data);
  });
  app.post("/api/tasks", async (req, res) => {
    const r = req as AuthRequest;
    const input = createTaskSchema.parse(req.body);
    await ownProject(r, input.project_id);
    const { data, error } = await r.db
      .from("tasks")
      .insert(input)
      .select(taskColumns)
      .single();
    check(error);
    res.status(201).json(data);
  });
  app.put("/api/tasks/:id", async (req, res) => {
    const input = taskSchema.parse(req.body);
    const { data, error } = await (req as AuthRequest).db
      .from("tasks")
      .update(input)
      .eq("id", id(req))
      .select(taskColumns)
      .maybeSingle();
    check(error);
    if (!data) throw new HttpError(404, "Task not found.");
    res.json(data);
  });
  app.delete("/api/tasks/:id", async (req, res) => {
    const { data, error } = await (req as AuthRequest).db
      .from("tasks")
      .delete()
      .eq("id", id(req))
      .select("id")
      .maybeSingle();
    check(error);
    if (!data) throw new HttpError(404, "Task not found.");
    res.status(204).end();
  });
  app.get("/api/dashboard", async (req, res) => {
    const { data, error } = await (req as AuthRequest).db.rpc(
      "dashboard_stats",
    );
    check(error);
    res.json(data);
  });
  app.use((_req, res) =>
    res.status(404).json({ message: "Endpoint not found." }),
  );
  app.use(
    (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
      if (error instanceof ZodError)
        return res.status(400).json({
          message: error.issues[0]?.message ?? "Invalid input.",
          fields: z.flattenError(error).fieldErrors,
        });
      if (error instanceof HttpError)
        return res.status(error.status).json({ message: error.message });
      if (error instanceof SyntaxError)
        return res.status(400).json({ message: "Invalid JSON request." });
      console.error(
        JSON.stringify({
          event: "request_error",
          type: error instanceof Error ? error.name : "unknown",
        }),
      );
      return res
        .status(500)
        .json({ message: "Something went wrong. Please try again." });
    },
  );
  return app;
}
