import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { categoryFormConfig } from '../config/forms/index.js'

const router = Router()

router.get('/', async (req, res) => {
    const categories = await prisma.category.findMany({
        include: { _count: { select: { posts: true } } },
        orderBy: { name: 'asc' },
    })
    res.render('categories/list', { title: 'Categories', categories })
})

router.get('/create', (req, res) => {
    res.render('categories/form', {
        title: 'Create Category',
        config: categoryFormConfig,
        formData: {},
        values: {},
        action: '/categories/create',
        isEdit: false,
    })
})

router.post('/create', async (req, res) => {
    try {
        const { name, slug, description } = req.body
        await prisma.category.create({ data: { name, slug, description } })
        res.redirect('/categories')
    } catch (error) {
        console.error('Create category error:', error)
        res.redirect('/categories/create')
    }
})

router.get('/:id/edit', async (req, res) => {
    const category = await prisma.category.findUnique({ where: { id: req.params.id } })
    if (!category) return res.redirect('/categories')

    res.render('categories/form', {
        title: 'Edit Category',
        config: categoryFormConfig,
        formData: {},
        values: category,
        action: `/categories/${category.id}/edit`,
        isEdit: true,
    })
})

router.post('/:id/edit', async (req, res) => {
    try {
        const { name, slug, description } = req.body
        await prisma.category.update({
            where: { id: req.params.id },
            data: { name, slug, description },
        })
        res.redirect('/categories')
    } catch (error) {
        console.error('Update category error:', error)
        res.redirect(`/categories/${req.params.id}/edit`)
    }
})

router.post('/:id/delete', async (req, res) => {
    try {
        await prisma.category.delete({ where: { id: req.params.id } })
    } catch (error) {
        console.error('Delete category error:', error)
    }
    res.redirect('/categories')
})

export default router
