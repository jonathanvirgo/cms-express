import { prisma } from '../prisma.js'
import type { DeviceInfo } from './jwt.js'

interface CreateSessionParams {
    userId: string
    tokenId: string
    deviceInfo: DeviceInfo
    ipAddress?: string
}

export async function createSession({ userId, tokenId, deviceInfo, ipAddress }: CreateSessionParams) {
    // Get or create settings
    let settings = await prisma.userSessionSettings.findUnique({
        where: { userId },
    })

    if (!settings) {
        settings = await prisma.userSessionSettings.create({
            data: { userId },
        })
    }

    // Reset current session flag
    await prisma.userSession.updateMany({
        where: { userId, isActive: true },
        data: { isCurrentSession: false },
    })

    // Handle multi-device policy
    if (!settings.allowMultipleDevices) {
        await prisma.userSession.updateMany({
            where: { userId, isActive: true },
            data: { isActive: false, logoutAt: new Date() },
        })
    } else {
        const activeCount = await prisma.userSession.count({
            where: { userId, isActive: true },
        })

        if (activeCount >= settings.maxSessions) {
            const oldest = await prisma.userSession.findMany({
                where: { userId, isActive: true },
                orderBy: { lastActivity: 'asc' },
                take: activeCount - settings.maxSessions + 1,
            })

            await prisma.userSession.updateMany({
                where: { id: { in: oldest.map(s => s.id) } },
                data: { isActive: false, logoutAt: new Date() },
            })
        }
    }

    return prisma.userSession.create({
        data: {
            userId,
            jwtTokenId: tokenId,
            deviceName: deviceInfo.deviceName,
            deviceType: deviceInfo.deviceType,
            browser: deviceInfo.browser,
            os: deviceInfo.os,
            userAgent: deviceInfo.userAgent,
            ipAddress,
            isActive: true,
            isCurrentSession: true,
        },
    })
}

export async function validateSession(userId: string, tokenId: string) {
    const session = await prisma.userSession.findFirst({
        where: { userId, jwtTokenId: tokenId, isActive: true },
        include: { user: { include: { role: true } } },
    })

    if (!session) {
        return { valid: false, user: null }
    }

    await prisma.userSession.update({
        where: { id: session.id },
        data: { lastActivity: new Date() },
    })

    return { valid: true, user: session.user, sessionId: session.id }
}

export async function deactivateSession(tokenId: string) {
    return prisma.userSession.updateMany({
        where: { jwtTokenId: tokenId },
        data: { isActive: false, logoutAt: new Date() },
    })
}

export async function getActiveSessions(userId: string) {
    return prisma.userSession.findMany({
        where: { userId, isActive: true },
        orderBy: { lastActivity: 'desc' },
        select: {
            id: true,
            deviceName: true,
            deviceType: true,
            browser: true,
            os: true,
            ipAddress: true,
            loginAt: true,
            lastActivity: true,
            isCurrentSession: true,
        },
    })
}

export async function deactivateSessionById(sessionId: string, userId: string) {
    return prisma.userSession.updateMany({
        where: { id: sessionId, userId },
        data: { isActive: false, logoutAt: new Date() },
    })
}

export async function deactivateAllOtherSessions(userId: string, currentTokenId: string) {
    return prisma.userSession.updateMany({
        where: { userId, isActive: true, jwtTokenId: { not: currentTokenId } },
        data: { isActive: false, logoutAt: new Date() },
    })
}
