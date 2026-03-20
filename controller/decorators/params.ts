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

// Try to parse from string to ctr type (for query parameters)
const typeParsers: Record<TypeKey, (value: string, ctr: Constructor) => any> = {
  String: (v) => v,
  Number: (v) => {
    const parsed = Number(v);
    return isNaN(parsed) ? null : parsed;
  },
  Boolean: (v) => {
    if (v === 'true') return true;
    if (v === 'false') return false;
    return null;
  },
  Object: (v) => {
    try {
      const parsed = JSON.parse(v);
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  },
  UUID: (v) => v,
  Email: (v) => v,
  ArrayOf: (v, ctr) => {
    try {
      const parsed = JSON.parse(v);
      return typeValidators.ArrayOf(parsed, ctr) ? parsed : null;
    } catch {
      return null;
    }
  },
  Optional: (v, ctr) => v === undefined ? undefined : tryParse(v, (ctr as OptionalConstructor).type),
  Varchar: (v) => v,
};

function hasValidator(ctr: Constructor): boolean {
  return getTypeKey(ctr) !== null;
}

function isValidSchema(value: any, ctr: Constructor): boolean {
  const key = getTypeKey(ctr);
  if (!key) return false;

  const validator = typeValidators[key];
  return validator(value, ctr);
}

function tryParse(value: string, ctr: Constructor): any {
  const key = getTypeKey(ctr);
  if (!key) return null;
  const parser = typeParsers[key];
  return parser(value, ctr);
}

// Decorator to ensure that the request body or query contains specific fields
export function body(fields: { [key: string]: Constructor }) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (ctx: HttpContext, ...args: any[]) {
      const validatedParams: Record<string, any> = {};

      for (const [field, ctr] of Object.entries(fields)) {
        const value = ctx.req.body?.[field];

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

      return await originalMethod.call(this, { ...ctx, body: validatedParams }, ...args);
    }
  }
}

export function query(fields: { [key: string]: Constructor }) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (ctx: HttpContext, ...args: any[]) {
      const validatedParams: Record<string, any> = {};

      for (const [field, ctr] of Object.entries(fields)) {
        const value = ctx.req.query?.[field] as string | undefined;

        if (value === undefined) {
          if (ctr instanceof OptionalConstructor) continue;
          throw new BadRequestError(`Missing required parameter: ${field}`);
        }
        // console.log(ctr.name, value, typeof value);
        if (!hasValidator(ctr)) {
          throw new BadRequestError(`Unknown type for parameter ${field}`);
        }

        const parsedValue = tryParse(value, ctr);
        if (parsedValue === null) {
          throw new BadRequestError(`Parameter ${field} must be of type ${ctr.name}`);
        }

        if (!isValidSchema(parsedValue, ctr)) {
          throw new BadRequestError(`Parameter ${field} must be of type ${ctr.name}`);
        }

        validatedParams[field] = parsedValue;
      }

      return await originalMethod.call(this, { ...ctx, query: validatedParams }, ...args);
    }
  }
}