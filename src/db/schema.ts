import { pgTable, serial, text, numeric, boolean, timestamp, primaryKey } from 'drizzle-orm/pg-core';

export const registrations = pgTable('registrations', {
  id: serial('id').primaryKey(),
  registrationNumber: text('registration_number').notNull().unique(),
  owner: text('owner'),
  soldTo: text('sold_to'),
  shipTo: text('ship_to'),
  endUser: text('end_user'),
  country: text('country'),
  product: text('product'),
  application: text('application'),
  onOff: text('on_off'),
  homoCopa: text('homo_copa'),
  priceFormula: text('price_formula').default('CPL base'),
  spread: numeric('spread').default('0'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const cplPrices = pgTable('cpl_prices', {
  month: text('month').primaryKey(), // YYYY-MM
  price: numeric('price').default('0'),
});

export const forecastVersions = pgTable('forecast_versions', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  isStandard: boolean('is_standard').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const forecastValues = pgTable('forecast_values', {
  registrationId: serial('registration_id').references(() => registrations.id),
  versionId: serial('version_id').references(() => forecastVersions.id),
  month: text('month').notNull(), // YYYY-MM
  qtyAct: numeric('qty_act').default('0'),
  qtyFcst: numeric('qty_fcst').default('0'),
  priceAct: numeric('price_act').default('0'),
}, (t) => ({
  pk: primaryKey({ columns: [t.registrationId, t.versionId, t.month] }),
}));
