import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { createToken, getDeviceInfo, comparePassword, createSession, deactivateSession } from '../lib/auth/index.js'

const router = Router()

// Login page
router.get('/login', (req, res) => {
    // Already logged in
    if (req.cookies?.auth_token) {
        return res.redirect('/')
    }
    res.render('auth/login', {
        title: 'Login',
        layout: 'layouts/auth',
        error: null
    })
})

// Login action
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body

        const user = await prisma.user.findUnique({
            where: { email },
            include: { role: true },
        })

        if (!user) {
            return res.render('auth/login', {
                title: 'Login',
                layout: 'layouts/auth',
                error: 'Invalid email or password',
            })
        }

        if (!user.isActive) {
            return res.render('auth/login', {
                title: 'Login',
                layout: 'layouts/auth',
                error: 'Your account has been deactivated',
            })
        }

        const isValid = await comparePassword(password, user.password)
        if (!isValid) {
            return res.render('auth/login', {
                title: 'Login',
                layout: 'layouts/auth',
                error: 'Invalid email or password',
            })
        }

        const { token, tokenId } = createToken(user)
        const deviceInfo = getDeviceInfo(req.headers['user-agent'] || null)

        await createSession({
            userId: user.id,
            tokenId,
            deviceInfo,
            ipAddress: req.ip,
        })

        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
        })

        res.redirect('/')
    } catch (error) {
        console.error('Login error:', error)
        res.render('auth/login', {
            title: 'Login',
            layout: 'layouts/auth',
            error: 'An error occurred. Please try again.',
        })
    }
})

// Logout
router.get('/logout', async (req, res) => {
    const token = req.cookies?.auth_token
    if (token) {
        const decoded = await import('../lib/auth/jwt.js').then(m => m.verifyToken(token))
        if (decoded) {
            await deactivateSession(decoded.tokenId)
        }
    }
    res.clearCookie('auth_token')
    res.redirect('/auth/login')
})

export default router
