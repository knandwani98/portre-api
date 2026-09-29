export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly expose: boolean;

  constructor(statusCode: number, code: string, message: string, expose = true) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.expose = expose;
  }
}

export function notFound(message = 'Not found'): AppError {
  return new AppError(404, 'NOT_FOUND', message);
}

export function badRequest(message: string, code = 'BAD_REQUEST'): AppError {
  return new AppError(400, code, message);
}

export function conflict(message: string, code = 'CONFLICT'): AppError {
  return new AppError(409, code, message);
}

export function unauthorized(message = 'Unauthorized'): AppError {
  return new AppError(401, 'UNAUTHORIZED', message);
}

export function forbidden(message = 'Forbidden'): AppError {
  return new AppError(403, 'FORBIDDEN', message);
}
