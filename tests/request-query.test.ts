import { expect, it } from "vitest";
import { requestQuery } from "../apps/api/src/request-query";
import { taskFilterSchema } from "../packages/contracts/src";

it("reads only URL filters, without Next catch-all route metadata", () => {
  const req = {
    url: "/api/tasks?status=Pending",
    query: { path: ["tasks"], status: "Pending" },
  };
  expect(taskFilterSchema.parse(requestQuery(req.url))).toEqual({
    status: "Pending",
  });
  expect(requestQuery("/api/projects")).toEqual({});
});
it("preserves invalid and duplicate filters for strict validation", () => {
  expect(() =>
    taskFilterSchema.parse(requestQuery("/api/tasks?path=bad")),
  ).toThrow();
  expect(() =>
    taskFilterSchema.parse(
      requestQuery("/api/tasks?status=Pending&status=Completed"),
    ),
  ).toThrow();
});
