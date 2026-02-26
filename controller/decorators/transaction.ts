
import type HttpContext from "../../httpContext.js";
import { transaction } from "../../database/database.js";

// Add a 'db' property to the HttpContext
// Each call to the decorated method will run in a transaction
export const useTransaction = () => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
  const originalMethod = descriptor.value;
  descriptor.value = async function (ctx: HttpContext, ...args: any[]) {
    return await transaction(async (db) => {
      return await originalMethod.call(this, { ...ctx, db }, ...args);
    });
  };
}