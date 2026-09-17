import 'dotenv/config';
import express from 'express'; 
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from './lib/prisma';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import axios from 'axios';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { SunatService } from './services/sunatService';

const app = express();
const port = 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'carmelita-secret-key-2024';

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

app.use(helmet({ crossOriginResourcePolicy: false })); // Permite cargar imágenes desde /uploads
app.use(cors());
app.use(express.json());

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // Límite de 1000 peticiones por ventana por IP
  message: { error: 'Demasiadas peticiones desde esta IP, por favor intenta más tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', globalLimiter);

// --- RATE LIMITERS ESPECÍFICOS ---
// Login: 20 intentos por 15 min
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Demasiados intentos de inicio de sesión, por favor intenta más tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Pedidos web: máx 5 por IP por minuto (anti-bot)
const orderLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Demasiados pedidos en poco tiempo. Por favor espere un momento.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Registro de clientes: máx 10 por IP por hora (anti-spam)
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados registros desde esta IP. Intente más tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Búsqueda de productos: máx 60 por IP por minuto (anti-scraping)
const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Demasiadas solicitudes de búsqueda. Intente más tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});


app.use('/uploads', express.static(path.join(process.cwd(), 'public/uploads')));

// Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Token no proporcionado' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Token inválido o expirado' });
    req.user = user;
    next();
  });
};

// API Upload
app.post('/api/upload', authenticateToken, upload.single('image'), async (req, res) => {
  console.log('Upload received:', req.file?.filename);
  if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo' });
  
  const originalPath = req.file.path;
  const fileName = `${path.parse(req.file.filename).name}.webp`;
  const optimizedPath = path.join(uploadsDir, fileName);
  
  try {
    /* Temporarily disabled sharp to debug hanging issues
    console.log('Optimizing image...');
    await sharp(originalPath)
      .resize(1200, null, { withoutEnlargement: true }) // Max width 1200px
      .webp({ quality: 95 })
      .toFile(optimizedPath);
    
    console.log('Optimization successful');
    if (fs.existsSync(originalPath)) {
      fs.unlinkSync(originalPath);
    }
    const url = `/uploads/${fileName}`;
    */
    
    const url = `/uploads/${req.file.filename}`;
    console.log('Returning original URL:', url);
    res.json({ url });
  } catch (error) {
    console.error('Error optimizing image:', error);
    // If optimization fails, still return original URL but ideally we want optimized
    const url = `/uploads/${req.file.filename}`;
    res.json({ url });
  }
});

// --- VEHICLES ---
app.get('/api/vehicles', authenticateToken, async (req, res) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      orderBy: { plate: 'asc' }
    });
    res.json(vehicles);
  } catch (error: any) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({ error: 'Error al obtener los vehículos' });
  }
});

app.post('/api/vehicles', authenticateToken, async (req, res) => {
  try {
    const { plate, brand, model, capacityWeight, capacityVolume, status } = req.body;
    
    // Check if plate exists
    const existing = await prisma.vehicle.findUnique({ where: { plate } });
    if (existing) {
      return res.status(400).json({ error: 'Ya existe un vehículo con esa placa' });
    }

    const vehicle = await prisma.vehicle.create({
      data: { 
        plate, 
        brand, 
        model, 
        capacityWeight: Number(capacityWeight) || 0,
        capacityVolume: Number(capacityVolume) || 0,
        status: status || 'ACTIVE'
      }
    });
    res.status(201).json(vehicle);
  } catch (error: any) {
    console.error('Error creating vehicle:', error);
    res.status(500).json({ error: 'Error al crear el vehículo' });
  }
});

app.put('/api/vehicles/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { plate, brand, model, capacityWeight, capacityVolume, status } = req.body;
    
    const existing = await prisma.vehicle.findFirst({
      where: { plate, id: { not: Number(id) } }
    });
    if (existing) {
      return res.status(400).json({ error: 'Ya existe otro vehículo con esa placa' });
    }

    const vehicle = await prisma.vehicle.update({
      where: { id: Number(id) },
      data: {
        plate, 
        brand, 
        model, 
        capacityWeight: Number(capacityWeight) || 0,
        capacityVolume: Number(capacityVolume) || 0,
        status: status || 'ACTIVE'
      }
    });
    res.json(vehicle);
  } catch (error: any) {
    console.error('Error updating vehicle:', error);
    res.status(500).json({ error: 'Error al actualizar el vehículo' });
  }
});

app.delete('/api/vehicles/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificamos si tiene despachos asociados
    const dispatches = await prisma.dispatch.count({ where: { vehicleId: Number(id) } });
    if (dispatches > 0) {
      return res.status(400).json({ error: 'No se puede eliminar el vehículo porque tiene despachos asociados' });
    }

    await prisma.vehicle.delete({
      where: { id: Number(id) }
    });
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting vehicle:', error);
    res.status(500).json({ error: 'Error al eliminar el vehículo' });
  }
});

// --- DISPATCHES ---
app.get('/api/dispatches/available-orders', authenticateToken, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        warehouseStatus: 'PICKED',
        agencyId: { not: null },
        dispatchId: null,
        status: { not: 'CANCELLED' }
      },
      include: {
        customer: true,
        agency: true,
        items: {
          include: { 
            product: {
              include: {
                unit: true,
                package: true,
                subPackage: true
              }
            } 
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const mapped = orders.map(o => {
      let weight = 0;
      let volume = 0;
      let qty = 0;
      const unitsSet = new Set<string>();

      o.items.forEach(i => {
        weight += Number(i.product.weight || 0) * i.quantity;
        volume += Number(i.product.volume || 0) * i.quantity;
        qty += i.quantity;
        const u = i.unitMeasure || i.product.package?.symbol || i.product.subPackage?.symbol || i.product.unit?.symbol || 'UND';
        if (u) unitsSet.add(u.toUpperCase());
      });

      return {
        id: o.id,
        code: o.docSeries && o.docNumber ? `PED-${o.docSeries}-${o.docNumber}` : `PED-${String(o.id).padStart(5, '0')}`,
        customerName: o.customerName || o.customer?.name || (o.customer ? `${o.customer.firstName || ''} ${o.customer.lastName || ''}`.trim() : '') || 'Cliente Varios',
        weight,
        volume,
        qty,
        unitMeasure: Array.from(unitsSet).join(', ') || 'UND',
        agency: o.agency?.name || 'Agencia Asignada',
        status: o.warehouseStatus
      };
    });
    
    res.json(mapped);
  } catch (error: any) {
    console.error('Error fetching available orders:', error);
    res.status(500).json({ error: 'Error al obtener pedidos disponibles' });
  }
});

app.post('/api/dispatches', authenticateToken, async (req, res) => {
  try {
    const { vehicleId, orderIds, dispatchId, driverId } = req.body;

    // If dispatchId provided, validate it's still PENDING
    if (dispatchId) {
      const existing = await prisma.dispatch.findUnique({ where: { id: Number(dispatchId) } });
      if (!existing) {
        return res.status(404).json({ error: 'Despacho no encontrado' });
      }
      if (existing.status !== 'PENDING') {
        return res.status(400).json({ error: 'El despacho ya fue cargado. No se pueden agregar más pedidos.' });
      }
    }

    if (dispatchId) {
      // Add orders to existing dispatch in a transaction
      const updated = await prisma.$transaction(async (tx) => {
        const updateData: any = {
          orders: {
            connect: orderIds.map((id: number) => ({ id }))
          }
        };

        // If driverId provided, update driver on existing dispatch
        if (driverId) {
          const driver = await tx.user.findUnique({ where: { id: Number(driverId) } });
          updateData.driverId = Number(driverId);
          updateData.driverName = driver?.name || null;
        }

        await tx.dispatch.update({
          where: { id: Number(dispatchId) },
          data: updateData
        });

        return await tx.dispatch.findUnique({
          where: { id: Number(dispatchId) }
        });
      });
      
      return res.json(updated);
    }

    const dispatch = await prisma.$transaction(async (tx) => {
      let driverName = null;
      if (driverId) {
        const driver = await tx.user.findUnique({ where: { id: Number(driverId) } });
        driverName = driver?.name || null;
      }

      const newDispatch = await tx.dispatch.create({
        data: {
          vehicleId: Number(vehicleId),
          status: 'PENDING',
          driverId: driverId ? Number(driverId) : null,
          driverName,
          orders: {
            connect: orderIds.map((id: number) => ({ id }))
          }
        }
      });

      return newDispatch;
    });

    res.status(201).json(dispatch);
  } catch (error: any) {
    console.error('Error creating dispatch:', error);
    res.status(500).json({ error: 'Error al crear el despacho' });
  }
});

app.put('/api/dispatches/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['LOADING', 'IN_TRANSIT', 'DELIVERED'].includes(status)) {
      return res.status(400).json({ error: 'Estado inválido. Use: LOADING, IN_TRANSIT, DELIVERED' });
    }

    const dispatch = await prisma.dispatch.findUnique({
      where: { id: parseInt(id) },
      include: { orders: true }
    });

    if (!dispatch) {
      return res.status(404).json({ error: 'Despacho no encontrado' });
    }

    // Validate transitions
    if (status === 'LOADING' && dispatch.status !== 'PENDING') {
      return res.status(400).json({ error: 'Solo se pueden cargar despachos en estado PENDING.' });
    }
    if (status === 'IN_TRANSIT' && dispatch.status !== 'LOADING') {
      return res.status(400).json({ error: 'Solo se pueden poner en tránsito despachos en estado LOADING.' });
    }
    if (status === 'DELIVERED' && dispatch.status !== 'IN_TRANSIT') {
      return res.status(400).json({ error: 'Solo se pueden entregar despachos en estado IN_TRANSIT.' });
    }

    if (status === 'LOADING' && dispatch.orders.length === 0) {
      return res.status(400).json({ error: 'No se puede cargar un despacho sin pedidos asignados.' });
    }

    const updated = await prisma.dispatch.update({
      where: { id: parseInt(id) },
      data: { status }
    });

    if (status === 'LOADING') {
      await prisma.order.updateMany({
        where: { dispatchId: parseInt(id) },
        data: { warehouseStatus: 'DISPATCHED' }
      });
    }

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating dispatch status:', error);
    res.status(500).json({ error: 'Error al actualizar estado del despacho' });
  }
});

app.get('/api/dispatches', authenticateToken, async (req, res) => {
  try {
    const dispatches = await prisma.dispatch.findMany({
      include: { 
        vehicle: true, 
        orders: {
          include: {
            customer: true,
            agency: {
              include: {
                branches: true
              }
            },
            items: { 
              include: { 
                product: {
                  include: {
                    unit: true,
                    package: true,
                    subPackage: true
                  }
                } 
              } 
            }
          }
        }
      },
      orderBy: { id: 'desc' }
    });

    const mapped = dispatches.map(d => {
      let currentWeight = 0;
      let currentVolume = 0;
      
      const ordersMapped = d.orders.map(o => {
        let weight = 0;
        let volume = 0;
        let qty = 0;
        const unitsSet = new Set<string>();

        o.items.forEach(i => {
          weight += Number(i.product.weight || 0) * i.quantity;
          volume += Number(i.product.volume || 0) * i.quantity;
          qty += i.quantity;
          const u = i.unitMeasure || i.product.package?.symbol || i.product.subPackage?.symbol || i.product.unit?.symbol || 'UND';
          if (u) unitsSet.add(u.toUpperCase());
        });

        currentWeight += weight;
        currentVolume += volume;

        const mainBranch = o.agency?.branches?.find((b: any) => b.isMain) || o.agency?.branches?.[0];
        const displayAddress = mainBranch?.address || o.agency?.legalAddress || o.agency?.address || '';

        return {
          id: o.id,
          code: o.docSeries && o.docNumber ? `PED-${o.docSeries}-${o.docNumber}` : `PED-${String(o.id).padStart(5, '0')}`,
          customerName: o.customerName || o.customer?.name || (o.customer ? `${o.customer.firstName || ''} ${o.customer.lastName || ''}`.trim() : '') || 'Cliente Varios',
          weight,
          volume,
          qty,
          unitMeasure: Array.from(unitsSet).join(', ') || 'UND',
          agency: o.agency?.name || 'Desconocida',
          agencyAddress: displayAddress,
          agencyBranches: o.agency?.branches || [],
          status: o.warehouseStatus
        };
      });

      return {
        ...d,
        currentWeight,
        currentVolume,
        mappedOrders: ordersMapped
      };
    });

    res.json(mapped);
  } catch (error: any) {
    console.error('Error fetching dispatches:', error);
    res.status(500).json({ error: 'Error al obtener despachos' });
  }
});

app.delete('/api/dispatches/:dispatchId/orders/:orderId', authenticateToken, async (req, res) => {
  try {
    const { dispatchId, orderId } = req.params;
    
    const dispatch = await prisma.dispatch.findUnique({
      where: { id: Number(dispatchId) },
      include: { orders: true }
    });
    
    if (!dispatch) {
      return res.status(404).json({ error: 'Despacho no encontrado' });
    }
    
    if (dispatch.status !== 'PENDING') {
      return res.status(400).json({ error: 'Solo se pueden remover pedidos de despachos pendientes' });
    }
    
    await prisma.order.update({
      where: { id: Number(orderId) },
      data: { 
        dispatch: { disconnect: true },
        warehouseStatus: 'PICKED'
      }
    });
    
    const remainingOrders = await prisma.dispatch.findUnique({
      where: { id: Number(dispatchId) },
      include: { orders: true }
    });
    
    if (remainingOrders && remainingOrders.orders.length === 0) {
      await prisma.dispatch.delete({ where: { id: Number(dispatchId) } });
    }
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error removing order from dispatch:', error);
    res.status(500).json({ error: 'Error al remover pedido del despacho' });
  }
});

// --- MOBILE APP (CONDUCTOR) ---
app.get('/api/mobile/dispatch', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const dispatch = await prisma.dispatch.findFirst({
      where: {
        driverId: userId,
        status: { in: ['LOADING', 'IN_TRANSIT'] }
      },
      include: {
        vehicle: true,
        orders: {
          include: {
            items: { include: { product: true } },
            customer: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!dispatch) {
      return res.json(null);
    }

    const mappedOrders = dispatch.orders.map(o => {
      let weight = 0, volume = 0, qty = 0;
      o.items.forEach((i: any) => {
        weight += Number(i.product.weight || 0) * i.quantity;
        volume += Number(i.product.volume || 0) * i.quantity;
        qty += i.quantity;
      });
      return {
        id: o.id,
        code: `PED-${String(o.id).padStart(5, '0')}`,
        customerName: o.customer?.name || o.customerName,
        customerAddress: o.customerAddress || o.customer?.address,
        customerPhone: o.customerPhone,
        weight, volume, qty,
        status: o.warehouseStatus,
        deliveredAt: o.deliveredAt
      };
    });

    const totalOrders = mappedOrders.length;
    const deliveredOrders = mappedOrders.filter((o: any) => o.status === 'DELIVERED').length;

    res.json({
      id: dispatch.id,
      status: dispatch.status,
      vehicle: dispatch.vehicle,
      totalOrders,
      deliveredOrders,
      orders: mappedOrders
    });
  } catch (error: any) {
    console.error('Error fetching mobile dispatch:', error);
    res.status(500).json({ error: 'Error al obtener despacho' });
  }
});

app.put('/api/mobile/dispatch/:id/status', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;
    const { status } = req.body;

    if (status !== 'IN_TRANSIT') {
      return res.status(400).json({ error: 'Estado inválido. Use: IN_TRANSIT' });
    }

    const dispatch = await prisma.dispatch.findUnique({
      where: { id: parseInt(id) },
      include: { orders: true }
    });

    if (!dispatch) return res.status(404).json({ error: 'Despacho no encontrado' });
    if (dispatch.driverId !== userId) return res.status(403).json({ error: 'Este despacho no te pertenece' });
    if (dispatch.status !== 'LOADING') return res.status(400).json({ error: 'El despacho debe estar en estado LOADING' });

    const updated = await prisma.dispatch.update({
      where: { id: parseInt(id) },
      data: { status, departureDate: new Date() }
    });

    await prisma.order.updateMany({
      where: { dispatchId: parseInt(id) },
      data: { warehouseStatus: 'IN_TRANSIT' }
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating mobile dispatch status:', error);
    res.status(500).json({ error: 'Error al actualizar despacho' });
  }
});

app.get('/api/mobile/orders', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { status } = req.query;

    const dispatch = await prisma.dispatch.findFirst({
      where: {
        driverId: userId,
        status: { in: ['LOADING', 'IN_TRANSIT'] }
      },
      include: {
        orders: {
          include: {
            items: { include: { product: true } },
            customer: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!dispatch) return res.json([]);

    let orders = dispatch.orders.map(o => {
      let weight = 0, volume = 0, qty = 0;
      o.items.forEach((i: any) => {
        weight += Number(i.product.weight || 0) * i.quantity;
        volume += Number(i.product.volume || 0) * i.quantity;
        qty += i.quantity;
      });
      return {
        id: o.id,
        code: `PED-${String(o.id).padStart(5, '0')}`,
        customerName: o.customer?.name || o.customerName,
        customerAddress: o.customerAddress || o.customer?.address,
        customerPhone: o.customerPhone,
        weight, volume, qty,
        status: o.warehouseStatus,
        deliveredAt: o.deliveredAt
      };
    });

    if (status === 'delivered') orders = orders.filter((o: any) => o.status === 'DELIVERED');
    if (status === 'pending') orders = orders.filter((o: any) => o.status !== 'DELIVERED');

    res.json(orders);
  } catch (error: any) {
    console.error('Error fetching mobile orders:', error);
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
});

app.put('/api/mobile/orders/:id/deliver', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: parseInt(id) },
      include: { dispatch: true }
    });

    if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });
    if (!order.dispatch) return res.status(400).json({ error: 'Este pedido no pertenece a ningún despacho' });
    if (order.dispatch.driverId !== userId) return res.status(403).json({ error: 'Este pedido no te pertenece' });
    if (order.dispatch.status !== 'IN_TRANSIT') return res.status(400).json({ error: 'El despacho no está en tránsito' });
    if (order.warehouseStatus === 'DELIVERED') return res.status(400).json({ error: 'Este pedido ya fue entregado' });

    await prisma.order.update({
      where: { id: parseInt(id) },
      data: {
        warehouseStatus: 'DELIVERED',
        deliveredAt: new Date(),
        status: 'DELIVERED'
      }
    });

    // Check if all orders are delivered → auto-close dispatch
    const remaining = await prisma.order.count({
      where: {
        dispatchId: order.dispatch.id,
        warehouseStatus: { not: 'DELIVERED' }
      }
    });

    if (remaining === 0) {
      await prisma.dispatch.update({
        where: { id: order.dispatch.id },
        data: { status: 'DELIVERED' }
      });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error delivering order:', error);
    res.status(500).json({ error: 'Error al entregar pedido' });
  }
});

// --- API CATEGORIES ---
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: { _count: { select: { products: true } } }
    });
    res.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
});

app.post('/api/categories', authenticateToken, async (req, res) => {
  try {
    const { name, slug, image, isFeatured } = req.body;
    const category = await prisma.category.create({
      data: { name, slug, image, isFeatured: !!isFeatured }
    });
    res.json(category);
  } catch (error) {
    console.error("Error creating category:", error);
    res.status(500).json({ error: 'Error al crear categoría' });
  }
});

app.put('/api/categories/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, image, isFeatured } = req.body;
    const category = await prisma.category.update({
      where: { id: parseInt(id) },
      data: { name, slug, image, isFeatured: !!isFeatured }
    });
    res.json(category);
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({ error: 'Error al actualizar categoría' });
  }
});

app.delete('/api/categories/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const productsCount = await prisma.product.count({ where: { categoryId: parseInt(id) } });
    if (productsCount > 0) {
      return res.status(400).json({ error: 'No se puede eliminar una categoría con productos asociados.' });
    }
    await prisma.category.delete({ where: { id: parseInt(id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar categoría' });
  }
});

// --- API BRANDS ---
app.get('/api/brands', async (req, res) => {
  try {
    const brands = await prisma.brand.findMany({
      include: { _count: { select: { products: true } } }
    });
    res.json(brands);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener marcas' });
  }
});

app.post('/api/brands', authenticateToken, async (req, res) => {
  try {
    const { name, logo } = req.body;
    const brand = await prisma.brand.create({ data: { name, logo } });
    res.json(brand);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear marca' });
  }
});

app.put('/api/brands/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, logo } = req.body;
    const brand = await prisma.brand.update({
      where: { id: parseInt(id) },
      data: { name, logo }
    });
    res.json(brand);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar marca' });
  }
});

app.delete('/api/brands/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const productsCount = await prisma.product.count({ where: { brandId: parseInt(id) } });
    if (productsCount > 0) {
      return res.status(400).json({ error: 'No se puede eliminar una marca con productos asociados.' });
    }
    await prisma.brand.delete({ where: { id: parseInt(id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar marca' });
  }
});

// --- API UNITS ---
app.get('/api/units', async (req, res) => {
  try {
    const units = await prisma.unit.findMany({
      include: { _count: { select: { products: true } } }
    });
    res.json(units);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener unidades' });
  }
});

app.post('/api/units', authenticateToken, async (req, res) => {
  try {
    const { name, symbol } = req.body;
    const unit = await prisma.unit.create({ data: { name, symbol } });
    res.json(unit);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear unidad' });
  }
});

app.put('/api/units/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, symbol } = req.body;
    const unit = await prisma.unit.update({
      where: { id: parseInt(id) },
      data: { name, symbol }
    });
    res.json(unit);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar unidad' });
  }
});

