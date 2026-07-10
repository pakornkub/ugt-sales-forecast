import {
  normalizeCrmCategoryFields,
  normalizeExcelImportCategoryFields,
  isLikelyCompanyName,
} from '../src/api/services/registrationCategory.ts';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const stable = normalizeExcelImportCategoryFields('Extrusion', 'MF', 'Fishing net');
assert(stable.process === 'Extrusion' && stable.application === 'MF' && stable.subApp === 'Fishing net', 'standard row');

const empty = normalizeExcelImportCategoryFields('', null, '');
assert(empty.process === null && empty.application === null && empty.subApp === null, 'empty cells');

const inj4w = normalizeExcelImportCategoryFields('Injection', 'INJ_4W', null);
assert(inj4w.process === 'Injection' && inj4w.application === 'INJ_4W' && inj4w.subApp === null, 'INJ_4W in Application');

const mb = normalizeExcelImportCategoryFields('MB Polymer', 'MB Polymer', 'AJ');
assert(mb.process === 'MB Polymer' && mb.application === 'MB Polymer' && mb.subApp === 'AJ', 'excel values pass through');

const company = normalizeExcelImportCategoryFields('Injection', 'MF', 'AMCOR FLEXIBLES (NEW ZEALAND) LIMITED');
assert(company.subApp === null, 'company in sub-app');

const combo = normalizeExcelImportCategoryFields('INJ_Combination Switch', 'Combination Switch', 'TOYO DENSO');
assert(combo.process === 'INJ_Combination Switch' && combo.application === 'Combination Switch', 'direct column mapping');

console.log('All category import tests passed');
