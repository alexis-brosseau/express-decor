import type HttpContext from "../../httpContext.js";
import { BadRequestError } from "../../errors.js";

// Supported types
type Constructor =
  | StringConstructor
  | NumberConstructor
  | BooleanConstructor
  | ObjectConstructor
  | typeof UUID
  | typeof Email
  | ArrayOfConstructor
  | OptionalConstructor
  | VarcharConstructor;

// Custom types
export class UUID { name = 'UUID' };
export class Email { name = 'Email' };

class VarcharConstructor {
  name = 'Varchar';

  constructor(public min: number, public max: number) {
    this.min = min;
    this.max = max;
    this.name = `Varchar(${min}, ${max})`;
  }
}

export function Varchar(min = 0, max = Infinity) {
  return new VarcharConstructor(min, max);
}

class ArrayOfConstructor {
  name = 'ArrayOf';

  constructor(public type: Constructor) {
    this.type = type;
    this.name = `Array<${type.name}>`;
  }
}

export function ArrayOf(type: Constructor) {
  return new ArrayOfConstructor(type);
}

class OptionalConstructor {
  name = 'Optional';
  
  constructor(public type: Constructor) {
    this.type = type;
    this.name = `Optional<${type.name}>`;
  }
}

export function Optional(type: Constructor) {
  return new OptionalConstructor(type);
}

type TypeKey =
  | 'String'
  | 'Number'
  | 'Boolean'
  | 'Object'
  | 'UUID'
  | 'Email'
  | 'ArrayOf'
  | 'Optional'
  | 'Varchar';

// Validate a value against a type
const typeValidators: Record<TypeKey, (value: any, ctr: Constructor) => boolean> = {
  String: (v) => typeof v === 'string' && v.length > 0,
  Number: (v) => typeof v === 'number',
  Boolean: (v) => typeof v === 'boolean',
  Object: (v) => typeof v === 'object' && v !== null && !Array.isArray(v),
  UUID: (v) => typeof v === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v),
  Email: (v) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  ArrayOf: (v, ctr) => Array.isArray(v) && v.every(item => isValidSchema(item, (ctr as ArrayOfConstructor).type)),
  Optional: (v, ctr) => v === undefined || isValidSchema(v, (ctr as OptionalConstructor).type),
  Varchar: (v, ctr) => typeof v === 'string' && v.length >= (ctr as VarcharConstructor).min && v.length <= (ctr as VarcharConstructor).max,
};

function getTypeKey(ctr: Constructor): TypeKey | null {
  if (ctr === String) return 'String';
  if (ctr === Number) return 'Number';
  if (ctr === Boolean) return 'Boolean';
  if (ctr === Object) return 'Object';
  if (ctr === UUID) return 'UUID';
  if (ctr === Email) return 'Email';
  if (ctr instanceof ArrayOfConstructor) return 'ArrayOf';
  if (ctr instanceof OptionalConstructor) return 'Optional';
  if (ctr instanceof VarcharConstructor) return 'Varchar';
  return null;
}

function hasValidator(ctr: Constructor): boolean {
  return getTypeKey(ctr) !== null;
}

function isValidSchema(value: any, ctr: Constructor): boolean {
  if (ctr instanceof ArrayOfConstructor) {
    if (!Array.isArray(value)) return false;
    return value.every(item => isValidSchema(item, ctr.type));
  }

  const key = getTypeKey(ctr);
  if (!key) return false;

  const validator = typeValidators[key];
  return validator(value, ctr);
}

// Decorator to ensure that the request body or query contains specific fields
function createParameterDecorator(source: 'body' | 'query') {
  return function (fields: { [key: string]: Constructor }) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value;
      descriptor.value = async function (ctx: HttpContext, ...args: any[]) {
        const validatedParams: Record<string, any> = {};

        for (const [field, ctr] of Object.entries(fields)) {
          const value = ctx.req[source]?.[field];

          if (value === undefined) {
            if (ctr instanceof OptionalConstructor) continue;
            throw new BadRequestError(`Missing required parameter: ${field}`);
          }
          // console.log(ctr.name, value, typeof value);
          if (!hasValidator(ctr)) {
            throw new BadRequestError(`Unknown type for parameter ${field}`);
          }

          if (!isValidSchema(value, ctr)) {
            throw new BadRequestError(`Parameter ${field} must be of type ${ctr.name}`);
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