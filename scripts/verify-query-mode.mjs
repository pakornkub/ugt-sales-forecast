/**
 * Smoke checks for single-deployment query mode helpers.
 * Run: npx tsx scripts/verify-query-mode.mjs
 */
import assert from 'node:assert/strict';
import {
  getAllowedBusinessUnits,
  getAppConfigPublic,
  getAppDisplayName,
  getAppMode,
  getPreferredLegacySheetNames,
  getPreferredVersionedSheetNames,
  isOutOfAppModeImportKey,
  isRegistrationInAppMode,
  parsePublicAppMode,
  runWithAppMode,
  toPublicAppMode,
} from '../src/config/appMode.ts';

assert.equal(parsePublicAppMode('nylon'), 'nyl');
assert.equal(parsePublicAppMode('NYLON'), 'nyl');
assert.equal(parsePublicAppMode('nyl'), 'nyl');
assert.equal(parsePublicAppMode('ufa'), 'ufa');
assert.equal(parsePublicAppMode('UFA'), 'ufa');
assert.equal(parsePublicAppMode('bogus'), 'nyl');
assert.equal(parsePublicAppMode(undefined), 'nyl');
assert.equal(toPublicAppMode('nyl'), 'nylon');
assert.equal(toPublicAppMode('ufa'), 'ufa');

runWithAppMode('ufa', () => {
  assert.equal(getAppMode(), 'ufa');
  assert.deepEqual(getAllowedBusinessUnits(), ['UFA']);
  assert.equal(getAppDisplayName(), 'UFA Sales Forecast');
  assert.deepEqual(getPreferredLegacySheetNames(), ['UFA', 'Sheet1']);
  assert.deepEqual(getPreferredVersionedSheetNames(), ['UFA']);
  assert.equal(isRegistrationInAppMode('UFA', '1504'), true);
  assert.equal(isRegistrationInAppMode('Polymer', '1111'), false);
  assert.equal(isOutOfAppModeImportKey('a/b/c/1504/d/e', 'UFA'), false);
  assert.equal(isOutOfAppModeImportKey('a/b/c/1111/d/e', 'Polymer'), true);
  const config = getAppConfigPublic();
  assert.equal(config.appMode, 'ufa');
  assert.equal(config.publicMode, 'ufa');
  assert.equal(config.basePath, '/ugt-sales-forecast');
});

runWithAppMode('nyl', () => {
  assert.equal(getAppMode(), 'nyl');
  assert.deepEqual(getAllowedBusinessUnits(), ['Polymer', 'Composite']);
  assert.equal(getAppDisplayName(), 'Nylon Sale Forecast');
  assert.equal(isRegistrationInAppMode('Polymer', '1111'), true);
  assert.equal(isRegistrationInAppMode('UFA', '1504'), false);
  const config = getAppConfigPublic();
  assert.equal(config.publicMode, 'nylon');
});

// Concurrent ALS stores must not leak across modes.
await Promise.all([
  new Promise(resolve => {
    runWithAppMode('ufa', async () => {
      await new Promise(r => setTimeout(r, 20));
      assert.equal(getAppMode(), 'ufa');
      resolve(undefined);
    });
  }),
  new Promise(resolve => {
    runWithAppMode('nyl', async () => {
      await new Promise(r => setTimeout(r, 5));
      assert.equal(getAppMode(), 'nyl');
      resolve(undefined);
    });
  }),
]);

console.log('[verify-query-mode] OK');
