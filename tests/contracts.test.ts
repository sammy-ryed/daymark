import { describe, it, expect } from "vitest";
import {
  projectSchema,
  createTaskSchema,
  registerSchema,
  taskFilterSchema,
} from "../packages/contracts/src/index";
const project = {
  name: "Example",
  description: "",
  status: "Not Started",
  start_date: "2026-10-06",
  end_date: "2026-10-20",
};
describe("server input contracts", () => {
  it("rejects ownership injection", () =>
    expect(
      projectSchema.safeParse({ ...project, owner_id: "someone-else" }).success,
    ).toBe(false));
  it("rejects impossible dates and reverse ranges", () => {
    expect(
      projectSchema.safeParse({ ...project, start_date: "2026-02-30" }).success,
    ).toBe(false);
    expect(
      projectSchema.safeParse({ ...project, end_date: "2026-10-01" }).success,
    ).toBe(false);
  });
  it("requires valid project identifiers for tasks", () =>
    expect(
      createTaskSchema.safeParse({
        name: "Task",
        description: "",
        project_id: "wrong",
        priority: "High",
        status: "Pending",
        due_date: "2026-10-07",
      }).success,
    ).toBe(false));
  it("normalizes emails and rejects blank names", () => {
    expect(
      registerSchema.parse({
        fullName: "Alex Example",
        email: "ALEX@EXAMPLE.COM",
        password: "long-password",
      }).email,
    ).toBe("alex@example.com");
    expect(
      registerSchema.safeParse({
        fullName: "   ",
        email: "alex@example.com",
        password: "long-password",
      }).success,
    ).toBe(false);
  });
  it("rejects unsupported filter values", () =>
    expect(taskFilterSchema.safeParse({ priority: "Urgent" }).success).toBe(
      false,
    ));
});
