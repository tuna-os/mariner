/**
 * Service Registry — centralized dependency container
 * 
 * This registry decouples service creation from AppWindow,
 * enabling testable components and explicit dependency contracts.
 */

import { ClipboardService } from './clipboard-service'
import { FileOperations } from './file-operations'
import { UndoService } from '../core/undo-service'
import { ArchiveService } from './archive-service'
import { OperationsQueue } from './operations-queue'
import { QuickLook } from '../ui/quick-look'
import { CommandPalette } from '../ui/command-palette'
import { TagsService } from './tags-service'
import { DirSizeService } from './dir-size-service'
import { RecentFolders } from './recent-folders'

export interface ServiceRegistry {
  clipboard: ClipboardService
  fileOps: FileOperations
  undo: UndoService
  archive: ArchiveService
  opsQueue: OperationsQueue
  quickLook: QuickLook | null
  commandPalette: CommandPalette | null
  tags: TagsService
  dirSize: DirSizeService
  recentFolders: RecentFolders
}

/**
 * Create a new service registry with all services initialized
 */
export function createServiceRegistry(): ServiceRegistry {
  return {
    clipboard: new ClipboardService(),
    fileOps: new FileOperations(),
    undo: new UndoService(),
    archive: new ArchiveService(),
    opsQueue: new OperationsQueue(),
    quickLook: null, // Initialized later in window setup
    commandPalette: null, // Initialized later in window setup
    tags: new TagsService(),
    dirSize: new DirSizeService(),
    recentFolders: new RecentFolders(),
  }
}

/**
 * For testing: create a registry with mock services
 * @param overrides Partial registry with test doubles
 */
export function createTestServiceRegistry(
  overrides?: Partial<ServiceRegistry>,
): ServiceRegistry {
  const defaults = createServiceRegistry()
  return { ...defaults, ...overrides }
}
