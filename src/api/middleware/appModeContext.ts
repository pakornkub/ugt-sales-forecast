import type { NextFunction, Request, Response } from 'express';
import {
  getAppConfigPublic,
  parsePublicAppMode,
  runWithAppMode,
  type AppMode,
} from '../../config/appMode';

export type RequestWithAppMode = Request & { appMode?: AppMode };

function extractModeFromRequest(req: Request): AppMode {
  const queryMode = typeof req.query.mode === 'string' ? req.query.mode : undefined;
  const headerMode = req.header('x-app-mode') ?? undefined;
  return parsePublicAppMode(queryMode ?? headerMode);
}

/**
 * Attach request-scoped app mode for the remainder of the Express pipeline.
 * ALS wraps next() so async route handlers keep the mode across awaits.
 */
export function appModeContext(req: Request, _res: Response, next: NextFunction) {
  const mode = extractModeFromRequest(req);
  (req as RequestWithAppMode).appMode = mode;
  runWithAppMode(mode, () => {
    next();
  });
}

export function sendAppConfig(req: Request, res: Response) {
  const mode = (req as RequestWithAppMode).appMode ?? extractModeFromRequest(req);
  res.json(getAppConfigPublic(mode));
}
