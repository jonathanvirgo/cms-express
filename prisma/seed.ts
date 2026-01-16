import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import bcrypt from 'bcrypt'

const { Pool } = pg

// Password hashing helper
async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12)
}

// Connect using DIRECT_URL for seeding
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL!
const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
    console.log('🌱 Seeding Express CMS database...')

    // Create Roles
    const adminRole = await prisma.role.upsert({
        where: { name: 'Admin' },
        update: {},
        create: {
            name: 'Admin',
            description: 'Full system access',
            permissions: '["all"]',
        },
    })

    const editorRole = await prisma.role.upsert({
        where: { name: 'Editor' },
        update: {},
        create: {
            name: 'Editor',
            description: 'Can create and edit content',
            permissions: '["read", "write", "publish"]',
        },
    })

    console.log('✅ Roles created')

    // Create Categories
    await prisma.category.upsert({
        where: { slug: 'technology' },
        update: {},
        create: { name: 'Technology', slug: 'technology', description: 'Tech articles' },
    })

    await prisma.category.upsert({
        where: { slug: 'business' },
        update: {},
        create: { name: 'Business', slug: 'business', description: 'Business news' },
    })

    console.log('✅ Categories created')

    // Create Tags
    await prisma.tag.upsert({
        where: { slug: 'javascript' },
        update: {},
        create: { name: 'JavaScript', slug: 'javascript' },
    })

    await prisma.tag.upsert({
        where: { slug: 'nodejs' },
        update: {},
        create: { name: 'Node.js', slug: 'nodejs' },
    })

    console.log('✅ Tags created')

    // Create Users with hashed passwords
    const adminPassword = await hashPassword('admin123')
    const editorPassword = await hashPassword('editor123')

    await prisma.user.upsert({
        where: { email: 'admin@example.com' },
        update: { password: adminPassword },
        create: {
            name: 'Admin User',
            email: 'admin@example.com',
            password: adminPassword,
            roleId: adminRole.id,
            isActive: true,
        },
    })

    await prisma.user.upsert({
        where: { email: 'editor@example.com' },
        update: { password: editorPassword },
        create: {
            name: 'Editor User',
            email: 'editor@example.com',
            password: editorPassword,
            roleId: editorRole.id,
            isActive: true,
        },
    })

    console.log('✅ Users created with hashed passwords')
    console.log('🎉 Seeding completed!')
    console.log('')
    console.log('📧 Login credentials:')
    console.log('   Email: admin@example.com')
    console.log('   Password: admin123')
}

main()
    .catch((e) => {
        console.error('❌ Error seeding:', e)
        process.exit(1)
    })
    .finally(async () => {
        await pool.end()
        await prisma.$disconnect()
    })
