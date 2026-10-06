import Link from "next/link";
export default function NotFound() {
  return (
    <main className="empty">
      <span className="brand">Daymark</span>
      <h1>This page took a wrong turn.</h1>
      <p>
        The link may be outdated. Your projects are still in your workspace.
      </p>
      <Link className="primary" href="/dashboard">
        Back to your workspace
      </Link>
    </main>
  );
}
