import { z } from "zod";

export const projectStatuses = [
  "Not Started",
  "In Progress",
  "Completed",
] as const;
export const taskStatuses = ["Pending", "In Progress", "Completed"] as const;
export const priorities = ["Low", "Medium", "High"] as const;
const name = z.string().trim().min(1, "A name is required.").max(120);
const description = z.string().trim().max(4000).default("");
const date = z.iso.date();
export const credentialsSchema = z
  .object({
    email: z.email().trim().toLowerCase(),
    password: z.string().min(8, "Use at least 8 characters.").max(72),
  })
  .strict();
export const registerSchema = credentialsSchema.extend({ fullName: name });
export const projectSchema = z
  .object({
    name,
    description,
    status: z.enum(projectStatuses),
    start_date: date,
    end_date: date,
  })
  .strict()
  .refine((v) => v.end_date >= v.start_date, {
    message: "End date must be on or after start date.",
    path: ["end_date"],
  });
export const taskSchema = z
  .object({
    name,
    description,
    priority: z.enum(priorities),
    status: z.enum(taskStatuses),
    due_date: date,
  })
  .strict();
export const createTaskSchema = taskSchema.extend({ project_id: z.uuid() });
export const projectFilterSchema = z
  .object({
    search: z.string().trim().max(120).optional(),
    status: z.enum(projectStatuses).optional(),
  })
  .strict();
export const taskFilterSchema = z
  .object({
    search: z.string().trim().max(120).optional(),
    status: z.enum(taskStatuses).optional(),
    priority: z.enum(priorities).optional(),
    projectId: z.uuid().optional(),
  })
  .strict();
export type ProjectInput = z.infer<typeof projectSchema>;
export type TaskInput = z.infer<typeof taskSchema>;
export type Project = ProjectInput & {
  id: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
};
export type Task = TaskInput & {
  id: string;
  project_id: string;
  created_at: string;
  updated_at: string;
  projects?: { name: string };
};
export type Profile = { id: string; email: string; fullName: string };
export type Dashboard = {
  totalProjects: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  projectsInProgress: number;
};
export type AuthResponse = {
  user?: Profile;
  accessToken?: string;
  expiresAt?: number;
  message?: string;
};
export function progress(tasks: Task[]) {
  return tasks.length
    ? Math.round(
        (tasks.filter((t) => t.status === "Completed").length / tasks.length) *
          100,
      )
    : 0;
}
