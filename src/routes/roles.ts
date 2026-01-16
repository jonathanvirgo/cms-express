import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { roleFormConfig } from '../config/forms/index.js'

const router = Router()

router.get('/', async (req, res) => {
    const roles = await prisma.role.findMany({
        include: { _count: { select: { users: true } } },
        orderBy: { name: 'asc' },
    })
    res.render('roles/list', { title: 'Roles', roles })
})

router.get('/create', (req, res) => {
    res.render('roles/form', {
        title: 'Create Role',
        config: roleFormConfig,
        formData: {},
        values: {},
        action: '/roles/create',
        isEdit: false,
    })
})

router.post('/create', async (req, res) => {
    try {
        const { name, description, permissions } = req.body
        await prisma.role.create({ data: { name, description, permissions } })
        res.redirect('/roles')
    } catch (error) {
        console.error('Create role error:', error)
        res.redirect('/roles/create')
    }
})

router.get('/:id/edit', async (req, res) => {
    const role = await prisma.role.findUnique({ where: { id: req.params.id } })
    if (!role) return res.redirect('/roles')

    res.render('roles/form', {
        title: 'Edit Role',
        config: roleFormConfig,
        formData: {},
        values: role,
        action: `/roles/${role.id}/edit`,
        isEdit: true,
    })
})

router.post('/:id/edit', async (req, res) => {
    try {
        const { name, description, permissions } = req.body
        await prisma.role.update({
            where: { id: req.params.id },
            data: { name, description, permissions },
        })
        res.redirect('/roles')
    } catch (error) {
        console.error('Update role error:', error)
        res.redirect(`/roles/${req.params.id}/edit`)
    }
})

router.post('/:id/delete', async (req, res) => {
    try {
        await prisma.role.delete({ where: { id: req.params.id } })
    } catch (error) {
        console.error('Delete role error:', error)
    }
    res.redirect('/roles')
})

export default router
