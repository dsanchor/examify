import { Request, Response, NextFunction } from 'express';

export interface EasyAuthUser {
  id: string;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: EasyAuthUser;
    }
  }
}

/**
 * Reads Azure Container Apps Easy Auth headers injected by the reverse proxy.
 * Non-blocking: attaches user info if present, passes through otherwise.
 */
export function easyAuthMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const principalId = req.headers['x-ms-client-principal-id'] as string;
  const principalName = req.headers['x-ms-client-principal-name'] as string;

  if (principalId) {
    req.user = {
      id: principalId,
      name: principalName || 'Unknown User',
    };
  }

  next();
}
