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
    cb(null, 'public/uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

app.use(cors());
app.use(express.json());
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
  if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo' });
  
  const originalPath = req.file.path;
  const fileName = `${path.parse(req.file.filename).name}.webp`;
  const optimizedPath = path.join(uploadsDir, fileName);

  try {
    // Process image with sharp: resize if too large, convert to webp
    await sharp(originalPath)
      .resize(1200, null, { withoutEnlargement: true }) // Max width 1200px
      .webp({ quality: 95 })
      .toFile(optimizedPath);
    
    // Remove original file
    fs.unlinkSync(originalPath);
    
    const url = `/uploads/${fileName}`;
    res.json({ url });
  } catch (error) {
    console.error('Error optimizing image:', error);
    // If optimization fails, still return original URL but ideally we want optimized
    const url = `/uploads/${req.file.filename}`;
    res.json({ url });
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
app.get('/api/products', async (req, res) => {
  try {
    const products = await (prisma as any).product.findMany({
      include: { 
        category: true,
        brand: true,
        unit: true,
        stockRecords: {
          include: { 
            warehouse: true,
            zone: {
              include: { floor: true }
            }
          }
        }
      }
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

app.post('/api/products', authenticateToken, async (req, res) => {
  try {
    const { 
      name, slug, stock, categoryId, images, code, weight, 
      description, features, sanitaryRegister, certificate,
      igv, costPrice, salePrice, minSalePrice, maxSalePrice,
      brandId, unitId, isActive
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
        stock: parseInt(stock) || 0, 
        categoryId: parsedCategoryId, 
        images,
        code, weight, description, features, sanitaryRegister, certificate,
        igv: parseFloat(igv) || 18,
        costPrice: parseFloat(costPrice) || 0,
        salePrice: parseFloat(salePrice) || 0,
        minSalePrice: minSalePrice ? parseFloat(minSalePrice) : null,
        maxSalePrice: maxSalePrice ? parseFloat(maxSalePrice) : null,
        brandId: brandId ? parseInt(brandId) : null,
        unitId: unitId ? parseInt(unitId) : null,
        isActive: isActive !== undefined ? isActive : true
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
      name, slug, stock, categoryId, images, code, weight, 
      description, features, sanitaryRegister, certificate,
      igv, costPrice, salePrice, minSalePrice, maxSalePrice,
      brandId, unitId, isActive
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
        stock: parseInt(stock) || 0, 
        categoryId: parsedCategoryId, 
        images,
        code, weight, description, features, sanitaryRegister, certificate,
        igv: parseFloat(igv) || 18,
        costPrice: parseFloat(costPrice) || 0,
        salePrice: parseFloat(salePrice) || 0,
        minSalePrice: minSalePrice ? parseFloat(minSalePrice) : null,
        maxSalePrice: maxSalePrice ? parseFloat(maxSalePrice) : null,
        brandId: brandId ? parseInt(brandId) : null,
        unitId: unitId ? parseInt(unitId) : null,
        isActive: isActive !== undefined ? isActive : true
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
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, series: (user as any).series } });
  } catch (error) {
    res.status(500).json({ error: 'Error en el inicio de sesión' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ 
      where: { id: (req as any).user.userId },
      select: { id: true, email: true, name: true, series: true }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuario' });
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
        'document_type': [
          { code: '01', name: 'DNI' },
          { code: '06', name: 'RUC' },
          { code: '04', name: 'CARNET EXTRANJERIA' },
          { code: '07', name: 'PASAPORTE' },
          { code: '00', name: 'OTROS' }
        ],
        'currency': [
          { code: 'PEN', name: 'SOLES' },
          { code: 'USD', name: 'DOLARES' }
        ],
        'payment_condition': [
          { code: 'CONTADO', name: 'CONTADO' },
          { code: 'CREDITO', name: 'CREDITO' }
        ],
        'operation_type': [
          { code: '10', name: 'GRAVADO - OPERACIÓN ONEROSA' },
          { code: '20', name: 'EXONERADO - OPERACIÓN ONEROSA' },
          { code: '30', name: 'INAFECTO - OPERACIÓN ONEROSA' }
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
    const token = process.env.APIPERU_TOKEN;
    if (!token) {
      return res.status(500).json({ error: 'Token de APIPeru no configurado en el servidor.' });
    }

    const response = await axios.get(`https://dniruc.apisperu.com/api/v1/tipo-cambio-sunat?token=${token}`, {
      timeout: 10000
    });

    if (response.data && response.data.success) {
      // Mapeamos al formato que espera el frontend
      res.json({
        compra: response.data.result.compra,
        venta: response.data.result.venta,
        fecha: response.data.result.fecha
      });
    } else {
      res.status(404).json({ error: 'No se pudo obtener el tipo de cambio de la SUNAT.' });
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

    // Si es persona natural, construimos el nombre completo si no viene
    if (personType === 'NATURAL' && !name) {
      name = [firstName, secondName, lastName, surname].filter(Boolean).join(' ');
    }
    
    // Si no hay código, usamos el número de documento
    if (!code) code = docNumber;

    const customer = await prisma.customer.create({
      data: { 
        name, docType, docNumber, address, phone, email, contact, code,
        personType: personType || 'NATURAL', 
        firstName, secondName, lastName, surname,
        country, department, province, district
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

    if (personType === 'NATURAL' && !name) {
      name = [firstName, secondName, lastName, surname].filter(Boolean).join(' ');
    }

    const customer = await prisma.customer.update({
      where: { id: parseInt(id) },
      data: { 
        name, docType, docNumber, address, phone, email, contact, code,
        personType: firstName ? personType : undefined, 
        firstName, secondName, lastName, surname,
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
        stockRecords: true
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
        items: { include: { product: true } },
        customer: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(quotations);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener cotizaciones' });
  }
});

app.post('/api/quotations', authenticateToken, async (req, res) => {
  try {
    const { 
      customerId, customerName, customerPhone, customerEmail, customerDocType, 
      customerDocNumber, customerAddress, docType, docSeries, docNumber,
      internalCode, igvPercent, exchangeRate, dueDate, sellerName, includeIgv, 
      priceIncludesIgv, operationType, paymentCondition, currency, items, 
      totalAmount, globalDiscount, flete, billingStatus, purchaseOrder, 
      requirementNumber, pickupPlace, observation, notes, agencyId 
    } = req.body;

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

    const quotation = await (prisma.quotation as any).create({
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
        sellerName, includeIgv, 
        priceIncludesIgv, operationType, paymentCondition, currency, 
        totalAmount: parseFloat(totalAmount as any) || 0, 
        globalDiscount: parseFloat(globalDiscount as any) || 0, 
        flete: parseFloat(flete as any) || 0, 
        billingStatus, purchaseOrder, 
        requirementNumber, pickupPlace, observation, notes,
        agencyId: (agencyId && !isNaN(parseInt(agencyId))) ? parseInt(agencyId) : null,
        items: {
          create: (items || []).map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            discount: item.discount || 0
          }))
        }
      } as any,
      include: { items: true }
    });

    // Incrementar correlativo si es una serie válida
    if (docSeries && docNumber && pickupPlace) {
      const warehouse = await (prisma as any).warehouse.findFirst({ where: { name: pickupPlace } });
      if (warehouse) {
        await (prisma as any).documentSeries.updateMany({
          where: { 
            warehouseId: warehouse.id, 
            documentType: docType, 
            series: docSeries 
          },
          data: { currentNumber: parseInt(docNumber) }
        });
      }
    }

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
      internalCode, igvPercent, exchangeRate, dueDate, sellerName, includeIgv, 
      priceIncludesIgv, operationType, paymentCondition, currency, items, 
      totalAmount, globalDiscount, flete, billingStatus, purchaseOrder, 
      requirementNumber, pickupPlace, observation, notes, agencyId 
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
        sellerName, includeIgv, 
        priceIncludesIgv, operationType, paymentCondition, currency, 
        totalAmount: parseFloat(totalAmount as any) || 0, 
        globalDiscount: parseFloat(globalDiscount as any) || 0, 
        flete: parseFloat(flete as any) || 0, 
        billingStatus, purchaseOrder, 
        requirementNumber, pickupPlace, observation, notes,
        agencyId: (agencyId && !isNaN(parseInt(agencyId))) ? parseInt(agencyId) : null,
        items: {
          create: (items || []).map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            discount: item.discount || 0
          }))
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

// --- API ORDERS ---
app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: { 
        items: { include: { product: true } },
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

app.post('/api/orders', async (req, res) => {
  try {
    const { 
      customerId, customerName, customerEmail, customerPhone, customerCity, customerAddress, 
      customerDocType, customerDocNumber, docType, docSeries, docNumber,
      exchangeRate, dueDate, sellerName, includeIgv, purchaseOrder, requirementNumber,
      consigneeName, consigneePhone, consigneeDocNumber, consigneeAddress,
      notes, items, totalAmount, quotationId, paymentStatus, shippingCost, agencyId,
      currency, paymentCondition, pickupPlace
    } = req.body;
    
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'El pedido debe tener al menos un producto' });
    }

    const order = await prisma.$transaction(async (tx) => {
      // 1. Create the order
      const newOrder = await tx.order.create({
        data: {
          customerId: customerId ? parseInt(customerId) : null,
          customerName,
          customerEmail,
          customerPhone,
          customerCity,
          customerAddress,
          customerDocType,
          customerDocNumber,
          docType: docType || 'COT',
          docSeries,
          docNumber,
          exchangeRate: parseFloat(exchangeRate) || 1.0,
          dueDate: dueDate ? new Date(dueDate) : null,
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
          notes,
          totalAmount,
          quotationId: quotationId ? parseInt(quotationId) : null,
          paymentStatus: paymentStatus || 'UNPAID',
          shippingCost: parseFloat(shippingCost) || 0,
          agencyId: agencyId ? parseInt(agencyId) : null,
          status: 'PENDING',
          items: {
            create: items.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              discount: parseFloat(item.discount) || 0
            }))
          }
        },
        include: { items: true }
      });

      // 2. If it's a CREDIT order, move stock immediately
      if (paymentStatus === 'CREDIT') {
        await moveStockToTemp(tx, newOrder.id, items);
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
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Error al procesar el pedido' });
  }
});

// --- HELPERS ---
async function moveStockToTemp(tx: any, orderId: number, items: any[]) {
  const existencias = await tx.warehouse.findUnique({ where: { name: 'Existencias' } });
  const comprobante = await tx.warehouse.findUnique({ where: { name: 'Comprobante' } });
  const despacho = await tx.warehouse.findUnique({ where: { name: 'Despacho' } });

  if (!existencias || !comprobante || !despacho) {
    throw new Error('Almacenes no configurados correctamente');
  }

  for (const item of items) {
    // 1. Salida de Existencias
    await tx.stock.upsert({
      where: { productId_warehouseId: { productId: item.productId, warehouseId: existencias.id } },
      update: { quantity: { decrement: item.quantity } },
      create: { productId: item.productId, warehouseId: existencias.id, quantity: -item.quantity }
    });

    // 2. Ingreso a Comprobante
    await tx.stock.upsert({
      where: { productId_warehouseId: { productId: item.productId, warehouseId: comprobante.id } },
      update: { quantity: { increment: item.quantity } },
      create: { productId: item.productId, warehouseId: comprobante.id, quantity: item.quantity }
    });

    // 3. Ingreso a Despacho
    await tx.stock.upsert({
      where: { productId_warehouseId: { productId: item.productId, warehouseId: despacho.id } },
      update: { quantity: { increment: item.quantity } },
      create: { productId: item.productId, warehouseId: despacho.id, quantity: item.quantity }
    });

    // 4. Record movement
    await tx.stockMovement.create({
      data: {
        productId: item.productId,
        fromWarehouseId: existencias.id,
        toWarehouseId: despacho.id, // Primary destination for preparation
        quantity: item.quantity,
        orderId,
        type: 'TRANSFER'
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

      // If status is being set to DISPATCHED, handle final stock exit from Despacho
      if (status === 'DISPATCHED' && order.status !== 'DISPATCHED') {
        const despacho = await tx.warehouse.findUnique({ where: { name: 'Despacho' } });
        const comprobante = await tx.warehouse.findUnique({ where: { name: 'Comprobante' } });

        if (despacho && comprobante) {
          for (const item of order.items) {
            // Remove from temp warehouses
            await tx.stock.update({
              where: { productId_warehouseId: { productId: item.productId, warehouseId: despacho.id } },
              data: { quantity: { decrement: item.quantity } }
            });
            await tx.stock.update({
              where: { productId_warehouseId: { productId: item.productId, warehouseId: comprobante.id } },
              data: { quantity: { decrement: item.quantity } }
            });
          }
        }
      }

      return await tx.order.update({
        where: { id: orderId },
        data: { status, referralGuide, carrierGuide }
      });
    });

    res.json(updatedOrder);
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Error al actualizar el estado' });
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

app.delete('/api/orders/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.order.delete({ where: { id: parseInt(id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar pedido' });
  }
});

// --- API SELLERS ---
app.get('/api/sellers', authenticateToken, async (req, res) => {
  try {
    const sellers = await (prisma as any).seller.findMany({ orderBy: { name: 'asc' } });
    res.json(sellers);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener vendedores' });
  }
});

app.post('/api/sellers', authenticateToken, async (req, res) => {
  try {
    const seller = await (prisma as any).seller.create({ data: req.body });
    res.json(seller);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear vendedor' });
  }
});

app.put('/api/sellers/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const seller = await (prisma as any).seller.update({ where: { id: parseInt(id) }, data: req.body });
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
    const { name, code, commercialName, address, ruc, ubigeo, observation, phones, type, validateStock, isActive } = req.body;
    const warehouse = await (prisma as any).warehouse.create({
      data: {
        name,
        code,
        commercialName,
        address,
        ruc,
        ubigeo,
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

// --- SUNAT TABLES ---
app.get('/api/sunat/:tableName', authenticateToken, async (req, res) => {
  try {
    const { tableName } = req.params;
    const records = await prisma.sunatTable.findMany({
      where: { tableName, isActive: true },
      orderBy: { code: 'asc' }
    });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener tablas SUNAT' });
  }
});

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

// --- CONSULTA RUC/DNI (APIPeru.dev) ---
app.get('/api/consult/:type/:number', authenticateToken, async (req, res) => {
  try {
    const { type, number } = req.params;
    let token = process.env.APIPERU_TOKEN;

    // Fallback con el token proporcionado por el usuario
    if (!token || token === 'YOUR_TOKEN_HERE') {
      token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6InNpc3RlbWFzQGdydXBvY2FybWVsaXRhLmNvbSJ9.txnBfIsj3SR322JLvUWooD74_HdypX-FcFgr5C2xMCY';
    }

    if (!token) return res.status(500).json({ error: 'Token de APIPeru no configurado' });

    let url = '';
    if (type === 'ruc') url = `https://dniruc.apisperu.com/api/v1/ruc/${number}?token=${token}`;
    else if (type === 'dni') url = `https://dniruc.apisperu.com/api/v1/dni/${number}?token=${token}`;
    else return res.status(400).json({ error: 'Tipo de consulta no válido' });

    const response = await axios.get(url, { timeout: 10000 });
    res.json(response.data);
  } catch (error: any) {
    console.error('APIPeru Error:', error.message);
    res.status(error.response?.status || 500).json({ error: 'Error en servicio de consulta' });
  }
});

// --- SERVER START ---
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on network at http://0.0.0.0:${port}`);
});
