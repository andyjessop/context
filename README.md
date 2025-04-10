# Context App

This directory hosts the **Context App**, a TypeScript-based utility designed to locate, collect, and optionally aggregate text files within a Git repository. Its primary goal is to simplify the process of searching for files, filtering out non-textual or lock files, and bundling relevant file content into a single output.

---

## Key Features

1. **Automated Git Root Discovery**
   - Dynamically identifies the nearest Git repository by navigating upwards from a specified folder.
   - Ensures the script operates consistently in projects using Git for version control.

2. **File Gathering and Filtering**
   - Uses `git ls-files` to list tracked and untracked files (excluding those ignored in `.gitignore`).
   - Filters out typical lock files (e.g., `package-lock.json`, `yarn.lock`, etc.) to keep results concise.

3. **Text File Detection**
   - Checks the MIME type of each file to confirm it is textual (e.g., `text/*`, `application/json`, `application/xml`).
   - Skips binaries and other unsupported MIME types.

4. **Context Bundling**
   - Aggregates the contents of all discovered text files into one output file.
   - Supports a _dry run_ mode to display actions without altering the filesystem.

---

## Project Structure

Within `apps/context/`, you will find the following key files:

```
apps/context/
├── src/
│   └── index.ts   (Main script implementing Git root search, file gathering, and output logic)
├── package.json   (Local package configuration, including scripts to serve or compile the app)
└── ...
```

- **`src/index.ts`**
  Contains the primary logic:
  1. Resolve the Git repository root.
  2. List tracked/untracked files.
  3. Filter out lock files.
  4. Determine if a file is text and, if so, read its contents.
  5. (Optionally) write all file contents into a single output file.

- **`package.json`**
  Contains the app-specific scripts:
  ```bash
  bun run serve   # Runs src/index.ts in Bun
  bun run compile # Builds/compiles src/index.ts into a native binary
  ```

---

## Requirements

- **Bun**
  Installation instructions can be found at [bun.sh](https://bun.sh).
  Example installation command for Unix-like systems:
  ```bash
  curl https://bun.sh/install | bash
  ```

- **Git**
  Required for listing and managing repository files.

---

## Installation and Setup

1. **Install Dependencies**

   From the repository root:

   ```bash
   bun install
   ```

   This command installs all dependencies declared in both the root `package.json` and this app’s `package.json`.

2. **Explore the App**

   Navigate to the `apps/context` directory:

   ```bash
   cd apps/context
   ```

3. **Run the App**

   ```bash
   bun run serve
   ```
   This command invokes `src/index.ts`, displaying logs on the terminal about how the app locates the nearest Git root and which files it processes.

---

## Usage

The script accepts optional command-line arguments:

```bash
bun run ./src/index.ts -- [options]
```

| Option              | Description                                                                 | Default Value         |
|---------------------|-----------------------------------------------------------------------------|-----------------------|
| `--inputFolder`     | The directory to begin searching for files.                                 | `.` (current folder)  |
| `--outputFile`      | The path to the output text file that aggregates discovered file contents.  | `./context.txt`       |
| `--dry-run`         | If present, only logs actions without creating or overwriting the output.   | (Disabled by default) |

**Example:**

```bash
bun run ./src/index.ts -- --inputFolder=./docs --outputFile=./results.txt
```
This command searches the `docs` directory relative to the Git repository root, collects text files, and writes them to `results.txt` at the end.

---

## Compile into a Native Binary

To create a standalone executable with Bun’s native compilation:

```bash
bun run compile
```

This generates a binary named `context` (or equivalent) in the `dist` folder, which you can run without requiring Bun:

```bash
./dist/context -- --inputFolder=./src --outputFile=./contextFiles.txt
```

---

## Editor Integration

Though this app is self-contained, the wider repository includes configuration for multiple editors:

- **VSCode**
  A `.vscode/settings.json` file is available at the project root to enable on-save formatting and linting.

- **Zed**
  A `.zed/settings.json` file configures external formatting with Biome.

- **IntelliJ/IDEA**
  `.idea/` contains IntelliJ project configuration and version control mappings.

These settings ensure that code in `src/index.ts` remains consistently formatted and linted.

---

## Concluding Remarks

**Context App** simplifies how you search, compile, and aggregate text-based assets in a Git-controlled repository. By automating file discovery, it provides a reliable means to streamline script-driven tasks in TypeScript and Bun.

For any questions or contributions, please open an issue or raise a pull request in the main repository.
