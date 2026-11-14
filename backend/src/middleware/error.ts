import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '../lib/errors.js';

export const notFoundHandler: RequestHandler = (_req, _res, next) => next(new AppError('NOT_FOUND', 'Route not found'));

/**
 * Single exit point for errors. Maps known failures to the public error
 * envelope and never leaks stack traces, driver messages or internals.
 */
export const errorHandler =
  (isProd: boolean): ErrorRequestHandler =>
  (err, req, res, _next) => {
    let e: AppError;
    if (err instanceof AppError) e = err;
    else if (err?.type === 'entity.too.large') e = new AppError('PAYLOAD_TOO_LARGE', 'Request body too large');
    else if (err?.type === 'entity.parse.failed') e = new AppError('VALIDATION_ERROR', 'Malformed JSON body');
    else if (err?.type === 'charset.unsupported' || err?.type === 'encoding.unsupported')
      e = new AppError('UNSUPPORTED_MEDIA_TYPE', 'Unsupported encoding');
    else if (err?.code === 11000) e = new AppError('CONFLICT', 'Resource already exists');
    else if (err?.name === 'CastError' || err?.name === 'ValidationError' || err?.name === 'StrictModeError')
      e = new AppError('VALIDATION_ERROR', 'Invalid input');
    else e = new AppError('INTERNAL', 'Something went wrong');

    if (e.status >= 500) req.log?.error({ err }, 'unhandled error');
    else req.log?.warn({ code: e.code, reason: e.message }, 'request rejected');

    res.status(e.status).json({
      error: {
        code: e.code,
        message: e.message,
        requestId: req.id,
        ...(e.details !== undefined ? { details: e.details } : {}),
        ...(!isProd && e.status >= 500 && err instanceof Error ? { debug: err.message } : {}),
      },
    });
  };