app.delete('/api/units/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const productsCount = await prisma.product.count({ where: { unitId: parseInt(id) } });
    if (productsCount > 0) {
      return res.status(400).json({ error: 'No se puede eliminar una unidad con productos asociados.' });
    }
    await prisma.unit.delete({ where: { id: parseInt(id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar unidad' });
  }
});

// --- API PRODUCTS ---
app.get('/api/products', searchLimiter, async (req, res) => {
  try {
    const { search, category, limit } = req.query;

    // Construir filtro de búsqueda dinámico
    const where: any = {};

    // Detectar si la petición viene del panel admin (tiene token válido)
    const authHeader = req.headers.authorization;
    const isAdminRequest = !!authHeader && authHeader.startsWith('Bearer ');
    
    // Solo filtrar activos/visibles en peticiones públicas (ecommerce)
    if (!isAdminRequest) {
      where.isActive = true;
      where.showInWeb = true;
    }

    // Filtro de categoría por slug
    if (category && typeof category === 'string') {
      where.category = { slug: category };
    }

    // Búsqueda multi-campo: nombre, código, marca, descripción, categoría
    if (search && typeof search === 'string' && search.trim().length > 0) {
      const term = search.trim();
      where.OR = [
        { name:        { contains: term } },
        { code:        { contains: term } },
        { description: { contains: term } },
        { brand:       { name: { contains: term } } },
        { category:    { name: { contains: term } } },
      ];
    }

    const products = await (prisma as any).product.findMany({
      where,
      take: limit ? parseInt(limit as string) : undefined,
      include: { 
        category: true,
        brand: true,
        unit: true,
        package: true,
        subPackage: true,
        stockRecords: {
          include: { 
            warehouse: true,
            zone: { include: { floor: true } }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});


// Endpoint de productos en oferta (público)
app.get('/api/products/offers', async (req, res) => {
  try {
    const products = await (prisma as any).product.findMany({
      where: { isOnSale: true, isActive: true, showInWeb: true },
      include: { category: true, brand: true, unit: true },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener ofertas' });
  }
});

app.post('/api/products', authenticateToken, async (req, res) => {
  try {
    const { 
      name, slug, categoryId, images, code, weight, volume, 
      description, features, sanitaryRegister, certificate,
      igv, costPrice, salePrice, minSalePrice, maxSalePrice,
      brandId, unitId, isActive,
      packageId, quantityPerPackage, subPackageId, quantityPerSubPackage,
      showInWeb, manageLots, useExpiryDate, isOnSale, discountPercent,
      profitMargin, existenceTypeCode, valuationMethodCode
    } = req.body;

    if (!name || !slug || !categoryId) {
      return res.status(400).json({ error: 'Faltan campos obligatorios: nombre, slug y categoría.' });
    }

    const parsedCategoryId = parseInt(categoryId);
    if (isNaN(parsedCategoryId)) {
      return res.status(400).json({ error: 'Categoría inválida.' });
    }

    const product = await prisma.product.create({
      data: { 
        name, slug, 
        stock: 0, 
        categoryId: parsedCategoryId, 
        images,
        code, 
        weight: (weight && !isNaN(parseFloat(weight))) ? parseFloat(weight) : null,
        volume: (volume && !isNaN(parseFloat(volume))) ? parseFloat(volume) : null,
        description, features, sanitaryRegister, certificate,
        igv: (igv && !isNaN(parseFloat(igv))) ? parseFloat(igv) : 18,
        costPrice: (costPrice && !isNaN(parseFloat(costPrice))) ? parseFloat(costPrice) : 0,
        salePrice: (salePrice && !isNaN(parseFloat(salePrice))) ? parseFloat(salePrice) : 0,
        minSalePrice: (minSalePrice && !isNaN(parseFloat(minSalePrice))) ? parseFloat(minSalePrice) : null,
        maxSalePrice: (maxSalePrice && !isNaN(parseFloat(maxSalePrice))) ? parseFloat(maxSalePrice) : null,
        brandId: (brandId && !isNaN(parseInt(brandId))) ? parseInt(brandId) : null,
        unitId: (unitId && !isNaN(parseInt(unitId))) ? parseInt(unitId) : null,
        isActive: isActive !== undefined ? isActive : true,
        packageId: (packageId && !isNaN(parseInt(packageId))) ? parseInt(packageId) : null,
        quantityPerPackage: (quantityPerPackage && !isNaN(parseInt(quantityPerPackage))) ? parseInt(quantityPerPackage) : 1,
        subPackageId: (subPackageId && !isNaN(parseInt(subPackageId))) ? parseInt(subPackageId) : null,
        quantityPerSubPackage: (quantityPerSubPackage && !isNaN(parseInt(quantityPerSubPackage))) ? parseInt(quantityPerSubPackage) : 1,
        showInWeb: showInWeb !== undefined ? showInWeb : true,
        manageLots: manageLots !== undefined ? manageLots : false,
        useExpiryDate: useExpiryDate !== undefined ? useExpiryDate : false,
        isOnSale: isOnSale !== undefined ? isOnSale : false,
        discountPercent: (discountPercent && !isNaN(parseFloat(discountPercent))) ? parseFloat(discountPercent) : null,
        profitMargin: (profitMargin && !isNaN(parseFloat(profitMargin))) ? parseFloat(profitMargin) : 0,
        existenceTypeCode: existenceTypeCode || '01',
        valuationMethodCode: valuationMethodCode || '1'
      }
    });
    res.json(product);
  } catch (error: any) {
    console.error("Error creating product:", error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe un producto con ese slug o código.' });
    }
    res.status(500).json({ error: 'Error al crear producto: ' + error.message });
  }
});

app.put('/api/products/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, slug, categoryId, images, code, weight, volume, 
      description, features, sanitaryRegister, certificate,
      igv, costPrice, salePrice, minSalePrice, maxSalePrice,
      brandId, unitId, isActive,
      packageId, quantityPerPackage, subPackageId, quantityPerSubPackage,
      showInWeb, manageLots, useExpiryDate, isOnSale, discountPercent,
      profitMargin, existenceTypeCode, valuationMethodCode
    } = req.body;

    if (!name || !slug || !categoryId) {
      return res.status(400).json({ error: 'Faltan campos obligatorios: nombre, slug y categoría.' });
    }

    const parsedCategoryId = parseInt(categoryId);
    if (isNaN(parsedCategoryId)) {
      return res.status(400).json({ error: 'Categoría inválida.' });
    }

    const product = await prisma.product.update({
      where: { id: parseInt(id) },
      data: { 
        name, slug, 
        categoryId: parsedCategoryId, 
        images,
        code, 
        weight: (weight && !isNaN(parseFloat(weight))) ? parseFloat(weight) : null,
        volume: (volume && !isNaN(parseFloat(volume))) ? parseFloat(volume) : null,
        description, features, sanitaryRegister, certificate,
        igv: (igv && !isNaN(parseFloat(igv))) ? parseFloat(igv) : 18,
        costPrice: (costPrice && !isNaN(parseFloat(costPrice))) ? parseFloat(costPrice) : 0,
        salePrice: (salePrice && !isNaN(parseFloat(salePrice))) ? parseFloat(salePrice) : 0,
        minSalePrice: (minSalePrice && !isNaN(parseFloat(minSalePrice))) ? parseFloat(minSalePrice) : null,
        maxSalePrice: (maxSalePrice && !isNaN(parseFloat(maxSalePrice))) ? parseFloat(maxSalePrice) : null,
        brandId: (brandId && !isNaN(parseInt(brandId))) ? parseInt(brandId) : null,
        unitId: (unitId && !isNaN(parseInt(unitId))) ? parseInt(unitId) : null,
        isActive: isActive !== undefined ? isActive : true,
        packageId: (packageId && !isNaN(parseInt(packageId))) ? parseInt(packageId) : null,
        quantityPerPackage: (quantityPerPackage && !isNaN(parseInt(quantityPerPackage))) ? parseInt(quantityPerPackage) : 1,
        subPackageId: (subPackageId && !isNaN(parseInt(subPackageId))) ? parseInt(subPackageId) : null,
        quantityPerSubPackage: (quantityPerSubPackage && !isNaN(parseInt(quantityPerSubPackage))) ? parseInt(quantityPerSubPackage) : 1,
        showInWeb: showInWeb !== undefined ? showInWeb : true,
        manageLots: manageLots !== undefined ? manageLots : false,
        useExpiryDate: useExpiryDate !== undefined ? useExpiryDate : false,
        isOnSale: isOnSale !== undefined ? isOnSale : false,
        discountPercent: (discountPercent && !isNaN(parseFloat(discountPercent))) ? parseFloat(discountPercent) : null,
        profitMargin: (profitMargin && !isNaN(parseFloat(profitMargin))) ? parseFloat(profitMargin) : 0,
        existenceTypeCode: existenceTypeCode || '01',
        valuationMethodCode: valuationMethodCode || '1'
      }
    });
    res.json(product);
  } catch (error: any) {
    console.error("Error updating product:", error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe un producto con ese slug o código.' });
    }
    res.status(500).json({ error: 'Error al actualizar producto: ' + error.message });
  }
});

app.delete('/api/products/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.product.delete({ where: { id: parseInt(id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar producto. Verifique que no tenga movimientos o pedidos asociados.' });
  }
});

// --- API ADS ---
app.get('/api/ads', async (req, res) => {
  try {
    const ads = await prisma.advertisement.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(ads);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener anuncios' });
  }
});

app.post('/api/ads', authenticateToken, async (req, res) => {
  try {
    const { title, imageUrl, mobileImageUrl, position, link } = req.body;
    const ad = await prisma.advertisement.create({
      data: { title, imageUrl, mobileImageUrl, position, link }
    });
    res.json(ad);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear anuncio' });
  }
});

app.put('/api/ads/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, imageUrl, mobileImageUrl, position, link, isActive } = req.body;
    const ad = await prisma.advertisement.update({
      where: { id: parseInt(id) },
      data: { title, imageUrl, mobileImageUrl, position, link, isActive }
    });
    res.json(ad);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar anuncio' });
  }
});

app.delete('/api/ads/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.advertisement.delete({ where: { id: parseInt(id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar anuncio' });
  }
});

// --- API BRANDS ---
app.get('/api/brands', async (req, res) => {
  try {
    const brands = await prisma.brand.findMany({ include: { _count: { select: { products: true } } } });
    res.json(brands);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener marcas' });
  }
});

app.post('/api/brands', authenticateToken, async (req, res) => {
  try {
    const { name, logo } = req.body;
    const brand = await prisma.brand.create({ data: { name, logo } });
    res.json(brand);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear marca' });
  }
});

app.put('/api/brands/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, logo } = req.body;
    const brand = await prisma.brand.update({ where: { id: parseInt(id) }, data: { name, logo } });
    res.json(brand);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar marca' });
  }
});

app.delete('/api/brands/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.brand.delete({ where: { id: parseInt(id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar marca. Verifique que no tenga productos asociados.' });
  }
});

// --- API UNITS ---
app.get('/api/units', async (req, res) => {
  try {
    const units = await prisma.unit.findMany();
    res.json(units);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener unidades' });
  }
});

app.post('/api/units', authenticateToken, async (req, res) => {
  try {
    const { name, symbol } = req.body;
    const unit = await prisma.unit.create({ data: { name, symbol } });
    res.json(unit);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear unidad' });
  }
});

app.put('/api/units/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, symbol } = req.body;
    const unit = await prisma.unit.update({ where: { id: parseInt(id) }, data: { name, symbol } });
    res.json(unit);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar unidad' });
  }
});

app.delete('/api/units/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.unit.delete({ where: { id: parseInt(id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar unidad. Verifique que no tenga productos asociados.' });
  }
});

// --- API SETTINGS ---
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await prisma.globalSetting.findMany();
    const settingsMap = settings.reduce((acc: any, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    res.json(settingsMap);
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ error: 'Error al obtener ajustes' });
  }
});

app.post('/api/settings', authenticateToken, async (req, res) => {
  try {
    const { key, value } = req.body;
    const setting = await prisma.globalSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    });
    res.json(setting);
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar ajuste' });
  }
});

// --- API AUTH ---
app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ 
      where: { email },
      include: { role: true, warehouse: true }
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    if (!user.isActive) {
      return res.status(401).json({ error: 'Cuenta inactiva. Contacte al administrador.' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
    let permissions = [];
    if (user.role && user.role.permissions) {
      try { permissions = JSON.parse(user.role.permissions); } catch (e) {}
    }
    
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        series: (user as any).series,
        warehouseId: user.warehouseId,
        warehouse: user.warehouse,
        role: user.role?.name,
        permissions
      } 
    });
  } catch (error) {
    res.status(500).json({ error: 'Error en el inicio de sesión' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ 
      where: { id: (req as any).user.userId },
      select: { id: true, email: true, name: true, series: true, warehouseId: true, warehouse: true, isActive: true, role: true }
    });
    
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (!user.isActive) return res.status(401).json({ error: 'Cuenta inactiva' });

    let permissions = [];
    if (user.role && user.role.permissions) {
      try { permissions = JSON.parse(user.role.permissions); } catch (e) {}
    }

    res.json({ 
      id: user.id, 
      email: user.email, 
      name: user.name, 
      series: user.series,
      warehouseId: user.warehouseId,
      warehouse: user.warehouse,
      role: user.role?.name,
      permissions
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
});

// --- ACTUALIZAR PERFIL DE USUARIO ---
app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Nombre y correo son requeridos' });
    }

    // Verificar si el correo ya pertenece a otro usuario
    const existing = await prisma.user.findFirst({
      where: {
        email: email.trim().toLowerCase(),
        NOT: { id: userId }
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado por otro usuario' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { name: name.trim(), email: email.trim().toLowerCase() },
      select: { id: true, email: true, name: true, series: true, warehouseId: true, warehouse: true, role: true }
    });

    let permissions = [];
    if (updatedUser.role && updatedUser.role.permissions) {
      try { permissions = JSON.parse(updatedUser.role.permissions); } catch (e) {}
    }

    res.json({
      message: 'Perfil actualizado con éxito',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        series: updatedUser.series,
        warehouseId: updatedUser.warehouseId,
        warehouse: updatedUser.warehouse,
        role: updatedUser.role?.name,
        permissions
      }
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Error al actualizar el perfil' });
  }
});

// --- CAMBIO DE CONTRASEÑA ---
app.put('/api/auth/change-password', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Debe ingresar la contraseña actual y la nueva contraseña' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'La confirmación de la nueva contraseña no coincide' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'La contraseña actual ingresada es incorrecta' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword }
    });

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error: any) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Error al cambiar la contraseña' });
  }
});

// --- API SUNAT TABLES ---
app.get('/api/sunat/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    const data = await prisma.sunatTable.findMany({ where: { tableName, isActive: true } });
    
    // Auto-seed if empty
    if (data.length === 0) {
      const defaults: Record<string, any[]> = {
        'TABLA_02': [
          { code: '0', name: 'OTROS TIPOS DE DOCUMENTOS' },
          { code: '1', name: 'DOCUMENTO NACIONAL DE IDENTIDAD (DNI)' },
          { code: '4', name: 'CARNET DE EXTRANJERÍA' },
          { code: '6', name: 'REGISTRO ÚNICO DE CONTRIBUYENTES' },
          { code: '7', name: 'PASAPORTE' },
          { code: 'A', name: 'CÉDULA DIPLOMÁTICA DE IDENTIDAD' }
        ],
        'TABLA_04': [
          { code: 'PEN', name: 'SOLES' },
          { code: 'USD', name: 'DÓLARES' }
        ],
        'CAT_PAY': [
          { code: 'CONTADO', name: 'CONTADO' },
          { code: 'CREDITO', name: 'CRÉDITO' }
        ],
        'TABLA_12': [
          { code: '01', name: 'VENTA NACIONAL' },
          { code: '02', name: 'COMPRA NACIONAL' },
          { code: '11', name: 'SALIDA POR TRANSFERENCIA ENTRE ALMACENES' },
          { code: '21', name: 'ENTRADA POR TRANSFERENCIA ENTRE ALMACENES' },
          { code: '16', name: 'SALDO INICIAL' },
          { code: '10', name: 'SALIDA A PRODUCCIÓN' },
          { code: '19', name: 'ENTRADA DE PRODUCCIÓN' },
          { code: '28', name: 'AJUSTE POR DIFERENCIA DE INVENTARIO' }
        ],
        'TABLA_05': [
          { code: '01', name: 'MERCADERÍAS' },
          { code: '02', name: 'PRODUCTOS TERMINADOS' },
          { code: '03', name: 'MATERIAS PRIMAS' }
        ],
        'TABLA_14': [
          { code: '1', name: 'PROMEDIO PONDERADO' },
          { code: '2', name: 'PRIMERAS ENTRADAS, PRIMERAS SALIDAS' }
        ],
        'TABLA_10': [
          { code: '00', name: 'Otros' },
          { code: '01', name: 'Factura' },
          { code: '02', name: 'Recibo por Honorarios' },
          { code: '03', name: 'Boleta de Venta' },
          { code: '07', name: 'Nota de crédito' },
          { code: '08', name: 'Nota de débito' },
          { code: '09', name: 'Guía de remisión - Remitente' },
          { code: '31', name: 'Guía de Remisión - Transportista' },
          { code: '50', name: 'Declaración Única de Aduanas - Importación definitiva' },
          { code: '97', name: 'Nota de Crédito - No Domiciliado' },
          { code: '98', name: 'Nota de Débito - No Domiciliado' }
        ],
        'CAT_51': [
          { code: '0101', name: 'Venta Interna' },
          { code: '0102', name: 'Exportación' },
          { code: '0103', name: 'No Domiciliados' },
          { code: '0200', name: 'Compra Nacional' },
          { code: '0201', name: 'Compra Importación' },
          { code: '11', name: 'SALIDA POR TRANSFERENCIA ENTRE ALMACENES' },
          { code: '21', name: 'ENTRADA POR TRANSFERENCIA ENTRE ALMACENES' },
          { code: '16', name: 'SALDO INICIAL' },
          { code: '99', name: 'AJUSTE POR DIFERENCIA DE INVENTARIO' },
          { code: '01', name: 'VENTA NACIONAL' },
          { code: '02', name: 'COMPRA NACIONAL' }
        ]
      };

      if (defaults[tableName]) {
        const seedData = defaults[tableName].map(item => ({ ...item, tableName }));
        await prisma.sunatTable.createMany({ data: seedData });
        return res.json(await prisma.sunatTable.findMany({ where: { tableName } }));
      }
    }
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener tabla SUNAT' });
  }
});

// --- FETCH SUNAT EXCHANGE RATE ---
app.get('/api/exchange-rates/fetch-sunat', authenticateToken, async (req, res) => {
  try {
    // Tomar la fecha del query o usar la fecha actual en formato YYYY-MM-DD
    const dateQuery = req.query.date as string;
    let fecha = '';
    
    if (dateQuery && /^\d{4}-\d{2}-\d{2}$/.test(dateQuery)) {
      fecha = dateQuery;
    } else {
      const today = new Date();
      // Formato manual YYYY-MM-DD considerando la zona horaria local de Perú (aprox)
      fecha = today.toISOString().split('T')[0];
    }

    const response = await axios.get(`https://free.e-api.net.pe/tipo-cambio/${fecha}.json`, {
      timeout: 10000
    });

    if (response.data && response.data.compra) {
      res.json({
        compra: response.data.compra,
        venta: response.data.venta,
        fecha: response.data.fecha
      });
    } else {
      res.status(404).json({ error: 'No se pudo obtener el tipo de cambio de la SUNAT para esta fecha.' });
    }
  } catch (error: any) {
    console.error('Error fetching SUNAT exchange rate:', error.message);
    res.status(500).json({ error: 'Error de conexión con el servicio de SUNAT.' });
  }
});

// --- API EXCHANGE RATES ---
app.get('/api/exchange-rates', authenticateToken, async (req, res) => {
  try {
    const rates = await prisma.exchangeRate.findMany({
      orderBy: { date: 'desc' }
    });
    res.json(rates);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener tipos de cambio' });
  }
});

app.get('/api/exchange-rates/today', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const rate = await prisma.exchangeRate.findFirst({
      where: { date: { gte: today } },
      orderBy: { date: 'desc' }
    });
    // Backward compatibility: export 'rate' as 'sell_rate' for orders/quotations
    res.json(rate ? { ...rate, rate: rate.sell_rate } : { rate: 1.0 });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener tipo de cambio' });
  }
});

app.post('/api/exchange-rates', authenticateToken, async (req, res) => {
  try {
    const { date, buy_rate, sell_rate } = req.body;
    let targetDate = new Date();
    if (date) {
      targetDate = new Date(date + 'T12:00:00'); 
    }
    targetDate.setHours(0, 0, 0, 0);

    const exchangeRate = await prisma.exchangeRate.upsert({
      where: { date: targetDate },
      update: { 
        buy_rate: parseFloat(buy_rate) || 1.0, 
        sell_rate: parseFloat(sell_rate) || 1.0 
      },
      create: { 
        date: targetDate, 
        buy_rate: parseFloat(buy_rate) || 1.0, 
        sell_rate: parseFloat(sell_rate) || 1.0 
      }
    });
    res.json(exchangeRate);
  } catch (error) {
    console.error("Exchange rate save error:", error);
    res.status(500).json({ error: 'Error al guardar tipo de cambio' });
  }
});

app.delete('/api/exchange-rates/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.exchangeRate.delete({ where: { id: parseInt(id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar tipo de cambio' });
  }
});

// --- API CUSTOMERS ---
app.get('/api/customers', authenticateToken, async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});

app.post('/api/customers', authenticateToken, async (req, res) => {
  try {
    let { 
      name, docType, docNumber, address, phone, email, contact, code,
      personType, firstName, secondName, lastName, surname,
      country, department, province, district 
    } = req.body;

    // --- VALIDACIONES DE INTEGRIDAD ---
    if (!docNumber) {
      return res.status(400).json({ error: 'El número de documento es obligatorio.' });
    }
    if (docNumber.length !== 8 && docNumber.length !== 11) {
      return res.status(400).json({ error: 'El número de documento debe tener 8 dígitos (DNI) u 11 dígitos (RUC).' });
    }
    if (personType === 'NATURAL' && !firstName && !lastName && !name) {
      return res.status(400).json({ error: 'Debe proporcionar al menos el nombre o apellidos del cliente.' });
    }
    if (personType === 'JURIDICA' && !name) {
      return res.status(400).json({ error: 'La razón social es obligatoria para personas jurídicas.' });
    }

    // Si es persona natural, construimos el nombre completo si no viene
    // Normalizar docType y nombre
    const normalizeDocType = (dt?: string) => {
      if (!dt) return 'DNI';
      const clean = dt.trim().toUpperCase();
      if (clean === '1' || clean === 'DNI') return 'DNI';
      if (clean === '6' || clean === 'RUC') return 'RUC';
      if (clean === '4' || clean === 'CE') return 'CE';
      if (clean === '7' || clean === 'PAS') return 'PAS';
      return clean;
    };

    docType = normalizeDocType(docType);

    // Si es persona natural, construimos el nombre completo si no viene
    if (personType === 'NATURAL' && !name) {
      name = [firstName, secondName, lastName, surname].filter(Boolean).join(' ');
    }
    
    name = name ? name.toUpperCase().trim() : '';
    
    // Concatenar dirección: Dirección Específica - Departamento - Provincia - Distrito
    const formatFullAddressServer = (addr?: string | null, dist?: string | null, prov?: string | null, dept?: string | null) => {
      const cleanStr = (s?: string | null) => (s || '').trim().toUpperCase();
      const removeAccents = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const isNumericOnly = (s: string) => /^\d+$/.test(s.trim());

      let a = cleanStr(addr);
      a = a.replace(/(?:\s*-\s*\d{1,4})+\s*$/g, '').trim();

      const de = isNumericOnly(cleanStr(dept)) ? '' : cleanStr(dept);
      const pr = isNumericOnly(cleanStr(prov)) ? '' : cleanStr(prov);
      const di = isNumericOnly(cleanStr(dist)) ? '' : cleanStr(dist);

      if (!a) return [de, pr, di].filter(Boolean).join(' - ');
      const normAddr = removeAccents(a);
      const parts = [a];
      if (de && !normAddr.includes(removeAccents(de))) parts.push(de);
      if (pr && !normAddr.includes(removeAccents(pr))) parts.push(pr);
      if (di && !normAddr.includes(removeAccents(di))) parts.push(di);
      return parts.join(' - ');
    };

    address = formatFullAddressServer(address, district, province, department);

    // Si no hay código, usamos el número de documento
    if (!code) code = docNumber;

    const customer = await prisma.customer.create({
      data: { 
        name, docType, docNumber, address, phone, email, contact, code,
        personType: personType || 'NATURAL', 
        firstName: firstName ? firstName.toUpperCase().trim() : null, 
        secondName: secondName ? secondName.toUpperCase().trim() : null, 
        lastName: lastName ? lastName.toUpperCase().trim() : null, 
        surname: surname ? surname.toUpperCase().trim() : null,
        country: country || 'PERU', 
        department, province, district
      }
    });
    res.json(customer);
  } catch (error: any) {
    console.error('Error creating customer:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe un cliente con ese documento o código.' });
    }
    res.status(500).json({ error: 'Error al crear cliente' });
  }
});

