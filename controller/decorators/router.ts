import type { Router, Request, Response, NextFunction } from 'express';
import type HttpContext from '../../httpContext.js';

// Factory to create method decorators
function createRouterDecorator(method: keyof Router) {
  return function (path: string) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      if (!target.constructor.routes) target.constructor.routes = [];

      const original = descriptor.value;

      descriptor.value = async function (req: Request, res: Response, next: NextFunction) {
        const ctx: HttpContext = {
          req,
          res,
          token: req.token,
        };

        try {
          await original.call(this, ctx);
        } catch (err) {
          next(err);
        }
      };

      target.constructor.routes.push({ method, path, handler: propertyKey });
    };
  };
}

export const get = createRouterDecorator('get');
export const post = createRouterDecorator('post');
export const put = createRouterDecorator('put');
export const del = createRouterDecorator('delete'); // 'delete' is a reserved word
export const patch = createRouterDecorator('patch');
export const options = createRouterDecorator('options');
export const head = createRouterDecorator('head');
