/**
 * Errors customizados para o processo de upload
 */

export class MissingColumnError extends Error {
  constructor(public missingColumns: string[]) {
    super(`Missing columns: ${missingColumns.join(', ')}`)
    this.name = 'MissingColumnError'
  }
}

export class InvalidGeometryError extends Error {
  constructor(
    public line: number,
    public reason: string
  ) {
    super(`Invalid geometry at line ${line}: ${reason}`)
    this.name = 'InvalidGeometryError'
  }
}

export class InvalidFileTypeError extends Error {
  constructor(public receivedType: string) {
    super(`Invalid file type: ${receivedType}`)
    this.name = 'InvalidFileTypeError'
  }
}

export class FileTooLargeError extends Error {
  constructor(
    public fileSize: number,
    public maxSize: number
  ) {
    super(`File size ${fileSize} bytes exceeds maximum ${maxSize} bytes`)
    this.name = 'FileTooLargeError'
  }
}

export class InvalidDataTypeError extends Error {
  constructor(
    public line: number,
    public column: string,
    public value: string,
    public expectedType: string
  ) {
    super(
      `Invalid value at line ${line}, column '${column}': '${value}' is not a valid ${expectedType}`
    )
    this.name = 'InvalidDataTypeError'
  }
}