app.put('/api/customers/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    let { 
      name, docType, docNumber, address, phone, email, contact, code,
      personType, firstName, secondName, lastName, surname,
      country, department, province, district 
    } = req.body;

    const normalizeDocType = (dt?: string) => {
      if (!dt) return 'DNI';
      const clean = dt.trim().toUpperCase();
      if (clean === '1' || clean === 'DNI') return 'DNI';
      if (clean === '6' || clean === 'RUC') return 'RUC';
      if (clean === '4' || clean === 'CE') return 'CE';
      if (clean === '7' || clean === 'PAS') return 'PAS';
      return clean;
    };

    if (docType) docType = normalizeDocType(docType);

    if (personType === 'NATURAL' && !name) {
      name = [firstName, secondName, lastName, surname].filter(Boolean).join(' ');
    }

    name = name ? name.toUpperCase().trim() : undefined;
    if (address !== undefined) {
      const formatFullAddressServer = (addr?: string | null, dist?: string | null, prov?: string | null, dept?: string | null) => {
        const cleanStr = (s?: string | null) => (s || '').trim().toUpperCase();
        const removeAccents = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const isNumericOnly = (s: string) => /^\d+$/.test(s.trim());

        let a = cleanStr(addr);
        a = a.replace(/(?:\s*-\s*\d{1,4})+\s*$/g, '').trim();

        const de = isNumericOnly(cleanStr(dept)) ? '' : cleanStr(dept);
        const pr = isNumericOnly(cleanStr(prov)) ? '' : cleanStr(prov);
        const di = isNumericOnly(cleanStr(dist)) ? '' : cleanStr(dist);

        if (!a) return [de, pr, di].filter(Boolean).join(' - ');
        const normAddr = removeAccents(a);
        const parts = [a];
        if (de && !normAddr.includes(removeAccents(de))) parts.push(de);
        if (pr && !normAddr.includes(removeAccents(pr))) parts.push(pr);
        if (di && !normAddr.includes(removeAccents(di))) parts.push(di);
        return parts.join(' - ');
      };
      address = formatFullAddressServer(address, district, province, department);
    }

    const customer = await prisma.customer.update({
      where: { id: parseInt(id) },
      data: { 
        name, docType, docNumber, address, phone, email, contact, code,
        personType: firstName ? personType : undefined, 
        firstName: firstName ? firstName.toUpperCase().trim() : undefined, 
        secondName: secondName ? secondName.toUpperCase().trim() : undefined, 
        lastName: lastName ? lastName.toUpperCase().trim() : undefined, 
        surname: surname ? surname.toUpperCase().trim() : undefined,
        country, department, province, district
      }
    });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
});

app.delete('/api/customers/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.customer.delete({ where: { id: parseInt(id) } });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ error: 'Error al eliminar cliente. Verifique que no tenga cotizaciones o pedidos asociados.' });
  }
});

app.get('/api/customers/search/:query', authenticateToken, async (req, res) => {
  try {
    const { query } = req.params;
    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { docNumber: { contains: query } },
          { code: { contains: query } }
        ]
      },
      take: 10
    });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: 'Error al buscar clientes' });
  }
});

app.get('/api/products/search', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: String(q) } },
          { code: { contains: String(q) } }
        ]
      },
      include: {
        category: true,
        brand: true,
        unit: true,
        package: true,
        subPackage: true,
        stockRecords: {
          include: { warehouse: true }
        }
      },
      take: 20
    });
    res.json(products);
  } catch (error) {
    console.error('Product search error:', error);
    res.status(500).json({ error: 'Error al buscar productos' });
  }
});

// --- API QUOTATIONS ---
app.get('/api/quotations', authenticateToken, async (req, res) => {
  try {
    const quotations = await prisma.quotation.findMany({
      include: { 
        items: { include: { product: { include: { unit: true } } } },
        customer: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(quotations);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener cotizaciones' });
  }
});

app.post('/api/quotations', async (req, res) => {
  try {
    const { 
      customerId, customerName, customerPhone, customerEmail, customerDocType, 
      customerDocNumber, customerAddress, docType, docSeries, docNumber,
      internalCode, igvPercent, exchangeRate, dueDate, sellerId, sellerName, includeIgv, 
      priceIncludesIgv, operationType, paymentCondition, currency, items, 
      totalAmount, globalDiscount, flete, billingStatus, purchaseOrder, 
      requirementNumber, pickupPlace, observation, notes, agencyId, branchId, origin
    } = req.body;

    // --- VALIDACIONES DE INTEGRIDAD ---
    if (!customerName && !customerId) {
      return res.status(400).json({ error: 'Debe proporcionar un nombre de cliente o ID de cliente.' });
    }
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'La cotización debe tener al menos un producto.' });
    }
    if (parseFloat(totalAmount as any) <= 0) {
      return res.status(400).json({ error: 'El monto total de la cotización debe ser mayor a cero.' });
    }
    // Validar formato básico de documento si viene
    if (customerDocNumber && (customerDocNumber.length !== 8 && customerDocNumber.length !== 11)) {
       console.warn(`[VALIDATION] Document number ${customerDocNumber} has unusual length.`);
    }

    let finalCustomerId = customerId ? parseInt(customerId) : null;

    if (!finalCustomerId && customerDocNumber) {
      const existingCustomer = await prisma.customer.findUnique({
        where: { docNumber: customerDocNumber }
      });
      if (existingCustomer) {
        finalCustomerId = existingCustomer.id;
      } else if (customerName) {
        const newCustomer = await prisma.customer.create({
          data: {
            name: customerName,
            docNumber: customerDocNumber,
            docType: customerDocType || 'DNI',
            phone: customerPhone,
            email: customerEmail,
            address: customerAddress
          }
        });
        finalCustomerId = newCustomer.id;
      }
    }

    const quotation = await prisma.$transaction(async (tx) => {
      let finalDocNumber = docNumber;
      let finalDocSeries = docSeries;

      // Logica automatica para Cotizaciones desde E-commerce (WEB)
      if (origin === 'WEB') {
        finalDocSeries = 'WEB1';
        // Buscamos cualquier almacen disponible para anclar la serie (usualmente el principal ID=1)
        const firstWarehouse = await (tx as any).warehouse.findFirst({ orderBy: { id: 'asc' } });
        if (firstWarehouse) {
          let seriesRec = await (tx as any).documentSeries.findFirst({
            where: { series: 'WEB1', documentType: 'COT' }
          });
          // Si no existe la serie WEB1, la creamos al vuelo
          if (!seriesRec) {
            seriesRec = await (tx as any).documentSeries.create({
              data: {
                documentType: 'COT',
                series: 'WEB1',
                currentNumber: 0,
                warehouseId: firstWarehouse.id
              }
            });
          }
          const nextNum = seriesRec.currentNumber + 1;
          finalDocNumber = nextNum.toString().padStart(8, '0');
          await (tx as any).documentSeries.update({
            where: { id: seriesRec.id },
            data: { currentNumber: nextNum }
          });
        }
      } else if (docSeries && pickupPlace) {
        // Logica habitual para sistema interno
        const warehouse = await (tx as any).warehouse.findFirst({ 
          where: { 
            OR: [
              { name: pickupPlace },
              { id: isNaN(parseInt(pickupPlace)) ? -1 : parseInt(pickupPlace) }
            ]
          } 
        });
        if (warehouse) {
          const seriesRec = await (tx as any).documentSeries.findFirst({
            where: { 
              warehouseId: warehouse.id, 
              documentType: docType || 'COT', 
              series: docSeries 
            }
          });
          if (seriesRec) {
            const nextNum = seriesRec.currentNumber + 1;
            finalDocNumber = nextNum.toString().padStart(8, '0');
            await (tx as any).documentSeries.update({
              where: { id: seriesRec.id },
              data: { currentNumber: nextNum }
            });
          }
        }
      }

      return await tx.quotation.create({
        data: {
          customerId: finalCustomerId,
          customerName: customerName || '', 
          customerPhone: customerPhone || '', 
          customerEmail: customerEmail || '', 
          customerDocType, 
          customerDocNumber, customerAddress, docType, docSeries: finalDocSeries, 
          docNumber: finalDocNumber,
          internalCode, 
          igvPercent: parseFloat(igvPercent as any) || 18, 
          exchangeRate: parseFloat(exchangeRate as any) || 1, 
          dueDate: dueDate ? new Date(dueDate) : null, 
          sellerId: sellerId ? parseInt(sellerId as string) : null,
          sellerName, includeIgv, 
          priceIncludesIgv, operationType, paymentCondition, currency, 
          totalAmount: parseFloat(totalAmount as any) || 0, 
          globalDiscount: parseFloat(globalDiscount as any) || 0, 
          flete: parseFloat(flete as any) || 0, 
          billingStatus, pickupPlace, observation, notes,
          agencyId: (agencyId && !isNaN(parseInt(agencyId))) ? parseInt(agencyId) : null,
          branchId: (branchId && !isNaN(parseInt(branchId))) ? parseInt(branchId) : null,
          items: {
            create: (items || []).map((item: any) => {
              const qty = parseInt(item.quantity);
              const pId = parseInt(item.productId);
              
              let validExpiry = null;
              if (item.expiryDate) {
                const d = new Date(item.expiryDate);
                if (!isNaN(d.getTime())) validExpiry = d;
              }

              return {
                productId: pId,
                quantity: isNaN(qty) ? 0 : qty,
                price: parseFloat(item.price) || 0,
                discount: parseFloat(item.discount) || 0,
                lotNumber: item.lotNumber || item.lot || null,
                warehouseName: item.warehouseName || null,
                expiryDate: validExpiry,
                unitMeasure: item.unitMeasure || null
              };
            })
          }
        },
        include: { items: true }
      });
    });

    res.json(quotation);
  } catch (error: any) {
    console.error('Error creating quotation:', error);
    res.status(500).json({ error: 'Error al crear cotización: ' + (error.message || 'Error desconocido') });
  }
});

app.put('/api/quotations/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      customerId, customerName, customerPhone, customerEmail, customerDocType, 
      customerDocNumber, customerAddress, docType, docSeries, docNumber,
      internalCode, igvPercent, exchangeRate, dueDate, sellerId, sellerName, includeIgv, 
      priceIncludesIgv, operationType, paymentCondition, currency, items, 
      totalAmount, globalDiscount, flete, billingStatus, purchaseOrder, 
      requirementNumber, pickupPlace, observation, notes, agencyId, branchId 
    } = req.body;

    let finalCustomerId = customerId ? parseInt(customerId) : null;

    // Eliminar items previos y crear nuevos (simplificado)
    await prisma.quotationItem.deleteMany({ where: { quotationId: parseInt(id) } });

    const quotation = await (prisma.quotation as any).update({
      where: { id: parseInt(id) },
      data: {
        customerId: finalCustomerId,
        customerName: customerName || '', 
        customerPhone: customerPhone || '', 
        customerEmail: customerEmail || '', 
        customerDocType, 
        customerDocNumber, customerAddress, docType, docSeries, docNumber,
        internalCode, 
        igvPercent: parseFloat(igvPercent as any) || 18, 
        exchangeRate: parseFloat(exchangeRate as any) || 1, 
        dueDate: dueDate ? new Date(dueDate) : null, 
        sellerId: sellerId ? parseInt(sellerId as string) : null,
        sellerName, includeIgv, 
        priceIncludesIgv, operationType, paymentCondition, currency, 
        totalAmount: parseFloat(totalAmount as any) || 0, 
        globalDiscount: parseFloat(globalDiscount as any) || 0, 
        flete: parseFloat(flete as any) || 0, 
        billingStatus, pickupPlace, observation, notes,
        agencyId: (agencyId && !isNaN(parseInt(agencyId))) ? parseInt(agencyId) : null,
        branchId: (branchId && !isNaN(parseInt(branchId))) ? parseInt(branchId) : null,
      items: {
        deleteMany: {}, // Limpiar ítems anteriores para evitar duplicados
        create: (items || []).map((item: any) => {
          const qty = parseInt(item.quantity);
          const pId = parseInt(item.productId);
          
          let validExpiry = null;
          if (item.expiryDate) {
            const d = new Date(item.expiryDate);
            if (!isNaN(d.getTime())) validExpiry = d;
          }

          return {
            productId: pId,
            quantity: isNaN(qty) ? 0 : qty,
            price: parseFloat(item.price) || 0,
            discount: parseFloat(item.discount) || 0,
            lotNumber: item.lotNumber || item.lot || null,
            warehouseName: item.warehouseName || null,
            expiryDate: validExpiry,
            unitMeasure: item.unitMeasure || null
          };
        })
      }
      } as any
    });
    res.json(quotation);
  } catch (error: any) {
    console.error('Error updating quotation:', error);
    res.status(500).json({ error: 'Error al actualizar cotización: ' + (error.message || 'Error desconocido') });
  }
});

app.delete('/api/quotations/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.quotation.delete({ where: { id: parseInt(id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar cotización' });
  }
});

app.put('/api/quotations/:id/reset', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const quot = await prisma.quotation.update({
      where: { id: parseInt(id) },
      data: { status: 'PENDING' }
    });
    res.json(quot);
  } catch (error) {
    res.status(500).json({ error: 'Error al resetear cotización' });
  }
});

// --- API WAREHOUSES & SHIPPING ---

app.get('/api/shipping-agencies', async (req, res) => {
  try {
    const agencies = await prisma.shippingAgency.findMany({
      include: { 
        zone: true,
        branches: true
      }
    });
    res.json(agencies);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener agencias' });
  }
});

app.get('/api/shipping-zones', async (req, res) => {
  try {
    const zones = await prisma.shippingZone.findMany({
      include: { agencies: true },
      orderBy: { name: 'asc' }
    });
    res.json(zones);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener zonas de envío' });
  }
});

app.post('/api/shipping-zones', authenticateToken, async (req, res) => {
  try {
    const { name, baseRate } = req.body;
    const zone = await prisma.shippingZone.create({
      data: { name, baseRate: parseFloat(baseRate) || 0 }
    });
    res.json(zone);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear zona' });
  }
});

app.put('/api/shipping-zones/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, baseRate } = req.body;
    const zone = await prisma.shippingZone.update({
      where: { id: parseInt(id) },
      data: { name, baseRate: parseFloat(baseRate) || 0 }
    });
    res.json(zone);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar zona' });
  }
});

app.delete('/api/shipping-zones/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.shippingZone.delete({ where: { id: parseInt(id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar zona' });
  }
});

app.post('/api/shipping-agencies', authenticateToken, async (req, res) => {
  try {
    const { 
      name, ruc, address, legalAddress, phone, email, contact, 
      country, department, province, district, ubigeo,
      isActive, zoneId, branches 
    } = req.body;
    
    const agency = await prisma.shippingAgency.create({
      data: { 
        name, ruc, address, legalAddress, phone, email, contact,
        country, department, province, district, ubigeo,
        isActive: isActive !== undefined ? isActive : true,
        zoneId: parseInt(zoneId),
        branches: branches && branches.length > 0 ? {
          create: branches.map((b: any) => ({
            address: b.address,
            department: b.department,
            province: b.province,
            district: b.district,
            ubigeo: b.ubigeo,
            contact: b.contact,
            phone: b.phone,
            isMain: !!b.isMain
          }))
        } : undefined
      },
      include: { branches: true }
    });
    res.json(agency);
  } catch (error) {
    console.error('Error creating agency:', error);
    res.status(500).json({ error: 'Error al crear agencia' });
  }
});

app.put('/api/shipping-agencies/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, ruc, address, legalAddress, phone, email, contact, 
      country, department, province, district, ubigeo,
      isActive, zoneId, branches 
    } = req.body;

    const agency = await prisma.$transaction(async (tx) => {
      // Delete existing branches first to sync
      await tx.agencyBranch.deleteMany({ where: { agencyId: parseInt(id) } });

      return await tx.shippingAgency.update({
        where: { id: parseInt(id) },
        data: { 
          name, ruc, address, legalAddress, phone, email, contact,
          country, department, province, district, ubigeo,
          isActive,
          zoneId: parseInt(zoneId),
          branches: branches && branches.length > 0 ? {
            create: branches.map((b: any) => ({
              address: b.address,
              department: b.department,
              province: b.province,
              district: b.district,
              ubigeo: b.ubigeo,
              contact: b.contact,
              phone: b.phone,
              isMain: !!b.isMain
            }))
          } : undefined
        },
        include: { branches: true }
      });
    });
    res.json(agency);
  } catch (error) {
    console.error('Error updating agency:', error);
    res.status(500).json({ error: 'Error al actualizar agencia' });
  }
});

app.delete('/api/shipping-agencies/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.shippingAgency.delete({ where: { id: parseInt(id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar agencia' });
  }
});

// --- API SUPPLIERS ---
app.get('/api/suppliers', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;
    const where: any = {};
    if (q) {
      where.OR = [
        { name: { contains: q as string } },
        { docNumber: { contains: q as string } },
        { code: { contains: q as string } },
      ];
    }
    const suppliers = await (prisma as any).supplier.findMany({ where, orderBy: { name: 'asc' }, take: 50 });
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener proveedores' });
  }
});

app.post('/api/suppliers', authenticateToken, async (req, res) => {
  try {
    const { name, docType, docNumber, address, phone, email, contact, department, province, district } = req.body;

    // --- VALIDACIONES DE INTEGRIDAD ---
    if (!docNumber) {
      return res.status(400).json({ error: 'El número de documento es obligatorio.' });
    }
    if (docNumber.length !== 8 && docNumber.length !== 11) {
      return res.status(400).json({ error: 'El número de documento debe tener 8 dígitos (DNI) u 11 dígitos (RUC).' });
    }
    if (!name) {
      return res.status(400).json({ error: 'El nombre o razón social del proveedor es obligatorio.' });
    }

    const supplier = await (prisma as any).supplier.create({ data: req.body });
    res.json(supplier);
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'Ya existe un proveedor con ese número de documento.' });
    console.error('Error creating supplier:', error);
    res.status(500).json({ error: 'Error al crear proveedor: ' + (error.message || 'Error desconocido') });
  }
});

app.put('/api/suppliers/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const supplier = await (prisma as any).supplier.update({ where: { id: parseInt(id) }, data: req.body });
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar proveedor' });
  }
});

app.delete('/api/suppliers/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await (prisma as any).supplier.delete({ where: { id: parseInt(id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar proveedor' });
  }
});

// --- API PURCHASES ---
app.get('/api/purchases', authenticateToken, async (req, res) => {
  try {
    const purchases = await (prisma as any).purchase.findMany({
      include: { 
        supplier: true, 
        items: { 
          include: { 
            product: {
              include: { unit: true, package: true, subPackage: true }
            } 
          } 
        } 
      },
      orderBy: { date: 'desc' }
    });

    // --- CÁLCULO DE ESTADO DINÁMICO PARA GUÍAS ---
    const finalPurchases = [];
    for (const purchase of purchases) {
      let computedStatus = purchase.status; // Default to DB status
      
      const isGuide = ['09', 'GRM', 'GUIA', 'DUA'].includes(purchase.docType);
      if (isGuide) {
        let hasStockInTransit = false;
        for (const item of purchase.items) {
          const stockRecord = await (prisma as any).stock.findFirst({
            where: {
              productId: item.productId,
              warehouseId: 6, // Tránsito
              lotNumber: item.lotNumber || null
            }
          });
          if (stockRecord && stockRecord.quantity > 0) {
            hasStockInTransit = true;
            break;
          }
        }
        computedStatus = hasStockInTransit ? 'EN TRÁNSITO' : 'TRANSFERIDO';
      }
      
      finalPurchases.push({
        ...purchase,
        computedStatus
      });
    }

    res.json(finalPurchases);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener compras' });
  }
});

app.get('/api/purchases/search', authenticateToken, async (req, res) => {
  try {
    const { type, series, number } = req.query;
    
    const cleanSeries = (series as string || '').trim().toUpperCase();
    const cleanNumber = (number as string || '').trim();
    const numericNumber = cleanNumber.replace(/^0+/, '');

    const whereClause: any = {
      docSeries: cleanSeries,
      docNumber: { in: [cleanNumber, numericNumber, cleanNumber.padStart(8, '0')] }
    };

    // Si busca una guía (09), incluir también GRM
    if (type === '09') {
      whereClause.docType = { in: ['09', 'GRM', 'GUIA'] };
    } else {
      whereClause.docType = type as string;
    }

    const purchase = await (prisma as any).purchase.findFirst({
      where: whereClause,
      include: {
        items: {
          include: {
            product: { include: { unit: true } }
          }
        }
      }
    });
    res.json(purchase);
  } catch (error) {
    console.error('Error searching purchase:', error);
    res.status(500).json({ error: 'Error al buscar documento' });
  }
});

