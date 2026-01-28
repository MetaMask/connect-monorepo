/* eslint-disable import-x/unambiguous -- Setup file has side effects only */

/* eslint-disable @typescript-eslint/prefer-promise-reject-errors -- Passing through original reason */
// Setup file to handle unhandled promise rejections in tests
// This prevents CI failures from expected unhandled rejections in web-mobile timeout tests

const originalUnhandledRejection = process.listeners('unhandledRejection');

process.removeAllListeners('unhandledRejection');

process.on('unhandledRejection', (reason) => {
  // Check if this is one of our expected test errors from web-mobile timeout tests
  const errorMessage =
    reason instanceof Error ? reason.message : String(reason);
  const expectedErrors = [
    'Session error',
    'Failed to connect transport',
    'Failed to create session',
    'Connect timeout',
    'Test timeout',
  ];

  // If it's an expected error from our timeout tests, ignore it
  if (expectedErrors.some((errorMsg) => errorMessage.includes(errorMsg))) {
    // Silently handle - these are expected in web-mobile timeout scenarios
    return;
  }

  // For other unhandled rejections, call the original handlers
  originalUnhandledRejection.forEach((handler) => {
    handler(reason, Promise.reject(reason));
  });
});
