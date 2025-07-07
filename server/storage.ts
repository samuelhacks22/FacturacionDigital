import { invoices, services, users, type User, type InsertUser, type Invoice, type InsertInvoice, type Service, type InsertService } from "../shared/schema";
import { db } from "./db";
import { eq, like, or, desc } from "drizzle-orm";

// Interface para compatibilidad con el almacenamiento local
interface IStorage {
  saveInvoice(invoiceData: any): Promise<{ success: boolean; invoice?: any; error?: string }>;
  getAllInvoices(): Promise<any[]>;
  getInvoiceById(id: string): Promise<any | null>;
  updateInvoice(id: string, updateData: any): Promise<{ success: boolean; invoice?: any; error?: string }>;
  deleteInvoice(id: string): Promise<{ success: boolean; error?: string }>;
  searchInvoices(query: string): Promise<any[]>;
  getStats(): Promise<{ totalInvoices: number; totalAmount: number; avgAmount: number }>;
}

// Implementación con base de datos PostgreSQL
export class DatabaseStorage implements IStorage {
  // Generar ID único para compatibilidad con el frontend
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  async saveInvoice(invoiceData: any): Promise<{ success: boolean; invoice?: any; error?: string }> {
    try {
      const externalId = this.generateId();
      
      // Insertar factura
      const [newInvoice] = await db
        .insert(invoices)
        .values({
          externalId,
          cliente: invoiceData.cliente,
          email: invoiceData.email,
          proyecto: invoiceData.proyecto,
          niveles: invoiceData.niveles,
          fechaEmision: new Date(invoiceData.fechaEmision),
          fechaVencimiento: new Date(invoiceData.fechaVencimiento),
          total: invoiceData.total.toString(),
          documentosRequeridos: invoiceData.documentosRequeridos,
          documentosEntregar: invoiceData.documentosEntregar,
          notas: invoiceData.notas,
          userId: null, // Por ahora sin usuario específico
        })
        .returning();

      // Insertar servicios
      if (invoiceData.servicios && invoiceData.servicios.length > 0) {
        const servicesToInsert = invoiceData.servicios.map((servicio: any) => ({
          invoiceId: newInvoice.id,
          tipo: servicio.tipo,
          nivel: servicio.nivel,
          area: servicio.area.toString(),
          precio: servicio.precio.toString(),
        }));

        await db.insert(services).values(servicesToInsert);
      }

      // Obtener factura completa con servicios
      const completeInvoice = await this.getInvoiceById(externalId);
      
      return { success: true, invoice: completeInvoice };
    } catch (error) {
      console.error('Error saving invoice:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  async getAllInvoices(): Promise<any[]> {
    try {
      const invoicesWithServices = await db
        .select()
        .from(invoices)
        .leftJoin(services, eq(invoices.id, services.invoiceId))
        .orderBy(desc(invoices.createdAt));

      // Agrupar servicios por factura
      const invoiceMap = new Map();
      
      invoicesWithServices.forEach((row) => {
        const invoice = row.invoices;
        const service = row.services;
        
        if (!invoiceMap.has(invoice.id)) {
          invoiceMap.set(invoice.id, {
            id: invoice.externalId,
            cliente: invoice.cliente,
            email: invoice.email,
            proyecto: invoice.proyecto,
            niveles: invoice.niveles,
            fechaEmision: invoice.fechaEmision.toISOString().split('T')[0],
            fechaVencimiento: invoice.fechaVencimiento.toISOString().split('T')[0],
            total: parseFloat(invoice.total),
            documentosRequeridos: invoice.documentosRequeridos,
            documentosEntregar: invoice.documentosEntregar,
            notas: invoice.notas,
            createdAt: invoice.createdAt?.toISOString(),
            updatedAt: invoice.updatedAt?.toISOString(),
            servicios: []
          });
        }
        
        if (service) {
          invoiceMap.get(invoice.id).servicios.push({
            tipo: service.tipo,
            nivel: service.nivel,
            area: parseFloat(service.area),
            precio: parseFloat(service.precio)
          });
        }
      });

      return Array.from(invoiceMap.values());
    } catch (error) {
      console.error('Error getting all invoices:', error);
      return [];
    }
  }

  async getInvoiceById(id: string): Promise<any | null> {
    try {
      const invoiceWithServices = await db
        .select()
        .from(invoices)
        .leftJoin(services, eq(invoices.id, services.invoiceId))
        .where(eq(invoices.externalId, id));

      if (invoiceWithServices.length === 0) {
        return null;
      }

      const invoice = invoiceWithServices[0].invoices;
      const invoiceServices = invoiceWithServices
        .filter(row => row.services)
        .map(row => ({
          tipo: row.services!.tipo,
          nivel: row.services!.nivel,
          area: parseFloat(row.services!.area),
          precio: parseFloat(row.services!.precio)
        }));

      return {
        id: invoice.externalId,
        cliente: invoice.cliente,
        email: invoice.email,
        proyecto: invoice.proyecto,
        niveles: invoice.niveles,
        fechaEmision: invoice.fechaEmision.toISOString().split('T')[0],
        fechaVencimiento: invoice.fechaVencimiento.toISOString().split('T')[0],
        total: parseFloat(invoice.total),
        documentosRequeridos: invoice.documentosRequeridos,
        documentosEntregar: invoice.documentosEntregar,
        notas: invoice.notas,
        createdAt: invoice.createdAt?.toISOString(),
        updatedAt: invoice.updatedAt?.toISOString(),
        servicios: invoiceServices
      };
    } catch (error) {
      console.error('Error getting invoice by ID:', error);
      return null;
    }
  }

  async updateInvoice(id: string, updateData: any): Promise<{ success: boolean; invoice?: any; error?: string }> {
    try {
      // Actualizar factura
      const [updatedInvoice] = await db
        .update(invoices)
        .set({
          cliente: updateData.cliente,
          email: updateData.email,
          proyecto: updateData.proyecto,
          niveles: updateData.niveles,
          fechaEmision: new Date(updateData.fechaEmision),
          fechaVencimiento: new Date(updateData.fechaVencimiento),
          total: updateData.total.toString(),
          documentosRequeridos: updateData.documentosRequeridos,
          documentosEntregar: updateData.documentosEntregar,
          notas: updateData.notas,
          updatedAt: new Date(),
        })
        .where(eq(invoices.externalId, id))
        .returning();

      if (!updatedInvoice) {
        return { success: false, error: 'Factura no encontrada' };
      }

      // Eliminar servicios existentes
      await db.delete(services).where(eq(services.invoiceId, updatedInvoice.id));

      // Insertar nuevos servicios
      if (updateData.servicios && updateData.servicios.length > 0) {
        const servicesToInsert = updateData.servicios.map((servicio: any) => ({
          invoiceId: updatedInvoice.id,
          tipo: servicio.tipo,
          nivel: servicio.nivel,
          area: servicio.area.toString(),
          precio: servicio.precio.toString(),
        }));

        await db.insert(services).values(servicesToInsert);
      }

      const completeInvoice = await this.getInvoiceById(id);
      return { success: true, invoice: completeInvoice };
    } catch (error) {
      console.error('Error updating invoice:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  async deleteInvoice(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await db
        .delete(invoices)
        .where(eq(invoices.externalId, id))
        .returning();

      if (result.length === 0) {
        return { success: false, error: 'Factura no encontrada' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting invoice:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  async searchInvoices(query: string): Promise<any[]> {
    try {
      const searchTerm = `%${query.toLowerCase()}%`;
      
      const invoicesWithServices = await db
        .select()
        .from(invoices)
        .leftJoin(services, eq(invoices.id, services.invoiceId))
        .where(
          or(
            like(invoices.cliente, searchTerm),
            like(invoices.proyecto, searchTerm),
            like(invoices.email, searchTerm)
          )
        )
        .orderBy(desc(invoices.createdAt));

      // Agrupar servicios por factura
      const invoiceMap = new Map();
      
      invoicesWithServices.forEach((row) => {
        const invoice = row.invoices;
        const service = row.services;
        
        if (!invoiceMap.has(invoice.id)) {
          invoiceMap.set(invoice.id, {
            id: invoice.externalId,
            cliente: invoice.cliente,
            email: invoice.email,
            proyecto: invoice.proyecto,
            niveles: invoice.niveles,
            fechaEmision: invoice.fechaEmision.toISOString().split('T')[0],
            fechaVencimiento: invoice.fechaVencimiento.toISOString().split('T')[0],
            total: parseFloat(invoice.total),
            documentosRequeridos: invoice.documentosRequeridos,
            documentosEntregar: invoice.documentosEntregar,
            notas: invoice.notas,
            createdAt: invoice.createdAt?.toISOString(),
            updatedAt: invoice.updatedAt?.toISOString(),
            servicios: []
          });
        }
        
        if (service) {
          invoiceMap.get(invoice.id).servicios.push({
            tipo: service.tipo,
            nivel: service.nivel,
            area: parseFloat(service.area),
            precio: parseFloat(service.precio)
          });
        }
      });

      return Array.from(invoiceMap.values());
    } catch (error) {
      console.error('Error searching invoices:', error);
      return [];
    }
  }

  async getStats(): Promise<{ totalInvoices: number; totalAmount: number; avgAmount: number }> {
    try {
      const allInvoices = await this.getAllInvoices();
      const totalInvoices = allInvoices.length;
      const totalAmount = allInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
      const avgAmount = totalInvoices > 0 ? totalAmount / totalInvoices : 0;

      return {
        totalInvoices,
        totalAmount,
        avgAmount
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return { totalInvoices: 0, totalAmount: 0, avgAmount: 0 };
    }
  }
}

export const storage = new DatabaseStorage();