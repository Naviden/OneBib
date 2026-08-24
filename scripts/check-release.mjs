import { access, readFile, stat } from "node:fs/promises";

const manifest = JSON.parse(await readFile("manifest.json", "utf8"));
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const versions = JSON.parse(await readFile("versions.json", "utf8"));

const failures = [];
const requireCondition = (condition, message) => {
  if (!condition) failures.push(message);
};

requireCondition(manifest.id === "onebib", "manifest id must be 'onebib'");
requireCondition(manifest.name === "OneBib", "manifest name must be 'OneBib'");
requireCondition(/^\d+\.\d+\.\d+$/.test(manifest.version), "manifest version must use x.y.z semantic versioning");
requireCondition(manifest.version === packageJson.version, "manifest and package versions must match");
requireCondition(versions[manifest.version] === manifest.minAppVersion, "versions.json must match minAppVersion");
requireCondition(manifest.description.length <= 250, "manifest description must be at most 250 characters");
requireCondition(manifest.description.endsWith("."), "manifest description must end with a period");
requireCondition(manifest.isDesktopOnly === false, "OneBib should remain mobile compatible");

for (const path of ["README.md", "LICENSE", "CHANGELOG.md", "main.js", "manifest.json", "styles.css"]) {
  try {
    await access(path);
  } catch {
    failures.push(`required release file is missing: ${path}`);
  }
}

try {
  const bundle = await readFile("main.js", "utf8");
  const bundleStats = await stat("main.js");
  requireCondition(bundle.includes('require("obsidian")'), "production bundle must load the Obsidian API externally");
  requireCondition(!bundle.includes("sourceMappingURL"), "production bundle must not contain an inline source map");
  requireCondition(bundleStats.size < 250_000, "production bundle should remain below 250 KB");
} catch {
  // The missing-file failure above is more useful.
}

if (failures.length > 0) {
  throw new Error(`Release validation failed:\n- ${failures.join("\n- ")}`);
}

process.stdout.write(`OneBib ${manifest.version} release assets are valid.\n`);
