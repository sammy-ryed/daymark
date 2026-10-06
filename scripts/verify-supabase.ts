import { loadEnvFile } from "node:process";
loadEnvFile("apps/api/.env");
async function main() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  for (const table of ["projects", "tasks"]) {
    const response = await fetch(`${url}/rest/v1/${table}?select=id`, {
      headers: { apikey: key },
    });
    if (![401, 403].includes(response.status))
      throw new Error(
        `Anonymous ${table} access unexpectedly returned ${response.status}`,
      );
    console.log(
      `PASS: anonymous access denied for ${table} (${response.status})`,
    );
  }
  const response = await fetch(`${url}/rest/v1/rpc/dashboard_stats`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: "{}",
  });
  if (![401, 403].includes(response.status))
    throw new Error("Anonymous dashboard access was not denied");
  console.log("PASS: anonymous dashboard execution denied");
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
