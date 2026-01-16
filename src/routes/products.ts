import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { productFormConfig } from '../config/forms/index.js'

const router = Router()

// List
router.get('/', async (req, res) => {
    const products = await prisma.product.findMany({
        include: { category: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
    })
    res.render('products/list', { title: 'Products', products })
})

// Create form
router.get('/create', async (req, res) => {
    const categorys = await prisma.category.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
    })

    res.render('products/form', {
        title: 'Create Product',
        config: productFormConfig,
        formData: { Category: categorys },
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

    const categorys = await prisma.category.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
    })

    res.render('products/form', {
        title: 'Edit Product',
        config: productFormConfig,
        formData: { Category: categorys },
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
