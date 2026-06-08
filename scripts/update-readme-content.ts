#!yarn tsx

import execa from 'execa';
import fs from 'fs';
import path from 'path';

type Workspace = {
  location: string;
  name: string;
  workspaceDependencies: string[];
  description: string;
};

const DEPENDENCY_GRAPH_START_MARKER = '<!-- start dependency graph -->';
const DEPENDENCY_GRAPH_END_MARKER = '<!-- end dependency graph -->';
const PACKAGE_LIST_START_MARKER = '<!-- start package list -->';
const PACKAGE_LIST_END_MARKER = '<!-- end package list -->';
const README_PATH = path.resolve(__dirname, '../README.md');

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

/**
 * The entrypoint to this script.
 *
 * Uses `yarn workspaces list` to:
 *
 * 1. Retrieve all of the workspace packages in this project and their relationships to each other.
 * 2. Produce a Markdown fragment that represents a Mermaid graph.
 * 3. Produce a Markdown fragment that represents a list of the workspace packages, and links to them.
 * 4. Update the README with the new content.
 */
async function main(): Promise<void> {
  const workspaces = await retrieveWorkspaces();
  // Only the published libraries under `packages/` drive the auto-generated
  // sections. Playgrounds and other non-private workspaces are documented by
  // hand in the README (Playgrounds table) and in docs/architecture.md.
  const publishedPackages = workspaces.filter((workspace) =>
    workspace.location.startsWith('packages/'),
  );
  await updateReadme(
    getDependencyGraph(publishedPackages),
    getPackageList(publishedPackages),
  );
  console.log('README content updated.');
}

/**
 * Uses the `yarn` executable to gather the Yarn workspaces inside of this
 * project (the packages that are matched by the `workspaces` field inside of
 * `package.json`).
 *
 * @returns The list of workspaces.
 */
async function retrieveWorkspaces(): Promise<Workspace[]> {
  const { stdout } = await execa('yarn', [
    'workspaces',
    'list',
    '--json',
    '--no-private',
    '--verbose',
  ]);

  return stdout.split('\n').map((line) => {
    const workspace = JSON.parse(line) as Omit<Workspace, 'description'>;
    const manifestPath = path.resolve(
      __dirname,
      '..',
      workspace.location,
      'package.json',
    );
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    return { ...workspace, description: manifest.description ?? '' };
  });
}

/**
 * Gets the Markdown fragment that represents a Mermaid graph of the
 * dependencies between the workspace packages in this project.
 *
 * @param workspaces - The Yarn workspaces inside of this project.
 * @returns The new dependency graph Markdown fragment.
 */
function getDependencyGraph(workspaces: Workspace[]): string {
  const nodeLines = buildMermaidNodeLines(workspaces);
  const connectionLines = buildMermaidConnectionLines(workspaces);
  return assembleMermaidMarkdownFragment(nodeLines, connectionLines);
}

/**
 * Builds a piece of the Mermaid graph by defining a node for each workspace
 * package within this project.
 *
 * @param workspaces - The Yarn workspaces inside of this project.
 * @returns A set of lines that will go into the final Mermaid graph.
 */
