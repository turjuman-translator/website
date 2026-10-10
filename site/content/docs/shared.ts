// What the text pages share: the documents they link to (on GitHub, in English) and the commands
// they show, copied verbatim from selfhost/README.md, docs/cli.md, docs/guide.md and docs/docker.md.
import { GITHUB_URL, SELF_HOST_DIR, SELF_HOST_REPO } from "../links.js";

const SELF_DOC = `${SELF_HOST_REPO}/blob/main`;

/** docs/cli.md in the self-hosted edition: every option of every command. */
export const CLI_DOC = `${SELF_DOC}/docs/cli.md`;
export const GUIDE_DOC = `${SELF_DOC}/docs/guide.md`;
export const DOCKER_DOC = `${SELF_DOC}/docs/docker.md`;
/** Hosting for many mosques is in the main repository only (the export leaves it out). */
export const HOSTING_DOC = `${GITHUB_URL}/blob/main/docs/hosting.md`;
export const SECURITY_DOC = `${GITHUB_URL}/blob/main/SECURITY.md`;
/** "Report a vulnerability" on the main repository's Security tab. */
export const SECURITY_REPORT = `${GITHUB_URL}/security`;

/** selfhost/README.md, "2. Install". */
export const INSTALL_COMMANDS = [
  `git clone ${SELF_HOST_REPO}.git ${SELF_HOST_DIR}`,
  `cd ${SELF_HOST_DIR}`,
  "pnpm install && pnpm build",
];

/** Where `pnpm turjuman start` says to open the app (the end of its banner). */
export const START_APP_LINES = [
  "Open the app:",
  "  Screens (dashboard):  http://127.0.0.1:8765/app",
  "  New screen (builder): http://127.0.0.1:8765/app/new",
  "  Caption look:         http://127.0.0.1:8765/app/look",
];

/** What `pnpm turjuman start` prints at a terminal with the default config (src/cli/run.ts,
 *  start.ts): its first log line, then the banner. */
export const START_OUTPUT = [
  "12:00:00 info  Server listening at http://127.0.0.1:8765",
  "Turjuman server running (v0.1.0, exposure local)",
  "  Caption link:     http://127.0.0.1:8765/",
  "  Caption page:     http://127.0.0.1:8765/ar/nl",
  "  Overlay / dock:   http://127.0.0.1:8765/overlay   http://127.0.0.1:8765/control",
  "  Health:           http://127.0.0.1:8765/health",
  // The blank line of the banner (a space, so the output block keeps the line).
  " ",
  ...START_APP_LINES,
];

/** docs/docker.md, "Several instances on one computer". */
export const INSTANCE_ENV = [
  "COMPOSE_PROJECT_NAME=turjuman-test",
  "HTTP_PORT=8780",
  "HTTPS_PORT=8781",
  "BRIDGE_PORT=7080",
  "CAPTIONS_IMAGE=turjuman-test:local",
  "CAPTIONS_BUILD_IMAGE=turjuman-test:build",
];
