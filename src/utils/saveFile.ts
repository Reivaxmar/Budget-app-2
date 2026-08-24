// Resolves a user-chosen save location for a Blob and writes it there,
// picking the right mechanism per environment:
//  - Packaged Tauri app: the native OS save dialog (@tauri-apps/plugin-dialog)
//    plus a custom Rust command to write arbitrary bytes to the chosen path.
//    A plain `<a download>` link does nothing in the Tauri webview — no
//    dialog, no error, the click is just silently swallowed — which is why
//    that can't be the only mechanism here (see pdfExportService, which
//    originally had this exact logic before it was extracted here so JSON
//    exports could share it too).
//  - A browser that supports the File System Access API: its native
//    `showSaveFilePicker`.
//  - Any other browser: an anchor `download` link (works fine there, just
//    not inside Tauri).

export interface SaveDestination {
  write(blob: Blob): Promise<void>;
}

export interface SaveFileFilter {
  name: string;
  extensions: string[];
}

function isRunningInTauri(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const runtime = window as Window & {
    __TAURI_INTERNALS__?: unknown;
    isTauri?: unknown;
  };

  if (runtime.__TAURI_INTERNALS__ && typeof runtime.__TAURI_INTERNALS__ === 'object') {
    return true;
  }

  if (typeof runtime.isTauri === 'function') {
    return runtime.isTauri() === true;
  }

  return typeof navigator !== 'undefined' && navigator.userAgent.includes('Tauri');
}

async function resolveTauriDestination(
  filename: string,
  filters: SaveFileFilter[]
): Promise<SaveDestination | null> {
  const { save } = await import('@tauri-apps/plugin-dialog');

  const path = await save({ defaultPath: filename, filters });
  if (!path) {
    return null;
  }

  return {
    async write(blob) {
      // Goes through our own `write_binary_file` Rust command rather than
      // `@tauri-apps/plugin-fs`'s `writeFile`: that plugin's write commands
      // are restricted to paths pre-declared in the capability's `fs:scope`,
      // which can't be known ahead of time for a path the user just picked
      // interactively — it would fail with a "not allowed" scope error for
      // any path outside that pre-declared set. A custom command isn't
      // subject to that plugin scope.
      const { invoke } = await import('@tauri-apps/api/core');
      const bytes = Array.from(new Uint8Array(await blob.arrayBuffer()));
      await invoke('write_binary_file', { path, contents: bytes });
    },
  };
}

async function resolveFileSystemAccessDestination(
  filename: string,
  filters: SaveFileFilter[]
): Promise<SaveDestination | null> {
  const picker = (
    window as unknown as {
      showSaveFilePicker: (options: {
        suggestedName: string;
        types: Array<{ description: string; accept: Record<string, string[]> }>;
      }) => Promise<FileSystemFileHandle>;
    }
  ).showSaveFilePicker;

  let handle: FileSystemFileHandle;
  try {
    handle = await picker({
      suggestedName: filename,
      types: filters.map((filter) => ({
        description: filter.name,
        accept: { '*/*': filter.extensions.map((ext) => `.${ext}`) },
      })),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return null;
    }
    throw err;
  }

  return {
    async write(blob) {
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
    },
  };
}

function anchorDestination(filename: string): SaveDestination {
  return {
    async write(blob) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
  };
}

/**
 * Resolves where to save a file, asking the user immediately — before any
 * potentially slow work (fetching data, building a PDF) — because browsers
 * only allow `showSaveFilePicker` while the click that triggered it is
 * still an active user gesture. Await slow work first and the gesture
 * expires; the picker then throws a SecurityError on every attempt. Returns
 * null if the user cancels the dialog/picker.
 */
export async function resolveSaveDestination(
  filename: string,
  filters: SaveFileFilter[]
): Promise<SaveDestination | null> {
  if (isRunningInTauri()) {
    return resolveTauriDestination(filename, filters);
  }

  if (typeof (window as unknown as { showSaveFilePicker?: unknown }).showSaveFilePicker === 'function') {
    return resolveFileSystemAccessDestination(filename, filters);
  }

  return anchorDestination(filename);
}

/**
 * Convenience wrapper for the common case: the data to save is already
 * available synchronously (nothing to await before showing the save
 * dialog). Returns whether the file was actually saved (false if the user
 * cancelled).
 */
export async function saveJsonFile(filename: string, data: unknown): Promise<boolean> {
  const destination = await resolveSaveDestination(filename, [{ name: 'JSON', extensions: ['json'] }]);
  if (!destination) {
    return false;
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  await destination.write(blob);
  return true;
}
