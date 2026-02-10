/**
 * Async file system utilities using vscode.workspace.fs
 * Cross-platform file operations for the extension
 */
import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Writes content to a file, creating parent directories if needed.
 * @param filePath Absolute path to the file
 * @param content Content to write (string or Buffer)
 */
export async function writeFile(filePath: string, content: string | Buffer): Promise<void> {
  const uri = vscode.Uri.file(filePath);
  const data = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
  await vscode.workspace.fs.writeFile(uri, data);
}

/**
 * Reads a file and returns its content as a Buffer.
 * @param filePath Absolute path to the file
 * @returns File content as Buffer
 */
export async function readFile(filePath: string): Promise<Buffer> {
  const uri = vscode.Uri.file(filePath);
  const data = await vscode.workspace.fs.readFile(uri);
  return Buffer.from(data);
}

/**
 * Reads a file and returns its content as a string.
 * @param filePath Absolute path to the file
 * @param encoding Text encoding (default: utf-8)
 * @returns File content as string
 */
export async function readFileAsString(filePath: string, encoding: BufferEncoding = 'utf-8'): Promise<string> {
  const buffer = await readFile(filePath);
  return buffer.toString(encoding);
}

/**
 * Creates a directory, including parent directories if needed.
 * @param dirPath Absolute path to the directory
 */
export async function mkdir(dirPath: string): Promise<void> {
  const uri = vscode.Uri.file(dirPath);
  await vscode.workspace.fs.createDirectory(uri);
}

/**
 * Checks if a file or directory exists.
 * @param fsPath Absolute path to check
 * @returns True if exists, false otherwise
 */
export async function exists(fsPath: string): Promise<boolean> {
  const uri = vscode.Uri.file(fsPath);
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if a path is a directory.
 * @param fsPath Absolute path to check
 * @returns True if directory, false otherwise
 */
export async function isDirectory(fsPath: string): Promise<boolean> {
  const uri = vscode.Uri.file(fsPath);
  try {
    const stat = await vscode.workspace.fs.stat(uri);
    return stat.type === vscode.FileType.Directory;
  } catch {
    return false;
  }
}

/**
 * Checks if a path is a file.
 * @param fsPath Absolute path to check
 * @returns True if file, false otherwise
 */
export async function isFile(fsPath: string): Promise<boolean> {
  const uri = vscode.Uri.file(fsPath);
  try {
    const stat = await vscode.workspace.fs.stat(uri);
    return stat.type === vscode.FileType.File;
  } catch {
    return false;
  }
}

/**
 * Deletes a file or directory.
 * @param fsPath Absolute path to delete
 * @param recursive Whether to delete directories recursively
 */
export async function deleteFile(fsPath: string, recursive = false): Promise<void> {
  const uri = vscode.Uri.file(fsPath);
  await vscode.workspace.fs.delete(uri, { recursive });
}

/**
 * Gets the directory name from a file path.
 * @param filePath Absolute path to a file
 * @returns Directory path
 */
export function dirname(filePath: string): string {
  return path.dirname(filePath);
}

/**
 * Gets the base name from a file path.
 * @param filePath Absolute path to a file
 * @param ext Optional extension to remove
 * @returns Base name
 */
export function basename(filePath: string, ext?: string): string {
  return path.basename(filePath, ext);
}

/**
 * Gets the extension from a file path.
 * @param filePath Absolute path to a file
 * @returns Extension including the dot (e.g., '.md')
 */
export function extname(filePath: string): string {
  return path.extname(filePath);
}

/**
 * Joins path segments.
 * @param segments Path segments to join
 * @returns Joined path
 */
export function joinPath(...segments: string[]): string {
  return path.join(...segments);
}

/**
 * Generates a unique filename by appending a counter if the file exists.
 * @param basePath Base file path (without extension)
 * @param ext File extension (with dot)
 * @returns Unique file path
 */
export async function getUniquePath(basePath: string, ext: string): Promise<string> {
  let candidate = `${basePath}${ext}`;
  let counter = 1;

  while (await exists(candidate)) {
    candidate = `${basePath}-${counter}${ext}`;
    counter++;
  }

  return candidate;
}

/**
 * Ensures the parent directory of a file exists.
 * @param filePath Absolute path to a file
 */
export async function ensureParentDir(filePath: string): Promise<void> {
  const dir = dirname(filePath);
  if (!(await exists(dir))) {
    await mkdir(dir);
  }
}

/**
 * Returns a unique folder path, appending -1, -2, etc. if the folder already exists.
 * @param baseFolderPath Base folder path (without trailing suffix)
 * @returns A folder path that does not yet exist
 */
export async function getUniqueFolderPath(baseFolderPath: string): Promise<string> {
  if (!(await exists(baseFolderPath))) {
    return baseFolderPath;
  }

  let counter = 1;
  let candidate = `${baseFolderPath}-${counter}`;
  while (await exists(candidate)) {
    counter++;
    candidate = `${baseFolderPath}-${counter}`;
  }

  return candidate;
}

/**
 * Validates that a workspace folder is open and returns the first workspace folder.
 * @returns The first workspace folder URI
 * @throws Error if no workspace folder is open
 */
export function getWorkspaceFolder(): vscode.WorkspaceFolder {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    throw new Error('No workspace folder is open. Please open a folder first.');
  }
  return folders[0];
}

/**
 * Checks if a workspace folder is open.
 * @returns True if at least one workspace folder is open
 */
export function hasWorkspaceFolder(): boolean {
  const folders = vscode.workspace.workspaceFolders;
  return !!folders && folders.length > 0;
}

/**
 * Prompts user to open a folder if no workspace is open.
 * @returns True if a workspace folder is now available, false if user cancelled
 */
export async function ensureWorkspaceFolder(): Promise<boolean> {
  if (hasWorkspaceFolder()) {
    return true;
  }

  const action = await vscode.window.showWarningMessage(
    'No folder is open. Please open a folder to save the converted files.',
    'Open Folder',
    'Cancel'
  );

  if (action === 'Open Folder') {
    await vscode.commands.executeCommand('vscode.openFolder');
    // After opening folder, check again (note: this may require extension re-activation)
    return hasWorkspaceFolder();
  }

  return false;
}