app.post('/api/purchases', authenticateToken, async (req, res) => {
  try {
    const { 
      supplierId, supplierName, docType, docSeries, docNumber, date, currency, 
      exchangeRate, warehouseId, items, observation, referenceId, purchaseType, 
      paymentCondition, creditDays, totalAmount: bodyTotal 
    } = req.body;

    // --- VALIDACIONES DE INTEGRIDAD ---
    if (!supplierId) {
      return res.status(400).json({ error: 'Debe seleccionar un proveedor.' });
    }
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'La compra debe tener al menos un producto.' });
    }
    
    // Validar ítems
    for (const item of items) {
      if (parseInt(item.quantity) <= 0) {
        return res.status(400).json({ error: `La cantidad para el producto ${item.productId} debe ser mayor a cero.` });
      }
      if (parseFloat(item.price) < 0) {
        return res.status(400).json({ error: `El precio para el producto ${item.productId} no puede ser negativo.` });
      }
    }
    
    let finalSupplierName = supplierName;
    if (!finalSupplierName && supplierId) {
      const supp = await prisma.supplier.findUnique({ where: { id: parseInt(supplierId) } });
      if (supp) finalSupplierName = supp.name;
    }

    const purchase = await prisma.$transaction(async (tx) => {
      // 1. Create Purchase
      const calculatedTotal = items.reduce((acc: number, item: any) => {
        if (item.isFree) return acc;
        return acc + (Number(item.quantity) * Number(item.price));
      }, 0);
      const finalTotal = bodyTotal !== undefined ? parseFloat(bodyTotal) : calculatedTotal;

      const newPurchase = await (tx as any).purchase.create({
        data: {
          supplierId: parseInt(supplierId),
          supplierName: finalSupplierName || 'PROVEEDOR',
          referenceId: referenceId ? parseInt(referenceId) : null,
          docType,
          docSeries,
          docNumber,
          date: new Date(date),
          currency,
          exchangeRate: parseFloat(exchangeRate),
          warehouseId: warehouseId ? parseInt(warehouseId) : null,
          purchaseType: purchaseType || 'MERCADERIA',
          paymentCondition: paymentCondition || 'CONTADO',
          creditDays: creditDays !== undefined ? parseInt(creditDays) : 0,
          observation,
          totalAmount: finalTotal,
          items: {
            create: items.map((item: any) => ({
              productId: item.productId,
              quantity: parseInt(item.quantity),
              price: item.isFree ? 0 : parseFloat(item.price || 0),
              isFree: Boolean(item.isFree),
              freeType: item.freeType || null,
              referencePrice: item.referencePrice ? parseFloat(item.referencePrice) : (item.referenceCost ? parseFloat(item.referenceCost) : null),
              lotNumber: item.lotNumber || null,
              seriesNumber: item.seriesNumber || null,
              expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
              unitSymbol: item.unitSymbol || null,
              observation: item.observation || null
            }))
          }
        }
      });

      // 2. Update stock and prices for each item
      // Solo incrementamos stock si NO hay un documento de referencia (como una Guía previa)
      const shouldIncrementStock = !referenceId;

      for (const item of items) {
        if (warehouseId && shouldIncrementStock) {
          const stockRecord = await (tx as any).stock.findFirst({
            where: { 
              productId: item.productId, 
              warehouseId: parseInt(warehouseId),
              lotNumber: item.lotNumber || null
            }
          } as any);

          if (stockRecord) {
            await (tx as any).stock.update({
              where: { id: stockRecord.id },
              data: { 
                quantity: { increment: parseInt(item.quantity) },
                ...(item.expiryDate && { expiryDate: new Date(item.expiryDate) })
              }
            } as any);
          } else {
            await (tx as any).stock.create({
              data: {
                productId: item.productId,
                warehouseId: parseInt(warehouseId),
                quantity: parseInt(item.quantity),
                lotNumber: item.lotNumber || null,
                expiryDate: item.expiryDate ? new Date(item.expiryDate) : null
              }
            } as any);
          }

          // Record movement
          await (tx as any).stockMovement.create({
            data: {
              productId: item.productId,
              toWarehouseId: parseInt(warehouseId),
              quantity: parseInt(item.quantity),
              type: 'INPUT',
              lotNumber: item.lotNumber || null,
              purchaseId: newPurchase.id,
              observation: `Compra ${docSeries}-${docNumber} (${docType})${item.isFree ? ' [GRATUITO/MUESTRA]' : ''}`
            }
          } as any);
        } else if (referenceId) {
           console.log(`[PURCHASE] Skiping stock increment for ${item.productId} because it references ${referenceId}`);
        }

        // Update product cost and recalculate sale price (Solo si es Factura o DUA y no es muestra gratuita)
        const isAccountingDoc = ['01', '50', '03'].includes(docType);
        if (isAccountingDoc && !item.isFree && parseFloat(item.price) > 0) {
          const prod = await tx.product.findUnique({ where: { id: item.productId }, include: { unit: true } }) as any;
          if (prod) {
            item.productName = prod.name || '';
            item.productCode = prod.code || '';
            item.unit = prod.unit?.symbol || 'UN.';
            const newCost = parseFloat(item.price);
            const margin = Number(prod.profitMargin || 0);
            const suggestedSalePrice = newCost * (1 + margin / 100);
            
            await tx.product.update({
              where: { id: item.productId },
              data: { 
                costPrice: newCost,
                salePrice: suggestedSalePrice
              }
            });
          }
        }
      }

      return newPurchase;
    });

    res.json(purchase);
  } catch (error: any) {
    console.error('Error creating purchase:', error);
    res.status(500).json({ error: error.message || 'Error al registrar la compra' });
  }
});

app.put('/api/purchases/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      supplierId, supplierName, docType, docSeries, docNumber, date, currency, 
      exchangeRate, warehouseId, items, observation, purchaseType, 
      paymentCondition, creditDays, totalAmount: bodyTotal 
    } = req.body;

    const purchaseId = parseInt(id);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Get old purchase to reverse stock
      const oldPurchase = await (tx as any).purchase.findUnique({
        where: { id: purchaseId },
        include: { items: { include: { product: true } } }
      });

      if (!oldPurchase) throw new Error('Compra no encontrada');

      // --- VALIDACIÓN DE INTEGRIDAD: REFERENCIAS ---
      const referenced = await (tx as any).purchase.findFirst({
        where: { referenceId: purchaseId }
      });
      if (referenced) {
        throw new Error(`Esta guía no puede ser modificada porque ya tiene una factura asociada (${referenced.docSeries}-${referenced.docNumber}).`);
      }

      // 2. Reverse old stock (Checking availability first to avoid negative stock)
      for (const oldItem of oldPurchase.items) {
        if (oldPurchase.warehouseId) {
          const currentStock = await (tx as any).stock.findFirst({
            where: { 
              productId: oldItem.productId, 
              warehouseId: oldPurchase.warehouseId,
              lotNumber: oldItem.lotNumber || null 
            }
          });

          const availableQty = currentStock ? currentStock.quantity : 0;
          if (availableQty < oldItem.quantity) {
            throw new Error(`No se puede modificar la guía: El stock del producto "${oldItem.product?.name}" (Lote: ${oldItem.lotNumber || 'SIN LOTE'}) ya fue movido o transferido del almacén de recepción.`);
          }

          await (tx as any).stock.updateMany({
            where: { 
              productId: oldItem.productId, 
              warehouseId: oldPurchase.warehouseId,
              lotNumber: oldItem.lotNumber || null 
            },
            data: { quantity: { decrement: oldItem.quantity } }
          });
        }
      }

      // 3. Delete old items and movements
      await (tx as any).purchaseItem.deleteMany({ where: { purchaseId } });
      await (tx as any).stockMovement.deleteMany({ where: { purchaseId } });

      // 4. Update Purchase header and create new items
      let finalSupplierName = supplierName;
      if (!finalSupplierName && supplierId) {
        const supp = await prisma.supplier.findUnique({ where: { id: parseInt(supplierId) } });
        if (supp) finalSupplierName = supp.name;
      }

      const updatedPurchase = await (tx as any).purchase.update({
        where: { id: purchaseId },
        data: {
          supplierId: parseInt(supplierId),
          supplierName: finalSupplierName || 'PROVEEDOR',
          docType,
          docSeries,
          docNumber,
          date: new Date(date),
          currency,
          exchangeRate: parseFloat(exchangeRate),
          warehouseId: warehouseId ? parseInt(warehouseId) : null,
          ...(purchaseType && { purchaseType }),
          paymentCondition: paymentCondition || 'CONTADO',
          creditDays: creditDays !== undefined ? parseInt(creditDays) : 0,
          observation,
          totalAmount: bodyTotal !== undefined ? parseFloat(bodyTotal) : items.reduce((acc: number, item: any) => {
            if (item.isFree) return acc;
            return acc + (Number(item.quantity) * Number(item.price));
          }, 0),
          items: {
            create: items.map((item: any) => ({
              productId: item.productId,
              quantity: parseInt(item.quantity),
              price: item.isFree ? 0 : parseFloat(item.price || 0),
              isFree: Boolean(item.isFree),
              freeType: item.freeType || null,
              referencePrice: item.referencePrice ? parseFloat(item.referencePrice) : (item.referenceCost ? parseFloat(item.referenceCost) : null),
              lotNumber: item.lotNumber || null,
              seriesNumber: item.seriesNumber || null,
              expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
              unitSymbol: item.unitSymbol || null,
              observation: item.observation || null
            }))
          }
        },
        include: { items: true }
      });

      // 5. Apply new stock and update product prices
      for (const newItem of items) {
        if (warehouseId) {
          const stockRecord = await (tx as any).stock.findFirst({
            where: { 
              productId: newItem.productId, 
              warehouseId: parseInt(warehouseId),
              lotNumber: newItem.lotNumber || null
            }
          });

          if (stockRecord) {
            await (tx as any).stock.update({
              where: { id: stockRecord.id },
              data: { 
                quantity: { increment: parseInt(newItem.quantity) },
                ...(newItem.expiryDate && { expiryDate: new Date(newItem.expiryDate) })
              }
            });
          } else {
            await (tx as any).stock.create({
              data: {
                productId: newItem.productId,
                warehouseId: parseInt(warehouseId),
                quantity: parseInt(newItem.quantity),
                lotNumber: newItem.lotNumber || null,
                expiryDate: newItem.expiryDate ? new Date(newItem.expiryDate) : null
              }
            });
          }

          // Record movement
          await (tx as any).stockMovement.create({
            data: {
              productId: newItem.productId,
              toWarehouseId: parseInt(warehouseId),
              quantity: parseInt(newItem.quantity),
              type: 'INPUT',
              lotNumber: newItem.lotNumber || null,
              purchaseId: purchaseId,
              observation: `Compra ${docSeries}-${docNumber}`
            }
          });
        }

        // Update product cost and recalculate sale price (Solo si es Factura o DUA)
        const isAccountingDoc = ['01', '50', '03'].includes(docType);
        const prod = await tx.product.findUnique({ where: { id: newItem.productId }, include: { unit: true } }) as any;
        if (prod && isAccountingDoc) {
          const newCost = parseFloat(newItem.price);
          const margin = Number(prod.profitMargin || 0);
          const suggestedSalePrice = newCost * (1 + margin / 100);
          
          await tx.product.update({
            where: { id: prod.id },
            data: { 
              costPrice: newCost,
              salePrice: suggestedSalePrice
            }
          });
        }
      }

      return updatedPurchase;
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error al actualizar compra:', error);
    res.status(500).json({ error: error.message || 'Error al actualizar compra' });
  }
});

app.delete('/api/purchases/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const purchaseId = parseInt(id);

    await prisma.$transaction(async (tx) => {
      const purchase = await (tx as any).purchase.findUnique({
        where: { id: purchaseId },
        include: { items: { include: { product: true } } }
      });

      if (!purchase) throw new Error('Compra no encontrada');

      // --- VALIDACIÓN DE INTEGRIDAD: REFERENCIAS ---
      const referenced = await (tx as any).purchase.findFirst({
        where: { referenceId: purchaseId }
      });
      if (referenced) {
        throw new Error(`Esta guía no puede ser eliminada porque ya tiene una factura asociada (${referenced.docSeries}-${referenced.docNumber}).`);
      }

      // 1. Reverse stock (Checking availability first)
      for (const item of purchase.items) {
        if (purchase.warehouseId) {
          const currentStock = await (tx as any).stock.findFirst({
            where: { 
              productId: item.productId, 
              warehouseId: purchase.warehouseId,
              lotNumber: item.lotNumber || null 
            }
          });

          const availableQty = currentStock ? currentStock.quantity : 0;
          if (availableQty < item.quantity) {
            throw new Error(`No se puede eliminar la guía: El stock del producto "${item.product?.name}" (Lote: ${item.lotNumber || 'SIN LOTE'}) ya fue movido o transferido del almacén de recepción.`);
          }

          await (tx as any).stock.updateMany({
            where: { 
              productId: item.productId, 
              warehouseId: purchase.warehouseId,
              lotNumber: item.lotNumber || null 
            },
            data: { quantity: { decrement: item.quantity } }
          });
        }
      }

      // 2. Delete movements related to this purchase
      // (This assumes we can identify them by observation or we should have a purchaseId in movements)
      // For now, let's just delete the purchase and its items (Prisma cascade or manual)
      await (tx as any).purchaseItem.deleteMany({ where: { purchaseId } });
      await (tx as any).purchase.delete({ where: { id: purchaseId } });
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting purchase:', error);
    res.status(500).json({ error: 'Error al eliminar la compra: ' + error.message });
  }
});

// --- API TRANSFERS ---
app.get('/api/transfers', authenticateToken, async (req, res) => {
  try {
    const transfers = await (prisma as any).transfer.findMany({
      include: { 
        fromWarehouse: true, 
        toWarehouse: true, 
        items: { include: { product: true } } 
      },
      orderBy: { date: 'desc' }
    });
    res.json(transfers);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener transferencias' });
  }
});

app.post('/api/transfers', authenticateToken, async (req, res) => {
  try {
    const { fromWarehouseId, toWarehouseId, docNumber, date, observation, items } = req.body;
    
    const transfer = await prisma.$transaction(async (tx) => {
      const newTransfer = await (tx as any).transfer.create({
        data: {
          fromWarehouseId: parseInt(fromWarehouseId),
          toWarehouseId: parseInt(toWarehouseId),
          docNumber,
          date: new Date(date),
          observation,
          items: {
            create: items.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity
            }))
          }
        }
      });

      for (const item of items) {
        // --- VALIDACIÓN ESTRICTA DE STOCK ---
        const currentStock = await (tx as any).stock.findFirst({
          where: { productId: item.productId, warehouseId: parseInt(fromWarehouseId) }
        });

        if (!currentStock || currentStock.quantity < item.quantity) {
          throw new Error(`Stock insuficiente para el producto ID ${item.productId} en el almacén de origen.`);
        }

        await tx.stock.update({
          where: { id: currentStock.id },
          data: { quantity: { decrement: item.quantity } }
        });

        const destStock = await tx.stock.findFirst({
          where: { productId: item.productId, warehouseId: parseInt(toWarehouseId) }
        });

        if (destStock) {
          await tx.stock.update({
            where: { id: destStock.id },
            data: { quantity: { increment: item.quantity } }
          });
        } else {
          await tx.stock.create({
            data: {
              productId: item.productId,
              warehouseId: parseInt(toWarehouseId),
              quantity: item.quantity
            }
          });
        }

        await (tx as any).stockMovement.create({
          data: {
            productId: item.productId,
            fromWarehouseId: parseInt(fromWarehouseId),
            toWarehouseId: parseInt(toWarehouseId),
            quantity: item.quantity,
            type: 'TRANSFER',
            transferId: newTransfer.id,
            observation: `Transferencia ${docNumber || ''}`
          }
        });
      }

      return newTransfer;
    });

    res.json(transfer);
  } catch (error) {
    console.error('Error creating transfer:', error);
    res.status(500).json({ error: 'Error al realizar la transferencia' });
  }
});// --- API WAREHOUSE MOVEMENTS (ASSISTANT) ---


app.get('/api/stock', authenticateToken, async (req, res) => {
  try {
    const stock = await (prisma as any).stock.findMany({
      include: {
        product: { 
          include: { 
            unit: true, 
            package: true, 
            subPackage: true, 
            category: true 
          } 
        },
        warehouse: true,
        zone: true
      },
      where: { quantity: { gt: 0 } }
    });
    res.json(stock);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener stock detallado' });
  }
});

app.get('/api/movements', authenticateToken, async (req, res) => {
  try {
    const movements = await prisma.stockMovement.findMany({
      include: {
        product: { select: { name: true, code: true } },
        fromWarehouse: { select: { name: true } },
        toWarehouse: { select: { name: true } },
        fromZone: { select: { name: true } },
        toZone: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(movements);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener movimientos' });
  }
});

app.get('/api/movements/sources', authenticateToken, async (req, res) => {
  try {
    const { from, to, type } = req.query;
    const whereClause: any = {
      date: {
        gte: from ? new Date(from as string) : undefined,
        lte: to ? new Date(to as string) : undefined
      }
    };

    if (type === 'COMPRA') {
      whereClause.docType = { in: ['01', '03', '50', 'DUA'] };
    } else if (type === 'GUIA') {
      whereClause.docType = { in: ['09', 'GRM', 'GUIA'] };
    }

    const purchases = await (prisma as any).purchase.findMany({
      where: whereClause,
      include: { 
        supplier: true, 
        items: { 
          include: { 
            product: { 
              include: { unit: true } 
            } 
          } 
        } 
      },
      orderBy: { date: 'desc' }
    });

    // --- FILTRO INTELIGENTE DE DOCUMENTOS EN TRÁNSITO ---
    let finalPurchases = purchases;
    if (type === 'GUIA' || type === 'COMPRA') {
      const validPurchases = [];
      for (const purchase of purchases) {
        if (purchase.warehouseId !== 6) {
          validPurchases.push(purchase);
          continue;
        }

        let hasStockInTransit = false;
        for (const item of purchase.items) {
          const stockRecord = await (prisma as any).stock.findFirst({
            where: {
              productId: item.productId,
              warehouseId: 6, // ID Fijo del Almacén de Tránsito
              lotNumber: item.lotNumber || null
            }
          });
          if (stockRecord && stockRecord.quantity > 0) {
            hasStockInTransit = true;
            break; // Con un solo ítem que tenga stock, el documento debe aparecer
          }
        }
        if (hasStockInTransit) {
          validPurchases.push(purchase);
        }
      }
      finalPurchases = validPurchases;
    }

    res.json(finalPurchases);
  } catch (error) {
    res.status(500).json({ error: 'Error al buscar fuentes' });
  }
});

app.post('/api/movements', authenticateToken, async (req, res) => {
  try {
    const { type, reason, date, observation, items } = req.body;

    // --- VALIDACIONES DE INTEGRIDAD ---
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'El movimiento debe tener al menos un producto.' });
    }
    
    // Validar cantidades y transferencias circulares
    for (const item of items) {
      if (parseInt(item.quantity) <= 0) {
        return res.status(400).json({ error: `La cantidad para el producto ${item.productId} debe ser mayor a cero.` });
      }
      if (type === 'TRANSFERENCIA' && item.fromWarehouseId === item.toWarehouseId) {
        return res.status(400).json({ error: 'En una transferencia, el almacén de origen y destino deben ser diferentes.' });
      }
    }
    
    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const qty = parseInt(item.quantity);
        const pId = parseInt(item.productId);
        
        // Robust parsing to avoid NaN
        const fromWhId = (item.fromWarehouseId && item.fromWarehouseId !== 'TRANSIT') ? parseInt(item.fromWarehouseId) : null;
        const toWhId = (item.toWarehouseId && item.toWarehouseId !== 'TRANSIT') ? parseInt(item.toWarehouseId) : null;
        const fromZoneId = (item.fromZoneId && item.fromZoneId !== 'TRANSIT_ZONE') ? parseInt(item.fromZoneId) : null;
        const toZoneId = (item.toZoneId && item.toZoneId !== 'TRANSIT_ZONE') ? parseInt(item.toZoneId) : null;
        
        // Handle 'TRANSIT' special case from Assistant
        let finalFromWhId = fromWhId;
        if (item.fromWarehouseId === 'TRANSIT') {
          // Identify the transit warehouse (ID 6 in this system)
          finalFromWhId = 6;
        }

        // 1. Decrement From (if Salida or Transferencia, or if it's an Ingreso from Transit)
        const shouldDecrement = (type === 'SALIDA' || type === 'TRANSFERENCIA' || (type === 'INGRESO' && item.fromWarehouseId === 'TRANSIT'));
        
        if (shouldDecrement && finalFromWhId) {
          // --- VALIDACIÓN ESTRICTA DE STOCK ---
          const currentStock = await (tx as any).stock.findFirst({
            where: { 
              productId: pId, 
              warehouseId: finalFromWhId, 
              zoneId: fromZoneId || null,
              lotNumber: item.lotNumber || null 
            }
          });

          if (!currentStock || currentStock.quantity < qty) {
            throw new Error(`Stock insuficiente para el producto ID ${pId}${item.lotNumber ? ` (Lote: ${item.lotNumber})` : ''} en el almacén de origen.`);
          }

          await (tx as any).stock.update({
            where: { id: currentStock.id },
            data: { quantity: { decrement: qty } }
          });

          // Only decrement global stock if it's a real exit, not a transfer/internal move
          // (Product.stock field is deprecated, using Stock table aggregate)
        }

        // 2. Increment To (if Ingreso or Transferencia)
        if ((type === 'INGRESO' || type === 'TRANSFERENCIA') && toWhId) {
          const stockRec = await (tx as any).stock.findFirst({
            where: { 
              productId: pId, 
              warehouseId: toWhId, 
              zoneId: toZoneId || null,
              lotNumber: item.lotNumber || null 
            }
          });

          if (stockRec) {
            await (tx as any).stock.update({
              where: { id: stockRec.id },
              data: { 
                quantity: { increment: qty },
                ...(item.expiryDate ? { expiryDate: new Date(item.expiryDate) } : {})
              }
            });
          } else {
            await (tx as any).stock.create({
              data: {
                productId: pId,
                warehouseId: toWhId,
                zoneId: toZoneId || null,
                quantity: qty,
                lotNumber: item.lotNumber || null,
                expiryDate: item.expiryDate ? new Date(item.expiryDate) : null
              }
            });
          }

          // (Product.stock field is deprecated, using Stock table aggregate)
        }

        // 3. Record Movement
        await (tx as any).stockMovement.create({
          data: {
            productId: pId,
            fromWarehouseId: (type === 'SALIDA' || type === 'TRANSFERENCIA' || (type === 'INGRESO' && item.fromWarehouseId === 'TRANSIT')) ? finalFromWhId : null,
            toWarehouseId: (type === 'INGRESO' || type === 'TRANSFERENCIA') ? toWhId : null,
            fromZoneId: (type === 'SALIDA' || type === 'TRANSFERENCIA') ? fromZoneId : null,
            toZoneId: (type === 'INGRESO' || type === 'TRANSFERENCIA') ? toZoneId : null,
            quantity: qty,
            type: type === 'TRANSFERENCIA' ? 'TRANSFER' : (type === 'INGRESO' ? 'INPUT' : 'OUTPUT'),
            lotNumber: item.lotNumber || null,
            observation: `[${type}] ${reason || ''} - ${observation || ''}`.trim()
          }
        });
      }
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Movement error:', error);
    res.status(500).json({ error: `Error al procesar movimiento: ${error.message}` });
  }
});

app.post('/api/movements/:id/annul', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    await prisma.$transaction(async (tx) => {
      const movement = await (tx as any).stockMovement.findUnique({
        where: { id },
        include: { product: true }
      });

      if (!movement) throw new Error('Movimiento no encontrado');
      if (movement.status === 'ANNULLED') throw new Error('El movimiento ya está anulado');

      const qty = movement.quantity;
      const pId = movement.productId;

      // REVERSE LOGIC
      // 1. Re-add to FROM
      if (movement.fromWarehouseId) {
        const stockFrom = await (tx as any).stock.findFirst({
          where: { 
            productId: pId, 
            warehouseId: movement.fromWarehouseId, 
            zoneId: movement.fromZoneId || null,
            lotNumber: movement.lotNumber || null
          }
        });

        if (stockFrom) {
          await (tx as any).stock.update({
            where: { id: stockFrom.id },
            data: { quantity: { increment: qty } }
          });
        } else {
          await (tx as any).stock.create({
            data: {
              productId: pId,
              warehouseId: movement.fromWarehouseId,
              zoneId: movement.fromZoneId || null,
              quantity: qty,
              lotNumber: movement.lotNumber || null
            }
          });
        }

        // (Product.stock field is deprecated, using Stock table aggregate)
      }

      // 2. Subtract from TO (if it was an input or transfer)
      if ((movement.type === 'INPUT' || movement.type === 'TRANSFER') && movement.toWarehouseId) {
        await (tx as any).stock.updateMany({
          where: { 
            productId: pId, 
            warehouseId: movement.toWarehouseId, 
            zoneId: movement.toZoneId || null,
            lotNumber: movement.lotNumber || null
          },
          data: { quantity: { decrement: qty } }
        });

        // (Product.stock field is deprecated, using Stock table aggregate)
      }

      // 3. Mark as Annulled
      await (tx as any).stockMovement.update({
        where: { id },
        data: { status: 'ANNULLED' }
      });
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Annulment error:', error);
    res.status(500).json({ error: error.message || 'Error al anular movimiento' });
  }
});



