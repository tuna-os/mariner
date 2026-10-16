import type { GFile } from './types.ts'
import { ClipboardService } from '../services/clipboard-service.ts'
import { FileOperations } from '../services/file-operations.ts'
import { UndoService } from '../services/undo-service.ts'
import { ArchiveService } from '../services/archive-service.ts'
import { OperationsQueue } from '../ui/operations-queue.ts'
import { QuickLook } from '../ui/preview.ts'
import { CommandPalette } from '../ui/command-palette.ts'
import { tagsService } from '../services/tags-service.ts'
import { dirSizes } from '../services/dir-size-service.ts'
import { recentFolders } from '../services/recent-folders.ts'
import { loadWindowState } from '../services/window-state.ts'
import { loadViewPrefs } from '../services/view-prefs.ts'

/**
 * ServiceRegistry manages the lifecycle and creation of all application services.
 * This centralizes service instantiation and enables dependency injection for better
 * testability and loose coupling.
 *
 * Services are created at application startup and shared across all windows.
 * This allows:
 * - Easy testing by providing mock implementations
 * - Explicit dependency contracts
 * - Clear service ownership and lifecycle
 */
export interface Services {
  clipboard: ClipboardService
  fileOps: FileOperations
  undo: UndoService
  archive: ArchiveService
  opsQueue: OperationsQueue
  quickLook: QuickLook | null
  palette: CommandPalette | null
  tags: any
  dirSizes: any
  recentFolders: any
}

export class ServiceRegistry {
  private static instance: ServiceRegistry | null = null
  private services: Services | null = null

  private constructor() {}

  /**
   * Get or create the global service registry singleton.
   */
  static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry()
    }
    return ServiceRegistry.instance
  }

  /**
   * Initialize all services. Called once at application startup.
   * Services are long-lived and shared across all windows.
   */
  initialize(prefs: any): Services {
    if (this.services) {
      return this.services
    }

    this.services = {
      clipboard: new ClipboardService(),
      fileOps: new FileOperations(),
      undo: new UndoService(),
      archive: new ArchiveService(),
      opsQueue: new OperationsQueue(),
      quickLook: null,
      palette: null,
      tags: tagsService,
      dirSizes: dirSizes,
      recentFolders: recentFolders,
    }

    // Configure stateful services based on preferences
    this.services.dirSizes.enabled = prefs.dirSizes ?? false
    this.services.dirSizes.ttlMs = (prefs.dirSizesTtl ?? 5) * 60_000

    return this.services
  }

  /**
   * Get the initialized services.
   * Must be called after initialize().
   */
  getServices(): Services {
    if (!this.services) {
      throw new Error('ServiceRegistry not initialized. Call initialize() first.')
    }
    return this.services
  }

  /**
   * Reset the registry (mainly for testing).
   */
  reset(): void {
    this.services = null
    ServiceRegistry.instance = null
  }

  /**
   * Replace a service with a mock (for testing).
   */
  setService<K extends keyof Services>(name: K, service: Services[K]): void {
    if (!this.services) {
      throw new Error('ServiceRegistry not initialized.')
    }
    this.services[name] = service
  }
}
