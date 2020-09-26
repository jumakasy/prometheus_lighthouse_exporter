module.exports = {
  extends: 'lighthouse:default',
  maxWaitForLoad: 80000,
  settings: {
    emulatedFormFactor: 'desktop',
    onlyCategories: [
      'performance',
      'seo',
      'accessibility',
      'best-practices',
      'pwa'
    ],
    onlyAudits: [
      'first-contentful-paint',
      'speed-index',
      'largest-contentful-paint',
      'interactive',
      'total-blocking-time',
      'cumulative-layout-shift'
    ],
  },
};
