"use client";
import Link from "next/link";
import { ArrowUpRight, Check, ArrowRight } from "lucide-react";
import type { Task } from "@project/contracts";
import { sortTasks } from "@/lib/task-view";

export function FocusPanel({
  tasks,
  today,
  busy,
  edit,
  complete,
  create,
}: {
  tasks: Task[];
  today: string;
  busy: boolean;
  edit: (task: Task) => void;
  complete: (task: Task) => void;
  create: () => void;
}) {
  const open = tasks.filter((t) => t.status !== "Completed");
  const next = sortTasks(open, "due").slice(0, 4);
  const overdue = open.filter((t) => t.due_date < today).length;
  const dueToday = open.filter((t) => t.due_date === today).length;
  const done = tasks.filter((t) => t.status === "Completed").length;
  return (
    <section className="focus-layout" aria-label="Your next steps">
      <div className="focus-tasks">
        <div className="collection-heading">
          <div>
            <h2>Up next</h2>
            <p className="small">Your earliest deadlines, in one place.</p>
          </div>
          <Link href="/tasks" className="quiet-link">
            All tasks <ArrowUpRight size={16} />
          </Link>
        </div>
        {next.length ? (
          next.map((task) => (
            <div className="focus-row" key={task.id}>
              <button
                className="completion-button"
                disabled={busy}
                onClick={() => complete(task)}
                aria-label={`Complete ${task.name}`}
              >
                <Check size={15} /><span>Mark done</span>
              </button>
              <button className="task-main" onClick={() => edit(task)}>
                <strong>{task.name}</strong>
                <span>{task.projects?.name}</span>
              </button>
              <span
                className={task.due_date < today ? "overdue small" : "small"}
              >
                {task.due_date < today
                  ? "Overdue"
                  : task.due_date === today
                    ? "Today"
                    : new Date(`${task.due_date}T12:00:00`).toLocaleDateString(
                        "en",
                        { month: "short", day: "numeric" },
                      )}
              </span>
            </div>
          ))
        ) : (
          <div className="focus-empty">
            <h3>
              {tasks.length
                ? "All caught up."
                : "Give your day a starting point."}
            </h3>
            <p>
              {tasks.length
                ? "Every task is complete. Ready for your next idea?"
                : "Create a project, add a task, and take the first step."}
            </p>
            <button onClick={create}>
              Plan your next step <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
      <aside className="focus-summary">
        <span className="eyebrow">A LITTLE PERSPECTIVE</span>
        <h2>
          {overdue ? "Bring the important things forward." : "One step closer."}
        </h2>
        <div className="focus-counts">
          <Link href="/tasks?due=overdue">
            <strong>{overdue}</strong>
            <span>
              Overdue <ArrowUpRight size={13} />
            </span>
          </Link>
          <Link href="/tasks?due=today">
            <strong>{dueToday}</strong>
            <span>
              Due today <ArrowUpRight size={13} />
            </span>
          </Link>
        </div>
        <div className="summary-progress">
          <span>
            {done} of {tasks.length} tasks completed
          </span>
          <strong>
            {tasks.length ? Math.round((done / tasks.length) * 100) : 0}%
          </strong>
        </div>
        <progress
          aria-label="All tasks progress"
          max={tasks.length || 1}
          value={done}
        />
      </aside>
    </section>
  );
}
