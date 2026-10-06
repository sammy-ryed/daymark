"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="empty">
      <h1>Something went wrong.</h1>
      <p>Please try loading your workspace again.</p>
      <button onClick={reset}>Try again</button>
    </main>
  );
}
