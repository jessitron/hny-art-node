// tracing.js
'use strict';

const { HoneycombSDK } = require('@honeycombio/opentelemetry-node');

// uses HONEYCOMB_API_KEY and OTEL_SERVICE_NAME environment variables
const sdk = new HoneycombSDK({
  instrumentations: []
});

//sdk.start()

export { sdk }
