// Export the self-hosted edition of Turjuman into its own repository folder
// (github.com/turjuman-translator/cli): the app, the server and the `turjuman` CLI,
// without the marketing website (with its SEO notes and its end-to-end tests) and the
// hosted-service docs. This repository stays the source of truth: the export is rebuilt from the
// committed files (`git archive HEAD`) for every release, so uncommitted work never leaks into it.
//
// Usage: pnpm exec tsx scripts/export-selfhost.ts <target-dir> [--verify] [--commit]
//   --verify  install, typecheck, lint, test and build inside the export
//   --commit  commit the export in <target-dir> (a git repository is created when missing)
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { parseArgs } from "node:util";

const REPO = resolve(import.meta.dirname, "..");
const MAIN_URL = "https://github.com/turjuman-translator/website";

/** Paths (relative to the repository) that stay in the main repository only. */
const EXCLUDED: readonly RegExp[] = [
  /^site\//,
  /^selfhost\//,
  /^scripts\/build-site\.ts$/,
  /^scripts\/export-selfhost\.ts$/,
  /^test\/unit\/site-[^/]+\.test\.ts$/,
  /^test\/unit\/export-selfhost\.test\.ts$/,
  /^test\/unit\/helpers\/site-[^/]+\.ts$/,
  /^test\/e2e\/website\//,
  /^test\/e2e\/helpers\/website[^/]*\.ts$/,
  /^docs\/hosting\.md$/,
  /^docs\/seo\.md$/,
];

function run(cmd: string, args: string[], cwd: string, input?: Buffer): Buffer {
  return execFileSync(cmd, args, {
    cwd,
    ...(input === undefined ? {} : { input }),
    maxBuffer: 512 * 1024 * 1024,
    stdio: input === undefined ? ["ignore", "pipe", "inherit"] : ["pipe", "pipe", "inherit"],
  });
}

function walk(dir: string, root = dir): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(path, root));
    else out.push(relative(root, path));
  }
  return out;
}

function edit(file: string, change: (text: string) => string): void {
  const before = readFileSync(file, "utf8");
  const after = change(before);
  if (after === before) throw new Error(`export: nothing changed in ${file}; update the script`);
  writeFileSync(file, after);
}

/** The line of src/config.ts that decides what a new config.yaml is made for. */
const DEPLOYMENT_LINE = 'export const DEPLOYMENT: Deployment = "hosted";';

/**
 * src/config.ts for the self-hosted edition: a first start makes a config.yaml for one mosque
 * (mode local, this computer only) instead of the hosted platform's.
 */
export function localDeployment(source: string): string {
  if (!source.includes(DEPLOYMENT_LINE)) {
    throw new Error("export: the DEPLOYMENT line of src/config.ts changed; update the script");
  }
  return source.replace(DEPLOYMENT_LINE, 'export const DEPLOYMENT: Deployment = "local";');
}

