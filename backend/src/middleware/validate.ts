import type { Request } from 'express';
import { z } from 'zod';
import { AppError } from '../lib/errors.js';

const fmt = (e: z.ZodError) => e.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));

/** Parse & validate one request part with a strict schema. Unknown keys → 400. */
export function parse<S extends z.ZodType>(schema: S, value: unknown, where: string): z.infer<S> {
  const r = schema.safeParse(value ?? {});
  if (!r.success) throw new AppError('VALIDATION_ERROR', `Invalid ${where}`, fmt(r.error));
  return r.data;
}

export const q = <S extends z.ZodType>(req: Request, s: S) => parse(s, req.query, 'query parameters');
export const b = <S extends z.ZodType>(req: Request, s: S) => parse(s, req.body, 'request body');
export const p = <S extends z.ZodType>(req: Request, s: S) => parse(s, req.params, 'path parameters');