// --- API ORDERS ---
app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: { 
        items: { include: { product: { include: { unit: true } } } },
        payments: true,
        agency: { include: { zone: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
});

app.post('/api/orders', authenticateToken, orderLimiter, async (req, res) => {
  try {
    const { 
      customerId, customerName, customerEmail, customerPhone, customerCity, customerAddress, 
      customerDocType, customerDocNumber, docType, docSeries, docNumber,
      exchangeRate, dueDate, sellerId, sellerName, includeIgv, purchaseOrder, requirementNumber,
      consigneeName, consigneePhone, consigneeDocNumber, consigneeAddress,
      notes, items, quotationId, paymentStatus, shippingCost, agencyId, branchId,
      currency, paymentCondition, pickupPlace, origin
    } = req.body;
    // NOTA: 'totalAmount' ya NO se acepta del cliente - se recalcula en el servidor

    // --- VALIDACIÓN DE INPUTS ---
    if (!customerName && !customerId) {
      return res.status(400).json({ error: 'Debe proporcionar un nombre de cliente o ID de cliente.' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'El pedido debe tener al menos un producto.' });
    }
    // Sanitizar: limitar a máximo 50 items por pedido (anti-abuse)
    if (items.length > 50) {
      return res.status(400).json({ error: 'El pedido supera el límite de 50 productos.' });
    }
    // Sanitizar campos de texto (limitar longitud)
    if (customerName && customerName.length > 200) {
      return res.status(400).json({ error: 'Nombre de cliente demasiado largo.' });
    }
    if (notes && notes.length > 1000) {
      return res.status(400).json({ error: 'Las observaciones superan el límite de 1000 caracteres.' });
    }

    // --- RECALCULO DE PRECIOS EN EL SERVIDOR (Price Tampering Protection) ---
    let serverCalculatedTotal = 0;
    const validatedItems: any[] = [];

    for (const item of items) {
      if (!item.productId || !Number.isInteger(item.productId)) {
        return res.status(400).json({ error: 'ID de producto inválido en los items del pedido.' });
      }
      if (!item.quantity || item.quantity <= 0 || !Number.isInteger(item.quantity)) {
        return res.status(400).json({ error: 'Cantidad inválida en los items del pedido.' });
      }

      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: { stockRecords: true }
      });

      if (!product || !product.isActive) {
        return res.status(404).json({ error: `Producto no encontrado o inactivo (ID: ${item.productId})` });
      }

      const totalStock = (product as any).stockRecords.reduce((acc: number, curr: any) => acc + curr.quantity, 0);
      if (totalStock < item.quantity) {
        return res.status(400).json({ error: `Stock insuficiente para ${product.name}. Disponible: ${totalStock}, Solicitado: ${item.quantity}` });
      }

      // Permitir el precio negociado/ingresado por el cliente en el frontend
      const officialPrice = Number(item.price) >= 0 ? Number(item.price) : Number(product.salePrice);
      const itemDiscount = Math.min(Math.max(parseFloat(item.discount) || 0, 0), officialPrice); // descuento entre 0 y precio unitario
      const itemTotal = (officialPrice - itemDiscount) * item.quantity;
      serverCalculatedTotal += itemTotal;

      // Validar fecha de vencimiento
      let validExpiry = null;
      if (item.expiryDate) {
        const d = new Date(item.expiryDate);
        if (!isNaN(d.getTime())) {
          validExpiry = d;
        }
      }

      validatedItems.push({
        productId: item.productId,
        quantity: parseInt(item.quantity) || 0,
        price: officialPrice, // precio enviado por el usuario o precio base
        discount: itemDiscount,
        lotNumber: item.lotNumber || item.lot || null,
        warehouseName: item.warehouseName || null,
        expiryDate: validExpiry,
        unitMeasure: item.unitMeasure || null
      });
    }

    // Agregar costo de envío al total (si aplica)
    const shippingCostNum = Math.max(parseFloat(shippingCost) || 0, 0);
    const finalTotal = serverCalculatedTotal + shippingCostNum;

    if (finalTotal <= 0) {
      return res.status(400).json({ error: 'El monto total del pedido debe ser mayor a cero.' });
    }

    // Validar que la cotización no haya sido ya convertida
    if (quotationId) {
      const quotation = await prisma.quotation.findUnique({ where: { id: parseInt(quotationId) } });
      if (quotation && quotation.status === 'ACCEPTED') {
        return res.status(400).json({ error: 'Esta cotización ya ha sido convertida en pedido anteriormente.' });
      }
    }

    const order = await prisma.$transaction(async (tx) => {
      let finalDocNumber = docNumber;
      
      // 0. Determinar y reservar el correlativo real (Prevenir condición de carrera)
      if (docSeries) {
        const seriesRec = await tx.documentSeries.findFirst({
          where: { series: docSeries, documentType: docType || 'PED' }
        });
        if (seriesRec) {
          const nextNum = seriesRec.currentNumber + 1;
          finalDocNumber = nextNum.toString().padStart(8, '0');
          // Actualizamos de inmediato en la transacción
          await tx.documentSeries.update({
            where: { id: seriesRec.id },
            data: { currentNumber: nextNum }
          });
        }
      }

      // 1. Create the order using server-calculated total
      const newOrder = await tx.order.create({
        data: {
          customerId: customerId ? parseInt(customerId) : null,
          customerName: customerName?.substring(0, 200),
          customerEmail: customerEmail?.substring(0, 200),
          customerPhone: customerPhone?.substring(0, 20),
          customerCity: customerCity?.substring(0, 100),
          customerAddress: customerAddress?.substring(0, 500),
          customerDocType,
          customerDocNumber: customerDocNumber?.substring(0, 20),
          origin: origin || 'WEB',
          docType: docType || 'COT',
          docSeries,
          docNumber: finalDocNumber,
          exchangeRate: parseFloat(exchangeRate) || 1.0,
          dueDate: dueDate ? new Date(dueDate) : null,
          sellerId: sellerId ? parseInt(sellerId) : null,
          sellerName,
          includeIgv: !!includeIgv,
          purchaseOrder,
          requirementNumber,
          consigneeName,
          consigneePhone,
          consigneeDocNumber,
          consigneeAddress,
          currency: currency || 'PEN',
          paymentCondition: paymentCondition || 'CONTADO',
          pickupPlace,
          notes: notes?.substring(0, 1000),
          totalAmount: finalTotal, // TOTAL CALCULADO EN EL SERVIDOR
          quotationId: quotationId ? parseInt(quotationId) : null,
          paymentStatus: paymentStatus || 'UNPAID',
          shippingCost: shippingCostNum,
          agencyId: agencyId ? parseInt(agencyId) : null,
          branchId: branchId ? parseInt(branchId) : null,
          status: 'PENDING',
          items: {
            create: validatedItems // Items validados con precios oficiales
          }
        },
        include: { items: true }
      });

      // 2. Move stock immediately for CREDIT or CASH orders to reserve inventory
      const normalizedCondition = (paymentCondition || '').toUpperCase();
      const normalizedStatus = (paymentStatus || '').toUpperCase();
      
      console.log(`[ORDER] Processing stock for Order ID: ${newOrder.id}`);
      console.log(`[ORDER] Condition: ${normalizedCondition}, Status: ${normalizedStatus}, Origin: ${origin}`);

      const shouldReserve = normalizedStatus === 'CREDIT' || normalizedCondition === 'CONTADO' || normalizedCondition === 'CRÉDITO' || normalizedCondition === 'CREDITO';
      if (shouldReserve) {
        console.log(`[ORDER] Triggering moveStockToTemp for Order ${newOrder.id}`);
        await moveStockToTemp(tx, newOrder.id, validatedItems);
        await tx.order.update({
          where: { id: newOrder.id },
          data: { warehouseStatus: 'PENDING' }
        });
      }

      // 3. If from quotation, update quotation status
      if (quotationId) {
        await tx.quotation.update({
          where: { id: parseInt(quotationId) },
          data: { status: 'ACCEPTED' }
        });
      }

      return newOrder;
    });
    
    res.json(order);
  } catch (error: any) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Error al procesar el pedido: ' + error.message });
  }
});

// --- HELPERS ---
async function moveStockToTemp(tx: any, orderId: number, items: any[]) {
  // Nombres de almacenes de control manuales
  const DESPACHO_NAME = 'A1.CUZCO.1048 - DESPACHO';
  // Nota: El usuario tiene escrito 'COPROBANTE' en DB
  const COMPROBANTE_NAME = 'A1.CUZCO.1048 - COPROBANTE'; 
  
  const getOrCreateWarehouse = async (name: string) => {
    let w = await tx.warehouse.findUnique({ where: { name } });
    if (!w) {
      w = await tx.warehouse.create({
        data: { name, address: 'Almacén de Sistema', isActive: true }
      });
    }
    return w;
  };

  const despacho = await getOrCreateWarehouse(DESPACHO_NAME);

  for (const item of items) {
    // 1. Identificar almacén de origen REAL
    // Excluimos transitorios (COMPRAS), sistema (Existencias) y control (Despacho/Comprobante)
    const stockSource = await tx.stock.findFirst({
      where: { 
        productId: item.productId, 
        quantity: { gte: item.quantity },
        lotNumber: item.lotNumber || null,
        warehouse: {
          name: item.warehouseName ? item.warehouseName : {
            notIn: ['Existencias', 'Comprobante', 'Despacho']
          },
          type: { 
            notIn: ['TRANSITORIO', 'DESPACHO', 'COMPROBANTES', 'SISTEMA'] 
          }
        }
      },
      include: { warehouse: true }
    });

    if (!stockSource) {
      console.warn(`[STOCK] No hay stock disponible fuera de almacenes transitorios para producto ID: ${item.productId}`);
      continue;
    }

    console.log(`[STOCK] Reservando ${item.quantity} unidades desde ${stockSource.warehouse.name} hacia ${DESPACHO_NAME}`);

    // 2. Salida de Origen Real
    await tx.stock.update({ 
      where: { id: stockSource.id }, 
      data: { quantity: { decrement: item.quantity } } 
    });

    // 3. Ingreso a Despacho Manual (Reserva)
    let stockDesp = await tx.stock.findFirst({
      where: { 
        productId: item.productId, 
        warehouseId: despacho.id,
        lotNumber: item.lotNumber || null
      }
    });
    if (!stockDesp) {
      stockDesp = await tx.stock.create({
        data: { 
          productId: item.productId, 
          warehouseId: despacho.id, 
          quantity: item.quantity,
          lotNumber: item.lotNumber || null,
          expiryDate: item.expiryDate || null
        }
      });
    } else {
      await tx.stock.update({ 
        where: { id: stockDesp.id }, 
        data: { quantity: { increment: item.quantity } } 
      });
    }

    // 4. Registrar Movimiento
    await tx.stockMovement.create({
      data: {
        productId: item.productId,
        orderId: orderId,
        fromWarehouseId: stockSource.warehouseId,
        toWarehouseId: despacho.id,
        quantity: item.quantity,
        type: 'TRANSFER',
        observation: `Reserva automática pedido #${orderId} (Desde ${stockSource.warehouse.name})`
      }
    });
  }
}

app.post('/api/orders/:id/payment', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, method, voucherNumber } = req.body;
    
    const orderId = parseInt(id);
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true }
    });

    if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });

    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 1. Create payment record
      await tx.payment.create({
        data: {
          orderId,
          amount: parseFloat(amount),
          method,
          voucherNumber
        }
      });

      // 2. Update order payment status
      const totalPaidRes = await tx.payment.aggregate({
        where: { orderId },
        _sum: { amount: true }
      });
      const totalPaid = Number(totalPaidRes._sum.amount || 0);
      const isFullyPaid = totalPaid >= Number(order.totalAmount);
      
      const newPaymentStatus = isFullyPaid ? 'PAID' : 'PARTIAL';
      
      // 3. If first payment (was UNPAID), move stock to temp
      if (order.paymentStatus === 'UNPAID') {
        await moveStockToTemp(tx, orderId, order.items);
        await tx.order.update({
          where: { id: orderId },
          data: { warehouseStatus: 'PENDING' }
        });
      }

      return await tx.order.update({
        where: { id: orderId },
        data: { 
          paymentStatus: newPaymentStatus,
          status: isFullyPaid ? 'PREPARING' : order.status
        }
      });
    });

    res.json(updatedOrder);
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ error: 'Error al registrar el pago' });
  }
});

app.put('/api/orders/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, referralGuide, carrierGuide } = req.body;
    
    const orderId = parseInt(id);
    
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true }
      });

      if (!order) throw new Error('Pedido no encontrado');

      // --- VALIDAR TRANSICIONES PERMITIDAS ---
      const allowedTransitions: Record<string, string[]> = {
        'PREPARING':   ['DISPATCHED'],
        'DISPATCHED':  ['SHIPPED', 'PREPARING'],
        'SHIPPED':     ['DELIVERED'],
      };

      const validNext = allowedTransitions[order.status] || [];
      if (!validNext.includes(status)) {
        throw new Error(
          `Transición no válida: no se puede cambiar de "${order.status}" a "${status}". ` +
          `Transiciones permitidas desde "${order.status}": ${validNext.join(', ') || 'ninguna'}`
        );
      }

      // --- DISPATCH (PREPARING → DISPATCHED): mover stock a Comprobante ---
      if (status === 'DISPATCHED' && order.status === 'PREPARING') {
        const despacho = await tx.warehouse.findFirst({
          where: { name: { contains: 'DESPACHO' } }
        });
        const comprobante = await tx.warehouse.findFirst({
          where: { name: { contains: 'COMPROBANTE' } }
        });

        if (despacho && comprobante) {
          for (const item of order.items) {
            await tx.stock.updateMany({
              where: { productId: item.productId, warehouseId: despacho.id },
              data: { quantity: { decrement: item.quantity } }
            });
            await tx.stock.updateMany({
              where: { productId: item.productId, warehouseId: comprobante.id },
              data: { quantity: { decrement: item.quantity } }
            });

            await tx.stockMovement.create({
              data: {
                productId: item.productId,
                fromWarehouseId: despacho.id,
                toWarehouseId: comprobante.id,
                quantity: item.quantity,
                type: 'OUTPUT',
                orderId,
                observation: `Despacho pedido #${orderId} - Guía: ${referralGuide || ''}`
              }
            });
          }
        }
      }

      // --- CANCEL DISPATCH (DISPATCHED → PREPARING): revertir stock ---
      if (status === 'PREPARING' && order.status === 'DISPATCHED') {
        const despacho = await tx.warehouse.findFirst({
          where: { name: { contains: 'DESPACHO' } }
        });
        const comprobante = await tx.warehouse.findFirst({
          where: { name: { contains: 'COMPROBANTE' } }
        });

        if (despacho && comprobante) {
          for (const item of order.items) {
            await tx.stock.updateMany({
              where: { productId: item.productId, warehouseId: despacho.id },
              data: { quantity: { increment: item.quantity } }
            });
            await tx.stock.updateMany({
              where: { productId: item.productId, warehouseId: comprobante.id },
              data: { quantity: { increment: item.quantity } }
            });

            await tx.stockMovement.create({
              data: {
                productId: item.productId,
                fromWarehouseId: comprobante.id,
                toWarehouseId: despacho.id,
                quantity: item.quantity,
                type: 'INPUT',
                orderId,
                observation: `Anulación despacho pedido #${orderId}`
              }
            });
          }
        }
      }

      return await tx.order.update({
        where: { id: orderId },
        data: {
          status,
          ...(status === 'PREPARING' ? { warehouseStatus: 'PICKED', referralGuide: null, carrierGuide: null } : {}),
          ...(referralGuide && { referralGuide }),
          ...(carrierGuide && { carrierGuide })
        }
      });
    });

    res.json(updatedOrder);
  } catch (error: any) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Error al actualizar el estado: ' + (error.message || '') });
  }
});

// --- ANULAR COBRO (reversión total: elimina pagos, devuelve stock, resetea estados) ---
app.post('/api/orders/:id/cancel-payment', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const orderId = parseInt(id);

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true, movements: true, payments: true }
      });

      if (!order) throw new Error('Pedido no encontrado');

      // Solo se puede anular cobro si está PREPARING (pagado, no despachado)
      if (order.status !== 'PREPARING') {
        throw new Error(
          'No se puede anular el cobro porque el pedido ya fue despachado. ' +
          'Debe anular el despacho primero.'
        );
      }
      if (order.paymentStatus !== 'PAID' && order.paymentStatus !== 'PARTIAL') {
        throw new Error('El pedido no tiene pagos registrados para anular.');
      }

      // 1. Revertir stock: devolver desde DESPACHO a almacenes originales
      const DESPACHO_NAME = 'A1.CUZCO.1048 - DESPACHO';
      const despacho = await tx.warehouse.findUnique({ where: { name: DESPACHO_NAME } });

      if (despacho) {
        for (const move of order.movements) {
          if (move.toWarehouseId === despacho.id && move.fromWarehouseId) {
            await tx.stock.updateMany({
              where: { productId: move.productId, warehouseId: move.fromWarehouseId },
              data: { quantity: { increment: move.quantity } }
            });
            await tx.stock.updateMany({
              where: { productId: move.productId, warehouseId: despacho.id },
              data: { quantity: { decrement: move.quantity } }
            });
          }
        }
      }

      // 2. Eliminar movimientos de stock asociados
      await tx.stockMovement.deleteMany({ where: { orderId } });

      // 3. Eliminar pagos
      await tx.payment.deleteMany({ where: { orderId } });

      // 4. Resetear estados del pedido
      return await tx.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'UNPAID',
          status: 'PENDING',
          warehouseStatus: null
        }
      });
    });

    res.json(updatedOrder);
  } catch (error: any) {
    console.error('Error canceling payment:', error);
    res.status(500).json({ error: 'Error al anular cobro: ' + (error.message || '') });
  }
});

// --- API INVOICES ---
app.get('/api/invoices', authenticateToken, async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      include: { 
        items: { include: { product: true } }, 
        installments: true, 
        seller: true, 
        customer: true, 
        order: true,
        warehouse: true 
      },
      orderBy: { id: 'desc' }
    });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener facturas' });
  }
});

app.get('/api/invoices/by-reference/:docType/:series/:number', authenticateToken, async (req, res) => {
  try {
    const { docType, series, number } = req.params;
    const cleanSeries = (series || '').trim().toUpperCase();
    const cleanNumber = (number || '').trim();
    const intNum = parseInt(cleanNumber, 10);

    const whereConditions: any = {
      documentType: docType,
      series: { equals: cleanSeries, mode: 'insensitive' }
    };

    if (!isNaN(intNum)) {
      whereConditions.number = intNum;
    }

    const invoice = await prisma.invoice.findFirst({
      where: whereConditions,
      include: { 
        items: { 
          include: { 
            product: { 
              include: { package: true, subPackage: true, unit: true } 
            } 
          } 
        }, 
        installments: true, 
        seller: true, 
        customer: true, 
        order: true,
        warehouse: true 
      }
    });

    if (!invoice) {
      return res.status(404).json({ error: `Comprobante ${cleanSeries}-${cleanNumber} no encontrado.` });
    }

    res.json(invoice);
  } catch (error) {
    console.error('Error al buscar comprobante de referencia:', error);
    res.status(500).json({ error: 'Error al consultar comprobante de referencia' });
  }
});

app.get('/api/invoices/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findUnique({
      where: { id: parseInt(id) },
      include: { 
        items: { include: { product: true } }, 
        installments: true, 
        seller: true, 
        customer: true, 
        order: true,
        warehouse: true 
      }
    });
    if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener factura' });
  }
});

app.post('/api/invoices', authenticateToken, async (req, res) => {
  try {
    const {
      documentType, series, number, customerName, customerDocType, customerDocNumber,
      customerAddress, customerEmail, customerPhone, customerId, issueDate, dueDate,
      currency, exchangeRate, paymentCondition, operationType, includeIgv, priceIncludesIgv,
      igvPercent, sellerId, orderId, notes, items, installments, warehouseId, sunatEstablishmentCode,
      sendToSunatImmediately
    } = req.body;

    const numberFormatted = `${series}-${String(number).padStart(8, '0')}`;

    // Calculate totals
    let subtotal = 0;
    let totalIgv = 0;
    let totalAmount = 0;
    const igvRate = (igvPercent || 18) / 100;

    const invoiceItems = (items || []).map((item: any) => {
      const price = parseFloat(item.price) || 0;
      const qty = parseInt(item.quantity) || 0;
      const discount = parseFloat(item.discount) || 0;
      const itemTotal = qty * price;
      const itemDiscount = itemTotal * (discount / 100);
      const itemFinal = itemTotal - itemDiscount;
      return {
        productId: parseInt(item.productId),
        quantity: qty,
        unitMeasure: item.unitMeasure || 'NIU',
        price,
        discount,
        priceType: item.priceType || 'PRICE1',
        total: itemFinal,
        lotNumber: item.lotNumber || null
      };
    });

    const sumOfItems = invoiceItems.reduce((acc: number, item: any) => acc + item.total, 0);

    if (priceIncludesIgv !== false && includeIgv !== false) {
      totalAmount = sumOfItems;
      subtotal = totalAmount / (1 + igvRate);
      totalIgv = totalAmount - subtotal;
    } else if (includeIgv !== false) {
      subtotal = sumOfItems;
      totalIgv = subtotal * igvRate;
      totalAmount = subtotal + totalIgv;
    } else {
      subtotal = sumOfItems;
      totalIgv = 0;
      totalAmount = sumOfItems;
    }

    // --- VALIDACIONES NORMATIVAS SUNAT ---
    const cleanDocNumber = (customerDocNumber || '').trim();

    // 1. Facturas Electrónicas (01) requieren obligatoriamente RUC de 11 dígitos
    if (documentType === '01') {
      if (!cleanDocNumber || cleanDocNumber.length !== 11 || !/^\d{11}$/.test(cleanDocNumber)) {
        return res.status(400).json({
          error: 'Normativa SUNAT: Las Facturas Electrónicas requieren obligatoriamente un número de RUC válido de 11 dígitos numéricos.'
        });
      }
    }

    // 2. Boletas de Venta (03) >= S/ 700.00 requieren identificar obligatoriamente al cliente
    if (documentType === '03' && totalAmount >= 700) {
      if (!cleanDocNumber || cleanDocNumber === '00000000' || cleanDocNumber.length < 8) {
        return res.status(400).json({
          error: 'Normativa SUNAT: Las Boletas de Venta con importe igual o mayor a S/ 700.00 requieren identificar obligatoriamente al cliente con DNI, RUC o Carné de Extranjería válido.'
        });
      }
    }

    // 3. Ventas al CRÉDITO requieren cuotas de pago que sumen el total exacto (R.S. 193-2020/SUNAT)
    if (paymentCondition === 'CREDITO') {
      if (!installments || !Array.isArray(installments) || installments.length === 0) {
        return res.status(400).json({
          error: 'Normativa SUNAT: Las ventas al CRÉDITO requieren detallar al menos una cuota de pago con fecha de vencimiento e importe.'
        });
      }
      const sumInstallments = installments.reduce((acc: number, inst: any) => acc + (parseFloat(inst.amount) || 0), 0);
      if (Math.abs(sumInstallments - totalAmount) > 0.10) {
        return res.status(400).json({
          error: `Inconsistencia en cuotas a crédito: La suma de las cuotas (S/ ${sumInstallments.toFixed(2)}) no coincide con el importe total del comprobante (S/ ${totalAmount.toFixed(2)}).`
        });
      }
    }

    const invoice = await prisma.$transaction(async (tx) => {
      let finalNumber = number;
      let finalNumberFormatted = numberFormatted;

      // Generar correlativo de forma atómica y segura (Race Condition Prevent)
      if (series) {
        const seriesWhere: any = { documentType, series };
        if (warehouseId) {
          seriesWhere.warehouseId = parseInt(warehouseId);
        }
        
        let seriesRec = await tx.documentSeries.findFirst({
          where: seriesWhere
        });

        if (!seriesRec) {
          seriesRec = await tx.documentSeries.findFirst({
            where: { documentType, series }
          });
        }

        if (seriesRec) {
          const updatedSeries = await tx.documentSeries.update({
            where: { id: seriesRec.id },
            data: { currentNumber: { increment: 1 } }
          });
          finalNumber = updatedSeries.currentNumber;
          finalNumberFormatted = `${series}-${finalNumber.toString().padStart(8, '0')}`;
        }
      }

      return await tx.invoice.create({
        data: {
          documentType, series, 
          number: parseInt(String(finalNumber)) || 1, 
          numberFormatted: finalNumberFormatted,
          customerName, customerDocType, customerDocNumber,
          customerAddress, customerEmail, customerPhone,
          customerId: customerId ? parseInt(customerId) : null,
          warehouseId: warehouseId ? parseInt(warehouseId) : null,
          sunatEstablishmentCode: sunatEstablishmentCode || '0000',
          sunatStatus: 'PENDING',
          issueDate: issueDate ? new Date(issueDate) : new Date(),
          dueDate: dueDate ? new Date(dueDate) : null,
          currency: currency || 'PEN',
          exchangeRate: parseFloat(exchangeRate) || 1,
          paymentCondition: paymentCondition || 'CONTADO',
          operationType: operationType || '10',
          includeIgv: includeIgv !== false,
          priceIncludesIgv: priceIncludesIgv !== false,
          igvPercent: parseFloat(igvPercent) || 18,
          subtotal, totalIgv, totalAmount,
          sellerId: sellerId ? parseInt(sellerId) : null,
          orderId: orderId ? parseInt(orderId) : null,
          notes,
          items: { create: invoiceItems },
          installments: installments ? {
            create: installments.map((inst: any, idx: number) => ({
              number: idx + 1,
              amount: parseFloat(inst.amount) || 0,
              daysOffset: parseInt(inst.daysOffset) || 0,
              dueDate: new Date(inst.dueDate),
              status: 'PENDING'
            }))
          } : undefined
        },
        include: { 
          items: { include: { product: true } }, 
          installments: true, 
          seller: true, 
          customer: true, 
          order: true,
          warehouse: true 
        }
      });
    });

    // If created from order, update order billing status
    if (orderId) {
      await prisma.order.update({
        where: { id: parseInt(orderId) },
        data: { voucherNumber: invoice.numberFormatted }
      });
    }

    // Procesar envío a SUNAT
    let finalInvoice = invoice;
    if (sendToSunatImmediately !== false) {
      try {
        finalInvoice = await SunatService.sendInvoiceToSunat(invoice.id);
      } catch (sErr: any) {
        console.warn('Advertencia al enviar comprobante a SUNAT:', sErr.message);
      }
    }

    res.json(finalInvoice);
  } catch (error: any) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: 'Error al crear factura: ' + (error.message || '') });
  }
});

