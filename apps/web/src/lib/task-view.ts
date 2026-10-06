import type { Task } from "@project/contracts";

export type DueFilter = "" | "overdue" | "today" | "week";
export type TaskSort = "due" | "priority" | "newest" | "name";
export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function matchesDue(task: Task, filter: DueFilter, today: string) {
  if (!filter) return true;
  if (task.status === "Completed") return false;
  if (filter === "overdue") return task.due_date < today;
  if (filter === "today") return task.due_date === today;
  const end = new Date(`${today}T12:00:00`);
  end.setDate(end.getDate() + 6);
  return task.due_date >= today && task.due_date <= localDay(end);
}
export function sortTasks(tasks: Task[], sort: TaskSort) {
  const rank = { High: 0, Medium: 1, Low: 2 };
  return [...tasks].sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "newest") return b.created_at.localeCompare(a.created_at);
    if (sort === "priority")
      return (
        rank[a.priority] - rank[b.priority] ||
        a.due_date.localeCompare(b.due_date)
      );
    return (
      a.due_date.localeCompare(b.due_date) ||
      rank[a.priority] - rank[b.priority]
    );
  });
}
export function tasksCsv(tasks: Task[]) {
  const cell = (value: string) => {
    // Spreadsheet apps interpret formula prefixes even inside quoted CSV cells.
    const safe = /^[\s]*[=+@-]/.test(value) ? `'${value}` : value;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  return [
    ["Task", "Project", "Status", "Priority", "Due date", "Description"],
    ...tasks.map((t) => [
      t.name,
      t.projects?.name ?? "",
      t.status,
      t.priority,
      t.due_date,
      t.description,
    ]),
  ]
    .map((row) => row.map(cell).join(","))
    .join("\r\n");
}
