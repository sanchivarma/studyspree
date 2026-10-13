import { readdirSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

it("has one page per URL, including exactly one public root page", () => {
  const root = dirname(fileURLToPath(import.meta.url));
  const routes = new Map<string, string[]>();
  function visit(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.name === "page.tsx") {
        const segments = relative(root, directory).split(sep).filter((part) => part && !/^\(.+\)$/.test(part));
        const route = `/${segments.join("/")}`;
        routes.set(route, [...(routes.get(route) ?? []), relative(root, path)]);
      }
    }
  }
  visit(root);
  expect([...routes.entries()].filter(([, pages]) => pages.length > 1)).toEqual([]);
  expect(routes.get("/")).toEqual([join("(auth)", "page.tsx")]);
});
