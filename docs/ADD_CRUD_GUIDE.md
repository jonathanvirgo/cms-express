# Hướng dẫn thêm Table và CRUD mới - Express CMS

## ⚡ Quick: Sử dụng Generator (Khuyến nghị)

```bash
# 1. Thêm model vào prisma/schema.prisma
# 2. Push schema
npx prisma db push && npx prisma generate

# 3. Chạy generator - TỰ ĐỘNG tạo routes, views, form config
npm run generate:crud ModelName

# Ví dụ:
npm run generate:crud Product
```

**Generator sẽ tự động:**
- ✅ Parse schema để lấy fields
- ✅ Tạo form config
- ✅ Tạo routes (list, create, edit, delete)
- ✅ Tạo views (list.ejs, form.ejs)
- ✅ Đăng ký route vào app.ts
- ✅ Thêm link vào sidebar

---

## 📖 Manual: Hướng dẫn chi tiết (nếu cần customize)

### Bước 1: Thêm Model vào Prisma Schema

📁 **File**: `prisma/schema.prisma`

```prisma
model Product {
    id          String    @id @default(cuid())
    name        String
    slug        String    @unique
    description String?
    price       Float     @default(0)
    stock       Int       @default(0)
    isActive    Boolean   @default(true)
    categoryId  String?
    category    Category? @relation(fields: [categoryId], references: [id])
    createdAt   DateTime  @default(now())
    updatedAt   DateTime  @updatedAt

    @@index([categoryId])
    @@index([slug])
}
```

> **Lưu ý**: Nếu có relation với Category, cần thêm `products Product[]` vào model Category

---

### Bước 2: Push Schema và Generate Client

```bash
npx prisma db push
npx prisma generate
```

---

### Bước 3: Tạo Form Config

📁 **File**: `src/config/forms/index.ts`

Thêm vào cuối file:

```typescript
// Product form config
export const productFormConfig: FormConfig = {
    modelName: 'Product',
    title: 'Product',
    fields: [
        { name: 'name', label: 'Product Name', type: 'text', required: true },
        { name: 'slug', label: 'Slug', type: 'text', required: true },
        { name: 'description', label: 'Description', type: 'textarea', rows: 3 },
        { name: 'price', label: 'Price', type: 'number', min: 0, step: 0.01 },
        { name: 'stock', label: 'Stock', type: 'number', min: 0 },
        { name: 'isActive', label: 'Active', type: 'checkbox', defaultValue: true },
        { 
            name: 'categoryId', 
            label: 'Category', 
            type: 'relation',
            relation: { model: 'Category', displayField: 'name', valueField: 'id' }
        },
    ],
}

// Thêm vào formConfigs object
export const formConfigs: Record<string, FormConfig> = {
    // ... existing configs
    Product: productFormConfig,
}
```

---

### Bước 4: Tạo Routes

📁 **File**: `src/routes/products.ts`

```typescript
import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { productFormConfig } from '../config/forms/index.js'

const router = Router()

// List products
router.get('/', async (req, res) => {
    const products = await prisma.product.findMany({
        include: { category: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
    })
    res.render('products/list', { title: 'Products', products })
})

// Create form
router.get('/create', async (req, res) => {
    const categories = await prisma.category.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
    })
    
    res.render('products/form', {
        title: 'Create Product',
        config: productFormConfig,
        formData: { Category: categories },
        values: {},
        action: '/products/create',
        isEdit: false,
    })
})

// Create action
router.post('/create', async (req, res) => {
    try {
        const { name, slug, description, price, stock, isActive, categoryId } = req.body
        
        await prisma.product.create({
            data: {
                name,
                slug,
                description,
                price: parseFloat(price) || 0,
                stock: parseInt(stock) || 0,
                isActive: isActive === 'on',
                categoryId: categoryId || null,
            },
        })
        res.redirect('/products')
    } catch (error) {
        console.error('Create product error:', error)
        res.redirect('/products/create')
    }
})

// Edit form
router.get('/:id/edit', async (req, res) => {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } })
    if (!product) return res.redirect('/products')
    
    const categories = await prisma.category.findMany({
        select: { id: true, name: true },
    })
    
    res.render('products/form', {
        title: 'Edit Product',
        config: productFormConfig,
        formData: { Category: categories },
        values: product,
        action: `/products/${product.id}/edit`,
        isEdit: true,
    })
})

// Edit action
router.post('/:id/edit', async (req, res) => {
    try {
        const { name, slug, description, price, stock, isActive, categoryId } = req.body
        
        await prisma.product.update({
            where: { id: req.params.id },
            data: {
                name,
                slug,
                description,
                price: parseFloat(price) || 0,
                stock: parseInt(stock) || 0,
                isActive: isActive === 'on',
                categoryId: categoryId || null,
            },
        })
        res.redirect('/products')
    } catch (error) {
        console.error('Update product error:', error)
        res.redirect(`/products/${req.params.id}/edit`)
    }
})

// Delete
router.post('/:id/delete', async (req, res) => {
    try {
        await prisma.product.delete({ where: { id: req.params.id } })
    } catch (error) {
        console.error('Delete product error:', error)
    }
    res.redirect('/products')
})

export default router
```

