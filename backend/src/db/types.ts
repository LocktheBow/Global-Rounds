export interface OrderRecord {
  id: string;
  date: string;
  sku: string;
  category: string;
  deviceType: string;
  supplierId: string;
  buyerRegion: string;
  qty: number;
  unitPrice: number;
  status: 'ordered' | 'shipped' | 'delivered' | 'paid' | 'canceled';
  shipDate: string | null;
  leadTimeDays: number;
}

export interface InventoryRecord {
  sku: string;
  udi: string;
  category: string;
  deviceType: string;
  supplierId: string;
  onHand: number;
  onOrder: number;
  lotAgeDays: number;
  expiryDate: string;
  backorderFlag: boolean;
  unitPrice: number;
}

export interface SupplierRecord {
  id: string;
  name: string;
  onTimePct: number;
  disputeRate: number;
  defectRate: number;
  country: string;
  region: string;
  categories: string[];
  deviceTypes: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export interface ComplianceDocRecord {
  supplierId: string;
  type: string;
  status: 'active' | 'expiring' | 'expired';
  expiresAt: string;
}

export interface EventRecord {
  timestamp: string;
  type: 'order_created' | 'shipment_updated' | 'doc_expiring' | 'dispute_filed';
  payload: Record<string, unknown>;
}

export interface SeedData {
  orders: OrderRecord[];
  inventory: InventoryRecord[];
  suppliers: SupplierRecord[];
  complianceDocs: ComplianceDocRecord[];
  events: EventRecord[];
}
