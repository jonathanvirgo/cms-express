import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { postFormConfig } from '../config/forms/index.js'

const router = Router()

router.get('/', async (req, res) => {
    const posts = await prisma.post.findMany({
        include: {
            author: { select: { name: true } },
            category: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
    })
    res.render('posts/list', { title: 'Posts', posts })
})

router.get('/create', async (req, res) => {
    const categories = await prisma.category.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
    })

    res.render('posts/form', {
        title: 'Create Post',
        config: postFormConfig,
        formData: { Category: categories },
        values: { authorId: req.user?.id },
        action: '/posts/create',
        isEdit: false,
    })
})

router.post('/create', async (req, res) => {
    try {
        const { title, slug, excerpt, content, status, categoryId } = req.body

        await prisma.post.create({
            data: {
                title,
                slug,
                excerpt,
                content,
                status,
                categoryId: categoryId || null,
                authorId: req.user!.id,
                publishedAt: status === 'published' ? new Date() : null,
            },
        })
        res.redirect('/posts')
    } catch (error) {
        console.error('Create post error:', error)
        res.redirect('/posts/create')
    }
})

router.get('/:id/edit', async (req, res) => {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } })
    if (!post) return res.redirect('/posts')

    const categories = await prisma.category.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
    })

    res.render('posts/form', {
        title: 'Edit Post',
        config: postFormConfig,
        formData: { Category: categories },
        values: post,
        action: `/posts/${post.id}/edit`,
        isEdit: true,
    })
})

router.post('/:id/edit', async (req, res) => {
    try {
        const { title, slug, excerpt, content, status, categoryId } = req.body
        const post = await prisma.post.findUnique({ where: { id: req.params.id } })

        await prisma.post.update({
            where: { id: req.params.id },
            data: {
                title,
                slug,
                excerpt,
                content,
                status,
                categoryId: categoryId || null,
                publishedAt: status === 'published' && !post?.publishedAt ? new Date() : post?.publishedAt,
            },
        })
        res.redirect('/posts')
    } catch (error) {
        console.error('Update post error:', error)
        res.redirect(`/posts/${req.params.id}/edit`)
    }
})

router.post('/:id/delete', async (req, res) => {
    try {
        await prisma.post.delete({ where: { id: req.params.id } })
    } catch (error) {
        console.error('Delete post error:', error)
    }
    res.redirect('/posts')
})

export default router
