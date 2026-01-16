import 'dotenv/config'
import express, { type Request, type Response, type NextFunction } from 'express'
import cookieParser from 'cookie-parser'
import path from 'path'
import { fileURLToPath } from 'url'

// Routes
import authRoutes from './routes/auth.js'
import dashboardRoutes from './routes/dashboard.js'
import userRoutes from './routes/users.js'
import roleRoutes from './routes/roles.js'
import categoryRoutes from './routes/categories.js'
import tagRoutes from './routes/tags.js'
import postRoutes from './routes/posts.js'

// Middleware
import { authMiddleware, setLocals } from './middleware/auth.js'
import productRoutes from './routes/products.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 4000

// =============================================================================
// MIDDLEWARE
// =============================================================================

// Body parsing
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Cookies
app.use(cookieParser())

// Static files
app.use(express.static(path.join(__dirname, 'public')))

// View engine
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))

// Set locals for all views
app.use(setLocals)

// =============================================================================
// ROUTES
// =============================================================================

// Auth routes (public)
app.use('/auth', authRoutes)

// Protected routes
app.use('/', authMiddleware, dashboardRoutes)
app.use('/users', authMiddleware, userRoutes)
app.use('/roles', authMiddleware, roleRoutes)
app.use('/categories', authMiddleware, categoryRoutes)
app.use('/tags', authMiddleware, tagRoutes)
app.use('/posts', authMiddleware, postRoutes)

// =============================================================================
// ERROR HANDLING
// =============================================================================

app.use('/products', authMiddleware, productRoutes)

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).render('errors/404', { title: 'Page Not Found' })
})

// Global error handler
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    console.error('Error:', err)
    res.status(500).render('errors/500', {
        title: 'Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    })
})

// =============================================================================
// START SERVER
// =============================================================================

app.listen(PORT, () => {
    console.log(`🚀 Express CMS running at http://localhost:${PORT}`)
    console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`)
})

export default app
