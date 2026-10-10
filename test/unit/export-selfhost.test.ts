// The self-hosted edition (scripts/export-selfhost.ts) differs in one line of src/config.ts: a
// first start there makes a config.yaml for one mosque on this computer, not the hosted
// platform's. This test stays in the main repository (the export leaves the script out).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { hostingLinks, localDeployment } from "../../scripts/export-selfhost.js";
import { DEPLOYMENT, newConfigYaml } from "../../src/config.js";

const source = readFileSync(new URL("../../src/config.ts", import.meta.url), "utf8");

describe("the export's rewrite of the deployment", () => {
  it("is hosted in this repository", () => {
    expect(DEPLOYMENT).toBe("hosted");
    expect(parse(newConfigYaml(DEPLOYMENT)).mode).toBe("hosted");
  });

  it("turns src/config.ts into the self-hosted edition's: that one line, nothing else", () => {
    const local = localDeployment(source);
    const before = source.split("\n");
    const after = local.split("\n");
    expect(after).toHaveLength(before.length);
    const changed = after.flatMap((line, i) => (line === before[i] ? [] : [[before[i], line]]));
    expect(changed).toEqual([
      [
        'export const DEPLOYMENT: Deployment = "hosted";',
        'export const DEPLOYMENT: Deployment = "local";',
      ],
    ]);
    // What a first start there makes.
    expect(parse(newConfigYaml("local"))).toEqual({ mode: "local", server: { exposure: "local" } });
  });

  it("refuses a src/config.ts whose line changed, so an export never ships the hosted default", () => {
    expect(() =>
      localDeployment(source.replace("DEPLOYMENT: Deployment", "KIND: Deployment")),
    ).toThrow("export: the DEPLOYMENT line of src/config.ts changed; update the script");
    expect(() => localDeployment(localDeployment(source))).toThrow(/DEPLOYMENT line/);
  });
});

describe("the export's links to the hosting guide", () => {
  it("lead to the main repository, with their anchor", () => {
    const main = "https://github.com/turjuman-translator/website/blob/main/docs/hosting.md";
    expect(
      hostingLinks(
        "[a](hosting.md) [b](docs/hosting.md#nginx) [c](../docs/hosting.md#what-is-stored-where) [d](docker.md#nginx)",
      ),
    ).toBe(
      `[a](${main}) [b](${main}#nginx) [c](${main}#what-is-stored-where) [d](docker.md#nginx)`,
    );
  });
});