---

### Bước 5: Đăng ký Route trong App

📁 **File**: `src/app.ts`

```typescript
// Thêm import
import productRoutes from './routes/products.js'

// Thêm route (sau các routes khác)
app.use('/products', authMiddleware, productRoutes)
```

---

### Bước 6: Tạo Views

#### 6a. List view

📁 **File**: `src/views/products/list.ejs`

```ejs
<%- include('../layouts/main', { body: `
<div class="page-header">
    <h2>Products</h2>
    <a href="/products/create" class="btn btn-primary">Add Product</a>
</div>

<div class="card">
    <div class="card-body">
        ${products.length > 0 ? `
        <table class="table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${products.map(p => `
                <tr>
                    <td><strong>${p.name}</strong></td>
                    <td>$${p.price.toFixed(2)}</td>
                    <td>${p.stock}</td>
                    <td>${p.category?.name || '-'}</td>
                    <td><span class="badge badge-${p.isActive ? 'success' : 'error'}">${p.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td class="actions">
                        <a href="/products/${p.id}/edit" class="btn btn-sm btn-outline">Edit</a>
                        <form action="/products/${p.id}/delete" method="POST" class="inline" onsubmit="return confirm('Delete?')">
                            <button type="submit" class="btn btn-sm btn-danger">Delete</button>
                        </form>
                    </td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        ` : '<p class="text-muted">No products found.</p>'}
    </div>
</div>
` }) %>
```

#### 6b. Form view

📁 **File**: `src/views/products/form.ejs`

```ejs
<%- include('../layouts/main', { body: `
<div class="page-header">
    <h2>${isEdit ? 'Edit' : 'Create'} Product</h2>
</div>

<div class="card">
    <div class="card-body">
        ${include('../partials/dynamic-form')}
    </div>
</div>
` }) %>
```

---

### Bước 7: Thêm vào Sidebar

📁 **File**: `src/views/partials/sidebar.ejs`

Thêm vào section "Content":

```ejs
<a href="/products" class="nav-item <%= currentPath.startsWith('/products') ? 'active' : '' %>">
    <span class="nav-icon">📦</span>
    <span class="nav-text">Products</span>
</a>
```

---

### Bước 8: Restart Server

```bash
# Server sẽ tự reload nếu đang chạy với tsx watch
# Hoặc restart thủ công:
npm run dev
```

---

## Tóm tắt các bước

| # | Bước | File |
|---|------|------|
| 1 | Thêm model | `prisma/schema.prisma` |
| 2 | Push + Generate | `npx prisma db push && npx prisma generate` |
| 3 | Form config | `src/config/forms/index.ts` |
| 4 | Routes | `src/routes/[model].ts` |
| 5 | Đăng ký route | `src/app.ts` |
| 6 | Views | `src/views/[model]/list.ejs`, `form.ejs` |
| 7 | Sidebar | `src/views/partials/sidebar.ejs` |
| 8 | Restart | `npm run dev` |

---

## Field Types Reference

| Type | Mô tả | Options |
|------|-------|---------|
| `text` | Input text | `minLength`, `maxLength` |
| `email` | Input email | |
| `password` | Input password | |
| `number` | Input number | `min`, `max`, `step` |
| `textarea` | Textarea | `rows` |
| `rich-text` | Rich text editor | `minHeight` |
| `checkbox` | Checkbox | `defaultValue` |
| `select` | Dropdown | `options: [{value, label}]` |
| `relation` | Foreign key | `relation: {model, displayField, valueField}` |
| `date` | Date picker | |
| `file` | File upload | `accept`, `multiple` |
