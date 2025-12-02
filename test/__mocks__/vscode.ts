// VS Code mock for Jest unit testing
// This mock allows testing conversion logic without VS Code context

export const window = {
  showInformationMessage: jest.fn(),
  showWarningMessage: jest.fn(),
  showErrorMessage: jest.fn(),
  showOpenDialog: jest.fn(),
  showSaveDialog: jest.fn(),
  createOutputChannel: jest.fn(() => ({
    appendLine: jest.fn(),
    append: jest.fn(),
    show: jest.fn(),
    dispose: jest.fn(),
  })),
  withProgress: jest.fn((options, task) => task({ report: jest.fn() })),
  createWebviewPanel: jest.fn(() => ({
    webview: {
      html: '',
      onDidReceiveMessage: jest.fn(),
      postMessage: jest.fn(),
    },
    onDidDispose: jest.fn(),
    dispose: jest.fn(),
  })),
};

export const workspace = {
  fs: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    stat: jest.fn(),
    createDirectory: jest.fn(),
    delete: jest.fn(),
  },
  getConfiguration: jest.fn(() => ({
    get: jest.fn((key: string, defaultValue?: unknown) => defaultValue),
  })),
  workspaceFolders: [
    {
      uri: { fsPath: '/mock/workspace', scheme: 'file' },
      name: 'mock-workspace',
      index: 0,
    },
  ],
};

export const Uri = {
  file: jest.fn((path: string) => ({
    fsPath: path,
    scheme: 'file',
    path,
  })),
  parse: jest.fn((uriString: string) => ({
    fsPath: uriString,
    scheme: 'file',
    path: uriString,
  })),
};

export const commands = {
  registerCommand: jest.fn(),
  executeCommand: jest.fn(),
};

export const env = {
  clipboard: {
    readText: jest.fn(),
    writeText: jest.fn(),
  },
};

export const ViewColumn = {
  One: 1,
  Two: 2,
  Three: 3,
};

export const ProgressLocation = {
  Notification: 15,
  SourceControl: 1,
  Window: 10,
};

export const ExtensionContext = jest.fn();

export class Disposable {
  static from(...disposables: { dispose: () => void }[]) {
    return {
      dispose: () => disposables.forEach((d) => d.dispose()),
    };
  }
  dispose() {}
}
