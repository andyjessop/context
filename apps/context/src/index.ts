#!/usr/bin/env bun
import { $ } from "bun";
import { file as bunFile, write as bunWrite } from "bun";
import * as path from "node:path";
import minimist from "minimist";

/**
 * Attempts to locate the nearest Git repository root by:
 *  1. Starting at the given folder (resolved to absolute path).
 *  2. Running "git rev-parse --show-toplevel".
 *  3. If it fails, move up one directory and try again.
 *  4. Repeat until either a valid Git root is found or the filesystem root is reached.
 */
async function findGitRootUp(folder: string): Promise<string> {
  let currentDir = path.resolve(folder);
  console.log(`[INFO] Searching for Git root. Starting at: "${currentDir}"`);

  while (true) {
    console.log(`[DEBUG] Trying "git rev-parse --show-toplevel" in: "${currentDir}"`);
    try {
      const root = await $`git rev-parse --show-toplevel`.cwd(currentDir).text();
      const trimmed = root.trim();
      console.log(`[INFO] Found valid Git root: "${trimmed}" (absolute: "${path.resolve(trimmed)}")`);
      return trimmed;
    } catch {
      // If rev-parse fails, move one directory up and try again
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) {
        console.error(`[ERROR] Failed to find a valid Git repository above "${folder}". Last attempt was "${currentDir}".`);
        throw new Error(`Could not find a valid Git repository above "${folder}".`);
      }
      currentDir = parentDir;
    }
  }
}

/**
 * Checks whether a MIME type is considered textual for our purposes.
 * Here, we allow:
 *  - text/*
 *  - application/json
 *  - application/xml
 *  - application/javascript
 *  - application/typescript
 *
 * Adjust or add more as needed.
 */
function isTextMIME(mimeType: string): boolean {
  if (mimeType.startsWith("text/")) return true;

  // Normalise the MIME type so e.g. "application/json;charset=utf-8" becomes "application/json"
  // We'll just strip any ";charset=" info.
  const [baseType] = mimeType.split(";").map((segment) => segment.trim().toLowerCase());

  return [
    "application/json",
    "application/xml",
    "application/javascript",
    "application/typescript"
  ].includes(baseType);
}

async function main(): Promise<void> {
  // 1. Parse CLI arguments
  const args = minimist(process.argv.slice(2));
  const inputFolderArg: string = args.inputFolder || ".";
  const outputFile: string = args.outputFile || "./context.txt";
  const isDryRun: boolean = Boolean(args["dry-run"]);

  // Compute absolute paths for clearer logging
  const absInputFolder = path.resolve(inputFolderArg);
  const absOutputFile = path.resolve(outputFile);

  console.log(`[INFO] Script invoked with:
    inputFolder = "${inputFolderArg}" (absolute: "${absInputFolder}")
    outputFile  = "${outputFile}"     (absolute: "${absOutputFile}")
    dryRun      = ${isDryRun}
  `);

  // 2. Attempt to locate the nearest Git root
  let gitRoot: string;
  try {
    gitRoot = await findGitRootUp(absInputFolder);
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }
  console.log(`[INFO] Using Git root: "${gitRoot}"`);

  // 3. Compute the relative path from Git root to our input folder
  const relativeInput = path.relative(gitRoot, absInputFolder) || ".";

  console.log(`[INFO] Will gather files from subdirectory: "${relativeInput}" (relative to root: "${gitRoot}")`);

  // 4. Gather files using git ls-files
  //    (tracked + untracked, ignoring .gitignored).
  console.log(`[INFO] Running "git ls-files --others --cached --exclude-standard -- ${relativeInput}" from Git root: "${gitRoot}"`);
  const stdout = await $`git ls-files --others --cached --exclude-standard -- ${relativeInput}`
    .cwd(gitRoot)
    .text();

  let files = stdout.trim().split("\n").filter(Boolean);
  console.log(`[INFO] Number of files discovered (before filtering lock files): ${files.length}`);

  // 5. Filter out lock files or other patterns you may not want.
  //    For simplicity, we reuse your lockFilePatterns from earlier.
  const lockFilePatterns = [
    /\.lockb$/i,
    /\.lock$/i,
    /package-lock\.json$/i,
    /yarn\.lock$/i,
    /pnpm-lock\.ya?ml$/i,
    /composer\.lock$/i,
    /Gemfile\.lock$/i,
    /Cargo\.lock$/i,
    /Pipfile\.lock$/i,
    /poetry\.lock$/i,
    /pubspec\.lock$/i,
    /Podfile\.lock$/i,
    /build\.gradle\.lockfile$/i,
    /mix\.lock$/i
  ];

  files = files.filter(filePath => {
    return !lockFilePatterns.some(pattern => pattern.test(filePath));
  });
  console.log(`[INFO] Number of files discovered (after filtering lock files): ${files.length}`);

  // 6. Read contents of each file with Bun.file if it is textual
  let outputString = "";
  for (const filePath of files) {
    const absoluteFile = path.join(gitRoot, filePath);
    const bunF = bunFile(absoluteFile);
    const mime = bunF.type;

    // Check if it's textual
    if (!isTextMIME(mime)) {
      console.log(`[INFO] Skipping non-text file: "${absoluteFile}" (MIME: "${mime}")`);
      continue;
    }

    console.log(`[INFO] Adding to context: "${absoluteFile}" (MIME: "${mime}")`);
    // read the text
    const fileContents = await bunF.text();
    outputString += `File: ${absoluteFile}\n\n${fileContents}\n\n`;
  }

  // 7. Write or skip based on --dry-run
  if (isDryRun) {
    console.log(`[INFO] Dry run mode is enabled. The context file "${outputFile}" (absolute: "${absOutputFile}") will NOT be created.`);
  } else {
    // Use Bun.write to create or overwrite the file
    await bunWrite(absOutputFile, outputString);
    console.log(`[INFO] Contents saved to "${absOutputFile}".`);
  }
}

// Execute main(), capturing errors
main().catch((err) => {
  console.error("[FATAL] Unexpected error:", err);
  process.exit(1);
});
