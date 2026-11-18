export type ArchiveFormat = 'zip' | 'tar.xz' | 'tar.gz' | '7z'

/* argv for the Compress action. Pure (no GTK), so tests/ can import it.
 *
 * `names` are basenames read from the filesystem, so they are untrusted: a file
 * can be called `-m`, `-TTcmd` or `@list`. Every tool therefore gets `--` before
 * the names, which ends option parsing (and, for 7z, @listfile parsing).
 * Without it, zip runs the command carried by a `-T` + `-TTcmd` pair of names,
 * zip `-m` and 7z `-sdel` delete the files being archived, and 7z `@list` adds
 * whatever paths the file `list` names. */
export function compressArgv(format: ArchiveFormat, out: string, names: string[]): string[] {
  switch (format) {
    case 'zip':
      return ['zip', '-r', out, '--', ...names]
    case 'tar.gz':
      return ['tar', '-czf', out, '--', ...names]
    case 'tar.xz':
      return ['tar', '-cJf', out, '--', ...names]
    case '7z':
      return ['7z', 'a', out, '--', ...names]
  }
}

/* File names "Extract Here" treats as archives. */
export const ARCHIVE_RE = /\.(zip|tar|tar\.gz|tgz|tar\.bz2|tbz2?|tar\.xz|txz|tar\.zst|7z|rar|jar)$/i

/* Name of the folder an archive is extracted into: the archive's name without
 * its extension, with a counter from the second attempt on (the caller asks
 * again while the name is taken). Pure, so tests/ can import it.
 *
 * The name comes from the filesystem. `.zip`, `..zip` and `...zip` leave a stem
 * that is empty, `.` or `..`, which would name the folder being viewed or its
 * parent instead of a new folder, so those fall back to a fixed name. */
export function extractFolderName(archiveName: string, attempt = 1): string {
  const stem = archiveName.replace(ARCHIVE_RE, '')
  const base = stem === '' || stem === '.' || stem === '..' ? 'Archive' : stem
  return attempt > 1 ? `${base} (${attempt})` : base
}
