import type HttpContext from "../../httpContext.js";
import { BadRequestError } from "../../errors.js";

// Custom types
export class UUID { name = 'UUID' };
export class Email { name = 'Email' };

// Supported types
type Constructor =
  | StringConstructor
  | NumberConstructor
  | BooleanConstructor
  | ObjectConstructor
  | typeof UUID
  | typeof Email;

// Optional type wrapper
class ArrayOfConstructor {
  constructor(public type: Constructor) {
    this.type = type;
  }
}

type Schema = Constructor | ArrayOfConstructor;

class OptionalConstructor {
  constructor(public type: Schema) {
    this.type = type;
  }
}

export function Optional(type: Schema) {
  return new OptionalConstructor(type);
}

export function ArrayOf(type: Constructor) {
  return new ArrayOfConstructor(type);
}

// Validate a value against a type
const typeValidators: Record<Constructor['name'], (value: any) => boolean> = {
  String: (v) => typeof v === 'string' && v.length > 0,
  Number: (v) => typeof v === 'number',
  Boolean: (v) => typeof v === 'boolean',
  Object: (v) => typeof v === 'object' && v !== null && !Array.isArray(v),
  UUID: (v) => typeof v === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v),
  Email: (v) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
};

type FieldDefinition = Schema | OptionalConstructor;

function hasValidator(schema: Schema): boolean {
  if (schema instanceof ArrayOfConstructor) {
    return hasValidator(schema.type);
  }
  return Boolean(typeValidators[schema.name]);
}

function isValidSchema(value: any, schema: Schema): boolean {
  if (schema instanceof ArrayOfConstructor) {
    if (!Array.isArray(value)) return false;
    return value.every(item => isValidSchema(item, schema.type));
  }
  const validator = typeValidators[schema.name];
  return validator ? validator(value) : false;
}

function schemaLabel(schema: Schema): string {
  if (schema instanceof ArrayOfConstructor) {
    return `Array<${schema.type.name}>`;
  }
  return schema.name;
}

// Decorator to ensure that the request body or query contains specific fields
function createParameterDecorator(source: 'body' | 'query') {
  return function (fields: { [key: string]: FieldDefinition }) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value;
      descriptor.value = async function (ctx: HttpContext, ...args: any[]) {
        const validatedParams: Record<string, any> = {};

        for (const [field, type] of Object.entries(fields)) {
          const value = ctx.req[source]?.[field];

          if (value === undefined) {
            if (type instanceof OptionalConstructor) continue;
            throw new BadRequestError(`Missing required parameter: ${field}`);
          }

          const schema = type instanceof OptionalConstructor ? type.type : type;
          if (!hasValidator(schema)) {
            throw new BadRequestError(`Unknown type for parameter ${field}`);
          }

          if (!isValidSchema(value, schema)) {
            throw new BadRequestError(`Parameter ${field} must be of type ${schemaLabel(schema)}`);
          }

          validatedParams[field] = value;
        }

        return await originalMethod.call(this, { ...ctx, [source]: validatedParams }, ...args);
      }
    }
  }
}

export const body = createParameterDecorator('body');
export const query = createParameterDecorator('query');