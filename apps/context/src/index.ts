#!/usr/bin/env bun
import { $ } from "bun";
import * as fs from "node:fs";
import * as path from "node:path";
import minimist from "minimist";

/**
 * Attempts to locate the nearest Git repository root by:
 *  1. Starting at the given folder (resolved to an absolute path).
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
    } catch (err) {
      // If rev-parse fails, move one directory up and try again.
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) {
        // We've reached the root of the filesystem without success
        console.error(`[ERROR] Failed to find a valid Git repository above "${folder}". Last attempt was "${currentDir}".`);
        throw new Error(`Could not find a valid Git repository above "${folder}".`);
      }
      currentDir = parentDir;
    }
  }
}

async function main(): Promise<void> {
  // 1. Parse CLI arguments
  const args = minimist(process.argv.slice(2));
  const inputFolder: string = args.inputFolder || ".";
  const outputFile: string = args.outputFile || "./context.txt";
  const isDryRun: boolean = Boolean(args["dry-run"]);

  // Compute absolute paths to aid debugging
  const absInputFolder = path.resolve(inputFolder);
  const absOutputFile = path.resolve(outputFile);

  console.log(`[INFO] Script invoked with:
    inputFolder    = "${inputFolder}"   (absolute: "${absInputFolder}")
    outputFile     = "${outputFile}"    (absolute: "${absOutputFile}")
    dryRun         = ${isDryRun}
  `);

  // 2. Attempt to locate a valid Git root by going up the directory tree
  let gitRoot: string;
  try {
    gitRoot = await findGitRootUp(inputFolder);
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }

  console.log(`[INFO] Using Git root: "${gitRoot}"`);

  // 3. Gather files with git ls-files (includes untracked but not ignored)
  console.log(`[INFO] Running "git ls-files --others --cached --exclude-standard -- ${inputFolder}" from Git root: "${gitRoot}"`);
  const stdout = await $`git ls-files --others --cached --exclude-standard -- ${inputFolder}`
    .cwd(gitRoot)
    .text();

  const files = stdout.trim().split("\n").filter(Boolean);
  console.log(`[INFO] Number of files discovered: ${files.length}`);

  // 4. Read contents of each file and form the combined string
  let outputString = "";
  for (const filePath of files) {
    const resolvedPath = path.resolve(gitRoot, filePath);
    console.log(`[INFO] Adding to context: "${resolvedPath}"`);
    const fileContents = fs.readFileSync(resolvedPath, "utf-8");
    outputString += `File: ${resolvedPath}\n\n${fileContents}\n\n`;
  }

  // 5. Respect --dry-run
  if (isDryRun) {
    console.log(`[INFO] Dry run mode is enabled. The context file "${outputFile}" (absolute: "${absOutputFile}") will NOT be created.`);
  } else {
    fs.writeFileSync(absOutputFile, outputString);
    console.log(`[INFO] Contents saved to "${absOutputFile}".`);
  }
}

// Execute main(), capturing errors
main().catch((err) => {
  console.error("[FATAL] Unexpected error:", err);
  process.exit(1);
});
