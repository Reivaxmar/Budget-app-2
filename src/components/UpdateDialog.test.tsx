import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import UpdateDialog from './UpdateDialog';
import { isTauri } from '@tauri-apps/api/core';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import '@testing-library/jest-dom';

vi.mock('@tauri-apps/api/core');
vi.mock('@tauri-apps/plugin-updater');
vi.mock('@tauri-apps/plugin-process');

describe('UpdateDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when not running inside Tauri (e.g. npm run dev in a browser)', async () => {
    vi.mocked(isTauri).mockReturnValue(false);

    const { container } = render(<UpdateDialog />);

    await waitFor(() => expect(isTauri).toHaveBeenCalled());
    expect(check).not.toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when already on the latest version', async () => {
    vi.mocked(isTauri).mockReturnValue(true);
    vi.mocked(check).mockResolvedValue(null);

    const { container } = render(<UpdateDialog />);

    await waitFor(() => expect(check).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the update dialog with the new version when one is available', async () => {
    vi.mocked(isTauri).mockReturnValue(true);
    vi.mocked(check).mockResolvedValue({
      available: true,
      version: '1.2.3',
      downloadAndInstall: vi.fn(),
    } as any);

    render(<UpdateDialog />);

    expect(await screen.findByText(/update available/i)).toBeInTheDocument();
    expect(screen.getByText(/1\.2\.3/)).toBeInTheDocument();
  });

  it('downloads, installs and relaunches when the user clicks Update', async () => {
    const downloadAndInstall = vi.fn().mockResolvedValue(undefined);
    vi.mocked(isTauri).mockReturnValue(true);
    vi.mocked(check).mockResolvedValue({
      available: true,
      version: '1.2.3',
      downloadAndInstall,
    } as any);
    vi.mocked(relaunch).mockResolvedValue(undefined);

    render(<UpdateDialog />);
    await screen.findByText(/update available/i);

    fireEvent.click(screen.getByRole('button', { name: /^update$/i }));

    await waitFor(() => {
      expect(downloadAndInstall).toHaveBeenCalled();
      expect(relaunch).toHaveBeenCalled();
    });
  });

  it('dismisses the dialog when the user clicks Later, without installing anything', async () => {
    vi.mocked(isTauri).mockReturnValue(true);
    vi.mocked(check).mockResolvedValue({
      available: true,
      version: '1.2.3',
      downloadAndInstall: vi.fn(),
    } as any);

    render(<UpdateDialog />);
    await screen.findByText(/update available/i);

    fireEvent.click(screen.getByRole('button', { name: /later/i }));

    expect(screen.queryByText(/update available/i)).not.toBeInTheDocument();
  });

  it('shows an error message and re-enables the button if install fails', async () => {
    const downloadAndInstall = vi.fn().mockRejectedValue(new Error('network blip'));
    vi.mocked(isTauri).mockReturnValue(true);
    vi.mocked(check).mockResolvedValue({
      available: true,
      version: '1.2.3',
      downloadAndInstall,
    } as any);

    render(<UpdateDialog />);
    await screen.findByText(/update available/i);

    fireEvent.click(screen.getByRole('button', { name: /^update$/i }));

    expect(await screen.findByText('network blip')).toBeInTheDocument();
    expect(relaunch).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /^update$/i })).not.toBeDisabled();
  });
});
