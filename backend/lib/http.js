/** Error carrying an HTTP status, so routes can throw instead of branching. */
export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const notFound = (what) => new HttpError(404, `${what} not found`);

/** Wraps a route handler so thrown errors reach the error middleware. */
export const asyncHandler = (handler) => (req, res, next) => {
  try {
    const result = handler(req, res, next);
    if (result && typeof result.catch === 'function') result.catch(next);
  } catch (error) {
    next(error);
  }
};

/**
 * Validates `req.body` against a Zod schema, replacing it with the parsed
 * (defaults-applied) value. Invalid bodies become a 400 with field details.
 */
export const validateBody = (schema) => (req, _res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return next(
      new HttpError(
        400,
        'Request body failed validation',
        result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      ),
    );
  }
  req.body = result.data;
  return next();
};
