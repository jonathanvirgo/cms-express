import jwt from 'jsonwebtoken'
import { randomBytes } from 'crypto'

interface TokenPayload {
    userId: string
    tokenId: string
    email: string
}

interface DeviceInfo {
    deviceName: string
    deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown'
    browser: string
    os: string
    userAgent: string
}

const getJwtSecret = (): string => {
    const secret = process.env.JWT_SECRET
    if (!secret) {
        console.warn('JWT_SECRET is not set, using random secret')
        return randomBytes(32).toString('hex')
    }
    return secret
}

const getJwtExpiresIn = (): number => {
    const expiresIn = process.env.JWT_EXPIRES_IN || '24h'
    const match = expiresIn.match(/^(\d+)(h|d|m|s)?$/)
    if (!match) return 86400

    const value = parseInt(match[1], 10)
    const unit = match[2] || 'h'

    switch (unit) {
        case 's': return value
        case 'm': return value * 60
        case 'h': return value * 3600
        case 'd': return value * 86400
        default: return value * 3600
    }
}

export function createToken(user: { id: string; email: string }): { token: string; tokenId: string } {
    const tokenId = randomBytes(16).toString('hex')

    const payload: TokenPayload = {
        userId: user.id,
        tokenId,
        email: user.email,
    }

    const token = jwt.sign(payload, getJwtSecret(), {
        expiresIn: getJwtExpiresIn(),
    })

    return { token, tokenId }
}

export function verifyToken(token: string): TokenPayload | null {
    try {
        const decoded = jwt.verify(token, getJwtSecret()) as TokenPayload
        return decoded
    } catch {
        return null
    }
}

export function getDeviceInfo(userAgent: string | null): DeviceInfo {
    const ua = userAgent || 'Unknown'

    let deviceType: DeviceInfo['deviceType'] = 'unknown'
    if (/Mobile|Android|iPhone|iPad/i.test(ua)) {
        deviceType = /iPad|Tablet/i.test(ua) ? 'tablet' : 'mobile'
    } else if (/Windows|Macintosh|Linux/i.test(ua)) {
        deviceType = 'desktop'
    }

    let browser = 'Unknown'
    if (/Chrome/i.test(ua) && !/Edge|Edg/i.test(ua)) {
        browser = 'Chrome'
    } else if (/Firefox/i.test(ua)) {
        browser = 'Firefox'
    } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
        browser = 'Safari'
    } else if (/Edge|Edg/i.test(ua)) {
        browser = 'Edge'
    }

    let os = 'Unknown'
    if (/Windows NT 10/i.test(ua)) os = 'Windows 10/11'
    else if (/Windows/i.test(ua)) os = 'Windows'
    else if (/Mac OS X/i.test(ua)) os = 'macOS'
    else if (/Android/i.test(ua)) os = 'Android'
    else if (/iPhone|iPad/i.test(ua)) os = 'iOS'
    else if (/Linux/i.test(ua)) os = 'Linux'

    return {
        deviceName: `${browser} on ${os}`,
        deviceType,
        browser,
        os,
        userAgent: ua,
    }
}

export type { TokenPayload, DeviceInfo }
