import type { Request, Response, NextFunction } from 'express'
import { verifyToken, validateSession } from '../lib/auth/index.js'

// Extend Express Request type
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string
                email: string
                name: string
                role: { id: string; name: string }
                tokenId: string
                sessionId: string
            }
        }
    }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const token = req.cookies?.auth_token

    if (!token) {
        return res.redirect('/auth/login')
    }

    const decoded = verifyToken(token)
    if (!decoded) {
        res.clearCookie('auth_token')
        return res.redirect('/auth/login')
    }

    const sessionCheck = await validateSession(decoded.userId, decoded.tokenId)
    if (!sessionCheck.valid || !sessionCheck.user) {
        res.clearCookie('auth_token')
        return res.redirect('/auth/login')
    }

    req.user = {
        id: sessionCheck.user.id,
        email: sessionCheck.user.email,
        name: sessionCheck.user.name,
        role: {
            id: sessionCheck.user.role.id,
            name: sessionCheck.user.role.name,
        },
        tokenId: decoded.tokenId,
        sessionId: sessionCheck.sessionId!,
    }

    next()
}

export function setLocals(req: Request, res: Response, next: NextFunction) {
    res.locals.user = req.user || null
    res.locals.currentPath = req.path
    next()
}
