import { NextApiRequest } from 'next/types';
import { AnySchema, InferType, object } from 'yup';

import { Errors, ResponseError } from '@/constants/error';
import { ApiRequest, ApiResponse, HttpMethods } from '@/types/request';

import { transformNextRequest, parseError } from './transformers-and-parsers';

export const nullSchema = object().shape({});

/**
 * Creates HTTP method handlers and takes care of transformation and error handling
 * for Next APIs
 *
 * Usage guide:
 * ```
 * const endpoint = new Endpoint(pathnameSchema [or nullSchema]);
 * endpoint.handle.GET(getSchema [or nullSchema], (req, res) => {
 *   // do things
 *   res.send(some response)
 * });
 *
 * export default endpoint.serve();
 * ```
 */
export class Endpoint<PathSchema extends AnySchema> {
  authenticated: boolean = true;
  pathSchema: PathSchema;
  handlers: Partial<
    Record<
      HttpMethods,
      [
        schema: AnySchema | undefined,
        handler: (req: ApiRequest, res: ApiResponse) => Promise<void>
      ]
    >
  > = {};

  constructor(pathSchema?: PathSchema, args?: { unauthenticated?: true }) {
    this.pathSchema = pathSchema;
    this.serve.bind(this);

    if (args?.unauthenticated) this.authenticated = false;
  }

  handle: Record<
    HttpMethods,
    <PayloadSchema extends AnySchema>(
      schema: PayloadSchema | undefined,
      handler: (
        req: ApiRequest<
          (PathSchema extends undefined ? undefined : InferType<PathSchema>) &
            (PayloadSchema extends undefined
              ? undefined
              : InferType<PayloadSchema>)
        >,
        res: ApiResponse
      ) => Promise<any>
    ) => [PayloadSchema | undefined, AnyFunction]
  > = {
    // @ts-ignore
    GET: (schema, handler) => (this.handlers['GET'] = [schema, handler]),
    // @ts-ignore
    POST: (schema, handler) => (this.handlers['POST'] = [schema, handler]),
    // @ts-ignore
    PUT: (schema, handler) => (this.handlers['PUT'] = [schema, handler]),
    // @ts-ignore
    PATCH: (schema, handler) => (this.handlers['PATCH'] = [schema, handler]),
    // @ts-ignore
    DELETE: (schema, handler) => (this.handlers['DELETE'] = [schema, handler]),
    // @ts-ignore
    HEAD: (schema, handler) => (this.handlers['HEAD'] = [schema, handler]),
    // @ts-ignore
    OPTIONS: (schema, handler) => (this.handlers['OPTIONS'] = [schema, handler])
  };

  serve() {
    return async (nextReq: NextApiRequest, res: ApiResponse) => {
      try {
        const req = transformNextRequest(nextReq);
        if (this.pathSchema) {
          await this.pathSchema.validate(req.payload);
        }

        if (!this.handlers[req.method]) {
          throw new ResponseError(Errors.METHOD_NOT_ALLOWED, 405);
        }

        const [schema, handler] = this.handlers[req.method];
        if (schema) {
          await schema.validate(req.payload);
        }

        await handler(req, res);
      } catch (err) {
        const error = parseError(err);
        const statusCode = error.status || 500;
        const errorMessage = error.payload || 'Internal Server Error';

        // Send error response
        res.status(statusCode).send(errorMessage);
      }
    };
  }
}
