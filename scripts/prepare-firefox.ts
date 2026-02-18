import { copyFileSync, cpSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = dirname(__dirname);

const distDir = join(rootDir, "dist");
const distFirefoxDir = join(rootDir, "dist-firefox");
const firefoxManifest = join(rootDir, "public", "manifest.firefox.json");

// Remove existing dist-firefox directory
if (existsSync(distFirefoxDir)) {
  rmSync(distFirefoxDir, { recursive: true });
}

// Copy dist to dist-firefox
cpSync(distDir, distFirefoxDir, { recursive: true });

// Replace manifest.json with Firefox version
copyFileSync(firefoxManifest, join(distFirefoxDir, "manifest.json"));

console.log("Firefox build prepared in dist-firefox/");
