/**
 * SCHEMA-FIRST OpenAPI 3.1.
 *
 * The SAME Zod schemas that validate requests generate the spec — single
 * source of truth, zero drift. No OpenAI / LLM / network: this is a pure,
 * deterministic document built from Zod via @asteasolutions/zod-to-openapi.
 *
 * To document a converted controller: register its exported Zod schemas +
 * one registerPath() call. The spec then stays correct by construction.
 */
import { z } from 'zod';
import {
  OpenAPIRegistry,
  OpenApiGeneratorV31,
  extendZodWithOpenApi,
} from '@asteasolutions/zod-to-openapi';
import { listQuerySchema, idParamSchema } from '../controllers/notificationController';

extendZodWithOpenApi(z);

/** Standard envelope, expressed in Zod so responses are generated, not typed. */
const MetaSchema = z
  .object({
    requestId: z.string().optional(),
    page: z.number().int().optional(),
    pageSize: z.number().int().optional(),
    total: z.number().int().optional(),
  })
  .openapi('Meta');

const ErrorObjectSchema = z
  .object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().nullable(),
  })
  .openapi('ErrorObject');

const envelope = (data: z.ZodTypeAny) =>
  z.object({
    success: z.boolean(),
    data: data.nullable(),
    meta: MetaSchema,
    error: ErrorObjectSchema.nullable(),
  });

const NotificationSchema = z
  .object({
    id: z.string().uuid(),
    type: z.string(),
    message: z.string(),
    link: z.string().nullable(),
    read: z.boolean(),
    createdAt: z.string().datetime(),
  })
  .openapi('Notification');

const LoginBody = z
  .object({ email: z.string().email(), password: z.string().min(1) })
  .openapi('LoginRequest');

export function buildOpenApi() {
  const r = new OpenAPIRegistry();

  const bearer = r.registerComponent('securitySchemes', 'bearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
  });

  r.register('Notification', NotificationSchema);
  r.register('Meta', MetaSchema);
  r.register('ErrorObject', ErrorObjectSchema);

  const json = (schema: z.ZodTypeAny) => ({
    content: { 'application/json': { schema: envelope(schema) } },
  });

  r.registerPath({
    method: 'post', path: '/api/auth/login', summary: 'Login',
    request: { body: { content: { 'application/json': { schema: LoginBody } } } },
    responses: {
      200: { description: 'Tokens + user', ...json(z.object({}).passthrough()) },
      401: { description: 'Invalid credentials', ...json(z.null()) },
    },
  });
  r.registerPath({
    method: 'post', path: '/api/auth/refresh', summary: 'Rotate tokens',
    responses: { 200: { description: 'New tokens', ...json(z.object({}).passthrough()) } },
  });
  r.registerPath({
    method: 'post', path: '/api/auth/logout', summary: 'Logout',
    responses: { 200: { description: 'ok', ...json(z.object({}).passthrough()) } },
  });
  r.registerPath({
    method: 'get', path: '/api/auth/me', summary: 'Current user',
    security: [{ [bearer.name]: [] }],
    responses: { 200: { description: 'User', ...json(z.object({}).passthrough()) } },
  });

  r.registerPath({
    method: 'get', path: '/api/notifications', summary: 'List notifications (paginated)',
    security: [{ [bearer.name]: [] }],
    request: { query: listQuerySchema },
    responses: {
      200: {
        description: 'Notification page',
        ...json(z.object({
          notifications: z.array(NotificationSchema),
          unreadCount: z.number().int(),
        })),
      },
    },
  });
  r.registerPath({
    method: 'patch', path: '/api/notifications/read-all', summary: 'Mark all read',
    security: [{ [bearer.name]: [] }],
    responses: { 200: { description: 'count', ...json(z.object({ updated: z.number().int() })) } },
  });
  r.registerPath({
    method: 'patch', path: '/api/notifications/{id}/read', summary: 'Mark one read',
    security: [{ [bearer.name]: [] }],
    request: { params: idParamSchema },
    responses: {
      200: { description: 'Notification', ...json(NotificationSchema) },
      404: { description: 'Not found', ...json(z.null()) },
    },
  });
  r.registerPath({
    method: 'delete', path: '/api/notifications/{id}', summary: 'Delete notification',
    security: [{ [bearer.name]: [] }],
    request: { params: idParamSchema },
    responses: { 200: { description: 'ok', ...json(z.object({ deleted: z.number().int() })) } },
  });

  return new OpenApiGeneratorV31(r.definitions).generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'THEORY API',
      version: '1.0.0',
      description:
        'Enterprise work-intelligence platform. Multi-tenant; every response is the standard envelope { success, data, meta, error }. Spec generated schema-first from Zod.',
    },
    servers: [{ url: '/' }],
  });
}
