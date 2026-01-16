import { Router } from 'express'
import { prisma } from '../lib/prisma.js'

const router = Router()

router.get('/', async (req, res) => {
    const [userCount, postCount, categoryCount, tagCount] = await Promise.all([
        prisma.user.count(),
        prisma.post.count(),
        prisma.category.count(),
        prisma.tag.count(),
    ])

    const recentPosts = await prisma.post.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
            author: { select: { name: true } },
            category: { select: { name: true } },
        },
    })

    res.render('dashboard/index', {
        title: 'Dashboard',
        stats: { userCount, postCount, categoryCount, tagCount },
        recentPosts,
    })
})

export default router
