import { ClipboardService } from './clipboard-service.ts'
import { FileOperations } from './file-operations.ts'
import { UndoService } from './undo-service.ts'
import { ArchiveService } from './archive-service.ts'

/**
 * ServiceRegistry encapsulates all application services.
 * This allows:
 * - Services to be created once at app startup (not in AppWindow)
 * - Services to be injected into AppWindow (testable with mocks)
 * - Services to be reused in other contexts (CLI, headless tools)
 * - Clear dependency graph (all services in one place)
 */
export class ServiceRegistry {
  clipboard: ClipboardService
  fileOps: FileOperations
  undo: UndoService
  archive: ArchiveService

  constructor() {
    this.clipboard = new ClipboardService()
    this.fileOps = new FileOperations()
    this.undo = new UndoService()
    this.archive = new ArchiveService()
  }
}
