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
const JWT_SECRET = process.env.JWT_SECRET || (
  process.env.NODE_ENV === 'production'
    ? (() => { throw new Error('JWT_SECRET debe estar configurado en producción.'); })()
    : 'carmelita-dev-only-secret'
);

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
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origen no permitido por CORS'));
  }
}));
app.use(express.json());

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // Límite de 1000 peticiones por ventana por IP para tráfico público
  message: { error: 'Demasiadas peticiones desde esta IP, por favor intenta más tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return false;
    try {
      jwt.verify(token, JWT_SECRET);
      return true;
    } catch {
      return false;
    }
  }
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

const parseRolePermissions = (raw: any): string[] => {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw !== 'string' || !raw.trim()) return [];
  let current: any = raw;
  for (let i = 0; i < 3 && typeof current === 'string'; i++) {
    try {
      current = JSON.parse(current);
    } catch {
      break;
    }
  }
  if (Array.isArray(current)) return current.map(String);
  if (typeof current === 'string' && current.trim()) {
    return current.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
};

// Middleware RBAC: verifica que el rol del usuario tenga alguno de los permisos requeridos (o 'ALL')
const requirePermission = (...requiredPermissions: string[]) => {
  return async (req: any, res: any, next: any) => {
    try {
      const userId = req.user?.userId || req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Usuario no autenticado' });

      const user = await prisma.user.findUnique({
        where: { id: Number(userId) },
        include: { role: true }
      });
      if (!user || !user.isActive) {
        return res.status(403).json({ error: 'Usuario inactivo o no encontrado' });
      }

      const permissions = parseRolePermissions(user.role?.permissions);

      if (permissions.includes('ALL') || requiredPermissions.some(p => permissions.includes(p))) {
        return next();
      }

      return res.status(403).json({ error: 'No tienes permisos suficientes para realizar esta acción.' });
    } catch (err) {
      return res.status(500).json({ error: 'Error al verificar permisos' });
    }
  };
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
    const { vehicleId, orderIds, dispatchId, driverId, catalogDriverId, helperIds } = req.body;
    const cleanHelperIds: number[] | null = Array.isArray(helperIds)
      ? Array.from(new Set(helperIds.map((h: any) => Number(h)).filter((n: number) => Number.isInteger(n) && n > 0)))
      : null;

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

    const resolveDriverAssignment = async (tx: any): Promise<{ driverId: number | null; driverName: string | null }> => {
      if (catalogDriverId) {
        const catalogDriver = await tx.driver.findUnique({ where: { id: Number(catalogDriverId) } });
        if (!catalogDriver) return { driverId: null, driverName: null };
        let linkedUserId: number | null = null;
        if (catalogDriver.email) {
          const matchedUser = await tx.user.findUnique({ where: { email: catalogDriver.email } });
          linkedUserId = matchedUser?.id ?? null;
        }
        return { driverId: linkedUserId, driverName: catalogDriver.name };
      }
      if (driverId) {
        const userDriver = await tx.user.findUnique({ where: { id: Number(driverId) } });
        return {
          driverId: userDriver ? Number(driverId) : null,
          driverName: userDriver?.name || null
        };
      }
      return { driverId: null, driverName: null };
    };

    if (dispatchId) {
      // Add orders to existing dispatch in a transaction
      const updated = await prisma.$transaction(async (tx) => {
        const updateData: any = {
          orders: {
            connect: orderIds.map((id: number) => ({ id }))
          }
        };

        // If driverId or catalogDriverId provided, update driver on existing dispatch
        if (driverId || catalogDriverId) {
          const resolved = await resolveDriverAssignment(tx);
          updateData.driverId = resolved.driverId;
          updateData.driverName = resolved.driverName;
        }

        await tx.dispatch.update({
          where: { id: Number(dispatchId) },
          data: updateData
        });

        if (cleanHelperIds !== null) {
          await tx.dispatchHelper.deleteMany({ where: { dispatchId: Number(dispatchId) } });
          if (cleanHelperIds.length > 0) {
            await tx.dispatchHelper.createMany({
              data: cleanHelperIds.map((operatorId) => ({ dispatchId: Number(dispatchId), operatorId }))
            });
          }
        }

        return await tx.dispatch.findUnique({
          where: { id: Number(dispatchId) },
          include: { helpers: { include: { operator: { select: { id: true, name: true } } } } }
        });
      });
      
      return res.json(updated);
    }

    const dispatch = await prisma.$transaction(async (tx) => {
      const resolved = await resolveDriverAssignment(tx);

      const newDispatch = await tx.dispatch.create({
        data: {
          vehicleId: Number(vehicleId),
          status: 'PENDING',
          driverId: resolved.driverId,
          driverName: resolved.driverName,
          orders: {
            connect: orderIds.map((id: number) => ({ id }))
          },
          ...(cleanHelperIds && cleanHelperIds.length > 0
            ? {
                helpers: {
                  create: cleanHelperIds.map((operatorId) => ({ operatorId }))
                }
              }
            : {})
        },
        include: { helpers: { include: { operator: { select: { id: true, name: true } } } } }
      });

      return newDispatch;
    });

    res.status(201).json(dispatch);
  } catch (error: any) {
    console.error('Error creating dispatch:', error);
    res.status(500).json({ error: 'Error al crear el despacho' });
  }
});

app.put('/api/dispatches/:id/helpers', authenticateToken, async (req, res) => {
  try {
    const dispatchId = parseInt(req.params.id, 10);
    const { helperIds } = req.body;
    const cleanHelperIds: number[] = Array.isArray(helperIds)
      ? Array.from(new Set(helperIds.map((h: any) => Number(h)).filter((n: number) => Number.isInteger(n) && n > 0)))
      : [];

    const existing = await prisma.dispatch.findUnique({ where: { id: dispatchId } });
    if (!existing) {
      return res.status(404).json({ error: 'Despacho no encontrado' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.dispatchHelper.deleteMany({ where: { dispatchId } });
      if (cleanHelperIds.length > 0) {
        await tx.dispatchHelper.createMany({
          data: cleanHelperIds.map((operatorId) => ({ dispatchId, operatorId }))
        });
      }
      return tx.dispatch.findUnique({
        where: { id: dispatchId },
        include: { helpers: { include: { operator: { select: { id: true, name: true } } } } }
      });
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating dispatch helpers:', error);
    res.status(500).json({ error: 'Error al actualizar ayudantes del despacho' });
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
        helpers: {
          include: {
            operator: { select: { id: true, name: true } }
          }
        },
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

// --- API PRODUCT LINES ---
app.get('/api/lines', async (req, res) => {
  try {
    const lines = await (prisma as any).productLine.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' }
    });
    res.json(lines);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener líneas' });
  }
});

app.post('/api/lines', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'El nombre de la línea es obligatorio.' });
    }
    const line = await (prisma as any).productLine.create({
      data: { name: String(name).trim().toUpperCase() }
    });
    res.json(line);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe una línea con ese nombre.' });
    }
    res.status(500).json({ error: 'Error al crear línea' });
  }
});

app.put('/api/lines/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'El nombre de la línea es obligatorio.' });
    }
    const line = await (prisma as any).productLine.update({
      where: { id: parseInt(id) },
      data: { name: String(name).trim().toUpperCase() }
    });
    res.json(line);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe una línea con ese nombre.' });
    }
    res.status(500).json({ error: 'Error al actualizar línea' });
  }
});

app.delete('/api/lines/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const productsCount = await (prisma as any).product.count({ where: { lineId: parseInt(id) } });
    if (productsCount > 0) {
      return res.status(400).json({ error: 'No se puede eliminar una línea con productos asociados.' });
    }
    await (prisma as any).productLine.delete({ where: { id: parseInt(id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar línea' });
  }
});

// --- API PRODUCT COLORS ---
app.get('/api/colors', async (req, res) => {
  try {
    const colors = await (prisma as any).productColor.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' }
    });
    res.json(colors);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener colores' });
  }
});

app.post('/api/colors', authenticateToken, async (req, res) => {
  try {
    const { name, hexCode } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'El nombre del color es obligatorio.' });
    }
    const color = await (prisma as any).productColor.create({
      data: {
        name: String(name).trim().toUpperCase(),
        hexCode: hexCode ? String(hexCode).trim() : null
      }
    });
    res.json(color);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe un color con ese nombre.' });
    }
    res.status(500).json({ error: 'Error al crear color' });
  }
});

app.put('/api/colors/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, hexCode } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'El nombre del color es obligatorio.' });
    }
    const color = await (prisma as any).productColor.update({
      where: { id: parseInt(id) },
      data: {
        name: String(name).trim().toUpperCase(),
        hexCode: hexCode ? String(hexCode).trim() : null
      }
    });
    res.json(color);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe un color con ese nombre.' });
    }
    res.status(500).json({ error: 'Error al actualizar color' });
  }
});

app.delete('/api/colors/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const productsCount = await (prisma as any).product.count({ where: { colorId: parseInt(id) } });
    if (productsCount > 0) {
      return res.status(400).json({ error: 'No se puede eliminar un color con productos asociados.' });
    }
    await (prisma as any).productColor.delete({ where: { id: parseInt(id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar color' });
  }
});

// --- API PAYMENT METHODS ---
const DEFAULT_PAYMENT_METHODS = ['EFECTIVO', 'TRANSFERENCIA', 'TARJETA / POS', 'YAPE / PLIN'];

app.get('/api/payment-methods', async (req, res) => {
  try {
    const count = await prisma.paymentMethod.count();
    if (count === 0) {
      await prisma.paymentMethod.createMany({
        data: DEFAULT_PAYMENT_METHODS.map((name) => ({ name, isActive: true })),
        skipDuplicates: true,
      });
    }
    const activeOnly = req.query.activeOnly === 'true';
    const methods = await prisma.paymentMethod.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { id: 'asc' },
    });
    res.json(methods);
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({ error: 'Error al obtener métodos de pago' });
  }
});

app.post('/api/payment-methods', authenticateToken, async (req, res) => {
  try {
    const { name, code, isActive } = req.body;
    const normalizedName = String(name || '').trim().toUpperCase();
    if (!normalizedName) {
      return res.status(400).json({ error: 'El nombre del método de pago es obligatorio' });
    }
    const method = await prisma.paymentMethod.create({
      data: {
        name: normalizedName,
        code: code ? String(code).trim().toUpperCase() : null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });
    res.json(method);
  } catch (error: any) {
    console.error('Error creating payment method:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe un método de pago con ese nombre' });
    }
    res.status(500).json({ error: 'Error al crear método de pago' });
  }
});

app.put('/api/payment-methods/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, code, isActive } = req.body;
    const data: any = {};
    if (name !== undefined) {
      const normalizedName = String(name).trim().toUpperCase();
      if (!normalizedName) return res.status(400).json({ error: 'El nombre es obligatorio' });
      data.name = normalizedName;
    }
    if (code !== undefined) data.code = code ? String(code).trim().toUpperCase() : null;
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    const updated = await prisma.paymentMethod.update({
      where: { id },
      data,
    });
    res.json(updated);
  } catch (error: any) {
    console.error('Error updating payment method:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe otro método de pago con ese nombre' });
    }
    res.status(500).json({ error: 'Error al actualizar método de pago' });
  }
});

app.delete('/api/payment-methods/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.paymentMethod.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting payment method:', error);
    res.status(500).json({ error: 'Error al eliminar método de pago' });
  }
});

// --- API BANK ACCOUNTS ---
const DEFAULT_BANK_ACCOUNTS = [
  { bankName: 'BCP', accountNumber: '191-1482686-0-24', cci: '002-191-001482686024-50', currency: 'PEN', holder: 'IMPORTACIONES CARMELITA DEL NORTE', isActive: true },
  { bankName: 'BBVA', accountNumber: '0011-0349-01-00043082-85', cci: '011-349-000100043082-85', currency: 'PEN', holder: 'IMPORTACIONES CARMELITA DEL NORTE', isActive: true },
];

app.get('/api/bank-accounts', async (req, res) => {
  try {
    const count = await prisma.bankAccount.count();
    if (count === 0) {
      await prisma.bankAccount.createMany({ data: DEFAULT_BANK_ACCOUNTS });
    }
    const activeOnly = req.query.activeOnly === 'true';
    const accounts = await prisma.bankAccount.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: [{ bankName: 'asc' }, { id: 'asc' }],
    });
    res.json(accounts);
  } catch (error) {
    console.error('Error fetching bank accounts:', error);
    res.status(500).json({ error: 'Error al obtener cuentas bancarias' });
  }
});

app.post('/api/bank-accounts', authenticateToken, async (req, res) => {
  try {
    const { bankName, accountNumber, cci, currency, holder, isActive } = req.body;
    const normalizedBank = String(bankName || '').trim().toUpperCase();
    const normalizedAccount = String(accountNumber || '').trim();
    if (!normalizedBank || !normalizedAccount) {
      return res.status(400).json({ error: 'El banco y número de cuenta son obligatorios' });
    }
    const created = await prisma.bankAccount.create({
      data: {
        bankName: normalizedBank,
        accountNumber: normalizedAccount,
        cci: cci ? String(cci).trim() : null,
        currency: currency ? String(currency).trim().toUpperCase() : 'PEN',
        holder: holder ? String(holder).trim().toUpperCase() : null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });
    res.json(created);
  } catch (error) {
    console.error('Error creating bank account:', error);
    res.status(500).json({ error: 'Error al crear cuenta bancaria' });
  }
});

app.put('/api/bank-accounts/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { bankName, accountNumber, cci, currency, holder, isActive } = req.body;
    const data: any = {};
    if (bankName !== undefined) {
      const normalizedBank = String(bankName).trim().toUpperCase();
      if (!normalizedBank) return res.status(400).json({ error: 'El banco es obligatorio' });
      data.bankName = normalizedBank;
    }
    if (accountNumber !== undefined) {
      const normalizedAccount = String(accountNumber).trim();
      if (!normalizedAccount) return res.status(400).json({ error: 'El número de cuenta es obligatorio' });
      data.accountNumber = normalizedAccount;
    }
    if (cci !== undefined) data.cci = cci ? String(cci).trim() : null;
    if (currency !== undefined) data.currency = currency ? String(currency).trim().toUpperCase() : 'PEN';
    if (holder !== undefined) data.holder = holder ? String(holder).trim().toUpperCase() : null;
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    const updated = await prisma.bankAccount.update({
      where: { id },
      data,
    });
    res.json(updated);
  } catch (error) {
    console.error('Error updating bank account:', error);
    res.status(500).json({ error: 'Error al actualizar cuenta bancaria' });
  }
});

app.delete('/api/bank-accounts/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.bankAccount.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting bank account:', error);
    res.status(500).json({ error: 'Error al eliminar cuenta bancaria' });
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
    const { name, symbol, sunatCode, equivalence } = req.body;
    const parsedEquivalence = equivalence !== undefined && equivalence !== '' && !isNaN(parseFloat(equivalence))
      ? parseFloat(equivalence)
      : 1;
    const unit = await (prisma as any).unit.create({
      data: {
        name: String(name).trim().toUpperCase(),
        symbol: String(symbol).trim().toUpperCase(),
        sunatCode: sunatCode ? String(sunatCode).trim().toUpperCase() : 'NIU',
        equivalence: parsedEquivalence
      }
    });
    res.json(unit);
  } catch (error: any) {
    console.error('Error creating unit:', error);
    res.status(500).json({ error: 'Error al crear unidad: ' + (error.message || 'Error interno') });
  }
});

