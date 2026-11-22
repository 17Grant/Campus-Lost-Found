import { Request, Response, NextFunction } from 'express';
import { ZodTypeAny } from 'zod';

type Source = 'body' | 'query' | 'params';

// Express 5 makes req.query read-only, so parsed query/params go on res.locals.
// Parsed body replaces req.body.
export function validate(schema: ZodTypeAny, source: Source = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors,
      });
    }
    if (source === 'body') req.body = result.data;
    else res.locals[source] = result.data;
    next();
  };
}