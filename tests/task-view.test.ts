import { describe, it, expect } from "vitest";
import {
  localDay,
  matchesDue,
  sortTasks,
  tasksCsv,
} from "../apps/web/src/lib/task-view";
import type { Task } from "@project/contracts";
const task = (overrides: Partial<Task> = {}): Task => ({
  id: "a",
  project_id: "p",
  name: "Draft",
  description: "",
  status: "Pending",
  priority: "Medium",
  due_date: "2026-10-06",
  created_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-01T00:00:00Z",
  ...overrides,
});
describe("task views", () => {
  it("excludes completed tasks from urgency views and includes exact date boundaries", () => {
    expect(
      matchesDue(task({ status: "Completed" }), "today", "2026-10-06"),
    ).toBe(false);
    expect(
      matchesDue(task({ due_date: "2026-10-05" }), "overdue", "2026-10-06"),
    ).toBe(true);
    expect(matchesDue(task(), "overdue", "2026-10-06")).toBe(false);
    expect(
      matchesDue(task({ due_date: "2026-10-12" }), "week", "2026-10-06"),
    ).toBe(true);
    expect(
      matchesDue(task({ due_date: "2026-10-13" }), "week", "2026-10-06"),
    ).toBe(false);
  });
  it("sorts by priority without mutating cached data", () => {
    const input = [
      task({ priority: "Low" }),
      task({ id: "b", priority: "High" }),
    ];
    expect(sortTasks(input, "priority")[0].id).toBe("b");
    expect(input[0].priority).toBe("Low");
  });
  it("exports quoted multiline values and neutralizes spreadsheet formulas", () => {
    const csv = tasksCsv([
      task({
        name: '=HYPERLINK("bad")',
        description: 'first\nsecond, "quoted"',
      }),
    ]);
    expect(csv).toContain('"\'=HYPERLINK(""bad"")"');
    expect(csv).toContain('"first\nsecond, ""quoted"""');
  });
  it("uses calendar components rather than locale-formatted date strings", () => {
    expect(localDay(new Date(2026, 0, 2, 23, 59))).toBe("2026-01-02");
  });
});
