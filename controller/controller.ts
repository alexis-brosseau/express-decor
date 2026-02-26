import express from 'express';
import type { Router, Request, Response, NextFunction } from 'express';

export interface RouteDefinition {
  method: keyof Router;
  path: string;
  handler: string;
}

export default class Controller {
  public router: Router;
  static routes?: RouteDefinition[];

  constructor() {
    this.router = express.Router();
    this.router.all('*splat', (req: Request, res: Response, next: NextFunction) => {
      next();
    });

    // Register routes from decorators
    const routes: RouteDefinition[] = (this.constructor as typeof Controller).routes || [];
    for (const { method, path, handler } of routes) {
      (this.router[method] as any).call(this.router, path, (this as any)[handler].bind(this));
    }
  }
}
