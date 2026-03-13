#!/usr/bin/env node
/**
 * Build script to replace {{BaseURL}} placeholder in public/ files
 * with the actual base URL from environment variables or wrangler vars.
 *
 * Usage:
 *   BASE_URL=mackerel-mcp.example.com node scripts/replace-baseurl.js
 *
 * In GitHub Actions, the BASE_URL is read from Repository Variables.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PUBLIC_DIR = join(__dirname, "..", "public");
const BASE_URL = process.env.BASE_URL || "localhost:8788";
const PLACEHOLDER = /\{\{BaseURL\}\}/g;
const TEXT_EXTENSIONS = new Set([
  ".html",
  ".md",
  ".txt",
  ".json",
  ".xml",
  ".css",
  ".js",
]);

function replacePlaceholdersInFile(filePath) {
  const content = readFileSync(filePath, "utf-8");

  if (!PLACEHOLDER.test(content)) {
    return false;
  }

  const newContent = content.replace(PLACEHOLDER, BASE_URL);
  writeFileSync(filePath, newContent, "utf-8");

  console.log(`✓ Replaced {{BaseURL}} with "${BASE_URL}" in ${filePath}`);
  return true;
}

function processDirectory(dir) {
  const entries = readdirSync(dir);
  let processedCount = 0;

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      processedCount += processDirectory(fullPath);
    } else if (stat.isFile()) {
      const ext = extname(entry).toLowerCase();
      if (TEXT_EXTENSIONS.has(ext)) {
        if (replacePlaceholdersInFile(fullPath)) {
          processedCount++;
        }
      }
    }
  }

  return processedCount;
}

console.log(`Replacing {{BaseURL}} with: ${BASE_URL}`);
console.log(`Processing directory: ${PUBLIC_DIR}\n`);

const count = processDirectory(PUBLIC_DIR);

if (count === 0) {
  console.log("No files with {{BaseURL}} placeholder found.");
} else {
  console.log(`\n✓ Successfully processed ${count} file(s).`);
}