/** Links to docs/hosting.md, which only the main repository has, lead there (anchors kept). */
export function hostingLinks(markdown: string): string {
  return markdown.replace(
    /\]\((?:\.\.\/)?(?:docs\/)?hosting\.md(#[^)]*)?\)/g,
    (_, anchor: string | undefined) => `](${MAIN_URL}/blob/main/docs/hosting.md${anchor ?? ""})`,
  );
}

/** The committed tree of HEAD in a fresh temp folder. */
function committedTree(): { dir: string; commit: string } {
  const commit = run("git", ["rev-parse", "--short", "HEAD"], REPO).toString().trim();
  const dir = mkdtempSync(join(tmpdir(), "turjuman-selfhost-"));
  const tar = run("git", ["archive", "--format=tar", "HEAD"], REPO);
  run("tar", ["-x", "-C", dir], REPO, tar);
  return { dir, commit };
}

/** Drop the main-repository-only files and adapt the rest for the self-hosted edition. */
function shape(dir: string, commit: string): void {
  // The self-hosted README, as committed (selfhost/ itself stays in the main repository).
  const readme = readFileSync(join(dir, "selfhost", "README.md"), "utf8");
  for (const file of walk(dir)) {
    if (EXCLUDED.some((re) => re.test(file))) rmSync(join(dir, file));
  }
  for (const empty of ["site", "selfhost", "test/e2e/website"]) {
    rmSync(join(dir, empty), { recursive: true, force: true });
  }

  // A first start makes a local config.yaml: one mosque, this computer only.
  edit(join(dir, "src", "config.ts"), localDeployment);

  // The build has no website.
  const pkgFile = join(dir, "package.json");
  const pkg = JSON.parse(readFileSync(pkgFile, "utf8")) as {
    scripts: Record<string, string>;
  };
  pkg.scripts.build = pkg.scripts.build?.replace(" && pnpm build:site", "") ?? "";
  pkg.scripts.typecheck =
    pkg.scripts.typecheck?.replace(" && tsc -p site/tsconfig.json --noEmit", "") ?? "";
  delete pkg.scripts["build:site"];
  if (pkg.scripts.build.includes("site") || pkg.scripts.typecheck.includes("site")) {
    throw new Error("export: package.json still builds the website; update the script");
  }
  writeFileSync(pkgFile, `${JSON.stringify(pkg, null, 2)}\n`);

  // Development happens in the main repository.
  writeFileSync(
    join(dir, "README.md"),
    `${readme.trimEnd()}\n\n<sub>Generated from [turjuman-translator/website@${commit}](${MAIN_URL}/tree/${commit}).</sub>\n`,
  );
  edit(join(dir, "CONTRIBUTING.md"), (text) =>
    text
      .replace(
        /^# Contributing\n/,
        `# Contributing\n\nThis repository is generated from [turjuman-translator/website](${MAIN_URL}), where Turjuman is developed. Please open issues and pull requests there.\n`,
      )
      .replace(
        "pnpm build            # server, app and website",
        "pnpm build            # server and app",
      )
      .replace("(`web/shared/app-i18n.ts`, `site/content/`)", "(`web/shared/app-i18n.ts`)"),
  );
  // No website in this edition: no `make site`.
  edit(join(dir, "Makefile"), (text) =>
    text
      .replace(/\nsite: ## Open the website[^\n]*\n(?:\t[^\n]*\n)+/, "")
      .replace(" admin app site keys ", " admin app keys "),
  );
  // Links to documents that only the main repository has.
  for (const file of walk(dir).filter((f) => f.endsWith(".md"))) {
    const path = join(dir, file);
    const text = readFileSync(path, "utf8");
    const next = hostingLinks(text);
    if (next !== text) writeFileSync(path, next);
  }
  edit(join(dir, "docs", "guide.md"), (text) => {
    const at = text.indexOf("\n## Development");
    if (at === -1) return text;
    return `${text.slice(0, at)}\n## Development\n\nTurjuman is developed at ${MAIN_URL}: the source of this edition, the specs and the tests that need the website. See its CONTRIBUTING.md.\n`;
  });
}

/** Replace everything in `target` (except .git) with the shaped export. */
function sync(from: string, target: string): void {
  mkdirSync(target, { recursive: true });
  for (const entry of readdirSync(target)) {
    if (entry !== ".git") rmSync(join(target, entry), { recursive: true, force: true });
  }
  cpSync(from, target, { recursive: true });
}

function verify(target: string): void {
  const steps: Array<[string, string[]]> = [
    ["pnpm", ["install", "--frozen-lockfile"]],
    ["pnpm", ["typecheck"]],
    ["pnpm", ["lint"]],
    ["pnpm", ["test"]],
    ["pnpm", ["build"]],
  ];
  for (const [cmd, args] of steps) {
    console.log(`export: ${cmd} ${args.join(" ")}`);
    execFileSync(cmd, args, { cwd: target, stdio: "inherit" });
  }
}

function commitExport(target: string, commit: string): void {
  if (!existsSync(join(target, ".git"))) run("git", ["init", "-b", "main"], target);
  run("git", ["add", "-A"], target);
  const status = run("git", ["status", "--porcelain"], target).toString().trim();
  if (status === "") {
    console.log("export: nothing to commit");
    return;
  }
  run("git", ["commit", "-q", "-m", `Turjuman self-hosted, from turjuman@${commit}`], target);
  console.log(`export: committed in ${target}`);
}

function main(): void {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      verify: { type: "boolean", default: false },
      commit: { type: "boolean", default: false },
    },
  });
  const targetArg = positionals[0];
  if (targetArg === undefined || positionals.length > 1) {
    console.error(
      "usage: pnpm exec tsx scripts/export-selfhost.ts <target-dir> [--verify] [--commit]",
    );
    process.exit(2);
  }
  const target = resolve(targetArg);
  if (target === REPO || target.startsWith(`${REPO}/`)) {
    console.error("export: the target must be outside this repository");
    process.exit(2);
  }
  const { dir, commit } = committedTree();
  try {
    shape(dir, commit);
    sync(dir, target);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  console.log(`export: turjuman@${commit} → ${target}`);
  if (values.verify) verify(target);
  if (values.commit) commitExport(target, commit);
}

// Run as a script; imported (the tests), it only defines the functions above.
const script = process.argv[1];
if (script !== undefined && realpathSync(script) === realpathSync(import.meta.filename)) main();
