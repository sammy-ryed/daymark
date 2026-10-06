"use client";
import {
  Check,
  MoreHorizontal,
  Plus,
  Trash2,
  CalendarDays,
} from "lucide-react";
import { taskStatuses, type Task } from "@project/contracts";

type Props = {
  tasks: Task[];
  view: "list" | "board";
  today: string;
  busy: boolean;
  edit: (task: Task) => void;
  remove: (task: Task) => void;
  changeStatus: (task: Task, status: Task["status"]) => void;
  create: () => void;
};
export function TaskCollection(props: Props) {
  const { tasks, view, create } = props;
  if (view === "board")
    return (
      <div className="task-board">
        {taskStatuses.map((status) => (
          <section
            className="board-column"
            key={status}
            aria-label={`${status} tasks`}
          >
            <header className="board-heading">
              <h3>{status}</h3>
              <span>{tasks.filter((t) => t.status === status).length}</span>
            </header>
            <div className="board-items">
              {tasks
                .filter((t) => t.status === status)
                .map((task) => (
                  <TaskItem key={task.id} {...props} task={task} />
                ))}
            </div>
            {!tasks.some((t) => t.status === status) && (
              <p className="board-empty">
                No {status.toLowerCase()} tasks in this view.
              </p>
            )}
            <button className="board-add" onClick={create}>
              <Plus size={16} /> Add task
            </button>
          </section>
        ))}
      </div>
    );
  return (
    <div className="task-list">
      {tasks.map((task) => (
        <TaskItem key={task.id} {...props} task={task} />
      ))}
    </div>
  );
}
function TaskItem({
  task,
  today,
  busy,
  view,
  edit,
  remove,
  changeStatus,
}: Props & { task: Task }) {
  const done = task.status === "Completed";
  const overdue = !done && task.due_date < today;
  const date = new Date(`${task.due_date}T12:00:00`).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
  return (
    <article
      className={`task-row ${view === "board" ? "board-card" : ""} ${done ? "task-done" : ""}`}
    >
      <button
        className={`check-button ${done ? "checked" : ""}`}
        aria-label={`${done ? "Reopen" : "Complete"} ${task.name}`}
        disabled={busy}
        onClick={() => changeStatus(task, done ? "Pending" : "Completed")}
      >
        {done && <Check size={16} />}
      </button>
      <button className="task-main" onClick={() => edit(task)}>
        <strong>{task.name}</strong>
        <span>{task.projects?.name ?? "Project"}</span>
      </button>
      <span className={`task-due ${overdue ? "overdue" : ""}`}>
        <CalendarDays size={14} />
        {overdue
          ? "Overdue · "
          : task.due_date === today && !done
            ? "Today · "
            : ""}
        {date}
      </span>
      <span className={`priority priority-${task.priority.toLowerCase()}`}>
        {task.priority}
      </span>
      <label className="inline-status">
        <span className="sr-only">Status for {task.name}</span>
        <select
          value={task.status}
          disabled={busy}
          onChange={(e) => changeStatus(task, e.target.value as Task["status"])}
        >
          {taskStatuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <div className="task-actions">
        <button
          className="icon-button"
          aria-label={`Edit ${task.name}`}
          onClick={() => edit(task)}
        >
          <MoreHorizontal size={18} />
        </button>
        <button
          className="icon-button"
          aria-label={`Delete ${task.name}`}
          onClick={() => remove(task)}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </article>
  );
}
