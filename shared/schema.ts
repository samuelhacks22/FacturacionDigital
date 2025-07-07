import { pgTable, text, timestamp, integer, decimal, serial, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').unique().notNull(),
  password: text('password').notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Invoices table
export const invoices = pgTable('invoices', {
  id: serial('id').primaryKey(),
  externalId: text('external_id').unique().notNull(),
  cliente: text('cliente').notNull(),
  email: text('email').notNull(),
  proyecto: text('proyecto').notNull(),
  niveles: integer('niveles').notNull(),
  fechaEmision: timestamp('fecha_emision').notNull(),
  fechaVencimiento: timestamp('fecha_vencimiento').notNull(),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  documentosRequeridos: text('documentos_requeridos'),
  documentosEntregar: text('documentos_entregar'),
  notas: text('notas'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  userId: integer('user_id'),
}, (table) => ({
  clienteIdx: index('cliente_idx').on(table.cliente),
  proyectoIdx: index('proyecto_idx').on(table.proyecto),
  emailIdx: index('email_idx').on(table.email),
}));

// Services table
export const services = pgTable('services', {
  id: serial('id').primaryKey(),
  invoiceId: integer('invoice_id').references(() => invoices.id, { onDelete: 'cascade' }),
  tipo: text('tipo').notNull(),
  nivel: integer('nivel').notNull(),
  area: decimal('area', { precision: 10, scale: 2 }).notNull(),
  precio: decimal('precio', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  invoices: many(invoices),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  user: one(users, {
    fields: [invoices.userId],
    references: [users.id],
  }),
  services: many(services),
}));

export const servicesRelations = relations(services, ({ one }) => ({
  invoice: one(invoices, {
    fields: [services.invoiceId],
    references: [invoices.id],
  }),
}));

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;
export type Service = typeof services.$inferSelect;
export type InsertService = typeof services.$inferInsert;