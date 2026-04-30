import { readFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

const TMP_UPLOAD_DIR = '/tmp/uploads'
const SQLITE_MAGIC = 'SQLite format 3'

export async function ensureUploadTempDir(): Promise<string> {
  await mkdir(TMP_UPLOAD_DIR, { recursive: true })
  return TMP_UPLOAD_DIR
}

export async function validateGpkgFile(filePath: string): Promise<boolean> {
  const buffer = await readFile(filePath)
  const magicBytes = buffer.slice(0, SQLITE_MAGIC.length).toString('ascii')

  return magicBytes === SQLITE_MAGIC
}

export function sanitizeFilename(filename: string): string {
  const basename = path.basename(filename)

  return basename
    .replace(/\.\./g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
}

export { TMP_UPLOAD_DIR }
