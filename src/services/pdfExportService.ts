import type { Template } from '../domain/models';

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

/** Thrown internally to mean "the user closed the save dialog without choosing anything" — not an error. */
class SaveCancelledError extends Error {}

interface PdfDestination {
  write(blob: Blob): Promise<void>;
}

async function resolveTauriDestination(filename: string): Promise<PdfDestination | null> {
  const { save } = await import('@tauri-apps/plugin-dialog');

  const path = await save({
    defaultPath: filename,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });
  if (!path) {
    return null;
  }

  return {
    async write(blob) {
      // Writing goes through our own `write_binary_file` Rust command
      // rather than `@tauri-apps/plugin-fs`'s `writeFile`: that plugin's
      // write commands are restricted to paths pre-declared in the
      // capability's `fs:scope`, which can't be known ahead of time for a
      // path the user just picked interactively — it would fail with a
      // "not allowed" scope error for any path outside that pre-declared
      // set. A custom command isn't subject to that plugin scope.
      const { invoke } = await import('@tauri-apps/api/core');
      const bytes = Array.from(new Uint8Array(await blob.arrayBuffer()));
      await invoke('write_binary_file', { path, contents: bytes });
    },
  };
}

async function resolveFileSystemAccessDestination(filename: string): Promise<PdfDestination | null> {
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
      types: [{ description: 'PDF document', accept: { 'application/pdf': ['.pdf'] } }],
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

function anchorDestination(filename: string): PdfDestination {
  return {
    async write(blob) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    },
  };
}

/**
 * Resolves where to save the PDF, asking the user immediately — before any
 * of the (potentially slow, cold-import) PDF-building work — because
 * browsers only allow `showSaveFilePicker` while the click that triggered
 * it is still an active user gesture. Awaiting the estimate data fetch or
 * PDF render first would let that gesture expire and the picker would
 * throw a SecurityError on every attempt. Returns null if cancelled.
 */
async function resolveDestination(filename: string): Promise<PdfDestination | null> {
  if (isRunningInTauri()) {
    return resolveTauriDestination(filename);
  }

  if (typeof (window as unknown as { showSaveFilePicker?: unknown }).showSaveFilePicker === 'function') {
    return resolveFileSystemAccessDestination(filename);
  }

  return anchorDestination(filename);
}

export interface ExportEstimatePdfOptions {
  template?: Template;
  /** The estimate's visible number (e.g. "001-26"), if the caller already has it, for a nicer filename. */
  estimateNumber?: string;
}

/**
 * Builds the PDF for a real, persisted estimate (SPECS.md §10 Export PDF)
 * and asks the user where to save it. Uses the given template, or the
 * user's default template when none is specified.
 */
export async function exportEstimatePdf(
  estimateId: string,
  { template, estimateNumber }: ExportEstimatePdfOptions = {}
): Promise<void> {
  const filename = `estimate-${estimateNumber || estimateId}.pdf`;

  try {
    const destination = await resolveDestination(filename);
    if (!destination) {
      return;
    }

    const [{ buildEstimateDocumentData }, { generateEstimatePdfBlob }, { templateService }] =
      await Promise.all([
        import('./documentDataService'),
        import('./pdfService'),
        import('./templateService'),
      ]);

    const data = await buildEstimateDocumentData(estimateId);
    // The estimate's own chosen template (SPECS §9/§21: the template
    // governs presentation for this estimate) takes precedence; only fall
    // back to the default template for older estimates saved before a
    // template was assigned.
    const estimateTemplate = data.estimate.templateId
      ? await templateService.getTemplate(data.estimate.templateId)
      : null;
    const resolvedTemplate = template ?? estimateTemplate ?? (await templateService.getDefaultTemplate());
    const blob = await generateEstimatePdfBlob(data, resolvedTemplate);

    await destination.write(blob);
  } catch (err) {
    if (err instanceof SaveCancelledError) {
      return;
    }
    throw err;
  }
}

export const pdfExportService = {
  exportEstimatePdf,
};
