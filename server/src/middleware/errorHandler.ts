import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('Error:', err.message);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        message: err.message,
        statusCode: err.statusCode,
      },
    });
    return;
  }

  // Joi validation errors
  if (err.name === 'ValidationError' && 'details' in err) {
    res.status(400).json({
      error: {
        message: err.message,
        statusCode: 400,
      },
    });
    return;
  }

  // Cosmos DB errors
  if ('code' in err && typeof (err as { code: unknown }).code === 'number') {
    const cosmosErr = err as { code: number; message: string };
    if (cosmosErr.code === 404) {
      res.status(404).json({
        error: {
          message: 'Resource not found',
          statusCode: 404,
        },
      });
      return;
    }
    if (cosmosErr.code === 409) {
      res.status(409).json({
        error: {
          message: 'Resource conflict',
          statusCode: 409,
        },
      });
      return;
    }
  }

  // Default server error
  const statusCode = 500;
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'Internal server error';

  res.status(statusCode).json({
    error: {
      message,
      statusCode,
    },
  });
}
