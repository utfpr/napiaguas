export class GeometryParseError extends Error {
  constructor(
    message: string,
    public readonly rawGeometry: string,
    public readonly cause?: Error,
  ) {
    super(message)
    this.name = 'GeometryParseError'

    if (cause && cause.stack) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`
    }

    Object.setPrototypeOf(this, GeometryParseError.prototype)
  }

  // Retorna os primeiros 200 caracteres da geometria para uso em logs.
  getSafeRawGeometryPreview(): string {
    return this.rawGeometry.length > 200
      ? `${this.rawGeometry.substring(0, 200)}...`
      : this.rawGeometry
  }
}
