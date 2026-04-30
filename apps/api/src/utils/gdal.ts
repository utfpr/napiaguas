// Wrapper para ogr2ogr (GDAL) executado via child_process com suporte a timeout.
// Requer GDAL 3.4+ instalado (incluso nos Dockerfiles de API).

import { spawn } from 'child_process';
import { promisify as _promisify } from 'util';
import { access } from 'fs/promises';

export class GDALError extends Error {
  constructor(
    message: string,
    public readonly exitCode: number | null,
    public readonly stderr: string
  ) {
    super(message);
    this.name = 'GDALError';
  }
}

export class GDALTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GDALTimeoutError';
  }
}

interface GDALConversionOptions {
  timeout?: number;
  layerName?: string;
}

export async function verifyGDALInstallation(): Promise<string> {
  return new Promise((resolve, reject) => {
    const process = spawn('ogr2ogr', ['--version']);
    let stdout = '';
    let stderr = '';

    process.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    process.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      if (code !== 0) {
        reject(new GDALError(
          'ogr2ogr not found or not working properly',
          code,
          stderr
        ));
        return;
      }

      resolve(stdout.trim());
    });

    process.on('error', (error) => {
      reject(new GDALError(
        `Failed to execute ogr2ogr: ${error.message}`,
        null,
        error.message
      ));
    });
  });
}

export async function convertGeoJSONToGPKG(
  inputPath: string,
  outputPath: string,
  options: GDALConversionOptions = {}
): Promise<void> {
  const {
    timeout = 60000,
    layerName = 'features'
  } = options;

  try {
    await access(inputPath);
  } catch (error) {
    throw new GDALError(
      `Input file not found: ${inputPath}`,
      null,
      (error as Error).message
    );
  }

  const args = [
    '-f', 'GPKG',
    outputPath,
    inputPath,
    '-nln', layerName
  ];

  return new Promise((resolve, reject) => {
    const process = spawn('ogr2ogr', args);
    let stderr = '';
    let timeoutId: NodeJS.Timeout;
    let isTimedOut = false;

    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        isTimedOut = true;
        process.kill('SIGTERM');
        reject(new GDALTimeoutError(
          `ogr2ogr conversion exceeded timeout of ${timeout}ms`
        ));
      }, timeout);
    }

    process.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (isTimedOut) {
        return;
      }

      if (code !== 0) {
        reject(new GDALError(
          `ogr2ogr failed with exit code ${code}`,
          code,
          stderr
        ));
        return;
      }

      resolve();
    });

    process.on('error', (error) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (isTimedOut) {
        return;
      }

      reject(new GDALError(
        `Failed to execute ogr2ogr: ${error.message}`,
        null,
        error.message
      ));
    });
  });
}

// Valida um GPKG inspecionando os magic bytes do SQLite e o application_id do GeoPackage.
export async function isValidGPKG(filePath: string): Promise<boolean> {
  try {
    const fs = await import('fs/promises');
    const buffer = Buffer.alloc(72);

    const fileHandle = await fs.open(filePath, 'r');
    try {
      await fileHandle.read(buffer, 0, 72, 0);

      const sqliteMagic = buffer.toString('utf8', 0, 15);
      if (!sqliteMagic.startsWith('SQLite format 3')) {
        return false;
      }

      const gpkgMagic = buffer.toString('utf8', 68, 72);
      return gpkgMagic === 'GP10' || gpkgMagic === 'GP11' || gpkgMagic === 'GPKG';
    } finally {
      await fileHandle.close();
    }
  } catch (_error) {
    return false;
  }
}
