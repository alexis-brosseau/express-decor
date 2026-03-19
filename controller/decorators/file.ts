import type HttpContext from '../../httpContext.js';
import type { UploadedFile } from '../../httpContext.js';
import { BadRequestError } from '../../errors.js';

function normalizeContentType(contentType?: string): string {
  return (contentType ?? '').split(';')[0]!.trim().toLowerCase();
}

export function file(type?: string | string[]) {
  const expectedTypes = Array.isArray(type)
    ? type.map((value) => normalizeContentType(value)).filter(Boolean)
    : (type ? [normalizeContentType(type)] : []);

  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (ctx: HttpContext, ...args: any[]) {
      const { req } = ctx;
      const contentType = normalizeContentType(req.headers['content-type'] as string | undefined);

      if (expectedTypes.length > 0 && !expectedTypes.includes(contentType)) {
        throw new BadRequestError(`Invalid file type. Expected one of ${expectedTypes.join(', ')}, got ${contentType || 'none'}`);
      }

      if (expectedTypes.length === 0 && (contentType === 'application/json' || contentType === 'application/x-www-form-urlencoded')) {
        throw new BadRequestError('Invalid file content-type for File decorator');
      }

      if (req.readableEnded) {
        throw new BadRequestError('Request body was already consumed before File decorator execution');
      }

      const chunks: Buffer[] = [];

      await new Promise<void>((resolve, reject) => {
        req.on('data', (chunk) => chunks.push(chunk as Buffer));
        req.on('end', () => resolve());
        req.on('error', reject);
      });

      const buffer = Buffer.concat(chunks);
      if (!buffer.length) throw new BadRequestError('Empty file payload');

      const file: UploadedFile = {
        buffer,
        type: contentType,
      };

      return await originalMethod.call(this, { ...ctx, file }, ...args);
    };
  };
}