// Endpoint para enviar o reintentar envío a SUNAT
app.post('/api/invoices/:id/send-sunat', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await SunatService.sendInvoiceToSunat(parseInt(id));
    res.json(result);
  } catch (error: any) {
    console.error('Error al enviar a SUNAT:', error);
    res.status(500).json({ error: error.message || 'Error al enviar comprobante a SUNAT' });
  }
});

app.put('/api/invoices/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const invoiceId = parseInt(id);
    const { notes, items, installments, ...data } = req.body;

    const invoice = await prisma.$transaction(async (tx) => {
      // Delete existing items and installments
      await tx.invoiceItem.deleteMany({ where: { invoiceId } });
      await tx.invoiceInstallment.deleteMany({ where: { invoiceId } });

      // Recalculate totals
      let subtotal = 0;
      let totalIgv = 0;
      let totalAmount = 0;
      const igvRate = (data.igvPercent || 18) / 100;

      const invoiceItems = (items || []).map((item: any) => {
        const price = parseFloat(item.price) || 0;
        const qty = parseInt(item.quantity) || 0;
        const discount = parseFloat(item.discount) || 0;
        const itemTotal = qty * price;
        const itemDiscount = itemTotal * (discount / 100);
        const itemFinal = itemTotal - itemDiscount;
        return {
          productId: parseInt(item.productId),
          quantity: qty,
          unitMeasure: item.unitMeasure || 'UND',
          price,
          discount,
          priceType: item.priceType || 'PRICE1',
          total: itemFinal,
          lotNumber: item.lotNumber || null
        };
      });

      const sumOfItems = invoiceItems.reduce((acc: number, item: any) => acc + item.total, 0);

      if (data.priceIncludesIgv !== false && data.includeIgv !== false) {
        totalAmount = sumOfItems;
        subtotal = totalAmount / (1 + igvRate);
        totalIgv = totalAmount - subtotal;
      } else if (data.includeIgv !== false) {
        subtotal = sumOfItems;
        totalIgv = subtotal * igvRate;
        totalAmount = subtotal + totalIgv;
      } else {
        subtotal = sumOfItems;
        totalIgv = 0;
        totalAmount = sumOfItems;
      }

      let numberFormatted = data.numberFormatted;
      if (data.series && data.number) {
        numberFormatted = `${data.series}-${String(data.number).padStart(8, '0')}`;
      }

      return await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          ...data,
          numberFormatted,
          customerId: data.customerId ? parseInt(data.customerId) : null,
          sellerId: data.sellerId ? parseInt(data.sellerId) : null,
          exchangeRate: parseFloat(data.exchangeRate) || 1,
          igvPercent: parseFloat(data.igvPercent) || 18,
          subtotal, totalIgv, totalAmount,
          items: { create: invoiceItems },
          installments: installments ? {
            create: (installments || []).map((inst: any, idx: number) => ({
              number: idx + 1,
              amount: parseFloat(inst.amount) || 0,
              daysOffset: parseInt(inst.daysOffset) || 0,
              dueDate: new Date(inst.dueDate),
              status: 'PENDING'
            }))
          } : undefined
        },
        include: { items: { include: { product: true } }, installments: true, seller: true, customer: true, order: true }
      });
    });

    res.json(invoice);
  } catch (error: any) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ error: 'Error al actualizar factura: ' + (error.message || '') });
  }
});

app.delete('/api/invoices/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.invoice.delete({ where: { id: parseInt(id) } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al eliminar factura: ' + (error.message || '') });
  }
});

// ==========================================
// GUÍAS DE REMISIÓN DE VENTA (GRE-REMITENTE)
// ==========================================

app.get('/api/sales-referral-guides', authenticateToken, async (req, res) => {
  try {
    const { search, startDate, endDate, status, warehouseId } = req.query;

    const where: any = {};

    if (status && status !== 'ALL') {
      where.status = String(status);
    }

    if (warehouseId) {
      where.originWarehouseId = parseInt(String(warehouseId));
    }

    if (startDate || endDate) {
      where.issueDate = {};
      if (startDate) {
        where.issueDate.gte = new Date(String(startDate) + 'T00:00:00.000Z');
      }
      if (endDate) {
        where.issueDate.lte = new Date(String(endDate) + 'T23:59:59.999Z');
      }
    }

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { numberFormatted: { contains: q } },
        { customerName: { contains: q } },
        { customerDocNumber: { contains: q } },
        { deliveryAddress: { contains: q } },
        { carrierName: { contains: q } },
        { orderNumber: { contains: q } },
        { vehiclePlate: { contains: q } }
      ];
    }

    const guides = await prisma.salesReferralGuide.findMany({
      where,
      include: {
        customer: true,
        originWarehouse: true,
        order: true,
        invoice: true,
        shippingAgency: true,
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: { id: 'desc' }
    });

    res.json(guides);
  } catch (error: any) {
    console.error('Error fetching sales referral guides:', error);
    res.status(500).json({ error: 'Error al obtener guías de remisión: ' + (error.message || '') });
  }
});

app.get('/api/sales-referral-guides/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const guide = await prisma.salesReferralGuide.findUnique({
      where: { id: parseInt(id) },
      include: {
        customer: true,
        originWarehouse: true,
        order: {
          include: {
            items: { include: { product: true } }
          }
        },
        invoice: true,
        shippingAgency: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!guide) {
      return res.status(404).json({ error: 'Guía de remisión no encontrada' });
    }

    res.json(guide);
  } catch (error: any) {
    console.error('Error fetching sales referral guide:', error);
    res.status(500).json({ error: 'Error al obtener guía de remisión' });
  }
});

app.post('/api/sales-referral-guides', authenticateToken, async (req, res) => {
  try {
    const {
      documentType, series, number,
      issueDate, transferDate, transferReason, transferReasonDescription,
      transportMode,
      customerId, customerDocType, customerDocNumber, customerName, customerAddress,
      originWarehouseId, originAddress, originUbigeo, originSunatCode,
      deliveryAddress, deliveryUbigeo, deliveryDepartment, deliveryProvince, deliveryDistrict,
      carrierDocType, carrierDocNumber, carrierName, carrierMtcNumber, shippingAgencyId, shippingBranchId,
      driverDocType, driverDocNumber, driverName, driverLicenseNumber, vehiclePlate, vehicleSecondaryPlate,
      totalWeight, weightUnit, totalPackages,
      orderId, orderNumber, invoiceId, invoiceNumber, relatedDocType, relatedDocNumber,
      notes, items, sendToSunatImmediately
    } = req.body;

    const docType = documentType || '09';
    let finalNumber = number;
    let finalNumberFormatted = series && number ? `${series}-${String(number).padStart(8, '0')}` : '';

    const guide = await prisma.$transaction(async (tx) => {
      // Auto numeración si hay serie
      if (series) {
        const seriesWhere: any = { 
          series, 
          documentType: { in: ['09', 'GRM', 'GRE', 'GUIA'] } 
        };
        if (originWarehouseId) {
          seriesWhere.warehouseId = parseInt(String(originWarehouseId));
        }

        let seriesRec = await tx.documentSeries.findFirst({ where: seriesWhere });
        if (!seriesRec) {
          seriesRec = await tx.documentSeries.findFirst({
            where: { series, documentType: { in: ['09', 'GRM', 'GRE', 'GUIA'] } }
          });
        }

        if (seriesRec) {
          const updatedSeries = await tx.documentSeries.update({
            where: { id: seriesRec.id },
            data: { currentNumber: { increment: 1 } }
          });
          finalNumber = updatedSeries.currentNumber;
          finalNumberFormatted = `${series}-${finalNumber.toString().padStart(8, '0')}`;
        }
      }

      if (!finalNumberFormatted) {
        finalNumber = finalNumber || 1;
        finalNumberFormatted = `${series || 'T001'}-${String(finalNumber).padStart(8, '0')}`;
      }

      // Preparar ítems
      const guideItems = (items || []).map((item: any) => {
        const qty = parseFloat(item.quantity) || 1;
        const uWeight = parseFloat(item.unitWeight) || 0;
        const tWeight = parseFloat(item.totalWeight) || (qty * uWeight);
        return {
          productId: parseInt(item.productId),
          code: item.code || item.product?.code || '',
          description: item.description || item.product?.name || 'Producto',
          quantity: qty,
          unitMeasure: item.unitMeasure || 'NIU',
          unitWeight: uWeight,
          totalWeight: tWeight,
          lotNumber: item.lotNumber || null,
          expiryDate: item.expiryDate ? new Date(item.expiryDate) : null
        };
      });

      // Calcular peso total acumulado si no viene explícito
      const calculatedWeight = guideItems.reduce((sum: number, it: any) => sum + (Number(it.totalWeight) || 0), 0);
      const computedWeight = parseFloat(totalWeight) || calculatedWeight || 1.0;

      const created = await tx.salesReferralGuide.create({
        data: {
          documentType: docType,
          series: series || 'T001',
          number: parseInt(String(finalNumber)) || 1,
          numberFormatted: finalNumberFormatted,
          issueDate: issueDate ? new Date(issueDate) : new Date(),
          transferDate: transferDate ? new Date(transferDate) : new Date(),
          transferReason: transferReason || '01',
          transferReasonDescription: transferReasonDescription || 'VENTA',
          transportMode: transportMode || '02',
          customerId: customerId ? parseInt(String(customerId)) : null,
          customerDocType: customerDocType || 'RUC',
          customerDocNumber: customerDocNumber || '',
          customerName: customerName || '',
          customerAddress: customerAddress || '',
          originWarehouseId: originWarehouseId ? parseInt(String(originWarehouseId)) : null,
          originAddress: originAddress || '',
          originUbigeo: originUbigeo || '150101',
          originSunatCode: originSunatCode || '0000',
          deliveryAddress: deliveryAddress || '',
          deliveryUbigeo: deliveryUbigeo || '150101',
          deliveryDepartment: deliveryDepartment || null,
          deliveryProvince: deliveryProvince || null,
          deliveryDistrict: deliveryDistrict || null,
          carrierDocType: carrierDocType || '6',
          carrierDocNumber: carrierDocNumber || null,
          carrierName: carrierName || null,
          carrierMtcNumber: carrierMtcNumber || null,
          shippingAgencyId: shippingAgencyId ? parseInt(String(shippingAgencyId)) : null,
          shippingBranchId: shippingBranchId ? parseInt(String(shippingBranchId)) : null,
          driverDocType: driverDocType || '1',
          driverDocNumber: driverDocNumber || null,
          driverName: driverName || null,
          driverLicenseNumber: driverLicenseNumber || null,
          vehiclePlate: vehiclePlate ? vehiclePlate.toUpperCase().trim() : null,
          vehicleSecondaryPlate: vehicleSecondaryPlate ? vehicleSecondaryPlate.toUpperCase().trim() : null,
          totalWeight: computedWeight,
          weightUnit: weightUnit || 'KGM',
          totalPackages: parseInt(String(totalPackages)) || (guideItems.length || 1),
          orderId: orderId ? parseInt(String(orderId)) : null,
          orderNumber: orderNumber || null,
          invoiceId: invoiceId ? parseInt(String(invoiceId)) : null,
          invoiceNumber: invoiceNumber || null,
          relatedDocType: relatedDocType || null,
          relatedDocNumber: relatedDocNumber || null,
          notes: notes || null,
          status: 'ACTIVE',
          sunatStatus: 'PENDING',
          items: {
            create: guideItems
          }
        },
        include: {
          customer: true,
          originWarehouse: true,
          order: true,
          invoice: true,
          shippingAgency: true,
          items: {
            include: { product: true }
          }
        }
      });

      // Si proviene de un pedido, vincular la guía en el pedido
      if (orderId) {
        await tx.order.update({
          where: { id: parseInt(String(orderId)) },
          data: {
            referralGuide: created.numberFormatted
          }
        });
      }

      return created;
    });

    // Procesar envío automático a SUNAT
    let finalGuide = guide;
    if (sendToSunatImmediately !== false) {
      try {
        finalGuide = await SunatService.sendSalesReferralGuideToSunat(guide.id);
      } catch (sErr: any) {
        console.warn('Advertencia al enviar Guía a SUNAT:', sErr.message);
      }
    }

    res.json(finalGuide);
  } catch (error: any) {
    console.error('Error creating sales referral guide:', error);
    res.status(500).json({ error: 'Error al crear guía de remisión: ' + (error.message || '') });
  }
});

// Endpoint para enviar o reintentar envío de Guía a SUNAT
app.post('/api/sales-referral-guides/:id/send-sunat', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await SunatService.sendSalesReferralGuideToSunat(parseInt(id));
    res.json(result);
  } catch (error: any) {
    console.error('Error al enviar Guía a SUNAT:', error);
    res.status(500).json({ error: error.message || 'Error al enviar guía a SUNAT' });
  }
});

app.put('/api/sales-referral-guides/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const updated = await prisma.salesReferralGuide.update({
      where: { id: parseInt(id) },
      data: {
        ...(status && { status }),
        ...(notes !== undefined && { notes })
      },
      include: {
        customer: true,
        originWarehouse: true,
        items: { include: { product: true } }
      }
    });
    res.json(updated);
  } catch (error: any) {
    console.error('Error updating guide status:', error);
    res.status(500).json({ error: 'Error al actualizar estado de la guía' });
  }
});

app.delete('/api/sales-referral-guides/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.salesReferralGuide.delete({
      where: { id: parseInt(id) }
    });
    res.json({ success: true, message: 'Guía de remisión eliminada' });
  } catch (error: any) {
    console.error('Error deleting guide:', error);
    res.status(500).json({ error: 'Error al eliminar guía de remisión' });
  }
});

// ==========================================
// VEHÍCULOS Y FLOTA (CONFIG. LOGÍSTICA)
// ==========================================

app.get('/api/vehicles', authenticateToken, async (req, res) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      orderBy: { plate: 'asc' }
    });
    res.json(vehicles);
  } catch (error: any) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({ error: 'Error al obtener vehículos' });
  }
});

app.post('/api/vehicles', authenticateToken, async (req, res) => {
  try {
    const { plate, brand, model, capacityWeight, capacityVolume, status } = req.body;
    if (!plate) return res.status(400).json({ error: 'La placa del vehículo es obligatoria' });

    const cleanPlate = plate.trim().toUpperCase();
    const vehicle = await prisma.vehicle.create({
      data: {
        plate: cleanPlate,
        brand: brand ? brand.trim().toUpperCase() : null,
        model: model ? model.trim().toUpperCase() : null,
        capacityWeight: parseFloat(capacityWeight) || 0,
        capacityVolume: parseFloat(capacityVolume) || 0,
        status: status || 'ACTIVE'
      }
    });
    res.json(vehicle);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe un vehículo registrado con esta placa' });
    }
    console.error('Error creating vehicle:', error);
    res.status(500).json({ error: 'Error al registrar vehículo: ' + error.message });
  }
});

app.put('/api/vehicles/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { plate, brand, model, capacityWeight, capacityVolume, status } = req.body;

    const vehicle = await prisma.vehicle.update({
      where: { id: parseInt(id) },
      data: {
        plate: plate ? plate.trim().toUpperCase() : undefined,
        brand: brand !== undefined ? (brand ? brand.trim().toUpperCase() : null) : undefined,
        model: model !== undefined ? (model ? model.trim().toUpperCase() : null) : undefined,
        capacityWeight: capacityWeight !== undefined ? parseFloat(capacityWeight) || 0 : undefined,
        capacityVolume: capacityVolume !== undefined ? parseFloat(capacityVolume) || 0 : undefined,
        status: status || undefined
      }
    });
    res.json(vehicle);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe otro vehículo con esta placa' });
    }
    console.error('Error updating vehicle:', error);
    res.status(500).json({ error: 'Error al actualizar vehículo' });
  }
});

app.delete('/api/vehicles/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.vehicle.delete({
      where: { id: parseInt(id) }
    });
    res.json({ success: true, message: 'Vehículo eliminado correctamente' });
  } catch (error: any) {
    console.error('Error deleting vehicle:', error);
    res.status(500).json({ error: 'Error al eliminar vehículo' });
  }
});

// ==========================================
// CONDUCTORES Y CHOFERES (CONFIG. LOGÍSTICA)
// ==========================================

app.get('/api/drivers', authenticateToken, async (req, res) => {
  try {
    const drivers = await prisma.driver.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(drivers);
  } catch (error: any) {
    console.error('Error fetching drivers:', error);
    res.status(500).json({ error: 'Error al obtener lista de conductores' });
  }
});

app.post('/api/drivers', authenticateToken, async (req, res) => {
  try {
    const { docType, docNumber, name, licenseNumber, phone, email, status } = req.body;
    if (!docNumber || !name) {
      return res.status(400).json({ error: 'El número de documento y el nombre del conductor son obligatorios' });
    }

    const driver = await prisma.driver.create({
      data: {
        docType: docType || '1',
        docNumber: docNumber.trim(),
        name: name.trim().toUpperCase(),
        licenseNumber: licenseNumber ? licenseNumber.trim().toUpperCase() : null,
        phone: phone ? phone.trim() : null,
        email: email ? email.trim() : null,
        status: status || 'ACTIVE'
      }
    });
    res.json(driver);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe un conductor registrado con este número de documento' });
    }
    console.error('Error creating driver:', error);
    res.status(500).json({ error: 'Error al registrar conductor: ' + error.message });
  }
});

app.put('/api/drivers/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { docType, docNumber, name, licenseNumber, phone, email, status } = req.body;

    const driver = await prisma.driver.update({
      where: { id: parseInt(id) },
      data: {
        docType: docType || undefined,
        docNumber: docNumber ? docNumber.trim() : undefined,
        name: name ? name.trim().toUpperCase() : undefined,
        licenseNumber: licenseNumber !== undefined ? (licenseNumber ? licenseNumber.trim().toUpperCase() : null) : undefined,
        phone: phone !== undefined ? (phone ? phone.trim() : null) : undefined,
        email: email !== undefined ? (email ? email.trim() : null) : undefined,
        status: status || undefined
      }
    });
    res.json(driver);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe otro conductor con este número de documento' });
    }
    console.error('Error updating driver:', error);
    res.status(500).json({ error: 'Error al actualizar conductor' });
  }
});

app.delete('/api/drivers/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.driver.delete({
      where: { id: parseInt(id) }
    });
    res.json({ success: true, message: 'Conductor eliminado correctamente' });
  } catch (error: any) {
    console.error('Error deleting driver:', error);
    res.status(500).json({ error: 'Error al eliminar conductor' });
  }
});

app.get('/api/stats', authenticateToken, async (req, res) => {
  try {
    const totalOrders = await prisma.order.count();
    const pendingOrders = await prisma.order.count({ where: { status: 'PENDING' } });
    
    const orders = await prisma.order.findMany();
    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.totalAmount), 0);

    const orderItems = await prisma.orderItem.findMany({
      include: { product: true }
    });

    const productSales: Record<number, { name: string, quantity: number, total: number }> = {};
    orderItems.forEach(item => {
      if (!productSales[item.productId]) {
        productSales[item.productId] = { name: item.product.name, quantity: 0, total: 0 };
      }
      productSales[item.productId].quantity += item.quantity;
      productSales[item.productId].total += Number(item.price) * item.quantity;
    });

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    res.json({
      totalOrders,
      pendingOrders,
      totalRevenue,
      topProducts
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Error al generar estadísticas' });
  }
});

