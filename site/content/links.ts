// Where the website points. The self-hosted edition lives in its own repository: its URL is
// SELF_HOST_REPO, and the commands, the folder and the docs link all follow from it.

/** The project on GitHub (public): its repositories, and the organisation's profile. */
export const GITHUB_ORG = "https://github.com/turjuman-translator";
/** The source code of Turjuman. */
export const GITHUB_URL = `${GITHUB_ORG}/website`;
export const LICENSE_URL = `${GITHUB_URL}/blob/main/LICENSE`;

/** The self-hosted edition ("Run it yourself"). */
export const SELF_HOST_REPO = "https://github.com/turjuman-translator/cli";
/** "Docs": the self-hosted edition's README. */
export const DOCS_URL = `${SELF_HOST_REPO}#readme`;

/** The folder the clone goes into (the repository itself is called "cli"). */
export const SELF_HOST_DIR = "turjuman";

export const SELF_HOST_COMMANDS: readonly string[] = [
  `git clone ${SELF_HOST_REPO}.git ${SELF_HOST_DIR}`,
  `cd ${SELF_HOST_DIR}`,
  "pnpm install && pnpm build",
  "pnpm turjuman setup",
  "pnpm turjuman start",
];

/**
 * The two builds of the pages. "hosted": the public website at /, /nl and /ar. "local": the
 * preview a local server shows at /site, where there is no sign-up: "Start for free" opens the
 * builder instead.
 */
export type SiteMode = "hosted" | "local";
export const SITE_MODES: readonly SiteMode[] = ["hosted", "local"];

/** Where "Start for free" and "Log in" lead. */
export const APP_PATHS: Readonly<Record<SiteMode, { start: string; login: string }>> = {
  hosted: { start: "/signup", login: "/login" },
  local: { start: "/app/new", login: "/login" },
};
