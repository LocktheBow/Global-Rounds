import { addDays, differenceInCalendarDays, formatISO, isAfter, isBefore, subDays } from 'date-fns';
import { randomUUID } from 'node:crypto';
import type {
  ComplianceDocRecord,
  EventRecord,
  InventoryRecord,
  OrderRecord,
  SeedData,
  SupplierRecord,
} from './types';

const categories = [
  { name: 'Respiratory', deviceTypes: ['Ventilation', 'Oxygen Therapy', 'Airway Clearance'] },
  { name: 'Mobility', deviceTypes: ['Wheelchairs', 'Mobility Assist', 'Gait Training'] },
  { name: 'Infusion', deviceTypes: ['Infusion Pumps', 'Medication Delivery', 'IV Sets'] },
  { name: 'Monitoring', deviceTypes: ['Remote Monitoring', 'Cardiac Monitoring', 'Glucose Monitoring'] },
  { name: 'Surgical', deviceTypes: ['Orthopedic Robotics', 'Minimally Invasive', 'Imaging'] },
];

const regions = ['Northeast', 'Midwest', 'South', 'West', 'International'];
const countriesByRegion: Record<string, string[]> = {
  Northeast: ['United States'],
  Midwest: ['United States'],
  South: ['United States'],
  West: ['United States'],
  International: ['Canada', 'United Kingdom', 'Germany', 'Netherlands', 'Singapore'],
};

const complianceDocTypes = ['ISO 13485', 'FDA 510K', 'HIPAA BAA', 'Cybersecurity Audit'];
const orderStatuses: OrderRecord['status'][] = ['ordered', 'shipped', 'delivered', 'paid'];
const eventTypes: EventRecord['type'][] = ['order_created', 'shipment_updated', 'doc_expiring', 'dispute_filed'];

const randomFrom = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min: number, max: number) => Math.random() * (max - min) + min;

const DEFAULT_SEED_SIZES = {
  supplierCount: 120,
  inventoryCount: 500,
  orderCount: 50000,
};

// Smaller dataset keeps automated tests fast while preserving realistic shapes.
const TEST_SEED_SIZES = {
  supplierCount: 20,
  inventoryCount: 80,
  orderCount: 600,
};

const resolveSeedSizes = (
  overrides: { supplierCount?: number; inventoryCount?: number; orderCount?: number } = {},
) => {
  const base = process.env.NODE_ENV === 'test' ? TEST_SEED_SIZES : DEFAULT_SEED_SIZES;
  return {
    supplierCount: overrides.supplierCount ?? base.supplierCount,
    inventoryCount: overrides.inventoryCount ?? base.inventoryCount,
    orderCount: overrides.orderCount ?? base.orderCount,
  };
};

const generateSuppliers = (count: number): SupplierRecord[] => {
  const records: SupplierRecord[] = [];
  for (let index = 0; index < count; index += 1) {
    const id = `SUP-${(index + 1).toString().padStart(3, '0')}`;
    const category = randomFrom(categories);
    const secondaryCategory = Math.random() > 0.6 ? randomFrom(categories) : category;
    const region = randomFrom(regions);
    const country = randomFrom(countriesByRegion[region]);
    const disputeRate = Number(randomFloat(0.015, 0.12).toFixed(3));
    const riskLevel = disputeRate >= 0.08 ? 'high' : disputeRate >= 0.04 ? 'medium' : 'low';

    records.push({
      id,
      name: `${category.name} Solutions ${index + 1}`,
      onTimePct: Number(randomFloat(0.78, 0.98).toFixed(3)),
      disputeRate,
      defectRate: Number(randomFloat(0.005, 0.04).toFixed(3)),
      country,
      region,
      categories: Array.from(new Set([category.name, secondaryCategory.name])),
      deviceTypes: Array.from(new Set([...category.deviceTypes, ...secondaryCategory.deviceTypes])).slice(0, 4),
      riskLevel,
    });
  }
  return records;
};

const generateInventory = (suppliers: SupplierRecord[], count: number): InventoryRecord[] => {
  const skus: InventoryRecord[] = [];
  for (let index = 0; index < count; index += 1) {
    const supplier = randomFrom(suppliers);
    const category = randomFrom(supplier.categories);
    const deviceType = randomFrom(
      categories.find((item) => item.name === category)?.deviceTypes ?? supplier.deviceTypes,
    );
    const basePrice = randomInt(1200, 7800);

    skus.push({
      sku: `SKU-${(index + 1).toString().padStart(4, '0')}`,
      udi: `UDI-${randomUUID().slice(0, 12).toUpperCase()}`,
      category,
      deviceType,
      supplierId: supplier.id,
      onHand: randomInt(10, 350),
      onOrder: randomInt(0, 180),
      lotAgeDays: randomInt(5, 240),
      expiryDate: formatISO(addDays(new Date(), randomInt(45, 540)), { representation: 'date' }),
      backorderFlag: Math.random() > 0.9,
      unitPrice: basePrice,
    });
  }
  return skus;
};

const pickStatusForOrder = (orderDate: Date): OrderRecord['status'] => {
  const daysOld = differenceInCalendarDays(new Date(), orderDate);
  if (daysOld < 3) return 'ordered';
  if (daysOld < 7) return 'shipped';
  if (daysOld < 14) return 'delivered';
  return 'paid';
};