app.put('/api/orders/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const orderId = parseInt(id);
    
    const currentOrder = await prisma.order.findUnique({ 
      where: { id: orderId },
      include: { items: true, movements: true }
    });
    if (!currentOrder) return res.status(404).json({ error: 'Pedido no encontrado' });

    const paidStatuses = ['PAID', 'PARTIAL'];
    const dispatchedStatuses = ['DISPATCHED', 'SHIPPED', 'DELIVERED'];

    if (paidStatuses.includes(currentOrder.paymentStatus)) {
      return res.status(400).json({
        error: 'No se puede editar un pedido que ya tiene pagos registrados. Debe anular el cobro primero.'
      });
    }
    if (dispatchedStatuses.includes(currentOrder.status)) {
      return res.status(400).json({
        error: 'No se puede editar un pedido que ya fue despachado. Debe anular el despacho y el cobro primero.'
      });
    }

    const { 
      customerName, customerEmail, customerPhone, customerCity, customerAddress, 
      notes, totalAmount, status, paymentStatus, currency, paymentCondition, pickupPlace, agencyId, branchId,
      items: newItems
    } = req.body;

    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 1. Revertir stock de items antiguos si existían movimientos
      const DESPACHO_NAME = 'A1.CUZCO.1048 - DESPACHO';
      const despacho = await tx.warehouse.findUnique({ where: { name: DESPACHO_NAME } });

      if (despacho && currentOrder.movements.length > 0) {
        for (const move of currentOrder.movements) {
          if (move.toWarehouseId === despacho.id && move.fromWarehouseId) {
            await tx.stock.updateMany({
              where: { productId: move.productId, warehouseId: move.fromWarehouseId },
              data: { quantity: { increment: move.quantity } }
            });
            await tx.stock.updateMany({
              where: { productId: move.productId, warehouseId: despacho.id },
              data: { quantity: { decrement: move.quantity } }
            });
          }
        }
        await tx.stockMovement.deleteMany({ where: { orderId } });
      }

      // 2. Eliminar items antiguos
      await tx.orderItem.deleteMany({ where: { orderId } });

      // 3. Actualizar header del pedido
      const order = await tx.order.update({
        where: { id: orderId },
        data: {
          customerName,
          customerEmail,
          customerPhone,
          customerCity,
          customerAddress,
          notes,
          totalAmount: totalAmount ? parseFloat(totalAmount.toString()) : undefined,
          status,
          paymentStatus,
          currency,
          paymentCondition,
          pickupPlace,
          agencyId: agencyId ? parseInt(agencyId) : undefined,
          branchId: branchId ? parseInt(branchId) : undefined,
          items: newItems && newItems.length > 0 ? {
            create: newItems.map((item: any) => ({
              productId: item.productId,
              quantity: parseInt(item.quantity) || 0,
              price: parseFloat(item.price) || 0,
              discount: parseFloat(item.discount) || 0,
              lotNumber: item.lotNumber || item.lot || null,
              warehouseName: item.warehouseName || null,
              expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
              unitMeasure: item.unitMeasure || null
            }))
          } : undefined
        },
        include: { items: true }
      });

      // 4. Aplicar nuevo stock para pedidos que requieren reserva
      // Siempre reservar stock al editar un pedido válido (no cancelado)
      const isOrderActive = !['CANCELLED', 'REFUNDED'].includes(currentOrder.status || '');
      
      if (isOrderActive && newItems && newItems.length > 0) {
        const getOrCreateWarehouse = async (name: string) => {
          let w = await tx.warehouse.findUnique({ where: { name } });
          if (!w) {
            w = await tx.warehouse.create({
              data: { name, address: 'Almacén de Sistema', isActive: true }
            });
          }
          return w;
        };

        const despachoWh = await getOrCreateWarehouse(DESPACHO_NAME);

        for (const item of newItems || []) {
          const qty = parseInt(item.quantity) || 0;
          if (qty <= 0) continue;

          const stockSource = await tx.stock.findFirst({
            where: { 
              productId: item.productId, 
              quantity: { gte: qty },
              lotNumber: item.lotNumber || item.lot || null,
              warehouse: {
                name: item.warehouseName ? item.warehouseName : {
                  notIn: ['Existencias', 'Comprobante', 'Despacho']
                },
                type: { 
                  notIn: ['TRANSITORIO', 'DESPACHO', 'COMPROBANTES', 'SISTEMA'] 
                }
              }
            },
            include: { warehouse: true }
          });

          if (!stockSource) {
            throw new Error(`Stock insuficiente para el producto ID ${item.productId}${item.lotNumber ? ` (Lote: ${item.lotNumber})` : ''} en el almacén de origen.`);
          }

          await tx.stock.update({ 
            where: { id: stockSource.id }, 
            data: { quantity: { decrement: qty } } 
          });

          let stockDesp = await tx.stock.findFirst({
            where: { 
              productId: item.productId, 
              warehouseId: despachoWh.id,
              lotNumber: item.lotNumber || item.lot || null
            }
          });
          if (!stockDesp) {
            stockDesp = await tx.stock.create({
              data: { 
                productId: item.productId, 
                warehouseId: despachoWh.id, 
                quantity: qty,
                lotNumber: item.lotNumber || item.lot || null,
                expiryDate: item.expiryDate || null
              }
            });
          } else {
            await tx.stock.update({ 
              where: { id: stockDesp.id }, 
              data: { quantity: { increment: qty } } 
            });
          }

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              orderId: orderId,
              fromWarehouseId: stockSource.warehouseId,
              toWarehouseId: despachoWh.id,
              quantity: qty,
              type: 'TRANSFER',
              observation: `Reserva automática pedido #${orderId} (Desde ${stockSource.warehouse.name})`
            }
          });
        }
      }

      return order;
    });

    res.json(updatedOrder);
  } catch (error: any) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Error al actualizar pedido: ' + (error.message || '') });
  }
});

app.delete('/api/orders/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const orderId = parseInt(id);
  console.log(`[DELETE ORDER] Starting deletion for order ${orderId}`);
  
  try {
    await prisma.$transaction(async (tx) => {
      // 0. Get order with movements and payments to check constraints
      const order = await tx.order.findUnique({ 
        where: { id: orderId },
        include: { movements: true, payments: true }
      });

      if (order) {
        // Validation: No se puede eliminar si ya fue cobrado o tiene pagos registrados
        if (order.paymentStatus === 'PAID' || order.payments.length > 0) {
          throw new Error('No se puede eliminar un pedido que ya cuenta con cobros o pagos registrados. Debe anular los cobros primero.');
        }

        // Validation: No se puede eliminar si ya fue despachado, enviado o entregado
        if (['DISPATCHED', 'SHIPPED', 'DELIVERED'].includes(order.status)) {
          throw new Error('No se puede eliminar un pedido que ya ha sido despachado, enviado o entregado. Debe anular el despacho primero.');
        }

        // 1. Reverse stock if there were movements
        const DESPACHO_NAME = 'A1.CUZCO.1048 - DESPACHO';
        const despacho = await tx.warehouse.findUnique({ where: { name: DESPACHO_NAME } });

        if (despacho) {
          console.log(`[DELETE ORDER] Reversing ${order.movements.length} stock movements targeting ${DESPACHO_NAME}`);
          for (const move of order.movements) {
            if (move.toWarehouseId === despacho.id && move.fromWarehouseId) {
              // Return to original source
              await tx.stock.updateMany({
                where: { productId: move.productId, warehouseId: move.fromWarehouseId },
                data: { quantity: { increment: move.quantity } }
              });
              // Remove from Despacho Manual
              await tx.stock.updateMany({
                where: { productId: move.productId, warehouseId: despacho.id },
                data: { quantity: { decrement: move.quantity } }
              });
            }
          }
        }

        // 2. Delete associated payments
        console.log(`[DELETE ORDER] Deleting payments for order ${orderId}`);
        await tx.payment.deleteMany({ where: { orderId } });
        
        // 3. The order has cascade on OrderItem and StockMovement
        console.log(`[DELETE ORDER] Deleting order record ${orderId}`);
        await tx.order.delete({ where: { id: orderId } });

        // 4. Revert quotation status if exists
        if (order.quotationId) {
          console.log(`[DELETE ORDER] Reverting quotation status for ID: ${order.quotationId}`);
          await tx.quotation.update({
            where: { id: order.quotationId },
            data: { status: 'PENDING' }
          });
        }
      }
    });
    
    console.log(`[DELETE ORDER] Success for order ${orderId}`);
    res.json({ success: true });
  } catch (error: any) {
    console.error(`[DELETE ORDER] Error for order ${orderId}:`, error);
    res.status(500).json({ error: `Error al eliminar pedido: ${error.message || 'Error desconocido'}` });
  }
});

// --- API PAYMENTS ---
app.get('/api/orders/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({
      where: { id: parseInt(id) },
      include: { 
        items: { include: { product: true } },
        payments: true,
        agency: true
      }
    });
    if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener detalle del pedido' });
  }
});

app.post('/api/payments', authenticateToken, async (req, res) => {
  try {
    const { orderId, amount, method, voucherNumber, date } = req.body;
    
    // --- VALIDACIONES DE INTEGRIDAD ---
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'El monto del pago debe ser un número positivo.' });
    }

    const payment = await prisma.$transaction(async (tx) => {
      // Verificar si el pago excede el saldo
      const order = await tx.order.findUnique({
        where: { id: parseInt(orderId) },
        include: { payments: true, items: true }
      });
      
      if (!order) throw new Error('Pedido no encontrado');
      
      const totalPaid = order.payments.reduce((acc, p) => acc + Number(p.amount), 0);
      const remaining = Number(order.totalAmount) - totalPaid;
      
      if (parsedAmount > remaining + 0.01) { // 0.01 tolerance for rounding
        throw new Error(`El pago excede el saldo pendiente. Saldo actual: ${remaining.toFixed(2)}`);
      }

      const newPayment = await tx.payment.create({
        data: {
          orderId: parseInt(orderId),
          amount: parseFloat(amount),
          method,
          voucherNumber,
          date: date ? new Date(date) : new Date()
        }
      });

      // Recalcular estado del pedido (obtener datos actualizados tras el pago)
      const updatedOrder = await tx.order.findUnique({
        where: { id: parseInt(orderId) },
        include: { payments: true }
      });

      if (updatedOrder) {
        const totalPaidAfter = updatedOrder.payments.reduce((acc, p) => acc + Number(p.amount), 0);
        const isFullyPaid = totalPaidAfter >= Number(updatedOrder.totalAmount) - 0.01;

        if (isFullyPaid) {
          await tx.order.update({
            where: { id: updatedOrder.id },
            data: { paymentStatus: 'PAID', status: 'PREPARING' }
          });
        } else {
          await tx.order.update({
            where: { id: updatedOrder.id },
            data: { paymentStatus: 'PARTIAL' }
          });
        }

        // Si es el primer pago (estaba UNPAID), reservar stock y enviar a bandeja de picking
        if (order.paymentStatus === 'UNPAID' && order.items && order.items.length > 0) {
          await moveStockToTemp(tx, order.id, order.items);
          await tx.order.update({
            where: { id: updatedOrder.id },
            data: { warehouseStatus: 'PENDING' }
          });
        }
      }

      return newPayment;
    });

    res.json(payment);
  } catch (error: any) {
    console.error('Error recording payment:', error);
    res.status(500).json({ error: 'Error al registrar el pago: ' + error.message });
  }
});

app.delete('/api/payments/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const paymentId = parseInt(id);

    await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: paymentId } });
      if (!payment) throw new Error('Pago no encontrado');

      await tx.payment.delete({ where: { id: paymentId } });

      // Recalcular estado del pedido
      const order = await tx.order.findUnique({
        where: { id: payment.orderId },
        include: { payments: true }
      });

      if (order) {
        const totalPaid = order.payments.reduce((acc, p) => acc + Number(p.amount), 0);
        if (totalPaid < Number(order.totalAmount)) {
          await tx.order.update({
            where: { id: order.id },
            data: { paymentStatus: 'PENDING' }
          });
        }
      }
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al eliminar pago: ' + error.message });
  }
});

// --- API SELLERS ---
app.get('/api/sellers', authenticateToken, async (req, res) => {
  try {
    const sellers = await (prisma as any).seller.findMany({ 
      include: { warehouse: true },
      orderBy: { name: 'asc' } 
    });
    res.json(sellers);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener vendedores' });
  }
});

app.post('/api/sellers', authenticateToken, async (req, res) => {
  try {
    const { name, dni, phone, email, isActive, warehouseId } = req.body;
    const seller = await (prisma as any).seller.create({ 
      data: {
        name, dni, phone, email, 
        isActive: isActive !== undefined ? isActive : true,
        warehouseId: warehouseId ? parseInt(warehouseId) : null
      },
      include: { warehouse: true }
    });
    res.json(seller);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear vendedor' });
  }
});

app.put('/api/sellers/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, dni, phone, email, isActive, warehouseId } = req.body;
    const seller = await (prisma as any).seller.update({ 
      where: { id: parseInt(id) }, 
      data: {
        name, dni, phone, email, 
        isActive,
        warehouseId: warehouseId !== undefined ? (warehouseId ? parseInt(warehouseId) : null) : undefined
      },
      include: { warehouse: true }
    });
    res.json(seller);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar vendedor' });
  }
});

app.delete('/api/sellers/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await (prisma as any).seller.delete({ where: { id: parseInt(id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar vendedor' });
  }
});

// --- API DOCUMENT SERIES ---
app.get('/api/series', authenticateToken, async (req, res) => {
  try {
    const series = await (prisma as any).documentSeries.findMany({
      include: { warehouse: true },
      orderBy: { id: 'desc' }
    });
    res.json(series);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener series' });
  }
});

app.post('/api/series', authenticateToken, async (req, res) => {
  try {
    const { documentType, series, currentNumber, warehouseId, isActive } = req.body;
    const newSeries = await (prisma as any).documentSeries.create({
      data: {
        documentType,
        series,
        currentNumber: parseInt(currentNumber) || 0,
        warehouseId: parseInt(warehouseId),
        isActive: isActive !== undefined ? isActive : true
      }
    });
    res.json(newSeries);
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'Ya existe esta serie para este tipo de documento en este almacén.' });
    res.status(500).json({ error: 'Error al crear serie' });
  }
});

app.put('/api/series/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { documentType, series, currentNumber, warehouseId, isActive } = req.body;
    const updated = await (prisma as any).documentSeries.update({
      where: { id: parseInt(id) },
      data: {
        documentType,
        series,
        currentNumber: parseInt(currentNumber) || 0,
        warehouseId: parseInt(warehouseId),
        isActive: isActive !== undefined ? isActive : true
      }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar serie' });
  }
});

app.delete('/api/series/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await (prisma as any).documentSeries.delete({ where: { id: parseInt(id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar serie' });
  }
});

app.get('/api/series/next/:warehouseId/:docType', authenticateToken, async (req, res) => {
  try {
    const { warehouseId, docType } = req.params;
    const series = await (prisma as any).documentSeries.findFirst({
      where: { 
        warehouseId: parseInt(warehouseId), 
        documentType: docType,
        isActive: true 
      }
    });
    
    if (!series) {
      return res.status(404).json({ error: 'No hay una serie configurada para este almacén y tipo de documento.' });
    }
    
    const nextNumber = series.currentNumber + 1;
    res.json({ 
      series: series.series, 
      nextNumber: nextNumber.toString().padStart(8, '0'),
      seriesId: series.id
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener correlativo' });
  }
});

// --- API DOCUMENT TYPES ---
app.get('/api/document-types', authenticateToken, async (req, res) => {
  try {
    const types = await prisma.sunatTable.findMany({
      where: { tableName: 'TABLA_10', isActive: true },
      orderBy: { code: 'asc' }
    });
    res.json(types);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener tipos de documento' });
  }
});

// --- API WAREHOUSES ---
app.get('/api/warehouses', authenticateToken, async (req, res) => {
  try {
    const warehouses = await (prisma as any).warehouse.findMany({
      include: {
        floors: {
          include: {
            zones: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });
    res.json(warehouses);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener almacenes' });
  }
});

app.post('/api/warehouses', authenticateToken, async (req, res) => {
  try {
    const { name, code, commercialName, address, ruc, ubigeo, sunatCode, observation, phones, type, validateStock, isActive } = req.body;
    const warehouse = await (prisma as any).warehouse.create({
      data: {
        name,
        code,
        commercialName,
        address,
        ruc,
        ubigeo,
        sunatCode: sunatCode || '0000',
        observation,
        phones,
        type,
        validateStock: validateStock !== undefined ? validateStock : true,
        isActive: isActive !== undefined ? isActive : true
      }
    });
    res.json(warehouse);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear almacén' });
  }
});

app.put('/api/warehouses/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const warehouse = await (prisma as any).warehouse.update({
      where: { id: parseInt(id) },
      data: req.body
    });
    res.json(warehouse);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar almacén' });
  }
});

app.post('/api/warehouses/floors', authenticateToken, async (req, res) => {
  try {
    const { warehouseId, name, code } = req.body;
    const floor = await (prisma as any).warehouseFloor.create({
      data: { warehouseId: parseInt(warehouseId), name, code }
    });
    res.json(floor);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe un piso con ese nombre o código en este almacén.' });
    }
    res.status(500).json({ error: 'Error al crear piso' });
  }
});

app.post('/api/warehouses/zones', authenticateToken, async (req, res) => {
  try {
    const { floorId, name, code } = req.body;
    const zone = await (prisma as any).warehouseZone.create({
      data: { floorId: parseInt(floorId), name, code }
    });
    res.json(zone);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe una zona con ese nombre o código en este piso.' });
    }
    res.status(500).json({ error: 'Error al crear zona' });
  }
});

app.put('/api/warehouses/floors/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code } = req.body;
    const floor = await (prisma as any).warehouseFloor.update({
      where: { id: parseInt(id) },
      data: { name, code }
    });
    res.json(floor);
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'Ya existe un piso con ese nombre o código.' });
    res.status(500).json({ error: 'Error al actualizar piso' });
  }
});

app.put('/api/warehouses/zones/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code } = req.body;
    const zone = await (prisma as any).warehouseZone.update({
      where: { id: parseInt(id) },
      data: { name, code }
    });
    res.json(zone);
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'Ya existe una zona con ese nombre o código.' });
    res.status(500).json({ error: 'Error al actualizar zona' });
  }
});

app.delete('/api/warehouses/floors/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const stockInFloor = await (prisma as any).stock.findFirst({
      where: {
        zone: { floorId: parseInt(id) },
        quantity: { gt: 0 }
      }
    });
    if (stockInFloor) {
      return res.status(400).json({ error: 'No se puede eliminar el piso porque contiene zonas con productos en stock.' });
    }
    await (prisma as any).warehouseFloor.delete({ where: { id: parseInt(id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar piso' });
  }
});

app.delete('/api/warehouses/zones/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const stockInZone = await (prisma as any).stock.findFirst({
      where: {
        zoneId: parseInt(id),
        quantity: { gt: 0 }
      }
    });
    if (stockInZone) {
      return res.status(400).json({ error: 'No se puede eliminar la zona porque contiene productos en stock.' });
    }
    await (prisma as any).warehouseZone.delete({ where: { id: parseInt(id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar zona' });
  }
});

app.delete('/api/warehouses/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await (prisma as any).warehouse.delete({ where: { id: parseInt(id) } });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete warehouse error:', error);
    res.status(500).json({ error: 'Error al eliminar almacén' });
  }
});


// --- SUNAT TABLES (manejado por ruta principal en línea 731) ---

// --- EXCHANGE RATE BY DATE ---
app.get('/api/exchange-rates/fetch-by-date/:date', authenticateToken, async (req, res) => {
  try {
    const { date } = req.params;
    const targetDate = new Date(date + 'T12:00:00');
    targetDate.setHours(0,0,0,0);
    
    const rate = await prisma.exchangeRate.findFirst({
      where: { date: targetDate },
      orderBy: { date: 'desc' }
    });
    
    if (rate) {
      res.json(rate);
    } else {
      // Si no hay para esa fecha, traer el último disponible
      const lastRate = await prisma.exchangeRate.findFirst({
        where: { date: { lte: targetDate } },
        orderBy: { date: 'desc' }
      });
      res.json(lastRate || { sell_rate: 1.0, buy_rate: 1.0 });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener tipo de cambio' });
  }
});

// --- CONSULTA RUC/DNI (PUBLICO PARA WEB) ---
app.get('/api/web/consult/:type/:number', async (req, res) => {
  try {
    const { type, number } = req.params;
    const cleanNum = (number || '').trim();

    if (type === 'ruc' && cleanNum.length !== 11) {
      return res.status(400).json({ error: `El RUC debe tener exactamente 11 dígitos numéricos (se recibieron ${cleanNum.length}).` });
    }
    if (type === 'dni' && cleanNum.length !== 8) {
      return res.status(400).json({ error: `El DNI debe tener exactamente 8 dígitos numéricos (se recibieron ${cleanNum.length}).` });
    }

    let token = process.env.APIPERU_TOKEN;
    if (!token || token === 'YOUR_TOKEN_HERE') {
      token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6InNpc3RlbWFzQGdydXBvY2FybWVsaXRhLmNvbSJ9.txnBfIsj3SR322JLvUWooD74_HdypX-FcFgr5C2xMCY';
    }
    let url = '';
    if (type === 'ruc') url = `https://dniruc.apisperu.com/api/v1/ruc/${cleanNum}?token=${token}`;
    else if (type === 'dni') url = `https://dniruc.apisperu.com/api/v1/dni/${cleanNum}?token=${token}`;
    else return res.status(400).json({ error: 'Tipo de consulta no válido' });

    const response = await axios.get(url, { timeout: 10000 });
    res.json(response.data);
  } catch (error: any) {
    const msg = error.response?.data?.message || error.response?.data?.error || 'Error en servicio de consulta';
    res.status(error.response?.status || 500).json({ error: msg });
  }
});

// --- CONSULTA RUC/DNI (APIPeru.dev) ---
app.get('/api/consult/:type/:number', authenticateToken, async (req, res) => {
  try {
    const { type, number } = req.params;
    const cleanNum = (number || '').trim();

    if (type === 'ruc' && cleanNum.length !== 11) {
      return res.status(400).json({ error: `El RUC debe tener exactamente 11 dígitos numéricos (se recibieron ${cleanNum.length}).` });
    }
    if (type === 'dni' && cleanNum.length !== 8) {
      return res.status(400).json({ error: `El DNI debe tener exactamente 8 dígitos numéricos (se recibieron ${cleanNum.length}).` });
    }

    let token = process.env.APIPERU_TOKEN;

    // Fallback con el token proporcionado por el usuario
    if (!token || token === 'YOUR_TOKEN_HERE') {
      token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6InNpc3RlbWFzQGdydXBvY2FybWVsaXRhLmNvbSJ9.txnBfIsj3SR322JLvUWooD74_HdypX-FcFgr5C2xMCY';
    }

    if (!token) return res.status(500).json({ error: 'Token de APIPeru no configurado' });

    let url = '';
    if (type === 'ruc') url = `https://dniruc.apisperu.com/api/v1/ruc/${cleanNum}?token=${token}`;
    else if (type === 'dni') url = `https://dniruc.apisperu.com/api/v1/dni/${cleanNum}?token=${token}`;
    else return res.status(400).json({ error: 'Tipo de consulta no válido' });

    const response = await axios.get(url, { timeout: 10000 });
    res.json(response.data);
  } catch (error: any) {
    console.error('APIPeru Error:', error.message);
    const msg = error.response?.data?.message || error.response?.data?.error || 'Error en servicio de consulta';
    res.status(error.response?.status || 500).json({ error: msg });
  }
});

// --- API ROLES ---
app.get('/api/roles', authenticateToken, async (req, res) => {
  try {
    const roles = await prisma.role.findMany({
      include: { _count: { select: { users: true } } }
    });
    res.json(roles);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener roles' });
  }
});

app.post('/api/roles', authenticateToken, async (req, res) => {
  try {
    const { name, permissions, isActive } = req.body;
    const role = await prisma.role.create({
      data: { name, permissions: JSON.stringify(permissions), isActive }
    });
    res.json(role);
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'El nombre del rol ya existe' });
    res.status(500).json({ error: 'Error al crear rol' });
  }
});

