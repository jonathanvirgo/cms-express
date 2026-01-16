import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { tagFormConfig } from '../config/forms/index.js'

const router = Router()

router.get('/', async (req, res) => {
    const tags = await prisma.tag.findMany({
        include: { _count: { select: { posts: true } } },
        orderBy: { name: 'asc' },
    })
    res.render('tags/list', { title: 'Tags', tags })
})

router.get('/create', (req, res) => {
    res.render('tags/form', {
        title: 'Create Tag',
        config: tagFormConfig,
        formData: {},
        values: {},
        action: '/tags/create',
        isEdit: false,
    })
})

router.post('/create', async (req, res) => {
    try {
        const { name, slug } = req.body
        await prisma.tag.create({ data: { name, slug } })
        res.redirect('/tags')
    } catch (error) {
        console.error('Create tag error:', error)
        res.redirect('/tags/create')
    }
})

router.get('/:id/edit', async (req, res) => {
    const tag = await prisma.tag.findUnique({ where: { id: req.params.id } })
    if (!tag) return res.redirect('/tags')

    res.render('tags/form', {
        title: 'Edit Tag',
        config: tagFormConfig,
        formData: {},
        values: tag,
        action: `/tags/${tag.id}/edit`,
        isEdit: true,
    })
})

router.post('/:id/edit', async (req, res) => {
    try {
        const { name, slug } = req.body
        await prisma.tag.update({
            where: { id: req.params.id },
            data: { name, slug },
        })
        res.redirect('/tags')
    } catch (error) {
        console.error('Update tag error:', error)
        res.redirect(`/tags/${req.params.id}/edit`)
    }
})

router.post('/:id/delete', async (req, res) => {
    try {
        await prisma.tag.delete({ where: { id: req.params.id } })
    } catch (error) {
        console.error('Delete tag error:', error)
    }
    res.redirect('/tags')
})

export default router
