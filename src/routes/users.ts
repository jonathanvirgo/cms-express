import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { hashPassword } from '../lib/auth/index.js'
import { userFormConfig } from '../config/forms/index.js'

const router = Router()

// List users
router.get('/', async (req, res) => {
    const users = await prisma.user.findMany({
        include: {
            role: { select: { id: true, name: true } },
            _count: { select: { posts: true } }
        },
        orderBy: { createdAt: 'desc' },
    })

    res.render('users/list', {
        title: 'Users',
        users,
    })
})

// Create form
router.get('/create', async (req, res) => {
    const roles = await prisma.role.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
    })

    res.render('users/form', {
        title: 'Create User',
        config: userFormConfig,
        formData: { Role: roles },
        values: {},
        action: '/users/create',
        isEdit: false,
    })
})

// Create action
router.post('/create', async (req, res) => {
    try {
        const { name, email, password, roleId, isActive } = req.body

        const hashedPassword = await hashPassword(password)

        await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                roleId,
                isActive: isActive === 'on',
            },
        })

        res.redirect('/users')
    } catch (error) {
        console.error('Create user error:', error)
        const roles = await prisma.role.findMany({ select: { id: true, name: true } })
        res.render('users/form', {
            title: 'Create User',
            config: userFormConfig,
            formData: { Role: roles },
            values: req.body,
            action: '/users/create',
            isEdit: false,
            error: 'Failed to create user',
        })
    }
})

// Edit form
router.get('/:id/edit', async (req, res) => {
    const user = await prisma.user.findUnique({
        where: { id: req.params.id },
    })

    if (!user) {
        return res.redirect('/users')
    }

    const roles = await prisma.role.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
    })

    res.render('users/form', {
        title: 'Edit User',
        config: {
            ...userFormConfig, fields: userFormConfig.fields.map(f =>
                f.name === 'password' ? { ...f, required: false, placeholder: 'Leave empty to keep current' } : f
            )
        },
        formData: { Role: roles },
        values: user,
        action: `/users/${user.id}/edit`,
        isEdit: true,
    })
})

// Edit action
router.post('/:id/edit', async (req, res) => {
    try {
        const { name, email, password, roleId, isActive } = req.body

        const updateData: Record<string, unknown> = {
            name,
            email,
            roleId,
            isActive: isActive === 'on',
        }

        if (password) {
            updateData.password = await hashPassword(password)
        }

        await prisma.user.update({
            where: { id: req.params.id },
            data: updateData,
        })

        res.redirect('/users')
    } catch (error) {
        console.error('Update user error:', error)
        res.redirect(`/users/${req.params.id}/edit`)
    }
})

// Delete
router.post('/:id/delete', async (req, res) => {
    try {
        await prisma.user.delete({
            where: { id: req.params.id },
        })
    } catch (error) {
        console.error('Delete user error:', error)
    }
    res.redirect('/users')
})

export default router
