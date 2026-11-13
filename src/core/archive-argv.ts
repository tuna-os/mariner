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