function buildMermaidNodeLines(workspaces: Workspace[]): string[] {
  return workspaces.map((workspace) => {
    const fullPackageName = workspace.name;
    const shortPackageName = fullPackageName
      .replace(/^@metamask\//u, '')
      .replace(/-/gu, '_');
    return `${shortPackageName}(["${fullPackageName}"]);`;
  });
}

/**
 * Builds a piece of the Mermaid graph by defining connections between nodes
 * that correspond to dependencies between workspace packages within this
 * project.
 *
 * @param workspaces - The Yarn workspaces inside of this project.
 * @returns A set of lines that will go into the final Mermaid graph.
 */
function buildMermaidConnectionLines(workspaces: Workspace[]): string[] {
  const connections: string[] = [];
  workspaces.forEach((workspace) => {
    const fullPackageName = workspace.name;
    const shortPackageName = fullPackageName
      .replace(/^@metamask\//u, '')
      .replace(/-/gu, '_');
    workspace.workspaceDependencies.forEach((dependency) => {
      const shortDependencyName = dependency
        .replace(/^packages\//u, '')
        .replace(/-/gu, '_');
      connections.push(`${shortPackageName} --> ${shortDependencyName};`);
    });
  });
  return connections;
}

/**
 * Creates the Mermaid graph from the given node lines and connection lines,
 * wrapping it in a triple-backtick directive so that it can be embedded within
 * a Markdown document.
 *
 * @param nodeLines - The set of nodes in the graph as lines.
 * @param connectionLines - The set of connections in the graph as lines.
 * @returns The graph in string format.
 */
function assembleMermaidMarkdownFragment(
  nodeLines: string[],
  connectionLines: string[],
): string {
  return [
    '```mermaid',
    "%%{ init: { 'flowchart': { 'curve': 'bumpX' } } }%%",
    'graph LR;',
    'linkStyle default opacity:0.5',
    ...nodeLines.map((line) => `  ${line}`),
    ...connectionLines.map((line) => `  ${line}`),
    '```',
  ].join('\n');
}

/**
 * Gets the Markdown fragment that represents a list of the workspace packages
 * in this project.
 *
 * @param workspaces - The Yarn workspaces inside of this project.
 * @returns The new package list Markdown fragment.
 */
function getPackageList(workspaces: Workspace[]): string {
  const rows = workspaces
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((workspace) => [
      `[\`${workspace.name}\`](${workspace.location})`,
      `[npm](https://www.npmjs.com/package/${workspace.name})`,
      workspace.description,
    ]);
  return formatMarkdownTable(['Package', 'npm', 'Description'], rows);
}

/**
 * Formats a Markdown table with columns aligned to their widest cell, matching
 * Prettier's output so the regenerated README passes `yarn lint:misc --check`
 * without a separate formatting pass.
 *
 * @param headers - The column header cells.
 * @param rows - The table rows, each an array of cells aligned to `headers`.
 * @returns The aligned Markdown table as a string.
 */
function formatMarkdownTable(headers: string[], rows: string[][]): string {
  const widths = headers.map((header, column) =>
    Math.max(3, header.length, ...rows.map((row) => row[column].length)),
  );
  const formatRow = (cells: string[]): string =>
    `| ${cells.map((cell, column) => cell.padEnd(widths[column])).join(' | ')} |`;
  const separator = `| ${widths.map((width) => '-'.repeat(width)).join(' | ')} |`;
  return [formatRow(headers), separator, ...rows.map(formatRow)].join('\n');
}

/**
 * Updates the dependency graph section in the README with the given Markdown
 * fragment.
 *
 * @param newGraph - The new dependency graph Markdown fragment.
 * @param newPackageList - The new package list Markdown fragment.
 */
async function updateReadme(
  newGraph: string,
  newPackageList: string,
): Promise<void> {
  const readmeContent = await fs.promises.readFile(README_PATH, 'utf8');

  // Dependency graph
  let newReadmeContent = readmeContent.replace(
    new RegExp(
      `(${DEPENDENCY_GRAPH_START_MARKER}).+(${DEPENDENCY_GRAPH_END_MARKER})`,
      'su',
    ),
    (_match, startMarker, endMarker) =>
      [startMarker, '', newGraph, '', endMarker].join('\n'),
  );

  // Package list
  newReadmeContent = newReadmeContent.replace(
    new RegExp(
      `(${PACKAGE_LIST_START_MARKER}).+(${PACKAGE_LIST_END_MARKER})`,
      'su',
    ),
    (_match, startMarker, endMarker) =>
      [startMarker, '', newPackageList, '', endMarker].join('\n'),
  );

  await fs.promises.writeFile(README_PATH, newReadmeContent);
}
