import type HttpContext from "../../httpContext.js";
import { UnauthorizedError, BadRequestError } from "../../errors.js";
import { verifyAccessToken } from "../../jwt/jwt.js";

// Take a UserRole and checks if the user has sufficient role to access the route
// Add a 'user' property to the HttpContext
export function auth() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (ctx: HttpContext, ...args: any[]) {
      const { req } = ctx;

      const authHeader = req.headers.authorization;
      if (!authHeader) throw new UnauthorizedError("Unauthorized");

      const [type, accessToken] = authHeader.split(' ');
      if (type !== 'Bearer') throw new BadRequestError("Invalid token type");
      if (!accessToken) throw new BadRequestError("Invalid token");

      const token = verifyAccessToken(accessToken);
      if (!token) throw new UnauthorizedError("Invalid or expired token");

      return await originalMethod.call(this, { ...ctx, token }, ...args);
    }
  }
}