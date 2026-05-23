/**
 * OpenTelemetry — side-effect module. MUST be the first import in server.ts
 * so http/express/prisma are instrumented before they load.
 *
 * Opt-in by env (no endpoint → no-op, zero local noise):
 *   OTEL_ENABLED=true  and/or  OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4318
 *
 * Observability must NEVER crash the app — every failure is caught + logged.
 */
const enabled =
  process.env.OTEL_ENABLED === 'true' || !!process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

if (enabled) {
  try {
    // Lazy require so the dependency tree is untouched when disabled.

    const { NodeSDK } = require('@opentelemetry/sdk-node');

    const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

    const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

    const { resourceFromAttributes } = require('@opentelemetry/resources');

    const { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } = require('@opentelemetry/semantic-conventions');

    const sdk = new NodeSDK({
      resource: resourceFromAttributes({
        [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'theory-api',
        [ATTR_SERVICE_VERSION]: process.env.APP_VERSION || '1.0.0',
      }),
      traceExporter: new OTLPTraceExporter(
        process.env.OTEL_EXPORTER_OTLP_ENDPOINT
          ? { url: `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces` }
          : undefined,
      ),
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': { enabled: false },
        }),
      ],
    });

    sdk.start();
    // eslint-disable-next-line no-console
    console.log('[otel] tracing started');

    const shutdown = () => sdk.shutdown().catch(() => undefined).finally(() => process.exit(0));
    process.once('SIGTERM', shutdown);
    process.once('SIGINT', shutdown);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[otel] disabled — init failed:', (err as Error).message);
  }
}

export {};