app.put('/api/units/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, symbol, sunatCode, equivalence } = req.body;
    const parsedEquivalence = equivalence !== undefined && equivalence !== '' && !isNaN(parseFloat(equivalence))
      ? parseFloat(equivalence)
      : 1;
    const unit = await (prisma as any).unit.update({
      where: { id: parseInt(id) },
      data: {
        name: String(name).trim().toUpperCase(),
        symbol: String(symbol).trim().toUpperCase(),
        sunatCode: sunatCode ? String(sunatCode).trim().toUpperCase() : 'NIU',
        equivalence: parsedEquivalence
      }
    });
    res.json(unit);
  } catch (error: any) {
    console.error('Error updating unit:', error);
    res.status(500).json({ error: 'Error al actualizar unidad: ' + (error.message || 'Error interno') });
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
app.get('/api/products/search', authenticateToken, async (req, res) => {
  try {
    const q = (req.query.q || req.query.search || '') as string;
    const term = q.trim();
    const where: any = {};
    if (term) {
      where.OR = [
        { name:        { contains: term } },
        { code:        { contains: term } },
        { description: { contains: term } },
        { brandCertificate: { contains: term } },
        { brand:       { name: { contains: term } } },
        { line:        { name: { contains: term } } },
        { color:       { name: { contains: term } } },
        { category:    { name: { contains: term } } },
      ];
    }
    const products = await (prisma as any).product.findMany({
      where,
      take: 50,
      include: { 
        category: true,
        brand: true,
        line: true,
        color: true,
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
    res.status(500).json({ error: 'Error al buscar productos' });
  }
});

app.get('/api/products', searchLimiter, async (req, res) => {
  try {
    const search = req.query.search || req.query.q;
    const { category, limit } = req.query;

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
        { brandCertificate: { contains: term } },
        { brand:       { name: { contains: term } } },
        { line:        { name: { contains: term } } },
        { color:       { name: { contains: term } } },
        { category:    { name: { contains: term } } },
      ];
    }

    const products = await (prisma as any).product.findMany({
      where,
      take: limit ? parseInt(limit as string) : undefined,
      include: { 
        category: true,
        brand: true,
        line: true,
        color: true,
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
      description, features, sanitaryRegister, certificate, brandCertificate,
      igv, costPrice, salePrice, minSalePrice, maxSalePrice,
      brandId, lineId, colorId, unitId, isActive,
      packageId, quantityPerPackage, subPackageId, quantityPerSubPackage,
      showInWeb, manageLots, useExpiryDate, isOnSale, discountPercent,
      profitMargin, existenceTypeCode, valuationMethodCode, igvAffectationCode, sunatProductCode
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
        brandCertificate: brandCertificate ? String(brandCertificate).trim().slice(0, 250) : null,
        igv: (igv && !isNaN(parseFloat(igv))) ? parseFloat(igv) : 18,
        costPrice: (costPrice && !isNaN(parseFloat(costPrice))) ? parseFloat(costPrice) : 0,
        salePrice: (salePrice && !isNaN(parseFloat(salePrice))) ? parseFloat(salePrice) : 0,
        minSalePrice: (minSalePrice && !isNaN(parseFloat(minSalePrice))) ? parseFloat(minSalePrice) : null,
        maxSalePrice: (maxSalePrice && !isNaN(parseFloat(maxSalePrice))) ? parseFloat(maxSalePrice) : null,
        brandId: (brandId && !isNaN(parseInt(brandId))) ? parseInt(brandId) : null,
        lineId: (lineId && !isNaN(parseInt(lineId))) ? parseInt(lineId) : null,
        colorId: (colorId && !isNaN(parseInt(colorId))) ? parseInt(colorId) : null,
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
        valuationMethodCode: valuationMethodCode || '1',
        igvAffectationCode: igvAffectationCode || '10',
        sunatProductCode: sunatProductCode ? String(sunatProductCode).trim() : null
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
      description, features, sanitaryRegister, certificate, brandCertificate,
      igv, costPrice, salePrice, minSalePrice, maxSalePrice,
      brandId, lineId, colorId, unitId, isActive,
      packageId, quantityPerPackage, subPackageId, quantityPerSubPackage,
      showInWeb, manageLots, useExpiryDate, isOnSale, discountPercent,
      profitMargin, existenceTypeCode, valuationMethodCode, igvAffectationCode, sunatProductCode
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
        brandCertificate: brandCertificate ? String(brandCertificate).trim().slice(0, 250) : null,
        igv: (igv && !isNaN(parseFloat(igv))) ? parseFloat(igv) : 18,
        costPrice: (costPrice && !isNaN(parseFloat(costPrice))) ? parseFloat(costPrice) : 0,
        salePrice: (salePrice && !isNaN(parseFloat(salePrice))) ? parseFloat(salePrice) : 0,
        minSalePrice: (minSalePrice && !isNaN(parseFloat(minSalePrice))) ? parseFloat(minSalePrice) : null,
        maxSalePrice: (maxSalePrice && !isNaN(parseFloat(maxSalePrice))) ? parseFloat(maxSalePrice) : null,
        brandId: (brandId && !isNaN(parseInt(brandId))) ? parseInt(brandId) : null,
        lineId: (lineId && !isNaN(parseInt(lineId))) ? parseInt(lineId) : null,
        colorId: (colorId && !isNaN(parseInt(colorId))) ? parseInt(colorId) : null,
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
        valuationMethodCode: valuationMethodCode || '1',
        igvAffectationCode: igvAffectationCode || '10',
        sunatProductCode: sunatProductCode ? String(sunatProductCode).trim() : null
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

app.post('/api/settings', authenticateToken, requirePermission('VIEW_SETTINGS'), async (req, res) => {
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
      include: { role: true, warehouse: true, seller: { select: { id: true, quotationSeries: true, orderSeries: true } } }
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
        sellerId: user.seller?.id ?? null,
        quotationSeries: user.seller?.quotationSeries ?? null,
        orderSeries: user.seller?.orderSeries ?? null,
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
      select: { id: true, email: true, name: true, series: true, warehouseId: true, warehouse: true, isActive: true, role: true, seller: { select: { id: true, quotationSeries: true, orderSeries: true } } }
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
      sellerId: user.seller?.id ?? null,
      quotationSeries: user.seller?.quotationSeries ?? null,
      orderSeries: user.seller?.orderSeries ?? null,
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
    const customers = await (prisma.customer as any).findMany({
      include: {
        associationsFrom: {
          include: {
            relatedCustomer: {
              select: { id: true, name: true, docType: true, docNumber: true, address: true, phone: true, email: true, personType: true }
            }
          }
        },
        associationsTo: {
          include: {
            customer: {
              select: { id: true, name: true, docType: true, docNumber: true, address: true, phone: true, email: true, personType: true }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    const mapped = customers.map((c: any) => {
      const seen = new Set<number>();
      const associatedCustomers: any[] = [];
      for (const rel of (c.associationsFrom || [])) {
        if (rel.relatedCustomer && !seen.has(rel.relatedCustomer.id)) {
          seen.add(rel.relatedCustomer.id);
          associatedCustomers.push({ ...rel.relatedCustomer, relationship: rel.relationship || null });
        }
      }
      for (const rel of (c.associationsTo || [])) {
        if (rel.customer && !seen.has(rel.customer.id)) {
          seen.add(rel.customer.id);
          associatedCustomers.push({ ...rel.customer, relationship: rel.relationship || null });
        }
      }
      const { associationsFrom, associationsTo, ...rest } = c;
      return { ...rest, associatedCustomers };
    });

    res.json(mapped);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});

app.post('/api/customers/:id/associations', authenticateToken, async (req, res) => {
  try {
    const customerId = parseInt(req.params.id);
    const { relatedCustomerId, relationship } = req.body;
    const relatedId = parseInt(relatedCustomerId);

    if (isNaN(customerId) || isNaN(relatedId)) {
      return res.status(400).json({ error: 'IDs de cliente inválidos.' });
    }
    if (customerId === relatedId) {
      return res.status(400).json({ error: 'No puedes asociar un cliente consigo mismo.' });
    }

    const existing = await (prisma as any).customerAssociation.findFirst({
      where: {
        OR: [
          { customerId, relatedCustomerId: relatedId },
          { customerId: relatedId, relatedCustomerId: customerId }
        ]
      }
    });
    if (existing) {
      return res.status(400).json({ error: 'Estos clientes ya se encuentran asociados.' });
    }

    const created = await (prisma as any).customerAssociation.create({
      data: {
        customerId,
        relatedCustomerId: relatedId,
        relationship: relationship ? String(relationship).trim().toUpperCase() : null
      },
      include: {
        relatedCustomer: {
          select: { id: true, name: true, docType: true, docNumber: true, address: true, phone: true, email: true, personType: true }
        }
      }
    });

    res.json({ ...created.relatedCustomer, relationship: created.relationship });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al asociar cliente' });
  }
});

app.delete('/api/customers/:id/associations/:relatedId', authenticateToken, async (req, res) => {
  try {
    const customerId = parseInt(req.params.id);
    const relatedId = parseInt(req.params.relatedId);

    await (prisma as any).customerAssociation.deleteMany({
      where: {
        OR: [
          { customerId, relatedCustomerId: relatedId },
          { customerId: relatedId, relatedCustomerId: customerId }
        ]
      }
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al eliminar asociación' });
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
        line: true,
        color: true,
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
        items: { include: { product: { include: { unit: true, package: true, subPackage: true } } } },
        customer: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(quotations);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener cotizaciones' });
  }
});

app.post('/api/quotations', orderLimiter, async (req, res) => {
  try {
    const { 
      customerId, customerName, customerPhone, customerEmail, customerDocType, 
      customerDocNumber, customerAddress, docType, docSeries, docNumber,
      internalCode, igvPercent, exchangeRate, dueDate, sellerId, sellerName, includeIgv, 
      priceIncludesIgv, operationType, paymentCondition, currency, items, 
      totalAmount, globalDiscount, flete, billingStatus, purchaseOrder, 
      requirementNumber, pickupPlace, observation, notes, agencyId, branchId, origin
    } = req.body;

    // Seguridad: si no viene token válido, solo se permite crear cotizaciones públicas de e-commerce ('WEB')
    const authHeader = req.headers['authorization'];
    const bearerToken = authHeader && authHeader.split(' ')[1];
    let effectiveOrigin = origin;
    if (bearerToken) {
      let decoded: any;
      try {
        decoded = jwt.verify(bearerToken, JWT_SECRET);
      } catch {
        return res.status(403).json({ error: 'Token inválido o expirado' });
      }
      if (origin !== 'WEB') {
        const userId = decoded?.id || decoded?.userId;
        const dbUser = userId ? await (prisma as any).user.findUnique({ where: { id: Number(userId) }, include: { role: true } }) : null;
        if (!dbUser || dbUser.isActive === false) {
          return res.status(401).json({ error: 'Usuario no válido o inactivo.' });
        }
        const perms = parseRolePermissions(dbUser.role?.permissions);
        if (!perms.includes('ALL') && !perms.includes('READ_QUOTATIONS') && !perms.includes('VIEW_QUOTATIONS') && !perms.includes('WRITE_QUOTATIONS')) {
          return res.status(403).json({ error: 'No tiene permisos para crear cotizaciones internas.' });
        }
      }
    } else {
      if (origin && origin !== 'WEB') {
        return res.status(401).json({ error: 'Autenticación requerida para crear cotizaciones internas.' });
      }
      effectiveOrigin = 'WEB';
    }

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
      if (effectiveOrigin === 'WEB') {
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
      } else if (docSeries) {
        // Logica habitual para sistema interno (con fallback por serie si pickupPlace no coincide o viene vacio)
        let targetWarehouseId: number | null = null;
        if (pickupPlace) {
          const warehouse = await (tx as any).warehouse.findFirst({
            where: {
              OR: [
                { name: pickupPlace },
                { id: isNaN(parseInt(pickupPlace)) ? -1 : parseInt(pickupPlace) }
              ]
            }
          });
          if (warehouse) targetWarehouseId = warehouse.id;
        }

        const targetDocType = docType || 'COT';
        let seriesRec = targetWarehouseId
          ? await (tx as any).documentSeries.findFirst({
              where: {
                warehouseId: targetWarehouseId,
                documentType: targetDocType,
                series: docSeries
              }
            })
          : null;

        if (!seriesRec) {
          seriesRec = await (tx as any).documentSeries.findFirst({
            where: {
              documentType: targetDocType,
              series: docSeries
            }
          });
        }

        if (seriesRec) {
          const existingQuotes = await tx.quotation.findMany({
            where: { docSeries, docType: targetDocType },
            select: { docNumber: true }
          });
          const maxExistingNum = existingQuotes.reduce((max, q) => {
            const n = parseInt(q.docNumber || '0', 10);
            return !isNaN(n) && n > max ? n : max;
          }, 0);

          const nextNum = Math.max(seriesRec.currentNumber, maxExistingNum) + 1;
          finalDocNumber = nextNum.toString().padStart(8, '0');
          await (tx as any).documentSeries.update({
            where: { id: seriesRec.id },
            data: { currentNumber: nextNum }
          });
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

const canOverrideQuotationEdit = (user: any): boolean => {
  const perms = parseRolePermissions(user?.role?.permissions);
  const roleName = String(user?.role?.name || '').toUpperCase();
  return perms.includes('ALL') || roleName.includes('ADMIN') || roleName.includes('SUPERVISOR');
};

const authorizeQuotationMutation = async (
  reqUser: any,
  quotation: any,
  editToken?: string,
  actionLabel = 'modificar'
): Promise<{ authorized: boolean; error?: string }> => {
  if (canOverrideQuotationEdit(reqUser)) return { authorized: true };

  const isOwnerBySellerId = Boolean(reqUser?.seller?.id && quotation.sellerId === reqUser.seller.id);
  const isOwnerByName = Boolean(
    !reqUser?.seller?.id &&
    reqUser?.name &&
    quotation.sellerName &&
    quotation.sellerName.trim().toUpperCase() === reqUser.name.trim().toUpperCase()
  );
  if (isOwnerBySellerId || isOwnerByName) return { authorized: true };

  const cleanCode = String(editToken || '').trim().toUpperCase();
  if (cleanCode) {
    const tokenRecord = await prisma.quotationEditToken.findUnique({ where: { code: cleanCode } });
    if (!tokenRecord || tokenRecord.usedAt || new Date(tokenRecord.expiresAt) <= new Date() || (tokenRecord.quotationId && tokenRecord.quotationId !== quotation.id)) {
      return { authorized: false, error: 'El token de autorización es inválido, expiró o ya fue utilizado.' };
    }
    await prisma.quotationEditToken.update({
      where: { id: tokenRecord.id },
      data: {
        usedAt: new Date(),
        usedByUserId: reqUser?.id ?? null,
        usedByName: reqUser?.name || reqUser?.email || null,
        quotationId: quotation.id
      }
    });
    return { authorized: true };
  }

  // Verificar si tiene una solicitud remota APROBADA y vigente
  if (reqUser?.id) {
    const approvedReq = await prisma.quotationAuthRequest.findFirst({
      where: {
        quotationId: quotation.id,
        requestedByUserId: reqUser.id,
        status: 'APPROVED',
        expiresAt: { gt: new Date() }
      },
      orderBy: { reviewedAt: 'desc' }
    });
    if (approvedReq) {
      await prisma.quotationAuthRequest.update({
        where: { id: approvedReq.id },
        data: { status: 'CONSUMED', consumedAt: new Date() }
      });
      return { authorized: true };
    }
  }

  return {
    authorized: false,
    error: `Solo puede ${actionLabel} sus propias cotizaciones. Solicite autorización o ingrese un token de Supervisor/Administrador.`
  };
};

app.get('/api/quotations/auth-requests', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user?.userId || (req as any).user?.id;
    const reqUser = await prisma.user.findUnique({ where: { id: Number(userId) }, include: { role: true } });
    if (!reqUser) return res.status(401).json({ error: 'Usuario no encontrado' });

    const isSupervisor = canOverrideQuotationEdit(reqUser);
    const where: any = isSupervisor ? {} : { requestedByUserId: reqUser.id };

    const requests = await prisma.quotationAuthRequest.findMany({
      where,
      include: {
        quotation: {
          select: {
            id: true,
            docType: true,
            docSeries: true,
            docNumber: true,
            customerName: true,
            sellerName: true,
            totalAmount: true,
            status: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 30
    });

    const pendingCount = isSupervisor
      ? requests.filter((r: any) => r.status === 'PENDING').length
      : requests.filter((r: any) => r.status === 'APPROVED' && r.expiresAt && new Date(r.expiresAt) > new Date()).length;

    res.json({ requests, pendingCount, isSupervisor });
  } catch (error) {
    console.error('Error fetching quotation auth requests:', error);
    res.status(500).json({ error: 'Error al obtener solicitudes de autorización' });
  }
});

app.post('/api/quotations/:id/auth-request', authenticateToken, async (req, res) => {
  try {
    const quotationId = parseInt(req.params.id, 10);
    const action = String(req.body?.action || 'EDIT').toUpperCase() === 'CONVERT' ? 'CONVERT' : 'EDIT';
    const reason = req.body?.reason ? String(req.body.reason).trim() : null;

    const userId = (req as any).user?.userId || (req as any).user?.id;
    const [reqUser, quotation] = await Promise.all([
      prisma.user.findUnique({ where: { id: Number(userId) } }),
      prisma.quotation.findUnique({ where: { id: quotationId } })
    ]);
    if (!reqUser) return res.status(401).json({ error: 'Usuario no encontrado' });
    if (!quotation) return res.status(404).json({ error: 'Cotización no encontrada' });

    // Si ya tiene una solicitud pendiente o aprobada vigente para esta cotización, reutilizarla
    const existing = await prisma.quotationAuthRequest.findFirst({
      where: {
        quotationId,
        requestedByUserId: reqUser.id,
        OR: [
          { status: 'PENDING' },
          { status: 'APPROVED', expiresAt: { gt: new Date() } }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });
    if (existing) {
      return res.json(existing);
    }

    const created = await prisma.quotationAuthRequest.create({
      data: {
        quotationId,
        action,
        requestedByUserId: reqUser.id,
        requestedByName: reqUser.name || reqUser.email,
        reason,
        status: 'PENDING'
      }
    });
    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating quotation auth request:', error);
    res.status(500).json({ error: 'Error al enviar solicitud de autorización' });
  }
});

app.put('/api/quotations/auth-requests/:reqId/review', authenticateToken, async (req, res) => {
  try {
    const reqId = parseInt(req.params.reqId, 10);
    const decision = String(req.body?.decision || '').toUpperCase();
    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      return res.status(400).json({ error: 'Decisión inválida (use APPROVED o REJECTED).' });
    }

    const userId = (req as any).user?.userId || (req as any).user?.id;
    const reqUser = await prisma.user.findUnique({ where: { id: Number(userId) }, include: { role: true } });
    if (!reqUser || !canOverrideQuotationEdit(reqUser)) {
      return res.status(403).json({ error: 'Solo supervisores o administradores pueden aprobar solicitudes.' });
    }

    const existing = await prisma.quotationAuthRequest.findUnique({ where: { id: reqId } });
    if (!existing) return res.status(404).json({ error: 'Solicitud no encontrada' });

    const updated = await prisma.quotationAuthRequest.update({
      where: { id: reqId },
      data: {
        status: decision,
        reviewedByUserId: reqUser.id,
        reviewedByName: reqUser.name || reqUser.email,
        reviewedAt: new Date(),
        expiresAt: decision === 'APPROVED' ? new Date(Date.now() + 15 * 60 * 1000) : null
      }
    });
    res.json(updated);
  } catch (error) {
    console.error('Error reviewing quotation auth request:', error);
    res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
});

app.get('/api/quotations/edit-tokens', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user?.userId || (req as any).user?.id;
    const reqUser = await prisma.user.findUnique({ where: { id: Number(userId) }, include: { role: true } });
    if (!reqUser || !canOverrideQuotationEdit(reqUser)) {
      return res.status(403).json({ error: 'Solo supervisores o administradores pueden ver tokens de autorización.' });
    }
    const tokens = await prisma.quotationEditToken.findMany({
      where: {
        usedAt: null,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    res.json(tokens);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener tokens de autorización' });
  }
});

app.post('/api/quotations/edit-tokens', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user?.userId || (req as any).user?.id;
    const reqUser = await prisma.user.findUnique({ where: { id: Number(userId) }, include: { role: true } });
    if (!reqUser || !canOverrideQuotationEdit(reqUser)) {
      return res.status(403).json({ error: 'Solo supervisores o administradores pueden generar tokens de autorización.' });
    }
    const { quotationId, ttlMinutes } = req.body || {};
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    const minutes = Math.min(120, Math.max(5, Number(ttlMinutes) || 15));
    const expiresAt = new Date(Date.now() + minutes * 60 * 1000);

    const tokenRecord = await prisma.quotationEditToken.create({
      data: {
        code,
        createdByUserId: reqUser.id,
        createdByName: reqUser.name || reqUser.email,
        quotationId: quotationId ? Number(quotationId) : null,
        expiresAt
      }
    });
    res.status(201).json(tokenRecord);
  } catch (error) {
    console.error('Error creating quotation edit token:', error);
    res.status(500).json({ error: 'Error al generar token de autorización' });
  }
});

app.post('/api/quotations/:id/verify-edit-token', authenticateToken, async (req, res) => {
  try {
    const quotationId = parseInt(req.params.id, 10);
    const cleanCode = String(req.body?.code || '').trim().toUpperCase();
    if (!cleanCode) {
      return res.status(400).json({ error: 'Ingrese el token de autorización.' });
    }
    const tokenRecord = await prisma.quotationEditToken.findUnique({ where: { code: cleanCode } });
    if (!tokenRecord) {
      return res.status(400).json({ error: 'Token de autorización inválido.' });
    }
    if (tokenRecord.usedAt) {
      return res.status(400).json({ error: 'Este token ya fue utilizado.' });
    }
    if (new Date(tokenRecord.expiresAt) <= new Date()) {
      return res.status(400).json({ error: 'Este token ha expirado.' });
    }
    if (tokenRecord.quotationId && tokenRecord.quotationId !== quotationId) {
      return res.status(400).json({ error: 'Este token no corresponde a esta cotización.' });
    }
    res.json({ valid: true, code: tokenRecord.code, expiresAt: tokenRecord.expiresAt, createdByName: tokenRecord.createdByName });
  } catch (error) {
    res.status(500).json({ error: 'Error al validar token de autorización' });
  }
});

app.put('/api/quotations/:id', authenticateToken, requirePermission('VIEW_QUOTATIONS', 'WRITE_QUOTATIONS'), async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      customerId, customerName, customerPhone, customerEmail, customerDocType, 
      customerDocNumber, customerAddress, docType, docSeries, docNumber,
      internalCode, igvPercent, exchangeRate, dueDate, sellerId, sellerName, includeIgv, 
      priceIncludesIgv, operationType, paymentCondition, currency, items, 
      totalAmount, globalDiscount, flete, billingStatus, purchaseOrder, 
      requirementNumber, pickupPlace, observation, notes, agencyId, branchId,
      editToken
    } = req.body;

    const reqUserId = (req as any).user?.userId || (req as any).user?.id;
    const [reqUser, existingQuotation] = await Promise.all([
      prisma.user.findUnique({ where: { id: Number(reqUserId) }, include: { role: true, seller: true } }),
      prisma.quotation.findUnique({ where: { id: parseInt(id) } })
    ]);
    if (!existingQuotation) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    const authCheck = await authorizeQuotationMutation(reqUser, existingQuotation, editToken, 'editar');
    if (!authCheck.authorized) {
      return res.status(403).json({ error: authCheck.error });
    }

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

app.delete('/api/quotations/:id', authenticateToken, requirePermission('VIEW_QUOTATIONS', 'DELETE_QUOTATIONS'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.quotation.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Cotización no encontrada' });
    if (existing.status === 'CONVERTED') {
      return res.status(400).json({ error: 'No se puede anular una cotización que ya pasó a pedido.' });
    }
    await prisma.quotation.update({ where: { id }, data: { status: 'ANNULLED' } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al anular cotización' });
  }
});

app.put('/api/quotations/:id/reset', authenticateToken, requirePermission('VIEW_QUOTATIONS', 'WRITE_QUOTATIONS'), async (req, res) => {
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

    if (purchase && type === '09') {
      const existingInvoice = await (prisma as any).purchase.findFirst({
        where: { referenceId: purchase.id },
        select: { id: true, docSeries: true, docNumber: true }
      });
      if (existingInvoice) {
        return res.status(400).json({
          error: `La guía ${purchase.docSeries}-${purchase.docNumber} ya fue asociada a la factura ${existingInvoice.docSeries}-${existingInvoice.docNumber}.`
        });
      }
    }

    res.json(purchase);
  } catch (error) {
    console.error('Error searching purchase:', error);
    res.status(500).json({ error: 'Error al buscar documento' });
  }
});

// Helper para obtener el nombre del usuario autenticado para auditoría
async function getAuditUserName(req: any): Promise<string | null> {
  const userId = req?.user?.userId;
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
    select: { name: true, email: true }
  });
  return user?.name || user?.email || null;
}

app.post('/api/purchases', authenticateToken, requirePermission('VIEW_PURCHASES', 'WRITE_PURCHASES'), async (req, res) => {
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

    const auditUser = await getAuditUserName(req);

    const purchase = await prisma.$transaction(async (tx) => {
      // 0. Validar documento duplicado (mismo proveedor + tipo + serie + número)
      if (docSeries && docNumber) {
        const duplicateDoc = await (tx as any).purchase.findFirst({
          where: {
            supplierId: parseInt(supplierId),
            docType,
            docSeries: String(docSeries).trim(),
            docNumber: String(docNumber).trim()
          }
        });
        if (duplicateDoc) {
          throw new Error(`Ya existe un documento ${docSeries}-${docNumber} registrado para este proveedor.`);
        }
      }

      // 0.1 Validaciones de integridad cuando se referencia una Guía previa
      if (referenceId) {
        const refIdNum = parseInt(referenceId);
        const guide = await (tx as any).purchase.findUnique({
          where: { id: refIdNum },
          include: { items: true }
        });
        if (!guide) {
          throw new Error('La guía de referencia especificada no existe.');
        }

        const existingInvoice = await (tx as any).purchase.findFirst({
          where: { referenceId: refIdNum }
        });
        if (existingInvoice) {
          throw new Error(`La guía ${guide.docSeries}-${guide.docNumber} ya fue asociada a la factura ${existingInvoice.docSeries}-${existingInvoice.docNumber}.`);
        }

        if (guide.supplierId !== parseInt(supplierId)) {
          throw new Error('El proveedor de la factura debe coincidir con el proveedor de la guía referenciada.');
        }

        const guideQtyByProduct = new Map<number, number>();
        for (const gi of guide.items) {
          guideQtyByProduct.set(gi.productId, (guideQtyByProduct.get(gi.productId) || 0) + Number(gi.quantity));
        }
        const invoiceQtyByProduct = new Map<number, number>();
        for (const ii of items) {
          const pId = parseInt(ii.productId);
          invoiceQtyByProduct.set(pId, (invoiceQtyByProduct.get(pId) || 0) + parseInt(ii.quantity));
        }

        if (guideQtyByProduct.size !== invoiceQtyByProduct.size) {
          throw new Error('Los productos de la factura deben coincidir exactamente con los de la guía referenciada.');
        }
        for (const [pId, qty] of guideQtyByProduct.entries()) {
          if (invoiceQtyByProduct.get(pId) !== qty) {
            throw new Error(`La cantidad del producto ID ${pId} no coincide con la guía referenciada (Guía: ${qty}, Factura: ${invoiceQtyByProduct.get(pId) || 0}).`);
          }
        }
      }

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
          createdBy: auditUser,
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
              expiryDate: (item.expiryDate || item.entranceDate) ? new Date(item.expiryDate || item.entranceDate) : null,
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
        const parsedExpiry = (item.expiryDate || item.entranceDate) ? new Date(item.expiryDate || item.entranceDate) : null;
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
                ...(parsedExpiry && { expiryDate: parsedExpiry })
              }
            } as any);
          } else {
            await (tx as any).stock.create({
              data: {
                productId: item.productId,
                warehouseId: parseInt(warehouseId),
                quantity: parseInt(item.quantity),
                lotNumber: item.lotNumber || null,
                expiryDate: parsedExpiry
              }
            } as any);
          }

          // Record movement
          await (tx as any).stockMovement.create({
            data: {
              productId: item.productId,
              toWarehouseId: parseInt(warehouseId),
              quantity: parseFloat(item.quantity) || 0,
              unitCost: Number(item.unitCost || 0),
              totalCost: (parseFloat(item.quantity) || 0) * Number(item.unitCost || 0),
              movementDate: newPurchase.issueDate ? new Date(newPurchase.issueDate) : new Date(),
              sunatOperationCode: docType === '50' ? '18' : '02',
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

app.put('/api/purchases/:id', authenticateToken, requirePermission('VIEW_PURCHASES', 'WRITE_PURCHASES'), async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      supplierId, supplierName, docType, docSeries, docNumber, date, currency, 
      exchangeRate, warehouseId, items, observation, purchaseType, 
      paymentCondition, creditDays, totalAmount: bodyTotal 
    } = req.body;

    const purchaseId = parseInt(id);
    const auditUser = await getAuditUserName(req);

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

      // 2. Reverse old stock ONLY if it didn't reference a prior Guide
      const shouldAdjustStock = !oldPurchase.referenceId;
      if (shouldAdjustStock) {
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
          updatedBy: auditUser,
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
              expiryDate: (item.expiryDate || item.entranceDate) ? new Date(item.expiryDate || item.entranceDate) : null,
              unitSymbol: item.unitSymbol || null,
              observation: item.observation || null
            }))
          }
        },
        include: { items: true }
      });

      // 5. Apply new stock and update product prices
      for (const newItem of items) {
        const parsedExpiry = (newItem.expiryDate || newItem.entranceDate) ? new Date(newItem.expiryDate || newItem.entranceDate) : null;
        if (warehouseId && shouldAdjustStock) {
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
                ...(parsedExpiry && { expiryDate: parsedExpiry })
              }
            });
          } else {
            await (tx as any).stock.create({
              data: {
                productId: newItem.productId,
                warehouseId: parseInt(warehouseId),
                quantity: parseInt(newItem.quantity),
                lotNumber: newItem.lotNumber || null,
                expiryDate: parsedExpiry
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

app.delete('/api/purchases/:id', authenticateToken, requirePermission('VIEW_PURCHASES', 'DELETE_PURCHASES'), async (req, res) => {
  try {
    const { id } = req.params;
    const purchaseId = parseInt(id);
    const auditUser = await getAuditUserName(req);

    await prisma.$transaction(async (tx) => {
      const purchase = await (tx as any).purchase.findUnique({
        where: { id: purchaseId },
        include: { items: { include: { product: true } } }
      });

      if (!purchase) throw new Error('Compra no encontrada');
      if (purchase.status === 'ANNULLED') throw new Error('El documento ya se encuentra anulado.');

      // --- VALIDACIÓN DE INTEGRIDAD: REFERENCIAS ---
      const referenced = await (tx as any).purchase.findFirst({
        where: { referenceId: purchaseId }
      });
      if (referenced) {
        throw new Error(`Esta guía no puede ser eliminada porque ya tiene una factura asociada (${referenced.docSeries}-${referenced.docNumber}).`);
      }

      // 1. Reverse stock ONLY if it didn't reference a prior Guide
      if (!purchase.referenceId) {
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
      }

      // 2. Marcar como anulado (conservar correlativo y trazabilidad)
      await (tx as any).purchase.update({
        where: { id: purchaseId },
        data: { status: 'ANNULLED', updatedBy: auditUser }
      });
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
        zone: { include: { floor: true } }
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
        toZone: { select: { name: true } },
        purchase: {
          select: {
            id: true,
            docType: true,
            docSeries: true,
            docNumber: true,
            supplierName: true,
            supplier: { select: { name: true, docNumber: true } }
          }
        },
        order: {
          select: {
            id: true,
            customerName: true,
            docSeries: true,
            docNumber: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Resolver proveedor por lote para movimientos de transferencia sin purchaseId directo
    const lotsToResolve = Array.from(new Set(
      movements
        .filter((m: any) => !m.purchase?.supplier?.name && !m.purchase?.supplierName && m.lotNumber)
        .map((m: any) => m.lotNumber as string)
    ));

    const lotSupplierMap = new Map<string, string>();
    if (lotsToResolve.length > 0) {
      const purchaseItems = await (prisma as any).purchaseItem.findMany({
        where: { lotNumber: { in: lotsToResolve } },
        select: {
          lotNumber: true,
          purchase: {
            select: {
              supplierName: true,
              supplier: { select: { name: true } }
            }
          }
        }
      });
      for (const pi of purchaseItems) {
        const sName = pi.purchase?.supplier?.name || pi.purchase?.supplierName;
        if (pi.lotNumber && sName && !lotSupplierMap.has(pi.lotNumber)) {
          lotSupplierMap.set(pi.lotNumber, sName);
        }
      }
    }

    const enriched = movements.map((m: any) => ({
      ...m,
      supplierName:
        m.purchase?.supplier?.name ||
        m.purchase?.supplierName ||
        (m.lotNumber ? lotSupplierMap.get(m.lotNumber) : null) ||
        m.order?.customerName ||
        null
    }));

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener movimientos' });
  }
});

app.get('/api/movements/sources', authenticateToken, async (req, res) => {
  try {
    const { from, to, type } = req.query;
    const whereClause: any = {
      status: { not: 'ANNULLED' },
      date: {
        gte: from ? new Date(String(from) + 'T00:00:00.000Z') : undefined,
        lte: to ? new Date(String(to) + 'T23:59:59.999Z') : undefined
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

    // --- FILTRO INTELIGENTE DE DOCUMENTOS EN TRÁNSITO Y ENRIQUECIMIENTO DE FECHA VENCIMIENTO ---
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
            if (!item.expiryDate && stockRecord.expiryDate) {
              item.expiryDate = stockRecord.expiryDate;
            }
            break; // Con un solo ítem que tenga stock, el documento debe aparecer
          }
        }
        if (hasStockInTransit) {
          validPurchases.push(purchase);
        }
      }
      finalPurchases = validPurchases;
    }

    // Asegurar que todos los ítems tengan expiryDate si existe en Stock
    for (const purchase of finalPurchases) {
      for (const item of purchase.items) {
        if (!item.expiryDate && item.lotNumber) {
          const stockRec = await (prisma as any).stock.findFirst({
            where: {
              productId: item.productId,
              lotNumber: item.lotNumber,
              expiryDate: { not: null }
            }
          });
          if (stockRec && stockRec.expiryDate) {
            item.expiryDate = stockRec.expiryDate;
          }
        }
      }
    }

    // Cargar siglas oficiales desde sunat_table (Tabla 10)
    const sunatDocRows = await (prisma as any).sunatTable.findMany({
      where: { tableName: { contains: '10' } }
    });
    const docSiglaMap: Record<string, string> = {};
    for (const row of sunatDocRows) {
      if (row.code && row.sigla) docSiglaMap[row.code] = row.sigla;
    }

    const enrichedPurchases = finalPurchases.map((p: any) => ({
      ...p,
      docSigla: docSiglaMap[p.docType] || p.docType
    }));

    // Incluir Guías de Remisión Electrónica por Traslado entre Establecimientos (Motivo 04)
    let transferGuidesMapped: any[] = [];
    if (type === 'GUIA') {
      const greWhere: any = {
        transferReason: '04',
        status: 'ACTIVE',
        issueDate: {
          gte: from ? new Date(String(from) + 'T00:00:00.000Z') : undefined,
          lte: to ? new Date(String(to) + 'T23:59:59.999Z') : undefined
        }
      };
      const transferGuides = await (prisma as any).salesReferralGuide.findMany({
        where: greWhere,
        include: {
          items: {
            include: {
              product: { include: { unit: true, package: true, subPackage: true } }
            }
          }
        },
        orderBy: { issueDate: 'desc' }
      });

      for (const g of transferGuides) {
        const alreadyTransferred = await (prisma as any).stockMovement.findFirst({
          where: {
            observation: { contains: g.numberFormatted },
            status: { not: 'ANNULLED' }
          }
        });
        if (alreadyTransferred) continue;

        const gType = g.documentType || '09';
        transferGuidesMapped.push({
          id: `GRE-${g.id}`,
          sourceKind: 'SALES_REFERRAL_GUIDE',
          docType: gType,
          docSigla: docSiglaMap[gType] || 'GRM',
          docSeries: g.series,
          docNumber: String(g.number).padStart(8, '0'),
          numberFormatted: g.numberFormatted,
          date: g.issueDate,
          supplierName: g.customerName,
          customerName: g.customerName,
          supplier: { docNumber: g.customerDocNumber, name: g.customerName },
          warehouseId: g.deliveryWarehouseId || g.originWarehouseId,
          originWarehouseId: g.originWarehouseId,
          deliveryWarehouseId: g.deliveryWarehouseId,
          items: (g.items || []).map((it: any) => ({
            ...it,
            unitSymbol: it.unitMeasure || it.product?.package?.symbol || it.product?.subPackage?.symbol || it.product?.unit?.symbol || 'UND'
          }))
        });
      }
    }

    res.json([...transferGuidesMapped, ...enrichedPurchases]);
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

app.put('/api/movements/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { observation, lotNumber } = req.body;
    const existing = await prisma.stockMovement.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Movimiento no encontrado' });

    const updated = await prisma.stockMovement.update({
      where: { id },
      data: {
        observation: observation !== undefined ? String(observation) : existing.observation,
        lotNumber: lotNumber !== undefined ? (String(lotNumber).trim() || null) : existing.lotNumber
      }
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al actualizar movimiento: ' + error.message });
  }
});

app.delete('/api/movements/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.$transaction(async (tx: any) => {
      const movement = await tx.stockMovement.findUnique({ where: { id } });
      if (!movement) throw new Error('Movimiento no encontrado');

      // Revertir stock si el movimiento aún estaba activo
      if (movement.status !== 'ANNULLED') {
        const qty = movement.quantity;
        const pId = movement.productId;

        if (movement.fromWarehouseId) {
          const stockFrom = await tx.stock.findFirst({
            where: {
              productId: pId,
              warehouseId: movement.fromWarehouseId,
              zoneId: movement.fromZoneId || null,
              lotNumber: movement.lotNumber || null
            }
          });
          if (stockFrom) {
            await tx.stock.update({
              where: { id: stockFrom.id },
              data: { quantity: { increment: qty } }
            });
          } else {
            await tx.stock.create({
              data: {
                productId: pId,
                warehouseId: movement.fromWarehouseId,
                zoneId: movement.fromZoneId || null,
                quantity: qty,
                lotNumber: movement.lotNumber || null
              }
            });
          }
        }

        if ((movement.type === 'INPUT' || movement.type === 'TRANSFER') && movement.toWarehouseId) {
          await tx.stock.updateMany({
            where: {
              productId: pId,
              warehouseId: movement.toWarehouseId,
              zoneId: movement.toZoneId || null,
              lotNumber: movement.lotNumber || null
            },
            data: { quantity: { decrement: qty } }
          });
        }
      }

      await tx.stockMovement.delete({ where: { id } });
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error al eliminar movimiento' });
  }
});



// --- API ORDERS ---
app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: { 
        items: { include: { product: { include: { unit: true, package: true, subPackage: true } } } },
        payments: true,
        agency: { include: { zone: true } },
        invoices: {
          where: { sunatStatus: { notIn: ['REJECTED', 'VOIDED', 'ANULADO'] } },
          select: {
            id: true,
            numberFormatted: true,
            documentType: true,
            totalAmount: true,
            sunatStatus: true,
            createdAt: true,
            items: {
              select: {
                productId: true,
                quantity: true,
                unitMeasure: true,
                lotNumber: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
});

app.post('/api/orders', authenticateToken, requirePermission('VIEW_ORDERS', 'WRITE_ORDERS'), orderLimiter, async (req, res) => {
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
        include: { stockRecords: { include: { warehouse: true } } }
      });

      if (!product || !product.isActive) {
        return res.status(404).json({ error: `Producto no encontrado o inactivo (ID: ${item.productId})` });
      }

      const excludedWarehouseNames = ['Existencias', 'Comprobante', 'Despacho'];
      const excludedWarehouseTypes = ['TRANSITORIO', 'DESPACHO', 'COMPROBANTES', 'SISTEMA'];
      const totalStock = (product as any).stockRecords
        .filter((s: any) => !excludedWarehouseNames.includes(s.warehouse?.name) && !excludedWarehouseTypes.includes(s.warehouse?.type))
        .reduce((acc: number, curr: any) => acc + curr.quantity, 0);
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

    // Validar que la cotización no haya sido ya convertida y verificar autorización de vendedor/token
    if (quotationId) {
      const reqUserId = (req as any).user?.userId || (req as any).user?.id;
      const [reqUser, quotation] = await Promise.all([
        prisma.user.findUnique({ where: { id: Number(reqUserId) }, include: { role: true, seller: true } }),
        prisma.quotation.findUnique({ where: { id: parseInt(quotationId) } })
      ]);
      if (quotation && quotation.status === 'ACCEPTED') {
        return res.status(400).json({ error: 'Esta cotización ya ha sido convertida en pedido anteriormente.' });
      }
      if (quotation) {
        const authCheck = await authorizeQuotationMutation(reqUser, quotation, req.body?.editToken, 'pasar a pedido');
        if (!authCheck.authorized) {
          return res.status(403).json({ error: authCheck.error });
        }
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
          origin: origin || 'ADMIN',
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

      // 2. Move stock and send to picking only if CREDIT or already has payment (PAID/PARTIAL)
      const normalizedCondition = (paymentCondition || '').toUpperCase();
      const normalizedStatus = (paymentStatus || '').toUpperCase();
      
      console.log(`[ORDER] Processing stock for Order ID: ${newOrder.id}`);
      console.log(`[ORDER] Condition: ${normalizedCondition}, Status: ${normalizedStatus}, Origin: ${origin}`);

      const isCredit = normalizedStatus === 'CREDIT' || normalizedCondition === 'CRÉDITO' || normalizedCondition === 'CREDITO';
      const hasPayment = normalizedStatus === 'PAID' || normalizedStatus === 'PARTIAL';
      const shouldReserve = isCredit || hasPayment;
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
      throw new Error(`Stock insuficiente en almacén real para reservar el producto ID ${item.productId}${item.lotNumber ? ` (Lote: ${item.lotNumber})` : ''}.`);
    }

    console.log(`[STOCK] Reservando ${item.quantity} unidades desde ${stockSource.warehouse.name} hacia ${DESPACHO_NAME}`);

    // 2. Salida de Origen Real (atómica para evitar stock negativo bajo concurrencia)
    const decResult = await tx.stock.updateMany({
      where: { id: stockSource.id, quantity: { gte: item.quantity } },
      data: { quantity: { decrement: item.quantity } }
    });
    if (decResult.count === 0) {
      throw new Error(`Stock insuficiente por concurrencia para el producto ID ${item.productId} en ${stockSource.warehouse.name}.`);
    }

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

app.post('/api/orders/:id/payment', authenticateToken, requirePermission('VIEW_ORDERS', 'WRITE_ORDERS'), async (req, res) => {
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

app.put('/api/orders/:id/status', authenticateToken, requirePermission('VIEW_ORDERS', 'WRITE_ORDERS'), async (req, res) => {
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
app.post('/api/orders/:id/cancel-payment', authenticateToken, requirePermission('VIEW_ORDERS', 'WRITE_ORDERS'), async (req, res) => {
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

const SUNAT_LOCKED_STATUSES = ['ACCEPTED', 'ACEPTADO', 'OBSERVED', 'VOIDED', 'ANULADO'];

function validateSunatInvoicePayload(params: {
  documentType: string;
  customerDocNumber?: string;
  paymentCondition?: string;
  totalAmount: number;
  items: any[];
  installments?: any[];
}): string | null {
  const { documentType, customerDocNumber, paymentCondition, totalAmount, items, installments } = params;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return 'El comprobante debe tener al menos un producto.';
  }
  if (items.some((i: any) => !i.quantity || i.quantity <= 0)) {
    return 'Todos los productos del comprobante deben tener una cantidad mayor a cero.';
  }
  if (totalAmount <= 0) {
    return 'El importe total del comprobante debe ser mayor a cero.';
  }

  const cleanDocNumber = (customerDocNumber || '').trim();
  if (documentType === '01') {
    if (!cleanDocNumber || cleanDocNumber.length !== 11 || !/^\d{11}$/.test(cleanDocNumber)) {
      return 'Normativa SUNAT: Las Facturas Electrónicas requieren obligatoriamente un número de RUC válido de 11 dígitos numéricos.';
    }
  }
  if (documentType === '03' && totalAmount >= 700) {
    if (!cleanDocNumber || cleanDocNumber === '00000000' || cleanDocNumber.length < 8) {
      return 'Normativa SUNAT: Las Boletas de Venta con importe igual o mayor a S/ 700.00 requieren identificar obligatoriamente al cliente con DNI, RUC o Carné de Extranjería válido.';
    }
  }
  if (paymentCondition === 'CREDITO') {
    if (!installments || !Array.isArray(installments) || installments.length === 0) {
      return 'Normativa SUNAT: Las ventas al CRÉDITO requieren detallar al menos una cuota de pago con fecha de vencimiento e importe.';
    }
    const sumInstallments = installments.reduce((acc: number, inst: any) => acc + (parseFloat(inst.amount) || 0), 0);
    if (Math.abs(sumInstallments - totalAmount) > 0.10) {
      return `Inconsistencia en cuotas a crédito: La suma de las cuotas (S/ ${sumInstallments.toFixed(2)}) no coincide con el importe total del comprobante (S/ ${totalAmount.toFixed(2)}).`;
    }
  }
  return null;
}

app.post('/api/invoices', authenticateToken, requirePermission('VIEW_ORDERS', 'WRITE_ORDERS'), async (req, res) => {
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
    const sunatValidationError = validateSunatInvoicePayload({
      documentType,
      customerDocNumber,
      paymentCondition,
      totalAmount,
      items: invoiceItems,
      installments
    });
    if (sunatValidationError) {
      return res.status(400).json({ error: sunatValidationError });
    }

    const invoice = await prisma.$transaction(async (tx) => {
      if (orderId) {
        const targetOrder = await tx.order.findUnique({
          where: { id: parseInt(orderId) },
          include: {
            items: true,
            invoices: {
              where: { sunatStatus: { notIn: ['REJECTED', 'VOIDED', 'ANULADO'] } },
              include: { items: true }
            }
          }
        });

        if (targetOrder) {
          const orderedByProduct = new Map<number, number>();
          for (const oi of targetOrder.items) {
            orderedByProduct.set(oi.productId, (orderedByProduct.get(oi.productId) || 0) + Number(oi.quantity || 0));
          }

          const invoicedByProduct = new Map<number, number>();
          for (const inv of targetOrder.invoices) {
            for (const ii of inv.items) {
              invoicedByProduct.set(ii.productId, (invoicedByProduct.get(ii.productId) || 0) + Number(ii.quantity || 0));
            }
          }

          let totalRemaining = 0;
          for (const [pid, orderedQty] of orderedByProduct.entries()) {
            const already = invoicedByProduct.get(pid) || 0;
            if (orderedQty > already) {
              totalRemaining += (orderedQty - already);
            }
          }

          if (targetOrder.invoices.length > 0 && totalRemaining <= 0) {
            throw new Error('Este pedido ya fue facturado completamente.');
          }

          const requestedByProduct = new Map<number, number>();
          for (const reqItem of invoiceItems) {
            requestedByProduct.set(reqItem.productId, (requestedByProduct.get(reqItem.productId) || 0) + Number(reqItem.quantity || 0));
          }

          for (const [pid, reqQty] of requestedByProduct.entries()) {
            if (orderedByProduct.has(pid)) {
              const remainingForProd = Math.max(0, (orderedByProduct.get(pid) || 0) - (invoicedByProduct.get(pid) || 0));
              if (reqQty > remainingForProd) {
                throw new Error(`La cantidad a facturar (${reqQty}) supera el saldo pendiente del pedido (${remainingForProd}).`);
              }
            }
          }
        }
      }

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

      const duplicateInvoice = await tx.invoice.findFirst({
        where: { documentType, numberFormatted: finalNumberFormatted }
      });
      if (duplicateInvoice) {
        throw new Error(`Ya existe un comprobante con la numeración ${finalNumberFormatted}.`);
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

    // If created from order, update order billing voucher list
    if (orderId) {
      const orderInvoices = await prisma.invoice.findMany({
        where: {
          orderId: parseInt(orderId),
          sunatStatus: { notIn: ['REJECTED', 'VOIDED', 'ANULADO'] }
        },
        select: { numberFormatted: true },
        orderBy: { createdAt: 'asc' }
      });
      const joinedVouchers = orderInvoices.map(i => i.numberFormatted).join(', ').slice(0, 190);
      await prisma.order.update({
        where: { id: parseInt(orderId) },
        data: { voucherNumber: joinedVouchers || invoice.numberFormatted }
      });
    }

    // Procesar envío a SUNAT
    let finalInvoice: any = invoice;
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
app.post('/api/invoices/:id/send-sunat', authenticateToken, requirePermission('VIEW_ORDERS', 'WRITE_ORDERS'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await SunatService.sendInvoiceToSunat(parseInt(id));
    res.json(result);
  } catch (error: any) {
    console.error('Error al enviar a SUNAT:', error);
    res.status(500).json({ error: error.message || 'Error al enviar comprobante a SUNAT' });
  }
});

app.put('/api/invoices/:id', authenticateToken, requirePermission('VIEW_ORDERS', 'WRITE_ORDERS'), async (req, res) => {
  try {
    const { id } = req.params;
    const invoiceId = parseInt(id);
    const { notes, items, installments, ...data } = req.body;

    const existingInvoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!existingInvoice) {
      return res.status(404).json({ error: 'Comprobante no encontrado.' });
    }
    if (SUNAT_LOCKED_STATUSES.includes((existingInvoice.sunatStatus || '').toUpperCase())) {
      return res.status(400).json({ error: 'Normativa SUNAT: No se puede modificar un comprobante ya aceptado, observado o anulado ante SUNAT.' });
    }

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

      const sunatValidationError = validateSunatInvoicePayload({
        documentType: data.documentType || existingInvoice.documentType,
        customerDocNumber: data.customerDocNumber ?? existingInvoice.customerDocNumber ?? undefined,
        paymentCondition: data.paymentCondition ?? existingInvoice.paymentCondition,
        totalAmount,
        items: invoiceItems,
        installments
      });
      if (sunatValidationError) {
        throw new Error(sunatValidationError);
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

app.delete('/api/invoices/:id', authenticateToken, requirePermission('VIEW_ORDERS', 'DELETE_ORDERS'), async (req, res) => {
  try {
    const { id } = req.params;
    const invoiceId = parseInt(id);
    const existing = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!existing) {
      return res.status(404).json({ error: 'Comprobante no encontrado.' });
    }
    if (SUNAT_LOCKED_STATUSES.includes((existing.sunatStatus || '').toUpperCase())) {
      return res.status(400).json({ error: 'Normativa SUNAT: No se puede eliminar un comprobante ya enviado/aceptado por SUNAT. Debe emitir una Nota de Crédito o Comunicación de Baja.' });
    }
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { sunatStatus: 'ANULADO' }
    });
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
        shippingAgency: { include: { branches: true } },
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
        shippingAgency: { include: { branches: true } },
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
      deliveryWarehouseId, deliveryAddress, deliveryUbigeo, deliverySunatCode, deliveryDepartment, deliveryProvince, deliveryDistrict,
      carrierDocType, carrierDocNumber, carrierName, carrierMtcNumber, shippingAgencyId, shippingBranchId,
      driverDocType, driverDocNumber, driverName, driverLicenseNumber, vehiclePlate, vehicleSecondaryPlate,
      vehicleBrand, vehicleTuce, vehicleMtc, authorizationEntity, authorizationNumber,
      returnEmptyContainers, transshipment, vehicleCategoryM1OrL, returnEmptyVehicle, fullDamOrDsTransfer, registerTransportData,
      totalWeight, weightUnit, totalPackages,
      orderId, orderNumber, invoiceId, invoiceNumber, relatedDocType, relatedDocNumber, relatedDocDate, purchaseOrderNumber,
      notes, items, sendToSunatImmediately
    } = req.body;

    const docType = documentType || '09';
    const cleanMode = transportMode || '02';
    const cleanReason = transferReason || '01';
    const cleanOriginSunat = String(originSunatCode || '0000').trim().padStart(4, '0');
    const cleanDeliverySunat = String(deliverySunatCode || '0000').trim().padStart(4, '0');

    // --- VALIDACIONES NORMATIVAS SUNAT GRE (09) ---
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'La Guía de Remisión debe tener al menos un bien o producto.'
      });
    }
    if (items.some((it: any) => !it.quantity || parseFloat(it.quantity) <= 0)) {
      return res.status(400).json({
        error: 'Todos los bienes de la Guía de Remisión deben tener una cantidad mayor a cero.'
      });
    }

    if (cleanReason === '04') {
      if (!originWarehouseId || !deliveryWarehouseId) {
        return res.status(400).json({
          error: 'Normativa SUNAT: En traslados entre establecimientos (Motivo 04), debe seleccionar el Almacén de Partida y el Almacén de Llegada.'
        });
      }
      if (String(originWarehouseId) === String(deliveryWarehouseId)) {
        return res.status(400).json({
          error: 'Normativa SUNAT: En traslados entre establecimientos (Motivo 04), el Almacén de Llegada debe ser distinto al Almacén de Partida.'
        });
      }
      if (!/^\d{4}$/.test(cleanOriginSunat) || !/^\d{4}$/.test(cleanDeliverySunat)) {
        return res.status(400).json({
          error: 'Normativa SUNAT: En traslados entre establecimientos (Motivo 04), tanto el Punto de Partida como el Punto de Llegada deben tener Código de Establecimiento SUNAT de 4 dígitos.'
        });
      }
      if (cleanOriginSunat === cleanDeliverySunat && (originAddress || '').trim().toUpperCase() === (deliveryAddress || '').trim().toUpperCase()) {
        return res.status(400).json({
          error: 'Normativa SUNAT: En traslados entre establecimientos (Motivo 04), el Punto de Llegada debe ser distinto al Punto de Partida.'
        });
      }
    }

    if (originWarehouseId) {
      const parsedOriginWhId = parseInt(String(originWarehouseId));
      for (const it of items) {
        const pId = parseInt(String(it.productId));
        const reqQty = parseFloat(String(it.quantity)) || 0;
        const stockWhere: any = { productId: pId, warehouseId: parsedOriginWhId };
        if (it.lotNumber) stockWhere.lotNumber = it.lotNumber;
        const stockRows = await prisma.stock.findMany({ where: stockWhere });
        const available = stockRows.reduce((sum: number, s: any) => sum + (Number(s.quantity) || 0), 0);
        if (available < reqQty) {
          return res.status(400).json({
            error: `Stock insuficiente en el almacén de partida para "${it.description || `Producto ID ${pId}`}"${it.lotNumber ? ` (Lote: ${it.lotNumber})` : ''}. Disponible: ${available}, Solicitado: ${reqQty}.`
          });
        }
      }
    }

    if (cleanMode === '01') {
      const cleanCarrierRuc = String(carrierDocNumber || '').trim();
      if (!/^\d{11}$/.test(cleanCarrierRuc)) {
        return res.status(400).json({
          error: 'Normativa SUNAT (Transporte Público): Debe ingresar un RUC válido de 11 dígitos numéricos para la empresa transportista.'
        });
      }
      if (!carrierName || !String(carrierName).trim()) {
        return res.status(400).json({
          error: 'Normativa SUNAT (Transporte Público): Debe ingresar la Razón Social de la empresa transportista.'
        });
      }
    } else if (cleanMode === '02' && !vehicleCategoryM1OrL) {
      if (!vehiclePlate || !String(vehiclePlate).trim()) {
        return res.status(400).json({
          error: 'Normativa SUNAT (Transporte Privado): Debe ingresar la placa del vehículo.'
        });
      }
      if (!driverDocNumber || !String(driverDocNumber).trim() || !driverName || !String(driverName).trim()) {
        return res.status(400).json({
          error: 'Normativa SUNAT (Transporte Privado): Debe ingresar el documento y nombre del conductor.'
        });
      }
    }

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
          packages: item.packages !== undefined && item.packages !== null ? parseFloat(String(item.packages)) || 0 : 0,
          packageType: item.packageType || null,
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
          originSunatCode: cleanOriginSunat,
          deliveryWarehouseId: deliveryWarehouseId ? parseInt(String(deliveryWarehouseId)) : null,
          deliveryAddress: deliveryAddress || '',
          deliveryUbigeo: deliveryUbigeo || '150101',
          deliverySunatCode: cleanDeliverySunat,
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
          driverDocNumber: cleanMode === '02' ? (driverDocNumber || null) : null,
          driverName: cleanMode === '02' ? (driverName || null) : null,
          driverLicenseNumber: cleanMode === '02' ? (driverLicenseNumber || null) : null,
          vehiclePlate: cleanMode === '02' && vehiclePlate ? vehiclePlate.toUpperCase().trim() : null,
          vehicleSecondaryPlate: cleanMode === '02' && vehicleSecondaryPlate ? vehicleSecondaryPlate.toUpperCase().trim() : null,
          vehicleBrand: cleanMode === '02' ? (vehicleBrand || null) : null,
          vehicleTuce: cleanMode === '02' ? (vehicleTuce || null) : null,
          vehicleMtc: cleanMode === '02' ? (vehicleMtc || null) : null,
          authorizationEntity: authorizationEntity || null,
          authorizationNumber: authorizationNumber || null,
          returnEmptyContainers: Boolean(returnEmptyContainers),
          transshipment: Boolean(transshipment),
          vehicleCategoryM1OrL: Boolean(vehicleCategoryM1OrL),
          returnEmptyVehicle: Boolean(returnEmptyVehicle),
          fullDamOrDsTransfer: Boolean(fullDamOrDsTransfer),
          registerTransportData: Boolean(registerTransportData),
          totalWeight: computedWeight,
          weightUnit: weightUnit || 'KGM',
          totalPackages: parseInt(String(totalPackages)) || (guideItems.length || 1),
          orderId: orderId ? parseInt(String(orderId)) : null,
          orderNumber: orderNumber || null,
          invoiceId: invoiceId ? parseInt(String(invoiceId)) : null,
          invoiceNumber: invoiceNumber || null,
          relatedDocType: relatedDocType || null,
          relatedDocNumber: relatedDocNumber || null,
          relatedDocDate: relatedDocDate ? new Date(relatedDocDate) : null,
          purchaseOrderNumber: purchaseOrderNumber || null,
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
    let finalGuide: any = guide;
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
    const id = parseInt(req.params.id);
    await prisma.salesReferralGuide.update({
      where: { id },
      data: { status: 'ANNULLED' }
    });
    res.json({ success: true, message: 'Guía de remisión anulada' });
  } catch (error: any) {
    console.error('Error annulling guide:', error);
    res.status(500).json({ error: 'Error al anular guía de remisión' });
  }
});

// ==========================================
// VEHÍCULOS Y FLOTA (CONFIG. LOGÍSTICA)
// ==========================================

app.get('/api/vehicles', authenticateToken, async (req, res) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      include: {
        carrier: { select: { id: true, name: true, ruc: true } }
      },
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
    const { plate, brand, model, tuce, mtcNumber, carrierId, capacityWeight, capacityVolume, status } = req.body;
    if (!plate) return res.status(400).json({ error: 'La placa del vehículo es obligatoria' });

    const cleanPlate = plate.trim().toUpperCase();
    const parsedCarrierId = carrierId ? parseInt(String(carrierId)) : null;

    if (parsedCarrierId) {
      const existingUnlinked = await prisma.vehicle.findUnique({ where: { plate: cleanPlate } });
      if (existingUnlinked && existingUnlinked.carrierId === null) {
        const linked = await prisma.vehicle.update({
          where: { id: existingUnlinked.id },
          data: {
            carrierId: parsedCarrierId,
            brand: brand ? brand.trim().toUpperCase() : existingUnlinked.brand,
            model: model ? model.trim().toUpperCase() : existingUnlinked.model,
            tuce: tuce ? tuce.trim().toUpperCase() : existingUnlinked.tuce,
            mtcNumber: mtcNumber ? mtcNumber.trim().toUpperCase() : existingUnlinked.mtcNumber
          }
        });
        return res.json(linked);
      }
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        plate: cleanPlate,
        brand: brand ? brand.trim().toUpperCase() : null,
        model: model ? model.trim().toUpperCase() : null,
        tuce: tuce ? tuce.trim().toUpperCase() : null,
        mtcNumber: mtcNumber ? mtcNumber.trim().toUpperCase() : null,
        carrierId: parsedCarrierId,
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
    const { plate, brand, model, tuce, mtcNumber, carrierId, capacityWeight, capacityVolume, status } = req.body;

    const vehicle = await prisma.vehicle.update({
      where: { id: parseInt(id) },
      data: {
        plate: plate ? plate.trim().toUpperCase() : undefined,
        brand: brand !== undefined ? (brand ? brand.trim().toUpperCase() : null) : undefined,
        model: model !== undefined ? (model ? model.trim().toUpperCase() : null) : undefined,
        tuce: tuce !== undefined ? (tuce ? tuce.trim().toUpperCase() : null) : undefined,
        mtcNumber: mtcNumber !== undefined ? (mtcNumber ? mtcNumber.trim().toUpperCase() : null) : undefined,
        carrierId: carrierId !== undefined ? (carrierId ? parseInt(String(carrierId)) : null) : undefined,
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
      include: {
        carrier: { select: { id: true, name: true, ruc: true } }
      },
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
    const { docType, docNumber, name, licenseNumber, phone, email, carrierId, status } = req.body;
    if (!docNumber || !name) {
      return res.status(400).json({ error: 'El número de documento y el nombre del conductor son obligatorios' });
    }

    const cleanDoc = docNumber.trim();
    const parsedCarrierId = carrierId ? parseInt(String(carrierId)) : null;

    if (parsedCarrierId) {
      const existingUnlinked = await prisma.driver.findUnique({ where: { docNumber: cleanDoc } });
      if (existingUnlinked && existingUnlinked.carrierId === null) {
        const linked = await prisma.driver.update({
          where: { id: existingUnlinked.id },
          data: {
            carrierId: parsedCarrierId,
            name: name ? name.trim().toUpperCase() : existingUnlinked.name,
            licenseNumber: licenseNumber ? licenseNumber.trim().toUpperCase() : existingUnlinked.licenseNumber,
            phone: phone ? phone.trim() : existingUnlinked.phone,
            email: email ? email.trim() : existingUnlinked.email
          }
        });
        return res.json(linked);
      }
    }

    const driver = await prisma.driver.create({
      data: {
        docType: docType || '1',
        docNumber: cleanDoc,
        name: name.trim().toUpperCase(),
        licenseNumber: licenseNumber ? licenseNumber.trim().toUpperCase() : null,
        phone: phone ? phone.trim() : null,
        email: email ? email.trim() : null,
        carrierId: parsedCarrierId,
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
    const { docType, docNumber, name, licenseNumber, phone, email, carrierId, status } = req.body;

    const driver = await prisma.driver.update({
      where: { id: parseInt(id) },
      data: {
        docType: docType || undefined,
        docNumber: docNumber ? docNumber.trim() : undefined,
        name: name ? name.trim().toUpperCase() : undefined,
        licenseNumber: licenseNumber !== undefined ? (licenseNumber ? licenseNumber.trim().toUpperCase() : null) : undefined,
        phone: phone !== undefined ? (phone ? phone.trim() : null) : undefined,
        email: email !== undefined ? (email ? email.trim() : null) : undefined,
        carrierId: carrierId !== undefined ? (carrierId ? parseInt(String(carrierId)) : null) : undefined,
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

// ==========================================
// EMPRESAS DE TRANSPORTE / TRANSPORTISTAS
// ==========================================

app.get('/api/carriers', authenticateToken, async (req, res) => {
  try {
    const carriers = await prisma.carrier.findMany({
      include: {
        vehicles: { orderBy: { plate: 'asc' } },
        drivers: { orderBy: { name: 'asc' } }
      },
      orderBy: [{ isOwnFleet: 'desc' }, { name: 'asc' }]
    });
    res.json(carriers);
  } catch (error: any) {
    console.error('Error fetching carriers:', error);
    res.status(500).json({ error: 'Error al obtener empresas de transporte' });
  }
});

app.post('/api/carriers', authenticateToken, async (req, res) => {
  try {
    const { ruc, name, address, mtcNumber, phone, email, isOwnFleet, isActive } = req.body;
    const cleanRuc = String(ruc || '').trim();
    if (!/^\d{11}$/.test(cleanRuc)) {
      return res.status(400).json({ error: 'El RUC del transportista debe tener exactamente 11 dígitos numéricos.' });
    }
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'La razón social del transportista es obligatoria.' });
    }
    const carrier = await prisma.carrier.create({
      data: {
        ruc: cleanRuc,
        name: String(name).trim().toUpperCase(),
        address: address ? String(address).trim().toUpperCase() : null,
        mtcNumber: mtcNumber ? String(mtcNumber).trim().toUpperCase() : null,
        phone: phone ? String(phone).trim() : null,
        email: email ? String(email).trim() : null,
        isOwnFleet: Boolean(isOwnFleet),
        isActive: isActive !== false
      },
      include: { vehicles: true, drivers: true }
    });
    res.json(carrier);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe una empresa de transporte registrada con este RUC.' });
    }
    console.error('Error creating carrier:', error);
    res.status(500).json({ error: 'Error al registrar empresa de transporte: ' + error.message });
  }
});

app.put('/api/carriers/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { ruc, name, address, mtcNumber, phone, email, isOwnFleet, isActive } = req.body;
    if (ruc !== undefined && !/^\d{11}$/.test(String(ruc).trim())) {
      return res.status(400).json({ error: 'El RUC del transportista debe tener exactamente 11 dígitos numéricos.' });
    }
    const carrier = await prisma.carrier.update({
      where: { id: parseInt(id) },
      data: {
        ruc: ruc !== undefined ? String(ruc).trim() : undefined,
        name: name !== undefined ? String(name).trim().toUpperCase() : undefined,
        address: address !== undefined ? (address ? String(address).trim().toUpperCase() : null) : undefined,
        mtcNumber: mtcNumber !== undefined ? (mtcNumber ? String(mtcNumber).trim().toUpperCase() : null) : undefined,
        phone: phone !== undefined ? (phone ? String(phone).trim() : null) : undefined,
        email: email !== undefined ? (email ? String(email).trim() : null) : undefined,
        isOwnFleet: isOwnFleet !== undefined ? Boolean(isOwnFleet) : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined
      },
      include: { vehicles: true, drivers: true }
    });
    res.json(carrier);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe otra empresa de transporte con este RUC.' });
    }
    console.error('Error updating carrier:', error);
    res.status(500).json({ error: 'Error al actualizar empresa de transporte' });
  }
});

app.delete('/api/carriers/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.carrier.delete({ where: { id: parseInt(id) } });
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting carrier:', error);
    res.status(500).json({ error: 'Error al eliminar empresa de transporte' });
  }
});

// --- API DASHBOARD POR ROL ---
app.get('/api/dashboard/summary', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const dbUser = userId
      ? await prisma.user.findUnique({
          where: { id: Number(userId) },
          include: { role: true, warehouse: true },
        })
      : null;

    let permissions: string[] = [];
    try {
      permissions = dbUser?.role?.permissions ? JSON.parse(dbUser.role.permissions) : [];
    } catch {
      permissions = [];
    }
    const roleName = (dbUser?.role?.name || req.user?.role || '').toUpperCase();

    // Buscar vendedor vinculado al usuario (por email o nombre)
    const userEmail = (dbUser?.email || '').trim().toLowerCase();
    const userName = (dbUser?.name || '').trim().toLowerCase();
    const sellers = await prisma.seller.findMany({ where: { isActive: true } });
    const matchedSeller =
      sellers.find((s: any) => userEmail && s.email && s.email.toLowerCase() === userEmail) ||
      sellers.find((s: any) => userName && s.name && s.name.trim().toLowerCase() === userName) ||
      null;

    // Determinar perfil de dashboard
    let roleProfile: 'ADMIN' | 'WAREHOUSE' | 'SELLER' = 'ADMIN';
    if (permissions.includes('ALL') || roleName.includes('SUPERADMIN') || roleName.includes('ADMIN')) {
      roleProfile = 'ADMIN';
    } else if (
      roleName.includes('ALMACEN') ||
      roleName.includes('ALMACÉN') ||
      roleName.includes('PICKING') ||
      ((permissions.includes('VIEW_PICKING') || permissions.includes('VIEW_LOGISTICS')) &&
        !permissions.includes('VIEW_ORDERS') &&
        !permissions.includes('VIEW_QUOTATIONS'))
    ) {
      roleProfile = 'WAREHOUSE';
    } else if (
      matchedSeller ||
      roleName.includes('VENTA') ||
      roleName.includes('VENDEDOR') ||
      permissions.includes('VIEW_ORDERS') ||
      permissions.includes('VIEW_QUOTATIONS')
    ) {
      roleProfile = 'SELLER';
    }

    const now = new Date();
    const rawMonth = typeof req.query.month === 'string' && /^\d{4}-\d{2}$/.test(req.query.month)
      ? req.query.month
      : null;
    const targetYear = rawMonth ? parseInt(rawMonth.split('-')[0], 10) : now.getFullYear();
    const targetMonth = rawMonth ? parseInt(rawMonth.split('-')[1], 10) - 1 : now.getMonth();
    const selectedMonth = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`;

    const startOfMonth = new Date(targetYear, targetMonth, 1);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const baseContext = {
      userId: dbUser?.id || userId,
      userName: dbUser?.name || req.user?.name || 'Usuario',
      roleName,
      roleProfile,
      selectedMonth,
      selectedYear: targetYear,
      warehouseId: dbUser?.warehouseId || matchedSeller?.warehouseId || null,
      warehouseName: dbUser?.warehouse?.name || null,
      sellerId: matchedSeller?.id || null,
      sellerName: matchedSeller?.name || null,
      monthlyQuota: matchedSeller ? Number(matchedSeller.monthlyQuota || 0) : 0,
    };

    if (roleProfile === 'WAREHOUSE') {
      const whId = baseContext.warehouseId;
      const pickingWhereBase: any = {
        warehouseStatus: { not: null },
        status: { not: 'ANNULLED' },
        ...(whId ? { warehouseId: whId } : {}),
      };

      const in45Days = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);
      const [
        pendingPicking,
        inPicking,
        preparedPicking,
        dispatchedToday,
        pendingGuidesSunat,
        recentPickingOrders,
        lowStockItems,
        expiringLots,
      ] = await Promise.all([
        prisma.order.count({ where: { ...pickingWhereBase, warehouseStatus: 'PENDING' } }),
        prisma.order.count({ where: { ...pickingWhereBase, warehouseStatus: 'IN_PICKING' } }),
        prisma.order.count({ where: { ...pickingWhereBase, warehouseStatus: 'PICKED' } }),
        prisma.order.count({
          where: {
            ...pickingWhereBase,
            status: 'DISPATCHED',
            updatedAt: { gte: startOfToday },
          },
        }),
        prisma.salesReferralGuide.count({
          where: {
            status: 'ACTIVE',
            sunatStatus: { in: ['PENDING', 'ERROR'] },
            ...(whId ? { originWarehouseId: whId } : {}),
          },
        }),
        prisma.order.findMany({
          where: {
            ...pickingWhereBase,
            warehouseStatus: { in: ['PENDING', 'IN_PICKING', 'PICKED'] },
          },
          select: {
            id: true,
            docSeries: true,
            docNumber: true,
            customerName: true,
            warehouseStatus: true,
            createdAt: true,
            picker: { select: { name: true } },
            _count: { select: { items: true } },
          },
          orderBy: [{ warehouseStatus: 'asc' }, { createdAt: 'desc' }],
          take: 8,
        }),
        prisma.stock.findMany({
          where: {
            quantity: { lte: 5 },
            ...(whId ? { warehouseId: whId } : {}),
            product: { isActive: true },
          },
          select: {
            id: true,
            quantity: true,
            lotNumber: true,
            product: { select: { code: true, name: true } },
            warehouse: { select: { name: true } },
          },
          orderBy: { quantity: 'asc' },
          take: 8,
        }),
        prisma.stock.findMany({
          where: {
            quantity: { gt: 0 },
            expiryDate: { not: null, lte: in45Days },
            ...(whId ? { warehouseId: whId } : {}),
            product: { isActive: true },
          },
          select: {
            id: true,
            quantity: true,
            lotNumber: true,
            expiryDate: true,
            product: { select: { code: true, name: true } },
            warehouse: { select: { name: true } },
          },
          orderBy: { expiryDate: 'asc' },
          take: 8,
        }),
      ]);

      return res.json({
        ...baseContext,
        warehouse: {
          pendingPicking,
          inPicking,
          preparedPicking,
          dispatchedToday,
          pendingGuidesSunat,
          recentPickingOrders,
          lowStockItems,
          expiringLots,
        },
      });
    }

    if (roleProfile === 'SELLER') {
      const sellerFilter: any = baseContext.sellerId ? { sellerId: baseContext.sellerId } : { id: -1 };
      const [monthOrders, unpaidOrdersList, openQuotations] = await Promise.all([
        prisma.order.findMany({
          where: {
            ...sellerFilter,
            status: { not: 'ANNULLED' },
            createdAt: { gte: startOfMonth, lte: endOfMonth },
          },
          select: {
            id: true,
            customerName: true,
            totalAmount: true,
            paymentStatus: true,
            items: {
              select: {
                productId: true,
                quantity: true,
                price: true,
                discount: true,
                product: { select: { code: true, name: true } },
              },
            },
          },
        }),
        prisma.order.findMany({
          where: {
            ...sellerFilter,
            status: { not: 'ANNULLED' },
            paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
          },
          select: {
            id: true,
            docSeries: true,
            docNumber: true,
            customerName: true,
            totalAmount: true,
            paymentStatus: true,
            createdAt: true,
            payments: { select: { amount: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.quotation.count({
          where: {
            ...sellerFilter,
            status: 'PENDING',
          },
        }),
      ]);

      const monthSalesAmount = monthOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

      // Calcular saldo pendiente de pedidos sin cobrar
      const unpaidOrdersFormatted = unpaidOrdersList.map((o) => {
        const total = Number(o.totalAmount || 0);
        const paid = o.payments.reduce((s, p) => s + Number(p.amount || 0), 0);
        const balance = Math.max(0, total - paid);
        return {
          id: o.id,
          docSeries: o.docSeries,
          docNumber: o.docNumber,
          customerName: o.customerName,
          totalAmount: total,
          paidAmount: paid,
          balance,
          paymentStatus: o.paymentStatus,
          createdAt: o.createdAt,
        };
      });
      const unpaidTotalBalance = unpaidOrdersFormatted.reduce((s, o) => s + o.balance, 0);

      // Top 5 clientes del mes del vendedor
      const clientMap = new Map<string, { name: string; orders: number; total: number }>();
      for (const o of monthOrders) {
        const cName = (o.customerName || 'CLIENTE GENERAL').trim().toUpperCase();
        const prev = clientMap.get(cName) || { name: cName, orders: 0, total: 0 };
        prev.orders += 1;
        prev.total += Number(o.totalAmount || 0);
        clientMap.set(cName, prev);
      }
      const topClients = Array.from(clientMap.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      // Top 5 productos del mes del vendedor
      const prodMap = new Map<number, { code: string; name: string; quantity: number; total: number }>();
      for (const o of monthOrders) {
        for (const it of o.items) {
          const qty = Number(it.quantity || 0);
          const raw = qty * Number(it.price || 0);
          const lineTotal = raw - (raw * Number(it.discount || 0)) / 100;
          const prev = prodMap.get(it.productId) || {
            code: it.product?.code || '-',
            name: it.product?.name || 'Producto',
            quantity: 0,
            total: 0,
          };
          prev.quantity += qty;
          prev.total += lineTotal;
          prodMap.set(it.productId, prev);
        }
      }
      const topProducts = Array.from(prodMap.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      return res.json({
        ...baseContext,
        seller: {
          monthSalesAmount,
          monthOrdersCount: monthOrders.length,
          unpaidOrdersCount: unpaidOrdersFormatted.length,
          unpaidTotalBalance,
          openQuotationsCount: openQuotations,
          quotaProgressPct:
            baseContext.monthlyQuota > 0
              ? Number(((monthSalesAmount / baseContext.monthlyQuota) * 100).toFixed(1))
              : 0,
          unpaidOrders: unpaidOrdersFormatted.slice(0, 8),
          topClients,
          topProducts,
        },
      });
    }

    // ADMIN (Gerencial)
    const startOfPrevMonth = new Date(targetYear, targetMonth - 1, 1);
    const endOfPrevMonth = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);
    const startOfLastYearMonth = new Date(targetYear - 1, targetMonth, 1);
    const endOfLastYearMonth = new Date(targetYear - 1, targetMonth + 1, 0, 23, 59, 59, 999);
    const startOfPrevYear = new Date(targetYear - 1, 0, 1);
    const endOfCurrentYear = new Date(targetYear, 11, 31, 23, 59, 59, 999);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const [
      monthOrders,
      prevMonthOrders,
      lastYearOrders,
      twoYearOrders,
      unpaidAllOrders,
      allStocks,
      recentOutMovements,
      recentSoldProductIds,
      activeProductsWithStock,
      lowStockCount,
    ] = await Promise.all([
      prisma.order.findMany({
        where: { status: { not: 'ANNULLED' }, createdAt: { gte: startOfMonth, lte: endOfMonth } },
        select: {
          id: true,
          sellerId: true,
          totalAmount: true,
          items: {
            select: {
              productId: true,
              quantity: true,
              price: true,
              discount: true,
              product: { select: { code: true, name: true } },
            },
          },
        },
      }),
      prisma.order.findMany({
        where: { status: { not: 'ANNULLED' }, createdAt: { gte: startOfPrevMonth, lte: endOfPrevMonth } },
        select: { totalAmount: true },
      }),
      prisma.order.findMany({
        where: { status: { not: 'ANNULLED' }, createdAt: { gte: startOfLastYearMonth, lte: endOfLastYearMonth } },
        select: { totalAmount: true },
      }),
      prisma.order.findMany({
        where: { status: { not: 'ANNULLED' }, createdAt: { gte: startOfPrevYear, lte: endOfCurrentYear } },
        select: { createdAt: true, totalAmount: true },
      }),
      prisma.order.findMany({
        where: { status: { not: 'ANNULLED' }, paymentStatus: { in: ['UNPAID', 'PARTIAL'] } },
        select: { id: true, totalAmount: true, payments: { select: { amount: true } } },
      }),
      prisma.stock.findMany({
        where: { quantity: { gt: 0 } },
        select: {
          quantity: true,
          warehouseId: true,
          warehouse: { select: { name: true } },
          product: { select: { costPrice: true } },
        },
      }),
      prisma.stockMovement.findMany({
        where: {
          createdAt: { gte: sixtyDaysAgo },
          type: { in: ['OUT', 'EXIT', 'SALE'] },
        },
        select: { productId: true },
        distinct: ['productId'],
      }),
      prisma.orderItem.findMany({
        where: {
          order: { status: { not: 'ANNULLED' }, createdAt: { gte: sixtyDaysAgo } },
        },
        select: { productId: true },
        distinct: ['productId'],
      }),
      prisma.product.findMany({
        where: { isActive: true, stock: { gt: 0 } },
        select: { id: true, code: true, name: true, stock: true, costPrice: true },
      }),
      prisma.product.count({ where: { isActive: true, stock: { lte: 5 } } }),
    ]);

    const monthRevenue = monthOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
    const prevMonthRevenue = prevMonthOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
    const lastYearMonthRevenue = lastYearOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

    const momGrowthPct =
      prevMonthRevenue > 0
        ? Number((((monthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100).toFixed(1))
        : null;
    const yoyGrowthPct =
      lastYearMonthRevenue > 0
        ? Number((((monthRevenue - lastYearMonthRevenue) / lastYearMonthRevenue) * 100).toFixed(1))
        : null;

    // Cuentas por cobrar
    let receivablesBalance = 0;
    for (const o of unpaidAllOrders) {
      const paid = o.payments.reduce((s, p) => s + Number(p.amount || 0), 0);
      receivablesBalance += Math.max(0, Number(o.totalAmount || 0) - paid);
    }

    // Valorización por almacén
    const whValMap = new Map<number, { name: string; units: number; value: number }>();
    let totalInventoryValue = 0;
    for (const st of allStocks) {
      const qty = Number(st.quantity || 0);
      const cost = Number(st.product?.costPrice || 0);
      const val = qty * cost;
      totalInventoryValue += val;
      const prev = whValMap.get(st.warehouseId) || {
        name: st.warehouse?.name || `Almacén #${st.warehouseId}`,
        units: 0,
        value: 0,
      };
      prev.units += qty;
      prev.value += val;
      whValMap.set(st.warehouseId, prev);
    }
    const inventoryValuationByWarehouse = Array.from(whValMap.values()).sort((a, b) => b.value - a.value);

    // Top 10 productos del mes
    const adminProdMap = new Map<number, { code: string; name: string; quantity: number; total: number }>();
    for (const o of monthOrders) {
      for (const it of o.items) {
        const qty = Number(it.quantity || 0);
        const raw = qty * Number(it.price || 0);
        const lineTotal = raw - (raw * Number(it.discount || 0)) / 100;
        const prev = adminProdMap.get(it.productId) || {
          code: it.product?.code || '-',
          name: it.product?.name || 'Producto',
          quantity: 0,
          total: 0,
        };
        prev.quantity += qty;
        prev.total += lineTotal;
        adminProdMap.set(it.productId, prev);
      }
    }
    const topProducts = Array.from(adminProdMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // Ranking de vendedores del mes vs cuota
    const sellerMap = new Map<number, { orders: number; total: number }>();
    for (const o of monthOrders) {
      if (!o.sellerId) continue;
      const prev = sellerMap.get(o.sellerId) || { orders: 0, total: 0 };
      prev.orders += 1;
      prev.total += Number(o.totalAmount || 0);
      sellerMap.set(o.sellerId, prev);
    }
    const sellerRanking = sellers
      .map((s: any) => {
        const agg = sellerMap.get(s.id) || { orders: 0, total: 0 };
        const quota = Number(s.monthlyQuota || 0);
        return {
          id: s.id,
          name: s.name,
          ordersCount: agg.orders,
          salesAmount: agg.total,
          monthlyQuota: quota,
          progressPct: quota > 0 ? Number(((agg.total / quota) * 100).toFixed(1)) : 0,
        };
      })
      .sort((a, b) => b.salesAmount - a.salesAmount);

    // Productos sin movimiento en 60 días
    const movedIds = new Set<number>([
      ...recentOutMovements.map((m) => m.productId),
      ...recentSoldProductIds.map((m) => m.productId),
    ]);
    const stagnantProducts = activeProductsWithStock
      .filter((p) => !movedIds.has(p.id))
      .map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        stock: Number(p.stock || 0),
        immobilizedValue: Number(p.stock || 0) * Number(p.costPrice || 0),
      }))
      .sort((a, b) => b.immobilizedValue - a.immobilizedValue || b.stock - a.stock)
      .slice(0, 10);

    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
    const monthlyComparison = monthNames.map((label, idx) => ({
      monthLabel: label,
      monthIndex: idx,
      currentYear: 0,
      prevYear: 0,
    }));
    for (const o of twoYearOrders) {
      const d = new Date(o.createdAt);
      const yr = d.getFullYear();
      const mo = d.getMonth();
      const amt = Number(o.totalAmount || 0);
      if (yr === targetYear) monthlyComparison[mo].currentYear += amt;
      else if (yr === targetYear - 1) monthlyComparison[mo].prevYear += amt;
    }

    return res.json({
      ...baseContext,
      admin: {
        monthRevenue,
        prevMonthRevenue,
        lastYearMonthRevenue,
        momGrowthPct,
        yoyGrowthPct,
        monthOrdersCount: monthOrders.length,
        avgTicket: monthOrders.length > 0 ? monthRevenue / monthOrders.length : 0,
        receivablesBalance,
        receivablesCount: unpaidAllOrders.length,
        totalInventoryValue,
        lowStockCount,
        topProducts,
        sellerRanking,
        stagnantProducts,
        inventoryValuationByWarehouse,
        monthlyComparison,
      },
    });
  } catch (error: any) {
    console.error('Error building dashboard summary:', error);
    res.status(500).json({ error: 'Error al obtener resumen del dashboard' });
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

app.put('/api/orders/:id', authenticateToken, requirePermission('VIEW_ORDERS', 'WRITE_ORDERS'), async (req, res) => {
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

    const activeInvoice = await prisma.invoice.findFirst({
      where: { orderId, sunatStatus: { notIn: ['REJECTED', 'VOIDED', 'ANULADO'] } }
    });
    if (activeInvoice) {
      return res.status(400).json({
        error: `No se puede editar un pedido que ya tiene un comprobante emitido (${activeInvoice.numberFormatted}).`
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

app.delete('/api/orders/:id', authenticateToken, requirePermission('VIEW_ORDERS', 'DELETE_ORDERS'), async (req, res) => {
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

        // Validation: No se puede eliminar si tiene comprobante electrónico activo
        const activeInvoice = await tx.invoice.findFirst({
          where: { orderId, sunatStatus: { notIn: ['REJECTED', 'VOIDED', 'ANULADO'] } }
        });
        if (activeInvoice) {
          throw new Error(`No se puede eliminar el pedido porque ya tiene un comprobante emitido (${activeInvoice.numberFormatted}).`);
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

        // 2. Anular pedido (conservar correlativo y trazabilidad)
        console.log(`[ANNUL ORDER] Annulling order record ${orderId}`);
        await tx.order.update({
          where: { id: orderId },
          data: { status: 'ANNULLED' }
        });

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

// --- API PAYMENTS ---
app.get('/api/payments', authenticateToken, async (req, res) => {
  try {
    const payments = await (prisma as any).payment.findMany({
      include: {
        order: {
          select: {
            id: true,
            docSeries: true,
            docNumber: true,
            customerName: true,
            customerDocNumber: true,
            totalAmount: true,
            paymentStatus: true,
            status: true,
            paymentCondition: true,
            warehouseStatus: true,
            createdAt: true
          }
        }
      },
      orderBy: { date: 'desc' }
    });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener cobros y adelantos' });
  }
});

app.post('/api/payments', authenticateToken, requirePermission('VIEW_ORDERS', 'WRITE_ORDERS'), async (req, res) => {
  try {
    const {
      orderId,
      amount,
      method,
      voucherNumber,
      date,
      bankName,
      accountNumber,
      ruc,
      currency,
      exchangeRate,
      originalAmount,
      observation
    } = req.body;
    
    // --- VALIDACIONES DE INTEGRIDAD ---
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'El monto del pago debe ser un número positivo.' });
    }

    const auditUser = await getAuditUserName(req);

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
          amount: parsedAmount,
          method,
          bankName: bankName || null,
          accountNumber: accountNumber || null,
          ruc: ruc ? String(ruc).trim() : null,
          currency: currency || 'PEN',
          exchangeRate: exchangeRate ? parseFloat(exchangeRate) : null,
          originalAmount: originalAmount ? parseFloat(originalAmount) : null,
          voucherNumber,
          observation: observation || null,
          createdBy: auditUser,
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

        // Si aún no había pasado a picking (ej. pedido al contado sin cobro previo), reservar stock y enviar a picking
        if (!order.warehouseStatus && order.items && order.items.length > 0) {
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

app.put('/api/payments/:id', authenticateToken, requirePermission('VIEW_ORDERS', 'WRITE_ORDERS'), async (req, res) => {
  try {
    const { id } = req.params;
    const paymentId = parseInt(id);
    const {
      amount,
      method,
      voucherNumber,
      date,
      bankName,
      accountNumber,
      ruc,
      currency,
      exchangeRate,
      originalAmount,
      observation
    } = req.body;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'El monto del pago debe ser un número positivo.' });
    }

    const auditUser = await getAuditUserName(req);

    const updated = await prisma.$transaction(async (tx) => {
      const existingPayment = await (tx as any).payment.findUnique({ where: { id: paymentId } });
      if (!existingPayment) throw new Error('Pago no encontrado');

      const order = await tx.order.findUnique({
        where: { id: existingPayment.orderId },
        include: { payments: true }
      });
      if (!order) throw new Error('Pedido asociado no encontrado');

      const amountChanged = Math.abs(parsedAmount - Number(existingPayment.amount)) > 0.01;
      if (amountChanged && ['DISPATCHED', 'SHIPPED', 'DELIVERED'].includes(order.status)) {
        throw new Error('No se puede modificar el monto de un cobro de un pedido ya despachado; solo datos de referencia.');
      }

      const otherPaid = order.payments
        .filter(p => p.id !== paymentId)
        .reduce((acc, p) => acc + Number(p.amount), 0);
      const maxAllowed = Number(order.totalAmount) - otherPaid;

      if (parsedAmount > maxAllowed + 0.01) {
        throw new Error(`El monto excede el saldo permitido del pedido. Máximo permitido: S/ ${maxAllowed.toFixed(2)}`);
      }

      const updatedPayment = await (tx as any).payment.update({
        where: { id: paymentId },
        data: {
          amount: parsedAmount,
          method,
          bankName: bankName || null,
          accountNumber: accountNumber || null,
          ruc: ruc ? String(ruc).trim() : null,
          currency: currency || 'PEN',
          exchangeRate: exchangeRate ? parseFloat(exchangeRate) : null,
          originalAmount: originalAmount ? parseFloat(originalAmount) : null,
          voucherNumber: voucherNumber || null,
          observation: observation || null,
          updatedBy: auditUser,
          date: date ? new Date(date) : existingPayment.date
        }
      });

      const totalPaidAfter = otherPaid + parsedAmount;
      const nextPaymentStatus = totalPaidAfter <= 0
        ? 'UNPAID'
        : (totalPaidAfter >= Number(order.totalAmount) - 0.01 ? 'PAID' : 'PARTIAL');

      await tx.order.update({
        where: { id: order.id },
        data: { paymentStatus: nextPaymentStatus }
      });

      return updatedPayment;
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error al actualizar el pago' });
  }
});

app.delete('/api/payments/:id', authenticateToken, requirePermission('VIEW_ORDERS', 'DELETE_ORDERS'), async (req, res) => {
  try {
    const { id } = req.params;
    const paymentId = parseInt(id);

    await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: paymentId } });
      if (!payment) throw new Error('Pago no encontrado');

      const existingOrder = await tx.order.findUnique({
        where: { id: payment.orderId }
      });
      if (existingOrder && ['DISPATCHED', 'SHIPPED', 'DELIVERED'].includes(existingOrder.status)) {
        throw new Error('No se puede anular un cobro de un pedido que ya fue despachado.');
      }

      await tx.payment.delete({ where: { id: paymentId } });

      // Recalcular estado del pedido
      const order = await tx.order.findUnique({
        where: { id: payment.orderId },
        include: { payments: true }
      });

      if (order) {
        const totalPaid = order.payments.reduce((acc, p) => acc + Number(p.amount), 0);
        const nextPaymentStatus = totalPaid <= 0 ? 'UNPAID' : (totalPaid >= Number(order.totalAmount) - 0.01 ? 'PAID' : 'PARTIAL');
        await tx.order.update({
          where: { id: order.id },
          data: { paymentStatus: nextPaymentStatus }
        });
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
      include: { warehouse: true, user: { select: { id: true, name: true, email: true } } },
      orderBy: { name: 'asc' } 
    });
    res.json(sellers);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener vendedores' });
  }
});

app.post('/api/sellers', authenticateToken, async (req, res) => {
  try {
    const { name, dni, phone, email, isActive, warehouseId, monthlyQuota, userId, quotationSeries, orderSeries } = req.body;
    const seller = await (prisma as any).seller.create({ 
      data: {
        name, dni, phone, email, 
        isActive: isActive !== undefined ? isActive : true,
        monthlyQuota: monthlyQuota !== undefined && monthlyQuota !== '' ? parseFloat(monthlyQuota) || 0 : 0,
        warehouseId: warehouseId ? parseInt(warehouseId) : null,
        userId: userId ? parseInt(userId) : null,
        quotationSeries: quotationSeries ? String(quotationSeries).trim().toUpperCase() : null,
        orderSeries: orderSeries ? String(orderSeries).trim().toUpperCase() : null,
      },
      include: { warehouse: true, user: { select: { id: true, name: true, email: true } } }
    });
    res.json(seller);
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return res.status(400).json({ error: 'El DNI o usuario vinculado ya está asignado a otro vendedor.' });
    }
    res.status(500).json({ error: 'Error al crear vendedor' });
  }
});

app.put('/api/sellers/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, dni, phone, email, isActive, warehouseId, monthlyQuota, userId, quotationSeries, orderSeries } = req.body;
    const seller = await (prisma as any).seller.update({ 
      where: { id: parseInt(id) }, 
      data: {
        name, dni, phone, email, 
        isActive,
        monthlyQuota: monthlyQuota !== undefined ? (monthlyQuota !== '' ? parseFloat(monthlyQuota) || 0 : 0) : undefined,
        warehouseId: warehouseId !== undefined ? (warehouseId ? parseInt(warehouseId) : null) : undefined,
        userId: userId !== undefined ? (userId ? parseInt(userId) : null) : undefined,
        quotationSeries: quotationSeries !== undefined ? (quotationSeries ? String(quotationSeries).trim().toUpperCase() : null) : undefined,
        orderSeries: orderSeries !== undefined ? (orderSeries ? String(orderSeries).trim().toUpperCase() : null) : undefined,
      },
      include: { warehouse: true, user: { select: { id: true, name: true, email: true } } }
    });
    res.json(seller);
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return res.status(400).json({ error: 'El DNI o usuario vinculado ya está asignado a otro vendedor.' });
    }
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
    const requestedSeries = req.query.series ? String(req.query.series).trim().toUpperCase() : undefined;
    const series = await (prisma as any).documentSeries.findFirst({
      where: { 
        warehouseId: parseInt(warehouseId), 
        documentType: docType,
        ...(requestedSeries ? { series: requestedSeries } : {}),
        isActive: true 
      }
    });
    
    if (!series) {
      return res.status(404).json({ error: 'No hay una serie configurada para este almacén y tipo de documento.' });
    }
    
    let maxExistingNum = 0;
    if (docType === 'COT') {
      const existingQuotes = await prisma.quotation.findMany({
        where: { docSeries: series.series, docType: 'COT' },
        select: { docNumber: true }
      });
      maxExistingNum = existingQuotes.reduce((max, q) => {
        const n = parseInt(q.docNumber || '0', 10);
        return !isNaN(n) && n > max ? n : max;
      }, 0);
    } else if (docType === 'PED') {
      const existingOrders = await prisma.order.findMany({
        where: { docSeries: series.series, docType: 'PED' },
        select: { docNumber: true }
      });
      maxExistingNum = existingOrders.reduce((max, o) => {
        const n = parseInt(o.docNumber || '0', 10);
        return !isNaN(n) && n > max ? n : max;
      }, 0);
    }

    const nextNumber = Math.max(series.currentNumber, maxExistingNum) + 1;
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

    // Incluir tipos de documentos internos para control de series/correlativos
    const internalTypes = [
      { id: -1, tableName: 'INTERNAL', code: 'COT', name: 'Cotización', isActive: true },
      { id: -2, tableName: 'INTERNAL', code: 'PED', name: 'Pedido', isActive: true },
    ];
    const existingCodes = new Set(types.map(t => t.code));
    const combined = [
      ...types,
      ...internalTypes.filter(t => !existingCodes.has(t.code))
    ];

    res.json(combined);
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
    const parsedFloorId = parseInt(floorId);
    const cleanCode = String(code || '').trim().toUpperCase();
    const cleanName = String(name || '').trim();

    const targetFloor = await (prisma as any).warehouseFloor.findUnique({ where: { id: parsedFloorId } });
    if (!targetFloor) {
      return res.status(404).json({ error: 'Piso no encontrado.' });
    }

    if (cleanCode) {
      const dupZone = await (prisma as any).warehouseZone.findFirst({
        where: {
          code: cleanCode,
          floor: { warehouseId: targetFloor.warehouseId }
        },
        include: { floor: true }
      });
      if (dupZone) {
        return res.status(400).json({
          error: `El código de zona "${cleanCode}" ya existe en este almacén (Piso: ${dupZone.floor?.name || dupZone.floorId}).`
        });
      }
    }

    const zone = await (prisma as any).warehouseZone.create({
      data: { floorId: parsedFloorId, name: cleanName, code: cleanCode }
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
    const zoneId = parseInt(id);
    const { name, code } = req.body;
    const cleanCode = String(code || '').trim().toUpperCase();
    const cleanName = String(name || '').trim();

    const existingZone = await (prisma as any).warehouseZone.findUnique({
      where: { id: zoneId },
      include: { floor: true }
    });
    if (!existingZone) {
      return res.status(404).json({ error: 'Zona no encontrada.' });
    }

    if (cleanCode) {
      const dupZone = await (prisma as any).warehouseZone.findFirst({
        where: {
          id: { not: zoneId },
          code: cleanCode,
          floor: { warehouseId: existingZone.floor.warehouseId }
        },
        include: { floor: true }
      });
      if (dupZone) {
        return res.status(400).json({
          error: `El código de zona "${cleanCode}" ya existe en este almacén (Piso: ${dupZone.floor?.name || dupZone.floorId}).`
        });
      }
    }

    const zone = await (prisma as any).warehouseZone.update({
      where: { id: zoneId },
      data: { name: cleanName, code: cleanCode }
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

    const token = process.env.APIPERU_TOKEN;
    if (!token || token === 'YOUR_TOKEN_HERE') {
      return res.status(500).json({ error: 'Token de APIPeru no configurado en el servidor.' });
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

    const token = process.env.APIPERU_TOKEN;
    if (!token || token === 'YOUR_TOKEN_HERE') {
      return res.status(500).json({ error: 'Token de APIPeru no configurado en el servidor.' });
    }

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
app.get('/api/roles', authenticateToken, requirePermission('ALL'), async (req, res) => {
  try {
    const roles = await prisma.role.findMany({
      include: { _count: { select: { users: true } } }
    });
    res.json(roles);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener roles' });
  }
});

app.post('/api/roles', authenticateToken, requirePermission('ALL'), async (req, res) => {
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

app.put('/api/roles/:id', authenticateToken, requirePermission('ALL'), async (req, res) => {
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
app.get('/api/users', authenticateToken, requirePermission('ALL'), async (req, res) => {
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

app.post('/api/users', authenticateToken, requirePermission('ALL'), async (req, res) => {
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

app.put('/api/users/:id', authenticateToken, requirePermission('ALL'), async (req, res) => {
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

app.post('/api/picking/operators', authenticateToken, requirePermission('VIEW_PICKING', 'WRITE_PICKING'), async (req, res) => {
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

app.put('/api/picking/operators/:id', authenticateToken, requirePermission('VIEW_PICKING', 'WRITE_PICKING'), async (req, res) => {
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
        agency: true,
        branch: true
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

app.put('/api/picking/:id/assign', authenticateToken, requirePermission('VIEW_PICKING', 'WRITE_PICKING'), async (req, res) => {
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

app.put('/api/picking/:id/prepare', authenticateToken, requirePermission('VIEW_PICKING', 'WRITE_PICKING'), async (req, res) => {
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

app.put('/api/picking/:id/dispatch', authenticateToken, requirePermission('VIEW_PICKING', 'WRITE_PICKING'), async (req, res) => {
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

// --- IMPORTACIÓN MASIVA DE SALDOS INICIALES / REGULARIZACIÓN EN NOTAS DE INGRESO ---
const parseFlexibleNumber = (val: any): number => {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (val === null || val === undefined) return 0;
  let s = String(val).trim();
  if (!s) return 0;
  // Formato europeo/latino: 26.000,00 o 5,354924
  if (s.includes(',') && s.includes('.')) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};

const parseFlexibleDate = (val: any): string | null => {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(excelEpoch.getTime() + val * 86400000);
    return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
  }
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const dd = dmy[1].padStart(2, '0');
    const mm = dmy[2].padStart(2, '0');
    return `${dmy[3]}-${mm}-${dd}`;
  }
  const parsed = new Date(s);
  return isNaN(parsed.getTime()) ? null : parsed.toISOString().split('T')[0];
};

const normalizeUnitText = (v: string) =>
  String(v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim()
    .replace(/ES$/, '')
    .replace(/S$/, '');

app.post('/api/entry-notes/import-preview', authenticateToken, async (req, res) => {
  try {
    const { rows = [], reasonCode = 'SALDO_INICIAL' } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'No se recibieron filas para validar.' });
    }

    const [warehouses, products, units, existingInitialCount] = await Promise.all([
      prisma.warehouse.findMany({
        include: { floors: { include: { zones: true } } },
      }),
      prisma.product.findMany({
        select: { id: true, code: true, name: true, unitId: true, weight: true },
      }),
      prisma.unit.findMany(),
      prisma.entryNote.count({
        where: { reasonCode: 'SALDO_INICIAL', status: 'APPROVED' },
      }),
    ]);

    const productByCode = new Map<string, any>();
    for (const p of products) {
      if (p.code) productByCode.set(p.code.trim().toUpperCase(), p);
    }

    const findUnit = (rawUnit: string, fallbackUnitId?: number | null) => {
      if (!rawUnit) {
        return units.find((u) => u.id === fallbackUnitId) || units[0] || null;
      }
      const rawUp = rawUnit.trim().toUpperCase();
      const norm = normalizeUnitText(rawUnit);
      return (
        units.find(
          (u) =>
            u.symbol.toUpperCase() === rawUp ||
            u.name.toUpperCase() === rawUp ||
            (u.sunatCode || '').toUpperCase() === rawUp ||
            normalizeUnitText(u.name) === norm ||
            normalizeUnitText(u.symbol) === norm
        ) ||
        (fallbackUnitId ? units.find((u) => u.id === fallbackUnitId) : null) ||
        null
      );
    };

    const resolveLocation = (rawSiglas: string) => {
      const clean = String(rawSiglas || '').trim().toUpperCase();
      if (!clean) return { warehouse: null, floor: null, zone: null };
      const parts = clean.split('.').map((s) => s.trim()).filter(Boolean);
      const whToken = parts[0] || clean;
      const floorToken = parts[1] || '';
      const zoneToken = parts[2] || '';

      const wh =
        warehouses.find(
          (w) =>
            (w.code && w.code.toUpperCase() === whToken) ||
            (w.sunatCode && w.sunatCode.toUpperCase() === whToken) ||
            w.name.toUpperCase() === clean ||
            w.name.toUpperCase() === whToken ||
            w.name.toUpperCase().startsWith(whToken)
        ) || null;

      if (!wh) return { warehouse: null, floor: null, zone: null };

      const floor = floorToken
        ? wh.floors.find(
            (f) =>
              (f.code && f.code.toUpperCase() === floorToken) ||
              f.name.toUpperCase() === floorToken
          ) || null
        : null;

      const zone =
        zoneToken && floor
          ? floor.zones.find(
              (z) =>
                (z.code && z.code.toUpperCase() === zoneToken) ||
                z.name.toUpperCase() === zoneToken
            ) || null
          : zoneToken
            ? wh.floors
                .flatMap((f) => f.zones)
                .find(
                  (z) =>
                    (z.code && z.code.toUpperCase() === zoneToken) ||
                    z.name.toUpperCase() === zoneToken
                ) || null
            : null;

      return { warehouse: wh, floor, zone };
    };

    const validatedRows = rows.map((row: any, idx: number) => {
      const siglas = String(row.siglasAlmacen || row.SiglasAlmacen || '').trim();
      const codProd = String(row.codProducto || row.CodProducto || '').trim().toUpperCase();
      const qty = parseFlexibleNumber(row.quantity ?? row.CantUnd ?? row.cantidad);
      const cost = parseFlexibleNumber(row.unitCost ?? row.Costo ?? row.costo);
      const lotNumber = String(row.lotNumber ?? row.Lote ?? row.lote ?? '').trim();
      const unitRaw = String(row.unitName ?? row['U.MED'] ?? row.umed ?? '').trim();
      const entryDate = parseFlexibleDate(row.entryDate ?? row.FechaIngreso ?? row.fechaIngreso) || new Date().toISOString().split('T')[0];
      const lotDate = parseFlexibleDate(row.lotDate ?? row.FechaLote ?? row.fechaLote);
      const orderNumber = String(row.orderNumber ?? row.Pedido ?? row.pedido ?? '').trim();

      const errors: string[] = [];
      const loc = resolveLocation(siglas);
      if (!loc.warehouse) errors.push(`Almacén no encontrado (${siglas || 'vacío'})`);

      const product = productByCode.get(codProd);
      if (!product) errors.push(`Producto no encontrado (${codProd || 'vacío'})`);

      const unit = findUnit(unitRaw, product?.unitId);
      if (!unit) errors.push(`Unidad no encontrada (${unitRaw || 'vacío'})`);

      if (qty <= 0) errors.push('Cantidad debe ser > 0');
      if (cost < 0) errors.push('Costo inválido');

      return {
        rowNumber: idx + 1,
        status: errors.length === 0 ? 'OK' : 'ERROR',
        errorMessage: errors.join(' | '),
        siglasAlmacen: siglas,
        warehouseId: loc.warehouse?.id || null,
        warehouseName: loc.warehouse?.name || '',
        floorId: loc.floor?.id || null,
        zoneId: loc.zone?.id || null,
        entryDate,
        codProducto: codProd,
        productId: product?.id || null,
        productName: product?.name || '',
        quantity: qty,
        unitCost: cost,
        total: Number((qty * cost).toFixed(2)),
        lotNumber,
        lotDate,
        unitId: unit?.id || null,
        unitSymbol: unit?.symbol || unitRaw,
        orderNumber,
      };
    });

    const validCount = validatedRows.filter((r) => r.status === 'OK').length;
    res.json({
      hasExistingInitialBalance: existingInitialCount > 0,
      reasonCode,
      summary: {
        total: validatedRows.length,
        valid: validCount,
        errors: validatedRows.length - validCount,
      },
      rows: validatedRows,
    });
  } catch (error: any) {
    console.error('Error in entry-notes import-preview:', error);
    res.status(500).json({ error: 'Error al validar plantilla: ' + error.message });
  }
});

app.post('/api/entry-notes/import', authenticateToken, async (req, res) => {
  try {
    const {
      reasonCode = 'SALDO_INICIAL',
      initialLoadType = 'CONTABLE',
      description = 'CARGA MASIVA DE INVENTARIO',
      exchangeRate = 1,
      supplierId,
      currency = 'PEN',
      allowDuplicateInitial = false,
      rows = [],
    } = req.body;

    const validRows = (Array.isArray(rows) ? rows : []).filter(
      (r: any) => r.status === 'OK' && r.warehouseId && r.productId && r.unitId && Number(r.quantity) > 0
    );

    if (validRows.length === 0) {
      return res.status(400).json({ error: 'No hay filas válidas para importar.' });
    }

    if (reasonCode === 'SALDO_INICIAL' && !allowDuplicateInitial) {
      const existingInitial = await prisma.entryNote.count({
        where: { reasonCode: 'SALDO_INICIAL', status: 'APPROVED' },
      });
      if (existingInitial > 0) {
        return res.status(400).json({
          error:
            'Ya existe una Nota de Ingreso aprobada de SALDO INICIAL. Para ajustes posteriores utilice el motivo REGULARIZACION o AJUSTE_INVENTARIO.',
        });
      }
    }

    // Agrupar por almacén
    const byWarehouse = new Map<number, any[]>();
    for (const r of validRows) {
      const whId = parseInt(String(r.warehouseId), 10);
      if (!byWarehouse.has(whId)) byWarehouse.set(whId, []);
      byWarehouse.get(whId)!.push(r);
    }

    const createdNotes = await prisma.$transaction(async (tx) => {
      const results: any[] = [];
      for (const [whId, whRows] of byWarehouse.entries()) {
        const firstRow = whRows[0];
        const noteDate = firstRow.entryDate ? new Date(firstRow.entryDate) : new Date();
        const calculatedTotal = whRows.reduce((s, r) => s + Number(r.quantity) * Number(r.unitCost || 0), 0);

        const newNote = await (tx as any).entryNote.create({
          data: {
            warehouseId: whId,
            floorId: firstRow.floorId || null,
            zoneId: firstRow.zoneId || null,
            currency: currency || 'PEN',
            exchangeRate: parseFloat(String(exchangeRate)) || 1.0,
            supplierId: supplierId ? parseInt(String(supplierId), 10) : null,
            date: noteDate,
            description: description || `${reasonCode} (${initialLoadType})`,
            reasonCode,
            initialLoadType: reasonCode === 'SALDO_INICIAL' ? initialLoadType : null,
            status: 'APPROVED',
            totalAmount: calculatedTotal,
            items: {
              create: whRows.map((item: any) => ({
                productId: parseInt(String(item.productId), 10),
                quantity: Number(item.quantity),
                unitId: parseInt(String(item.unitId), 10),
                unitCost: Number(item.unitCost || 0),
                total: Number(item.quantity) * Number(item.unitCost || 0),
                orderNumber: item.orderNumber || null,
                lotNumber: item.lotNumber || null,
                entryDate: item.entryDate ? new Date(item.entryDate) : noteDate,
              })),
            },
          },
        });

        for (const item of whRows) {
          const pId = parseInt(String(item.productId), 10);
          const qty = Number(item.quantity);
          const uCost = Number(item.unitCost || 0);
          const zId = item.zoneId ? parseInt(String(item.zoneId), 10) : null;
          const fId = item.floorId ? parseInt(String(item.floorId), 10) : null;
          const lot = item.lotNumber || null;

          const stockRecord = await (tx as any).stock.findFirst({
            where: {
              productId: pId,
              warehouseId: whId,
              zoneId: zId,
              lotNumber: lot,
            },
          });

          if (stockRecord) {
            await (tx as any).stock.update({
              where: { id: stockRecord.id },
              data: { quantity: { increment: qty } },
            });
          } else {
            await (tx as any).stock.create({
              data: {
                productId: pId,
                warehouseId: whId,
                floorId: fId,
                zoneId: zId,
                quantity: qty,
                lotNumber: lot,
                expiryDate: item.lotDate ? new Date(item.lotDate) : null,
              },
            });
          }

          await (tx as any).stockMovement.create({
            data: {
              productId: pId,
              toWarehouseId: whId,
              toZoneId: zId,
              quantity: qty,
              unitCost: uCost,
              totalCost: qty * uCost,
              movementDate: item.entryDate ? new Date(item.entryDate) : noteDate,
              sunatOperationCode: reasonCode === 'SALDO_INICIAL' ? '16' : '99',
              entryNoteId: newNote.id,
              type: 'INPUT',
              lotNumber: lot,
              observation: `Importación ${reasonCode} (${initialLoadType}) - ${item.siglasAlmacen || ''}`,
              status: 'COMPLETED',
            },
          });

          await (tx as any).product.update({
            where: { id: pId },
            data: {
              stock: { increment: qty },
              ...(uCost > 0 ? { costPrice: uCost } : {}),
            },
          });
        }

        results.push(newNote);
      }
      return results;
    });

    res.json({
      success: true,
      notesCreated: createdNotes.length,
      itemsImported: validRows.length,
    });
  } catch (error: any) {
    console.error('Error importing entry notes:', error);
    res.status(500).json({ error: 'Error al importar notas de ingreso: ' + error.message });
  }
});

// --- MOTOR DE KARDEX FÍSICO (12.1) Y VALORIZADO (13.1 SUNAT) ---
const buildProductKardex = async ({
  productId,
  warehouseId,
  startDate,
  endDate,
  mode = 'VALUED',
}: {
  productId: number;
  warehouseId: number | null;
  startDate?: string;
  endDate?: string;
  mode?: 'PHYSICAL' | 'VALUED';
}) => {
  const [product, warehouse, movements, invoiceItems, purchaseItems] = await Promise.all([
    prisma.product.findUnique({
      where: { id: productId },
      include: { unit: true, package: true, subPackage: true },
    }),
    warehouseId ? prisma.warehouse.findUnique({ where: { id: warehouseId } }) : Promise.resolve(null),
    prisma.stockMovement.findMany({
      where: {
        productId,
        status: 'COMPLETED',
      },
      include: {
        order: {
          select: {
            id: true, docType: true, docSeries: true, docNumber: true,
            items: { where: { productId }, select: { productId: true, lotNumber: true, unitMeasure: true, quantity: true } },
          },
        },
        purchase: {
          select: {
            id: true, docType: true, docSeries: true, docNumber: true, date: true, currency: true, exchangeRate: true,
            items: { where: { productId }, select: { productId: true, lotNumber: true, unitSymbol: true, quantity: true, price: true, isFree: true } },
          },
        },
        entryNote: { select: { id: true, documentType: true, series: true, number: true, reasonCode: true } },
        exitNote: { select: { id: true, documentType: true, series: true, number: true, reasonCode: true } },
        transfer: { select: { id: true, docNumber: true } },
        fromWarehouse: { select: { id: true, name: true } },
        toWarehouse: { select: { id: true, name: true } },
      },
      orderBy: [{ movementDate: 'asc' }, { id: 'asc' }],
    }),
    mode === 'VALUED'
      ? prisma.invoiceItem.findMany({
          where: {
            productId,
            invoice: {
              sunatStatus: { notIn: ['REJECTED', 'VOIDED', 'ANULADO'] },
              status: { notIn: ['VOIDED', 'ANULADO', 'ANNULLED'] },
              ...(warehouseId ? { warehouseId } : {}),
            },
          },
          include: {
            invoice: {
              select: {
                id: true,
                documentType: true,
                series: true,
                number: true,
                issueDate: true,
                createdAt: true,
                warehouseId: true,
                warehouse: { select: { id: true, name: true } },
                customerName: true,
              },
            },
          },
          orderBy: { id: 'asc' },
        })
      : Promise.resolve([]),
    mode === 'VALUED'
      ? prisma.purchaseItem.findMany({
          where: {
            productId,
            purchase: {
              status: { not: 'ANNULLED' },
              docType: { notIn: ['09', 'GRM', 'GUIA'] },
              ...(warehouseId
                ? {
                    OR: [
                      { warehouseId },
                      { reference: { warehouseId } },
                    ],
                  }
                : {}),
            },
          },
          include: {
            purchase: {
              select: {
                id: true,
                docType: true,
                docSeries: true,
                docNumber: true,
                date: true,
                createdAt: true,
                currency: true,
                exchangeRate: true,
                warehouseId: true,
              },
            },
          },
          orderBy: { id: 'asc' },
        })
      : Promise.resolve([]),
  ]);

  if (!product) {
    throw new Error('Producto no encontrado');
  }

  const resolveUnitMultiplier = (unitSymOrName?: string | null): number => {
    const clean = String(unitSymOrName || '').trim().toUpperCase();
    if (!clean) return 1;
    const baseSym = String(product.unit?.symbol || '').trim().toUpperCase();
    const baseName = String(product.unit?.name || '').trim().toUpperCase();
    if (clean === baseSym || clean === baseName) return 1;

    const subFactor = Number(product.quantityPerSubPackage || 1);
    const subSym = String(product.subPackage?.symbol || '').trim().toUpperCase();
    const subName = String(product.subPackage?.name || '').trim().toUpperCase();
    if (product.subPackage && (clean === subSym || clean === subName)) {
      return subFactor > 0 ? subFactor : 1;
    }

    const pkgFactor = Number(product.quantityPerPackage || 1) * (subFactor > 0 ? subFactor : 1);
    const pkgSym = String(product.package?.symbol || '').trim().toUpperCase();
    const pkgName = String(product.package?.name || '').trim().toUpperCase();
    if (product.package && (clean === pkgSym || clean === pkgName)) {
      return pkgFactor > 0 ? pkgFactor : 1;
    }
    return 1;
  };

  const startDt = startDate ? new Date(`${startDate}T00:00:00.000Z`) : null;
  const endDt = endDate ? new Date(`${endDate}T23:59:59.999Z`) : null;

  let runningQty = 0;
  let runningTotalCost = 0;
  let runningAvgCost = 0;

  let initialCaptured = false;
  let initialBalance = {
    quantity: 0,
    unitCost: 0,
    totalCost: 0,
  };

  const rows: any[] = [];
  let sumInQty = 0;
  let sumInTotal = 0;
  let sumOutQty = 0;
  let sumOutTotal = 0;

  type KardexEvent = {
    id: number;
    sortPriority: number;
    date: Date;
    direction: 'IN' | 'OUT';
    qty: number;
    unitMultiplier: number;
    rawTotalCost: number | null;
    rawUnitCost: number;
    docType: string;
    docSeries: string;
    docNumber: string;
    sunatOperationCode: string;
    lotNumber: string;
    warehouseName: string;
    observation: string;
  };

  const events: KardexEvent[] = [];

  for (const m of movements) {
    const movDate = new Date(m.movementDate || m.createdAt);

    // Determinar si el movimiento es ENTRADA o SALIDA según alcance (Por Almacén vs General)
    let direction: 'IN' | 'OUT' | null = null;
    if (warehouseId) {
      const isTo = m.toWarehouseId === warehouseId;
      const isFrom = m.fromWarehouseId === warehouseId;
      if (isTo && !isFrom) direction = 'IN';
      else if (isFrom && !isTo) direction = 'OUT';
      else continue;
    } else {
      if (m.type === 'INPUT') direction = 'IN';
      else if (m.type === 'OUTPUT') direction = 'OUT';
      else continue; // En General, traslados internos entre almacenes propios se netean
    }

    const rawQty = Number(m.quantity || 0);
    if (rawQty <= 0) continue;

    // En Kardex Valorizado (13.1), compras y ventas provienen directamente de PurchaseItem e InvoiceItem
    if (mode === 'VALUED' && (m.order || m.purchase || m.transfer)) {
      continue;
    }

    // Resolver Tipo/Serie/Número de Documento, Operación SUNAT (Tabla 12) y factor a unidad mínima
    let docType = '00';
    let docSeries = '';
    let docNumber = '';
    let sunatOp = m.sunatOperationCode || '';
    let unitMultiplier = 1;
    const effectiveMovDate = movDate;

    if (m.purchase) {
      docType = m.purchase.docType || '01';
      docSeries = m.purchase.docSeries || '';
      docNumber = m.purchase.docNumber || '';
      sunatOp = sunatOp || (docType === '50' ? '18' : '02');
      const matchedItem = (m.purchase.items || []).find(
        (it: any) => !m.lotNumber || it.lotNumber === m.lotNumber
      ) || (m.purchase.items || [])[0];
      const purchaseUnit = matchedItem?.unitSymbol || product.package?.symbol || product.subPackage?.symbol || product.unit?.symbol;
      unitMultiplier = resolveUnitMultiplier(purchaseUnit);
    } else if (m.order) {
      docType = m.order.docType || '00';
      docSeries = m.order.docSeries || '';
      docNumber = m.order.docNumber || String(m.order.id);
      sunatOp = sunatOp || '01';
      const matchedItem = (m.order.items || []).find(
        (it: any) => !m.lotNumber || it.lotNumber === m.lotNumber
      ) || (m.order.items || [])[0];
      const orderUnit = matchedItem?.unitMeasure || product.unit?.symbol;
      unitMultiplier = resolveUnitMultiplier(orderUnit);
    } else if (m.entryNote) {
      docType = m.entryNote.documentType || 'NI';
      docSeries = m.entryNote.series || 'NI';
      docNumber = m.entryNote.number || String(m.entryNote.id);
      sunatOp = sunatOp || (m.entryNote.reasonCode === 'SALDO_INICIAL' ? '16' : '99');
    } else if (m.exitNote) {
      docType = m.exitNote.documentType || 'NS';
      docSeries = m.exitNote.series || 'NS';
      docNumber = m.exitNote.number || String(m.exitNote.id);
      sunatOp = sunatOp || '99';
    } else if (m.transfer) {
      docType = 'GRM';
      docSeries = 'TRF';
      docNumber = m.transfer.docNumber || String(m.transfer.id);
      sunatOp = sunatOp || '11';
    } else {
      sunatOp = sunatOp || (direction === 'IN' ? '16' : '99');
    }

    const normalizedDocType = String(docType).trim().toUpperCase();
    if (normalizedDocType === '09') {
      docType = 'GRM';
    }

    // En Kardex Valorizado (13.1) no se consideran Guías de Remisión (09 / GRM); solo en Kardex Físico (12.1)
    if (mode === 'VALUED' && (normalizedDocType === '09' || normalizedDocType === 'GRM' || normalizedDocType === 'GUIA')) {
      continue;
    }

    if (endDt && effectiveMovDate > endDt) continue;

    events.push({
      id: m.id,
      sortPriority: direction === 'IN' ? 1 : 2,
      date: effectiveMovDate,
      direction,
      qty: rawQty * unitMultiplier,
      unitMultiplier,
      rawTotalCost: Number(m.totalCost || 0) > 0 ? Number(m.totalCost) : null,
      rawUnitCost: Number(m.unitCost || 0),
      docType,
      docSeries,
      docNumber,
      sunatOperationCode: sunatOp,
      lotNumber: m.lotNumber || '',
      warehouseName: direction === 'IN' ? (m.toWarehouse?.name || '') : (m.fromWarehouse?.name || ''),
      observation: m.observation || '',
    });
  }

  if (mode === 'VALUED') {
    for (const pi of purchaseItems as any[]) {
      const pur = pi.purchase;
      if (!pur) continue;
      const purDate = new Date(pur.date || pur.createdAt);
      if (endDt && purDate > endDt) continue;

      const rawDoc = String(pur.docType || '01').trim().toUpperCase();
      const docType =
        rawDoc === 'FACTURA' || rawDoc === 'FAC' ? '01' :
        rawDoc === 'BOLETA' || rawDoc === 'BOL' ? '03' :
        rawDoc === 'DUA' || rawDoc === 'DAM' ? '50' : rawDoc;
      const direction: 'IN' | 'OUT' = docType === '07' ? 'OUT' : 'IN';
      const sunatOp = docType === '50' ? '18' : docType === '07' ? '06' : '02';

      const purUnit = pi.unitSymbol || product.package?.symbol || product.subPackage?.symbol || product.unit?.symbol;
      const mult = resolveUnitMultiplier(purUnit);
      const rawQty = Number(pi.quantity || 0);
      const qty = rawQty * mult;
      if (qty <= 0) continue;

      const fx = String(pur.currency || '').toUpperCase() === 'USD' ? Number(pur.exchangeRate || 1) : 1;
      const rawTotal = (!pi.isFree && Number(pi.price || 0) > 0) ? rawQty * Number(pi.price) * fx : null;

      events.push({
        id: 200000000 + pi.id,
        sortPriority: direction === 'IN' ? 1 : 2,
        date: purDate,
        direction,
        qty,
        unitMultiplier: mult,
        rawTotalCost: rawTotal,
        rawUnitCost: 0,
        docType,
        docSeries: pur.docSeries || '',
        docNumber: pur.docNumber || String(pur.id),
        sunatOperationCode: sunatOp,
        lotNumber: pi.lotNumber || '',
        warehouseName: warehouse?.name || '',
        observation: `Compra ${pur.docSeries || ''}-${pur.docNumber || ''} (${docType})`,
      });
    }

    for (const ii of invoiceItems as any[]) {
      const inv = ii.invoice;
      if (!inv) continue;
      const invDate = new Date(inv.issueDate || inv.createdAt);
      if (endDt && invDate > endDt) continue;

      const rawDoc = String(inv.documentType || '01').trim().toUpperCase();
      const docType =
        rawDoc === 'FACT' ? '01' :
        rawDoc === 'BOOL' ? '03' :
        rawDoc === 'NCRE' ? '07' :
        rawDoc === 'NDEB' ? '08' : rawDoc;
      const direction: 'IN' | 'OUT' = docType === '07' ? 'IN' : 'OUT';
      const sunatOp = docType === '07' ? '05' : '01';
      const mult = resolveUnitMultiplier(ii.unitMeasure || product.unit?.symbol);
      const qty = Number(ii.quantity || 0) * mult;
      if (qty <= 0) continue;

      events.push({
        id: 100000000 + ii.id,
        sortPriority: direction === 'IN' ? 1 : 2,
        date: invDate,
        direction,
        qty,
        unitMultiplier: mult,
        rawTotalCost: null,
        rawUnitCost: 0,
        docType,
        docSeries: inv.series || '',
        docNumber: String(inv.number || '').padStart(8, '0'),
        sunatOperationCode: sunatOp,
        lotNumber: ii.lotNumber || '',
        warehouseName: inv.warehouse?.name || '',
        observation: `Comprobante ${inv.series}-${String(inv.number || '').padStart(8, '0')} (${inv.customerName || ''})`,
      });
    }
  }

  events.sort((a, b) => (
    a.date.getTime() - b.date.getTime() ||
    a.sortPriority - b.sortPriority ||
    a.id - b.id
  ));

  for (const ev of events) {
    // Capturar saldo inicial justo antes del primer movimiento dentro del rango
    if (startDt && !initialCaptured && ev.date >= startDt) {
      initialCaptured = true;
      initialBalance = {
        quantity: Number(runningQty.toFixed(3)),
        unitCost: Number((runningQty > 0 ? runningTotalCost / runningQty : 0).toFixed(6)),
        totalCost: Number(runningTotalCost.toFixed(2)),
      };
    }

    let inQty = 0;
    let inUnitCost = 0;
    let inTotalCost = 0;
    let outQty = 0;
    let outUnitCost = 0;
    let outTotalCost = 0;

    if (ev.direction === 'IN') {
      inQty = ev.qty;
      if (ev.rawTotalCost !== null && ev.rawTotalCost > 0) {
        inTotalCost = ev.rawTotalCost;
        inUnitCost = inQty > 0 ? inTotalCost / inQty : 0;
      } else if (ev.rawUnitCost > 0) {
        inUnitCost = ev.unitMultiplier > 1 ? ev.rawUnitCost / ev.unitMultiplier : ev.rawUnitCost;
        inTotalCost = inQty * inUnitCost;
      } else {
        const fallbackUnitCost = Number(product.costPrice || 0) / (ev.unitMultiplier > 1 ? ev.unitMultiplier : 1);
        inUnitCost = runningAvgCost > 0 ? runningAvgCost : fallbackUnitCost;
        inTotalCost = inQty * inUnitCost;
      }

      runningQty += inQty;
      runningTotalCost += inTotalCost;
      runningAvgCost = runningQty > 0 ? runningTotalCost / runningQty : inUnitCost;
    } else {
      outQty = ev.qty;
      const fallbackOutCost = (ev.rawUnitCost > 0 ? ev.rawUnitCost : Number(product.costPrice || 0)) / (ev.unitMultiplier > 1 ? ev.unitMultiplier : 1);
      outUnitCost = runningAvgCost > 0 ? runningAvgCost : fallbackOutCost;
      outTotalCost = outQty * outUnitCost;

      runningQty = Math.max(0, runningQty - outQty);
      runningTotalCost = Math.max(0, runningTotalCost - outTotalCost);
      if (runningQty === 0) runningTotalCost = 0;
    }

    // Si el movimiento es anterior a startDate, solo acumula para el Saldo Inicial
    if (startDt && ev.date < startDt) {
      continue;
    }

    sumInQty += inQty;
    sumInTotal += inTotalCost;
    sumOutQty += outQty;
    sumOutTotal += outTotalCost;

    const curAvg = runningQty > 0 ? runningTotalCost / runningQty : runningAvgCost;

    rows.push({
      id: ev.id,
      date: ev.date.toISOString().split('T')[0],
      docType: ev.docType,
      docSeries: ev.docSeries,
      docNumber: ev.docNumber,
      sunatOperationCode: ev.sunatOperationCode,
      direction: ev.direction,
      lotNumber: ev.lotNumber,
      warehouseName: ev.warehouseName,
      observation: ev.observation,
      inQty: Number(inQty.toFixed(3)),
      inUnitCost: Number(inUnitCost.toFixed(6)),
      inTotalCost: Number(inTotalCost.toFixed(2)),
      outQty: Number(outQty.toFixed(3)),
      outUnitCost: Number(outUnitCost.toFixed(6)),
      outTotalCost: Number(outTotalCost.toFixed(2)),
      balanceQty: Number(runningQty.toFixed(3)),
      balanceUnitCost: Number(curAvg.toFixed(6)),
      balanceTotalCost: Number(runningTotalCost.toFixed(2)),
    });
  }

  // Si no hubo movimientos dentro del rango, todo lo acumulado hasta endDt es el Saldo Inicial
  if (startDt && !initialCaptured) {
    initialBalance = {
      quantity: Number(runningQty.toFixed(3)),
      unitCost: Number((runningQty > 0 ? runningTotalCost / runningQty : 0).toFixed(6)),
      totalCost: Number(runningTotalCost.toFixed(2)),
    };
  }

  return {
    product: {
      id: product.id,
      code: product.code || '-',
      name: product.name,
      unitName: product.unit?.name || 'UNIDAD',
      unitSymbol: product.unit?.symbol || 'UND',
      sunatUnitCode: product.unit?.sunatCode || 'NIU',
    },
    scope: warehouse ? 'WAREHOUSE' : 'GENERAL',
    warehouse: warehouse ? { id: warehouse.id, name: warehouse.name, sunatCode: warehouse.sunatCode } : null,
    period: { startDate: startDate || null, endDate: endDate || null },
    initialBalance,
    totals: {
      inQty: Number(sumInQty.toFixed(3)),
      inTotalCost: Number(sumInTotal.toFixed(2)),
      outQty: Number(sumOutQty.toFixed(3)),
      outTotalCost: Number(sumOutTotal.toFixed(2)),
    },
    finalBalance: {
      quantity: Number(runningQty.toFixed(3)),
      unitCost: Number((runningQty > 0 ? runningTotalCost / runningQty : 0).toFixed(6)),
      totalCost: Number(runningTotalCost.toFixed(2)),
    },
    rows,
  };
};

app.get('/api/kardex/physical', authenticateToken, async (req, res) => {
  try {
    const productId = parseInt(String(req.query.productId || ''), 10);
    if (!productId) {
      return res.status(400).json({ error: 'Debe seleccionar un producto.' });
    }
    const whRaw = String(req.query.warehouseId || '');
    const warehouseId = whRaw && whRaw !== 'ALL' ? parseInt(whRaw, 10) : null;
    const startDate = req.query.startDate ? String(req.query.startDate) : undefined;
    const endDate = req.query.endDate ? String(req.query.endDate) : undefined;

    const result = await buildProductKardex({ productId, warehouseId, startDate, endDate, mode: 'PHYSICAL' });
    res.json({ format: '12.1', ...result });
  } catch (error: any) {
    console.error('Error generating physical kardex:', error);
    res.status(500).json({ error: error.message || 'Error al generar Kardex Físico' });
  }
});

app.get('/api/kardex/valued', authenticateToken, async (req, res) => {
  try {
    const productId = parseInt(String(req.query.productId || ''), 10);
    if (!productId) {
      return res.status(400).json({ error: 'Debe seleccionar un producto.' });
    }
    const whRaw = String(req.query.warehouseId || '');
    const warehouseId = whRaw && whRaw !== 'ALL' ? parseInt(whRaw, 10) : null;
    const startDate = req.query.startDate ? String(req.query.startDate) : undefined;
    const endDate = req.query.endDate ? String(req.query.endDate) : undefined;

    const result = await buildProductKardex({ productId, warehouseId, startDate, endDate, mode: 'VALUED' });
    res.json({ format: '13.1', ...result });
  } catch (error: any) {
    console.error('Error generating valued kardex:', error);
    res.status(500).json({ error: error.message || 'Error al generar Kardex Valorizado' });
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

      if (status === 'ACTIVE' || status === 'APPROVED' || status === 'COMPLETED') {
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
              unitCost: Number(item.unitCost || 0),
              totalCost: Number(item.total || (baseQuantity * Number(item.unitCost || 0))),
              movementDate: date ? new Date(date) : new Date(),
              sunatOperationCode: reasonCode === 'SALDO_INICIAL' ? '16' : '99',
              entryNoteId: newNote.id,
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

      if (status === 'ACTIVE' || status === 'APPROVED' || status === 'COMPLETED') {
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
              unitCost: Number(item.unitCost || 0),
              totalCost: Number(item.total || (baseQuantity * Number(item.unitCost || 0))),
              movementDate: updatedNote.date ? new Date(updatedNote.date) : new Date(),
              sunatOperationCode: updatedNote.reasonCode === 'SALDO_INICIAL' ? '16' : '99',
              entryNoteId: updatedNote.id,
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
            unitCost: Number(item.unitCost || 0),
            totalCost: Number(item.total || (baseQuantity * Number(item.unitCost || 0))),
            movementDate: note.date ? new Date(note.date) : new Date(),
            sunatOperationCode: note.reasonCode === 'SALDO_INICIAL' ? '16' : '99',
            entryNoteId: note.id,
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
        let baseQuantity = Number(item.quantity || 0);
        const product = item.product;
        if (product) {
          if (item.unitId === product.subPackageId) {
            baseQuantity = Number(item.quantity || 0) * (product.quantityPerSubPackage || 1);
          } else if (item.unitId === product.packageId) {
            baseQuantity = Number(item.quantity || 0) * (product.quantityPerPackage || 1) * (product.quantityPerSubPackage || 1);
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

// --- API EXIT NOTES (NOTAS DE SALIDA) ---
const computeExitBaseQuantity = (item: any, product: any) => {
  let baseQuantity = Number(item.quantity) || 0;
  if (product) {
    if (item.unitId === product.subPackageId) {
      baseQuantity = baseQuantity * (product.quantityPerSubPackage || 1);
    } else if (item.unitId === product.packageId) {
      baseQuantity = baseQuantity * (product.quantityPerPackage || 1) * (product.quantityPerSubPackage || 1);
    }
  }
  return baseQuantity;
};

const applyExitNoteStockDeduction = async (tx: any, note: any) => {
  for (const item of note.items) {
    const baseQuantity = computeExitBaseQuantity(item, item.product);
    const stockRecord = await tx.stock.findFirst({
      where: {
        productId: item.productId,
        warehouseId: note.warehouseId,
        zoneId: note.zoneId || null,
        lotNumber: item.lotNumber || null,
      },
    });
    if (!stockRecord || stockRecord.quantity < baseQuantity) {
      throw new Error(`Stock insuficiente para "${item.product?.name || item.productId}" en la ubicación/lote seleccionado (disponible: ${stockRecord?.quantity || 0}, requerido: ${baseQuantity}).`);
    }
    await tx.stock.update({
      where: { id: stockRecord.id },
      data: { quantity: { decrement: baseQuantity } },
    });
    await tx.stockMovement.create({
      data: {
        productId: item.productId,
        fromWarehouseId: note.warehouseId,
        fromZoneId: note.zoneId || null,
        quantity: baseQuantity,
        unitCost: Number(item.unitCost || 0),
        totalCost: Number(item.total || (baseQuantity * Number(item.unitCost || 0))),
        movementDate: note.date ? new Date(note.date) : new Date(),
        sunatOperationCode: '99',
        exitNoteId: note.id,
        type: 'OUTPUT',
        lotNumber: item.lotNumber || null,
        observation: `Nota de Salida ${note.series || ''}-${note.number || ''} (${note.reasonCode})`,
        status: 'COMPLETED',
      },
    });
    await tx.product.update({
      where: { id: item.productId },
      data: { stock: { decrement: baseQuantity } },
    });
  }
};

app.get('/api/exit-notes', authenticateToken, async (req, res) => {
  try {
    const { status, warehouseId, customerId, dateFrom, dateTo, search } = req.query;
    const where: any = {};

    if (status) where.status = status;
    if (warehouseId) where.warehouseId = parseInt(warehouseId as string);
    if (customerId) where.customerId = parseInt(customerId as string);
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

    const notes = await (prisma as any).exitNote.findMany({
      where,
      include: {
        warehouse: true,
        customer: true,
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
    res.status(500).json({ error: 'Error al obtener notas de salida: ' + error.message });
  }
});

app.get('/api/exit-notes/:id', authenticateToken, async (req, res) => {
  try {
    const note = await (prisma as any).exitNote.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        warehouse: true,
        customer: true,
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
    if (!note) return res.status(404).json({ error: 'Nota de salida no encontrada' });
    res.json(note);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener nota de salida: ' + error.message });
  }
});

app.post('/api/exit-notes', authenticateToken, async (req, res) => {
  try {
    const {
      warehouseId, zoneId, floorId, currency, exchangeRate, customerId, date, description,
      reasonCode, guideRemission, status, documentType, series, number, items
    } = req.body;

    if (!warehouseId) return res.status(400).json({ error: 'Debe seleccionar un almacén.' });
    if (!reasonCode) return res.status(400).json({ error: 'Debe seleccionar un motivo.' });
    if (!date) return res.status(400).json({ error: 'La fecha es obligatoria.' });
    if (!items || items.length === 0) return res.status(400).json({ error: 'La nota de salida debe tener al menos un producto.' });

    for (const item of items) {
      if (!item.productId || !item.quantity || Number(item.quantity) <= 0 || !item.unitId) {
        return res.status(400).json({ error: 'Cada ítem debe tener producto, cantidad > 0 y unidad de medida.' });
      }
    }

    const totalAmount = items.reduce((sum: number, i: any) => sum + Number(i.quantity) * Number(i.unitCost || 0), 0);
    const targetStatus = status || 'ACTIVE';

    const created = await prisma.$transaction(async (tx: any) => {
      const note = await tx.exitNote.create({
        data: {
          warehouseId: parseInt(warehouseId),
          zoneId: zoneId ? parseInt(zoneId) : null,
          floorId: floorId ? parseInt(floorId) : null,
          currency: currency || 'PEN',
          exchangeRate: exchangeRate ? parseFloat(exchangeRate) : 1.0,
          customerId: customerId ? parseInt(customerId) : null,
          date: new Date(date),
          description: description || null,
          reasonCode,
          guideRemission: guideRemission || null,
          status: targetStatus,
          documentType: documentType || null,
          series: series || null,
          number: number || null,
          totalAmount,
          items: {
            create: items.map((i: any) => ({
              productId: parseInt(i.productId),
              guideRemission: i.guideRemission || null,
              documentType: i.documentType || null,
              documentNumber: i.documentNumber || null,
              quantity: parseInt(i.quantity),
              unitId: parseInt(i.unitId),
              unitCost: Number(i.unitCost || 0),
              total: Number(i.quantity) * Number(i.unitCost || 0),
              orderNumber: i.orderNumber || null,
              lotNumber: i.lotNumber || null,
              exitDate: i.exitDate ? new Date(i.exitDate) : new Date(date),
              weight: i.weight !== undefined && i.weight !== null && i.weight !== '' ? Number(i.weight) : null,
              totalWeight: i.totalWeight !== undefined && i.totalWeight !== null && i.totalWeight !== '' ? Number(i.totalWeight) : null,
            })),
          },
        },
        include: {
          warehouse: true,
          customer: true,
          zone: true,
          floor: true,
          items: {
            include: {
              product: { include: { unit: true, package: true, subPackage: true } },
              unit: true,
            },
          },
        },
      });

      if (targetStatus === 'ACTIVE' || targetStatus === 'APPROVED' || targetStatus === 'COMPLETED') {
        await applyExitNoteStockDeduction(tx, note);
      }

      return note;
    });

    res.json(created);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error al registrar nota de salida' });
  }
});

app.put('/api/exit-notes/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await (prisma as any).exitNote.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Nota de salida no encontrada' });
    if (!['DRAFT', 'PENDING'].includes(existing.status)) {
      return res.status(400).json({ error: 'Solo se pueden editar notas en estado Borrador o Pendiente.' });
    }

    const {
      warehouseId, zoneId, floorId, currency, exchangeRate, customerId, date, description,
      reasonCode, guideRemission, status, documentType, series, number, items
    } = req.body;

    if (!warehouseId) return res.status(400).json({ error: 'Debe seleccionar un almacén.' });
    if (!reasonCode) return res.status(400).json({ error: 'Debe seleccionar un motivo.' });
    if (!items || items.length === 0) return res.status(400).json({ error: 'Debe agregar al menos un producto.' });

    const totalAmount = items.reduce((sum: number, i: any) => sum + Number(i.quantity) * Number(i.unitCost || 0), 0);
    const targetStatus = status || existing.status;

    const updated = await prisma.$transaction(async (tx: any) => {
      await tx.exitNoteItem.deleteMany({ where: { exitNoteId: id } });
      const note = await tx.exitNote.update({
        where: { id },
        data: {
          warehouseId: parseInt(warehouseId),
          zoneId: zoneId ? parseInt(zoneId) : null,
          floorId: floorId ? parseInt(floorId) : null,
          currency: currency || 'PEN',
          exchangeRate: exchangeRate ? parseFloat(exchangeRate) : 1.0,
          customerId: customerId ? parseInt(customerId) : null,
          date: new Date(date),
          description: description || null,
          reasonCode,
          guideRemission: guideRemission || null,
          status: targetStatus,
          documentType: documentType || null,
          series: series || null,
          number: number || null,
          totalAmount,
          items: {
            create: items.map((i: any) => ({
              productId: parseInt(i.productId),
              guideRemission: i.guideRemission || null,
              documentType: i.documentType || null,
              documentNumber: i.documentNumber || null,
              quantity: parseInt(i.quantity),
              unitId: parseInt(i.unitId),
              unitCost: Number(i.unitCost || 0),
              total: Number(i.quantity) * Number(i.unitCost || 0),
              orderNumber: i.orderNumber || null,
              lotNumber: i.lotNumber || null,
              exitDate: i.exitDate ? new Date(i.exitDate) : new Date(date),
              weight: i.weight !== undefined && i.weight !== null && i.weight !== '' ? Number(i.weight) : null,
              totalWeight: i.totalWeight !== undefined && i.totalWeight !== null && i.totalWeight !== '' ? Number(i.totalWeight) : null,
            })),
          },
        },
        include: {
          warehouse: true,
          customer: true,
          zone: true,
          floor: true,
          items: {
            include: {
              product: { include: { unit: true, package: true, subPackage: true } },
              unit: true,
            },
          },
        },
      });

      if (targetStatus === 'ACTIVE' || targetStatus === 'APPROVED' || targetStatus === 'COMPLETED') {
        await applyExitNoteStockDeduction(tx, note);
      }

      return note;
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error al actualizar nota de salida' });
  }
});

app.delete('/api/exit-notes/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await (prisma as any).exitNote.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Nota de salida no encontrada' });
    if (existing.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Solo se pueden eliminar notas en estado Borrador.' });
    }
    await (prisma as any).exitNote.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al eliminar nota de salida: ' + error.message });
  }
});

app.post('/api/exit-notes/:id/approve', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const note = await (prisma as any).exitNote.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: { include: { unit: true, package: true, subPackage: true } },
            unit: true,
          },
        },
        warehouse: true,
        customer: true,
        zone: true,
        floor: true,
      },
    });
    if (!note) return res.status(404).json({ error: 'Nota de salida no encontrada' });
    if (note.status === 'APPROVED' || note.status === 'COMPLETED') {
      return res.status(400).json({ error: 'La nota ya está aprobada o completada.' });
    }

    const updated = await prisma.$transaction(async (tx: any) => {
      await applyExitNoteStockDeduction(tx, note);
      return tx.exitNote.update({
        where: { id: note.id },
        data: { status: 'APPROVED' },
        include: {
          items: { include: { product: { include: { unit: true, package: true, subPackage: true } }, unit: true } },
          warehouse: true,
          customer: true,
          zone: true,
          floor: true,
        },
      });
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error al aprobar nota de salida' });
  }
});

app.post('/api/exit-notes/:id/annul', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const note = await (prisma as any).exitNote.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: { include: { unit: true, package: true, subPackage: true } },
            unit: true,
          },
        },
      },
    });
    if (!note) return res.status(404).json({ error: 'Nota de salida no encontrada' });
    if (note.status === 'ANNULLED') {
      return res.status(400).json({ error: 'La nota ya está anulada.' });
    }
    if (note.status === 'DRAFT' || note.status === 'PENDING') {
      const updated = await (prisma as any).exitNote.update({
        where: { id: note.id },
        data: { status: 'ANNULLED' },
        include: { items: { include: { product: true } }, warehouse: true, customer: true, zone: true, floor: true },
      });
      return res.json(updated);
    }

    await prisma.$transaction(async (tx: any) => {
      for (const item of note.items) {
        const baseQuantity = computeExitBaseQuantity(item, item.product);
        const stockRecord = await tx.stock.findFirst({
          where: {
            productId: item.productId,
            warehouseId: note.warehouseId,
            zoneId: note.zoneId || null,
            lotNumber: item.lotNumber || null,
          },
        });
        if (stockRecord) {
          await tx.stock.update({
            where: { id: stockRecord.id },
            data: { quantity: { increment: baseQuantity } },
          });
        } else {
          await tx.stock.create({
            data: {
              productId: item.productId,
              warehouseId: note.warehouseId,
              zoneId: note.zoneId || null,
              floorId: note.floorId || null,
              quantity: baseQuantity,
              lotNumber: item.lotNumber || null,
            },
          });
        }
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            toWarehouseId: note.warehouseId,
            toZoneId: note.zoneId || null,
            quantity: baseQuantity,
            type: 'INPUT',
            lotNumber: item.lotNumber || null,
            observation: `ANULACIÓN Nota de Salida ${note.series || ''}-${note.number || ''}`,
            status: 'COMPLETED',
          },
        });
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: baseQuantity } },
        });
      }
      await tx.exitNote.update({
        where: { id: note.id },
        data: { status: 'ANNULLED' },
      });
    });

    const updated = await (prisma as any).exitNote.findUnique({
      where: { id: note.id },
      include: { items: { include: { product: true } }, warehouse: true, customer: true, zone: true, floor: true },
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al anular nota de salida: ' + error.message });
  }
});

const SUNAT_ENTRY_REASON_CODES = ['02', '03', '05', '16', '18', '19', '20', '21', '22', '24', '26', '28', '29', '31', '99'];
const SUNAT_EXIT_REASON_CODES = ['01', '04', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '17', '23', '25', '27', '28', '30', '32', '99'];

const getSunatOperationReasons = async (codes: string[]) => {
  let reasons = await prisma.sunatTable.findMany({
    where: { tableName: 'TABLA_12', code: { in: codes }, isActive: true },
    orderBy: { code: 'asc' },
  });
  if (reasons.length === 0) {
    reasons = await prisma.sunatTable.findMany({
      where: { tableName: 'motivo', code: { in: codes }, isActive: true },
      orderBy: { code: 'asc' },
    });
  }
  return reasons;
};

app.get('/api/entry-notes/reasons', authenticateToken, async (req, res) => {
  try {
    const reasons = await getSunatOperationReasons(SUNAT_ENTRY_REASON_CODES);
    res.json(reasons);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener motivos: ' + error.message });
  }
});

app.get('/api/exit-notes/reasons', authenticateToken, async (req, res) => {
  try {
    const reasons = await getSunatOperationReasons(SUNAT_EXIT_REASON_CODES);
    res.json(reasons);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener motivos de salida: ' + error.message });
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