app.put('/api/roles/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, permissions, isActive } = req.body;
    const role = await prisma.role.update({
      where: { id: parseInt(id) },
      data: { name, permissions: JSON.stringify(permissions), isActive }
    });
    res.json(role);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al actualizar rol' });
  }
});

// --- API USERS (ADMIN) ---
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const { role } = req.query;
    const where = role
      ? { role: { name: String(role).toUpperCase() }, isActive: true }
      : {};
    const users = await prisma.user.findMany({
      where,
      select: { 
        id: true, 
        email: true, 
        name: true, 
        isActive: true, 
        roleId: true, 
        role: { select: { name: true } }, 
        warehouseId: true,
        warehouse: { select: { id: true, name: true, sunatCode: true } },
        createdAt: true 
      }
    });
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

app.post('/api/users', authenticateToken, async (req, res) => {
  try {
    const { email, password, name, roleId, warehouseId, isActive } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { 
        email, 
        password: hashedPassword, 
        name, 
        roleId: roleId ? parseInt(roleId) : null, 
        warehouseId: warehouseId ? parseInt(warehouseId) : null,
        isActive: isActive ?? true 
      }
    });
    res.json({ id: user.id, email: user.email, name: user.name, warehouseId: user.warehouseId });
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'El email ya está registrado' });
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

app.put('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { email, password, name, roleId, warehouseId, isActive } = req.body;
    const data: any = { 
      email, 
      name, 
      roleId: roleId ? parseInt(roleId) : null, 
      warehouseId: warehouseId !== undefined ? (warehouseId ? parseInt(warehouseId) : null) : undefined,
      isActive 
    };
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }
    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data
    });
    res.json({ id: user.id, email: user.email, name: user.name, warehouseId: user.warehouseId });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

// --- PICKING / WAREHOUSE MODULE ---

// --- PICKING OPERATORS ---
app.get('/api/picking/operators', authenticateToken, async (req, res) => {
  try {
    const operators = await prisma.warehouseOperator.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(operators);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener operarios' });
  }
});

app.post('/api/picking/operators', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'El nombre es requerido' });
    const operator = await prisma.warehouseOperator.create({
      data: { name: name.trim() }
    });
    res.json(operator);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear operario' });
  }
});

app.put('/api/picking/operators/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;
    const operator = await prisma.warehouseOperator.update({
      where: { id: parseInt(id) },
      data: { ...(name && { name: name.trim() }), ...(isActive !== undefined && { isActive }) }
    });
    res.json(operator);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar operario' });
  }
});

app.get('/api/picking/orders', authenticateToken, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        warehouseStatus: { not: null },
        status: { not: 'DISPATCHED' }
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                unit: true,
                package: true,
                subPackage: true,
              }
            }
          }
        },
        payments: true,
        picker: true,
        agency: true
      },
      orderBy: [
        { warehouseStatus: 'asc' },
        { createdAt: 'desc' }
      ]
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener pedidos de picking' });
  }
});

app.put('/api/picking/:id/assign', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { pickerId } = req.body;

    const order = await prisma.order.update({
      where: { id: parseInt(id) },
      data: {
        pickerId: parseInt(pickerId),
        warehouseStatus: 'IN_PICKING',
        pickingStartedAt: new Date()
      },
      include: {
        picker: true
      }
    });

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Error al asignar operario' });
  }
});

app.put('/api/picking/:id/prepare', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.update({
      where: { id: parseInt(id) },
      data: { warehouseStatus: 'PICKED' }
    });

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Error al marcar como preparado' });
  }
});

app.put('/api/picking/:id/dispatch', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { referralGuide, carrierGuide } = req.body;
    const orderId = parseInt(id);

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true }
      });

      if (!order) throw new Error('Pedido no encontrado');

      const despacho = await tx.warehouse.findFirst({
        where: { name: { contains: 'DESPACHO' } }
      });
      const comprobante = await tx.warehouse.findFirst({
        where: { name: { contains: 'COMPROBANTE' } }
      });

      if (despacho && comprobante) {
        for (const item of order.items) {
          await tx.stock.updateMany({
            where: { productId: item.productId, warehouseId: despacho.id },
            data: { quantity: { decrement: item.quantity } }
          });
          await tx.stock.updateMany({
            where: { productId: item.productId, warehouseId: comprobante.id },
            data: { quantity: { decrement: item.quantity } }
          });

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              fromWarehouseId: despacho.id,
              toWarehouseId: comprobante.id,
              quantity: item.quantity,
              type: 'OUTPUT',
              orderId,
              observation: `Despacho pedido #${orderId} - Guía: ${referralGuide || ''}`
            }
          });
        }
      }

      return await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'DISPATCHED',
          warehouseStatus: 'DISPATCHED',
          ...(referralGuide && { referralGuide }),
          ...(carrierGuide && { carrierGuide })
        }
      });
    });

    res.json(updatedOrder);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al despachar pedido: ' + error.message });
  }
});

// ============================================
// ENTRY NOTES (Notas de Ingreso)
// ============================================

app.get('/api/entry-notes', authenticateToken, async (req, res) => {
  try {
    const { status, warehouseId, supplierId, dateFrom, dateTo, search } = req.query;
    const where: any = {};

    if (status) where.status = status;
    if (warehouseId) where.warehouseId = parseInt(warehouseId as string);
    if (supplierId) where.supplierId = parseInt(supplierId as string);
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom as string);
      if (dateTo) where.date.lte = new Date(dateTo as string);
    }
    if (search) {
      where.OR = [
        { description: { contains: search as string } },
        { guideRemission: { contains: search as string } },
        { series: { contains: search as string } },
        { number: { contains: search as string } },
      ];
    }

    const notes = await prisma.entryNote.findMany({
      where,
      include: {
        warehouse: true,
        supplier: true,
        zone: true,
        floor: true,
        items: {
          include: {
            product: { include: { category: true, brand: true, unit: true, package: true, subPackage: true } },
            unit: true,
          },
          orderBy: { id: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(notes);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener notas de ingreso: ' + error.message });
  }
});

app.get('/api/entry-notes/:id', authenticateToken, async (req, res) => {
  try {
    const note = await prisma.entryNote.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        warehouse: true,
        supplier: true,
        zone: true,
        floor: true,
        items: {
          include: {
            product: { include: { category: true, brand: true, unit: true, package: true, subPackage: true } },
            unit: true,
          },
          orderBy: { id: 'asc' },
        },
      },
    });

    if (!note) {
      return res.status(404).json({ error: 'Nota de ingreso no encontrada' });
    }

    res.json(note);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener nota de ingreso: ' + error.message });
  }
});

app.post('/api/entry-notes', authenticateToken, async (req, res) => {
  try {
    const {
      warehouseId, zoneId, floorId, currency, exchangeRate, supplierId, date, description,
      reasonCode, guideRemission, status, documentType, series, number, items
    } = req.body;

    if (!warehouseId) return res.status(400).json({ error: 'Debe seleccionar un almacén.' });
    if (!reasonCode) return res.status(400).json({ error: 'Debe seleccionar un motivo.' });
    if (!date) return res.status(400).json({ error: 'La fecha es obligatoria.' });
    if (!items || items.length === 0) return res.status(400).json({ error: 'La nota de ingreso debe tener al menos un producto.' });

    for (const item of items) {
      if (!item.productId) return res.status(400).json({ error: 'Todos los items deben tener un producto.' });
      if (!item.quantity || parseInt(item.quantity) <= 0) return res.status(400).json({ error: `La cantidad del producto ${item.productId} debe ser mayor a cero.` });
      if (!item.unitId) return res.status(400).json({ error: `La unidad de medida es obligatoria para el producto ${item.productId}.` });
      if (item.unitCost === undefined || item.unitCost === null || parseFloat(item.unitCost) < 0) return res.status(400).json({ error: `El costo unitario es obligatorio para el producto ${item.productId}.` });
    }

    const note = await prisma.$transaction(async (tx) => {
      const calculatedTotal = items.reduce((acc: number, item: any) => {
        return acc + (parseInt(item.quantity) * parseFloat(item.unitCost));
      }, 0);

      const newNote = await (tx as any).entryNote.create({
        data: {
          warehouseId: parseInt(warehouseId),
          zoneId: zoneId ? parseInt(zoneId) : null,
          floorId: floorId ? parseInt(floorId) : null,
          currency: currency || 'PEN',
          exchangeRate: parseFloat(exchangeRate) || 1.0000,
          supplierId: supplierId ? parseInt(supplierId) : null,
          date: new Date(date),
          description: description || null,
          reasonCode,
          guideRemission: guideRemission || null,
          status: status || 'DRAFT',
          documentType: documentType || null,
          series: series || null,
          number: number || null,
          totalAmount: calculatedTotal,
          items: {
            create: items.map((item: any) => {
              const qty = parseInt(item.quantity);
              const weight = item.weight ? parseFloat(item.weight) : null;
              return {
                productId: item.productId,
                guideRemission: item.guideRemission || null,
                documentType: item.documentType || null,
                documentNumber: item.documentNumber || null,
                quantity: qty,
                unitId: parseInt(item.unitId),
                unitCost: parseFloat(item.unitCost),
                total: qty * parseFloat(item.unitCost),
                orderNumber: item.orderNumber || null,
                lotNumber: item.lotNumber || null,
                entryDate: item.entryDate ? new Date(item.entryDate) : new Date(),
                weight: weight,
                totalWeight: weight ? qty * weight : null,
              };
            }),
          },
        },
        include: {
          items: {
            include: {
              product: { include: { unit: true, package: true, subPackage: true } },
              unit: true,
            },
          },
          warehouse: true,
          supplier: true,
          zone: true,
          floor: true,
        },
      });

      if (status === 'APPROVED' || status === 'COMPLETED') {
        for (const item of newNote.items) {
          let baseQuantity = item.quantity;
          const product = item.product;
          if (product) {
            if (item.unitId === product.subPackageId) {
              baseQuantity = item.quantity * (product.quantityPerSubPackage || 1);
            } else if (item.unitId === product.packageId) {
              baseQuantity = item.quantity * (product.quantityPerPackage || 1) * (product.quantityPerSubPackage || 1);
            }
          }

          const stockRecord = await (tx as any).stock.findFirst({
            where: {
              productId: item.productId,
              warehouseId: parseInt(warehouseId),
              zoneId: zoneId ? parseInt(zoneId) : null,
              lotNumber: item.lotNumber || null,
            },
          });

          if (stockRecord) {
            await (tx as any).stock.update({
              where: { id: stockRecord.id },
              data: { quantity: { increment: baseQuantity } },
            });
          } else {
            await (tx as any).stock.create({
              data: {
                productId: item.productId,
                warehouseId: parseInt(warehouseId),
                zoneId: zoneId ? parseInt(zoneId) : null,
                floorId: floorId ? parseInt(floorId) : null,
                quantity: baseQuantity,
                lotNumber: item.lotNumber || null,
              },
            });
          }

          await (tx as any).stockMovement.create({
            data: {
              productId: item.productId,
              toWarehouseId: parseInt(warehouseId),
              toZoneId: zoneId ? parseInt(zoneId) : null,
              quantity: baseQuantity,
              type: 'INPUT',
              lotNumber: item.lotNumber || null,
              observation: `Nota de Ingreso ${series || ''}-${number || ''} (${reasonCode})`,
              status: 'COMPLETED',
            },
          });

          await (tx as any).product.update({
            where: { id: item.productId },
            data: { stock: { increment: baseQuantity } },
          });
        }
      }

      return newNote;
    });

    res.status(201).json(note);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al crear nota de ingreso: ' + error.message });
  }
});

app.put('/api/entry-notes/:id', authenticateToken, async (req, res) => {
  try {
    const existing = await prisma.entryNote.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { items: true },
    });

    if (!existing) return res.status(404).json({ error: 'Nota de ingreso no encontrada' });
    if (['APPROVED', 'COMPLETED'].includes(existing.status)) {
      return res.status(400).json({ error: 'No se puede editar una nota aprobada o completada.' });
    }

    const {
      warehouseId, zoneId, floorId, currency, exchangeRate, supplierId, date, description,
      reasonCode, guideRemission, status, documentType, series, number, items
    } = req.body;

    if (items && items.length > 0) {
      for (const item of items) {
        if (!item.productId) return res.status(400).json({ error: 'Todos los items deben tener un producto.' });
        if (!item.quantity || parseInt(item.quantity) <= 0) return res.status(400).json({ error: `La cantidad debe ser mayor a cero.` });
        if (!item.unitId) return res.status(400).json({ error: `La unidad de medida es obligatoria.` });
        if (item.unitCost === undefined || item.unitCost === null || parseFloat(item.unitCost) < 0) return res.status(400).json({ error: `El costo unitario es obligatorio.` });
      }
    }

    const note = await prisma.$transaction(async (tx) => {
      await (tx as any).entryNoteItem.deleteMany({ where: { entryNoteId: existing.id } });

      const calculatedTotal = items ? items.reduce((acc: number, item: any) => {
        return acc + (parseInt(item.quantity) * parseFloat(item.unitCost));
      }, 0) : 0;

      const updatedNote = await (tx as any).entryNote.update({
        where: { id: existing.id },
        data: {
          warehouseId: warehouseId ? parseInt(warehouseId) : existing.warehouseId,
          zoneId: zoneId !== undefined ? (zoneId ? parseInt(zoneId) : null) : existing.zoneId,
          floorId: floorId !== undefined ? (floorId ? parseInt(floorId) : null) : existing.floorId,
          currency: currency || existing.currency,
          exchangeRate: exchangeRate !== undefined ? parseFloat(exchangeRate) : existing.exchangeRate,
          supplierId: supplierId !== undefined ? (supplierId ? parseInt(supplierId) : null) : existing.supplierId,
          date: date ? new Date(date) : existing.date,
          description: description !== undefined ? description : existing.description,
          reasonCode: reasonCode || existing.reasonCode,
          guideRemission: guideRemission !== undefined ? guideRemission : existing.guideRemission,
          status: status || existing.status,
          documentType: documentType !== undefined ? documentType : existing.documentType,
          series: series !== undefined ? series : existing.series,
          number: number !== undefined ? number : existing.number,
          totalAmount: calculatedTotal,
          items: items ? {
            create: items.map((item: any) => {
              const qty = parseInt(item.quantity);
              const weight = item.weight ? parseFloat(item.weight) : null;
              return {
                productId: item.productId,
                guideRemission: item.guideRemission || null,
                documentType: item.documentType || null,
                documentNumber: item.documentNumber || null,
                quantity: qty,
                unitId: parseInt(item.unitId),
                unitCost: parseFloat(item.unitCost),
                total: qty * parseFloat(item.unitCost),
                orderNumber: item.orderNumber || null,
                lotNumber: item.lotNumber || null,
                entryDate: item.entryDate ? new Date(item.entryDate) : new Date(),
                weight: weight,
                totalWeight: weight ? qty * weight : null,
              };
            }),
          } : undefined,
        },
        include: {
          items: {
            include: {
              product: { include: { unit: true, package: true, subPackage: true } },
              unit: true,
            },
          },
          warehouse: true,
          supplier: true,
          zone: true,
          floor: true,
        },
      });

      if (status === 'APPROVED' || status === 'COMPLETED') {
        for (const item of updatedNote.items) {
          let baseQuantity = item.quantity;
          const product = item.product;
          if (product) {
            if (item.unitId === product.subPackageId) {
              baseQuantity = item.quantity * (product.quantityPerSubPackage || 1);
            } else if (item.unitId === product.packageId) {
              baseQuantity = item.quantity * (product.quantityPerPackage || 1) * (product.quantityPerSubPackage || 1);
            }
          }

          const stockRecord = await (tx as any).stock.findFirst({
            where: {
              productId: item.productId,
              warehouseId: updatedNote.warehouseId,
              zoneId: updatedNote.zoneId || null,
              lotNumber: item.lotNumber || null,
            },
          });

          if (stockRecord) {
            await (tx as any).stock.update({
              where: { id: stockRecord.id },
              data: { quantity: { increment: baseQuantity } },
            });
          } else {
            await (tx as any).stock.create({
              data: {
                productId: item.productId,
                warehouseId: updatedNote.warehouseId,
                zoneId: updatedNote.zoneId || null,
                floorId: updatedNote.floorId || null,
                quantity: baseQuantity,
                lotNumber: item.lotNumber || null,
              },
            });
          }

          await (tx as any).stockMovement.create({
            data: {
              productId: item.productId,
              toWarehouseId: updatedNote.warehouseId,
              toZoneId: updatedNote.zoneId || null,
              quantity: baseQuantity,
              type: 'INPUT',
              lotNumber: item.lotNumber || null,
              observation: `Nota de Ingreso ${updatedNote.series || ''}-${updatedNote.number || ''} (${updatedNote.reasonCode})`,
              status: 'COMPLETED',
            },
          });

          await (tx as any).product.update({
            where: { id: item.productId },
            data: { stock: { increment: baseQuantity } },
          });
        }
      }

      return updatedNote;
    });

    res.json(note);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al actualizar nota de ingreso: ' + error.message });
  }
});

app.delete('/api/entry-notes/:id', authenticateToken, async (req, res) => {
  try {
    const note = await prisma.entryNote.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!note) return res.status(404).json({ error: 'Nota de ingreso no encontrada' });
    if (['APPROVED', 'COMPLETED'].includes(note.status)) {
      return res.status(400).json({ error: 'No se puede eliminar una nota aprobada o completada. Debe anularla primero.' });
    }

    await prisma.entryNote.delete({
      where: { id: parseInt(req.params.id) },
    });

    res.json({ message: 'Nota de ingreso eliminada correctamente' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al eliminar nota de ingreso: ' + error.message });
  }
});

app.post('/api/entry-notes/:id/approve', authenticateToken, async (req, res) => {
  try {
    const note = await prisma.entryNote.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { items: true },
    });

    if (!note) return res.status(404).json({ error: 'Nota de ingreso no encontrada' });
    if (note.status === 'APPROVED' || note.status === 'COMPLETED') {
      return res.status(400).json({ error: 'La nota ya está aprobada o completada.' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedNote = await (tx as any).entryNote.update({
        where: { id: note.id },
        data: { status: 'APPROVED' },
        include: {
          items: {
            include: {
              product: { include: { unit: true, package: true, subPackage: true } },
              unit: true,
            },
          },
          warehouse: true,
          supplier: true,
          zone: true,
          floor: true,
        },
      });

      for (const item of updatedNote.items) {
        let baseQuantity = item.quantity;
        const product = item.product;
        if (product) {
          if (item.unitId === product.subPackageId) {
            baseQuantity = item.quantity * (product.quantityPerSubPackage || 1);
          } else if (item.unitId === product.packageId) {
            baseQuantity = item.quantity * (product.quantityPerPackage || 1) * (product.quantityPerSubPackage || 1);
          }
        }

        const stockRecord = await (tx as any).stock.findFirst({
          where: {
            productId: item.productId,
            warehouseId: note.warehouseId,
            zoneId: updatedNote.zoneId || null,
            lotNumber: item.lotNumber || null,
          },
        });

        if (stockRecord) {
          await (tx as any).stock.update({
            where: { id: stockRecord.id },
            data: { quantity: { increment: baseQuantity } },
          });
        } else {
          await (tx as any).stock.create({
            data: {
              productId: item.productId,
              warehouseId: note.warehouseId,
              zoneId: updatedNote.zoneId || null,
              floorId: updatedNote.floorId || null,
              quantity: baseQuantity,
              lotNumber: item.lotNumber || null,
            },
          });
        }

        await (tx as any).stockMovement.create({
          data: {
            productId: item.productId,
            toWarehouseId: note.warehouseId,
            toZoneId: updatedNote.zoneId || null,
            quantity: baseQuantity,
            type: 'INPUT',
            lotNumber: item.lotNumber || null,
            observation: `Nota de Ingreso ${note.series || ''}-${note.number || ''} (${note.reasonCode})`,
            status: 'COMPLETED',
          },
        });

        await (tx as any).product.update({
          where: { id: item.productId },
          data: { stock: { increment: baseQuantity } },
        });
      }

      return updatedNote;
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al aprobar nota de ingreso: ' + error.message });
  }
});

app.post('/api/entry-notes/:id/annul', authenticateToken, async (req, res) => {
  try {
    const note = await prisma.entryNote.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        items: {
          include: {
            product: { include: { unit: true, package: true, subPackage: true } },
            unit: true,
          },
        },
      },
    });

    if (!note) return res.status(404).json({ error: 'Nota de ingreso no encontrada' });
    if (note.status === 'ANNULLED') {
      return res.status(400).json({ error: 'La nota ya está anulada.' });
    }
    if (note.status === 'DRAFT') {
      const updated = await prisma.entryNote.update({
        where: { id: note.id },
        data: { status: 'ANNULLED' },
        include: { items: { include: { product: true } }, warehouse: true, supplier: true, zone: true, floor: true },
      });
      return res.json(updated);
    }

    await prisma.$transaction(async (tx) => {
      for (const item of note.items) {
        let baseQuantity = item.quantity;
        const product = item.product;
        if (product) {
          if (item.unitId === product.subPackageId) {
            baseQuantity = item.quantity * (product.quantityPerSubPackage || 1);
          } else if (item.unitId === product.packageId) {
            baseQuantity = item.quantity * (product.quantityPerPackage || 1) * (product.quantityPerSubPackage || 1);
          }
        }

        const stockRecord = await (tx as any).stock.findFirst({
          where: {
            productId: item.productId,
            warehouseId: note.warehouseId,
            zoneId: note.zoneId || null,
            lotNumber: item.lotNumber || null,
          },
        });

        if (stockRecord) {
          await (tx as any).stock.update({
            where: { id: stockRecord.id },
            data: { quantity: { decrement: baseQuantity } },
          });
        }

        await (tx as any).stockMovement.create({
          data: {
            productId: item.productId,
            fromWarehouseId: note.warehouseId,
            fromZoneId: note.zoneId || null,
            quantity: baseQuantity,
            type: 'OUTPUT',
            lotNumber: item.lotNumber || null,
            observation: `ANULACIÓN Nota de Ingreso ${note.series || ''}-${note.number || ''}`,
            status: 'COMPLETED',
          },
        });

        await (tx as any).product.update({
          where: { id: item.productId },
          data: { stock: { decrement: baseQuantity } },
        });
      }

      await (tx as any).entryNote.update({
        where: { id: note.id },
        data: { status: 'ANNULLED' },
      });
    });

    const updated = await prisma.entryNote.findUnique({
      where: { id: note.id },
      include: { items: { include: { product: true } }, warehouse: true, supplier: true, zone: true, floor: true },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al anular nota de ingreso: ' + error.message });
  }
});

app.get('/api/entry-notes/reasons', authenticateToken, async (req, res) => {
  try {
    const reasons = await prisma.sunatTable.findMany({
      where: {
        tableName: 'motivo',
        code: { in: ['28', '02', '03', '05', '31', '29', '19', '26', '24', '25', '23', '18', '16', '21'] },
      },
      orderBy: { code: 'asc' },
    });
    res.json(reasons);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener motivos: ' + error.message });
  }
});

// --- SERVER START ---
// Error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error('GLOBAL ERROR:', err);
  res.status(500).json({ error: 'Error interno del servidor: ' + err.message });
});


// Trigger server reload after generating Prisma Client
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on network at http://0.0.0.0:${port}`);
});