const generateOrders = (
  inventory: InventoryRecord[],
  total: number,
): { orders: OrderRecord[]; onTimeTracker: Map<string, { total: number; onTime: number; disputes: number }> } => {
  const orders: OrderRecord[] = [];
  const onTimeTracker = new Map<string, { total: number; onTime: number; disputes: number }>();

  const startDate = subDays(new Date(), 365);

  for (let index = 0; index < total; index += 1) {
    const skuRecord = randomFrom(inventory);
    const orderDate = addDays(startDate, randomInt(0, 365));
    const status = pickStatusForOrder(orderDate);
    const leadTimeDays = randomInt(2, 18);
    const shipDate = addDays(orderDate, leadTimeDays);
    const shipped = status === 'shipped' || status === 'delivered' || status === 'paid';

    const qty = randomInt(1, 35);
    const unitPrice = Number((skuRecord.unitPrice * randomFloat(0.95, 1.2)).toFixed(2));
    const supplierStats = onTimeTracker.get(skuRecord.supplierId) ?? {
      total: 0,
      onTime: 0,
      disputes: 0,
    };
    supplierStats.total += 1;
    if (leadTimeDays <= 7) {
      supplierStats.onTime += 1;
    }
    if (Math.random() < 0.05) {
      supplierStats.disputes += 1;
    }
    onTimeTracker.set(skuRecord.supplierId, supplierStats);

    orders.push({
      id: `ORD-${(index + 1).toString().padStart(6, '0')}`,
      date: formatISO(orderDate, { representation: 'date' }),
      sku: skuRecord.sku,
      category: skuRecord.category,
      deviceType: skuRecord.deviceType,
      supplierId: skuRecord.supplierId,
      buyerRegion: randomFrom(regions),
      qty,
      unitPrice,
      status,
      shipDate: shipped ? formatISO(shipDate, { representation: 'date' }) : null,
      leadTimeDays,
    });
  }

  return { orders, onTimeTracker };
};

const generateComplianceDocs = (suppliers: SupplierRecord[]): ComplianceDocRecord[] => {
  const records: ComplianceDocRecord[] = [];
  suppliers.forEach((supplier) => {
    complianceDocTypes.forEach((docType) => {
      const expiresIn = randomInt(-120, 240);
      const expiresAt = addDays(new Date(), expiresIn);
      const status = expiresIn < 0 ? 'expired' : expiresIn < 45 ? 'expiring' : 'active';
      records.push({
        supplierId: supplier.id,
        type: docType,
        status,
        expiresAt: formatISO(expiresAt, { representation: 'date' }),
      });
    });
  });
  return records;
};

const generateEvents = (orders: OrderRecord[], docs: ComplianceDocRecord[]): EventRecord[] => {
  const events: EventRecord[] = [];

  const sampledOrders = orders.filter(() => Math.random() < 0.08);
  sampledOrders.forEach((order) => {
    events.push({
      timestamp: `${order.date}T08:00:00Z`,
      type: 'order_created',
      payload: { orderId: order.id, supplierId: order.supplierId, qty: order.qty },
    });
    if (order.shipDate && Math.random() > 0.3) {
      events.push({
        timestamp: `${order.shipDate}T12:00:00Z`,
        type: 'shipment_updated',
        payload: { orderId: order.id, status: order.status, leadTimeDays: order.leadTimeDays },
      });
    }
    if (Math.random() < 0.12) {
      events.push({
        timestamp: `${order.date}T20:15:00Z`,
        type: 'dispute_filed',
        payload: { orderId: order.id, amount: Number((order.qty * order.unitPrice * 0.1).toFixed(2)) },
      });
    }
  });

  docs
    .filter((doc) => doc.status !== 'active' && Math.random() > 0.4)
    .forEach((doc) => {
      events.push({
        timestamp: `${doc.expiresAt}T00:00:00Z`,
        type: 'doc_expiring',
        payload: { supplierId: doc.supplierId, docType: doc.type, status: doc.status },
      });
    });

  return events.sort((a, b) => (a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0));
};

const enrichSuppliers = (
  suppliers: SupplierRecord[],
  tracker: Map<string, { total: number; onTime: number; disputes: number }>,
): SupplierRecord[] =>
  suppliers.map((supplier) => {
    const stats = tracker.get(supplier.id);
    if (!stats || stats.total === 0) {
      return supplier;
    }
    const onTimePct = stats.onTime / stats.total;
    const disputeRate = Math.max(stats.disputes / stats.total, 0.01);
    const riskLevel = disputeRate >= 0.08 ? 'high' : disputeRate >= 0.04 ? 'medium' : 'low';
    return {
      ...supplier,
      onTimePct: Number(onTimePct.toFixed(3)),
      disputeRate: Number(disputeRate.toFixed(3)),
      riskLevel,
    };
  });

export const generateSeedData = (
  options: { supplierCount?: number; inventoryCount?: number; orderCount?: number } = {},
): SeedData => {
  const { supplierCount, inventoryCount, orderCount } = resolveSeedSizes(options);

  const suppliers = generateSuppliers(supplierCount);
  const inventory = generateInventory(suppliers, inventoryCount);
  const { orders, onTimeTracker } = generateOrders(inventory, orderCount);
  const complianceDocs = generateComplianceDocs(suppliers);
  const events = generateEvents(orders, complianceDocs);
  const enrichedSuppliers = enrichSuppliers(suppliers, onTimeTracker);

  return {
    orders,
    inventory,
    suppliers: enrichedSuppliers,
    complianceDocs,
    events,
  };
};

export const filterOrdersByRange = (
  orders: OrderRecord[],
  from?: string,
  to?: string,
): OrderRecord[] => {
  if (!from && !to) return orders;
  return orders.filter((order) => {
    const date = new Date(order.date);
    if (from && isBefore(date, new Date(from))) return false;
    if (to && isAfter(date, new Date(addDays(new Date(to), 1)))) return false;
    return true;
  });
};
