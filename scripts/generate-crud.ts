#!/usr/bin/env node
/**
 * Express CMS - CRUD Generator
 * 
 * Usage: npm run generate:crud ModelName
 * Example: npm run generate:crud Product
 * 
 * This script will generate:
 * - Form config in src/config/forms/
 * - Routes in src/routes/
 * - Views in src/views/
 * - Auto-register route in app.ts
 * - Auto-add sidebar link
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

// Get model name from args
const modelName = process.argv[2]

if (!modelName) {
    console.error('❌ Usage: npm run generate:crud ModelName')
    console.error('   Example: npm run generate:crud Product')
    process.exit(1)
}

// Validate model name (PascalCase)
if (!/^[A-Z][a-zA-Z]*$/.test(modelName)) {
    console.error('❌ Model name must be PascalCase (e.g., Product, BlogPost)')
    process.exit(1)
}

// Parse Prisma schema to get fields
function parsePrismaSchema(modelName: string) {
    const schemaPath = path.join(ROOT, 'prisma', 'schema.prisma')
    const schema = fs.readFileSync(schemaPath, 'utf-8')

    // Find model block
    const modelRegex = new RegExp(`model\\s+${modelName}\\s*\\{([^}]+)\\}`, 's')
    const match = schema.match(modelRegex)

    if (!match) {
        console.error(`❌ Model "${modelName}" not found in prisma/schema.prisma`)
        console.error('   Please add the model to schema first, then run this command.')
        process.exit(1)
    }

    const modelBlock = match[1]
    const fields: Array<{
        name: string
        type: string
        isOptional: boolean
        isRelation: boolean
        relationModel?: string
        hasDefault: boolean
    }> = []

    const lines = modelBlock.split('\n')
    for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('@@') || trimmed.startsWith('//')) continue

        // Parse field: name Type? @default(...)
        const fieldMatch = trimmed.match(/^(\w+)\s+(\w+)(\?)?(.*)$/)
        if (!fieldMatch) continue

        const [, name, type, optional, rest] = fieldMatch

        // Skip auto-generated fields
        if (['id', 'createdAt', 'updatedAt'].includes(name)) continue

        // Check if it's a relation (capitalized type that's not a primitive)
        const primitives = ['String', 'Int', 'Float', 'Boolean', 'DateTime', 'Json']
        const isRelation = !primitives.includes(type) && /^[A-Z]/.test(type)

        // Skip array relations (e.g., posts Post[])
        if (type.includes('[]') || rest.includes('[]')) continue

        fields.push({
            name,
            type,
            isOptional: !!optional || rest.includes('@default'),
            isRelation,
            relationModel: isRelation ? type.replace('?', '') : undefined,
            hasDefault: rest.includes('@default'),
        })
    }

    return fields
}

// Map Prisma types to form field types
function mapFieldType(field: ReturnType<typeof parsePrismaSchema>[0]): string {
    if (field.isRelation) return 'relation'

    switch (field.type) {
        case 'String':
            if (field.name.toLowerCase().includes('email')) return 'email'
            if (field.name.toLowerCase().includes('password')) return 'password'
            if (field.name.toLowerCase().includes('content') || field.name.toLowerCase().includes('description')) return 'textarea'
            return 'text'
        case 'Int':
        case 'Float':
            return 'number'
        case 'Boolean':
            return 'checkbox'
        case 'DateTime':
            return 'date'
        default:
            return 'text'
    }
}

// Generate form config
function generateFormConfig(modelName: string, fields: ReturnType<typeof parsePrismaSchema>) {
    const lowerName = modelName.toLowerCase()

    const fieldConfigs = fields.map(field => {
        const fieldType = mapFieldType(field)
        let config = `        { name: '${field.name}', label: '${field.name.charAt(0).toUpperCase() + field.name.slice(1)}', type: '${fieldType}'`

        if (!field.isOptional && !field.hasDefault) {
            config += `, required: true`
        }

        if (fieldType === 'textarea') {
            config += `, rows: 3`
        }

        if (fieldType === 'number' && field.type === 'Float') {
            config += `, step: 0.01`
        }

        if (fieldType === 'checkbox') {
            config += `, defaultValue: true`
        }

        if (field.isRelation && field.relationModel) {
            config += `,\n            relation: { model: '${field.relationModel}', displayField: 'name', valueField: 'id' }`
        }

        config += ' },'
        return config
    })

    return `// ${modelName} form config - Auto-generated
export const ${lowerName}FormConfig: FormConfig = {
    modelName: '${modelName}',
    title: '${modelName}',
    fields: [
${fieldConfigs.join('\n')}
    ],
}
`
}

// Generate route file
function generateRoutes(modelName: string, fields: ReturnType<typeof parsePrismaSchema>) {
    const lowerName = modelName.toLowerCase()
    const pluralName = lowerName + 's'

    // Find relation fields for include
    const relations = fields.filter(f => f.isRelation)
    const includeClause = relations.length > 0
        ? `include: { ${relations.map(r => `${r.name}: { select: { id: true, name: true } }`).join(', ')} },`
        : ''

    // Generate create/update data
    const dataFields = fields.map(f => {
        if (f.isRelation) {
            return `                ${f.name}Id: ${f.name}Id || null,`
        }
        if (f.type === 'Int') {
            return `                ${f.name}: parseInt(${f.name}) || 0,`
        }
        if (f.type === 'Float') {
            return `                ${f.name}: parseFloat(${f.name}) || 0,`
        }
        if (f.type === 'Boolean') {
            return `                ${f.name}: ${f.name} === 'on',`
        }
        return `                ${f.name},`
    }).join('\n')

    const destructure = fields.map(f => f.isRelation ? `${f.name}Id` : f.name).join(', ')

    // Form data for relations
    const formDataFetches = relations.map(r =>
        `    const ${r.relationModel!.toLowerCase()}s = await prisma.${r.relationModel!.toLowerCase()}.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
    })`
    ).join('\n')

    const formDataObject = relations.length > 0
        ? `{ ${relations.map(r => `${r.relationModel}: ${r.relationModel!.toLowerCase()}s`).join(', ')} }`
        : '{}'

    return `import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { ${lowerName}FormConfig } from '../config/forms/index.js'

const router = Router()

// List
router.get('/', async (req, res) => {
    const ${pluralName} = await prisma.${lowerName}.findMany({
        ${includeClause}
        orderBy: { createdAt: 'desc' },
    })
    res.render('${pluralName}/list', { title: '${modelName}s', ${pluralName} })
})

// Create form
router.get('/create', async (req, res) => {
${formDataFetches}
    
    res.render('${pluralName}/form', {
        title: 'Create ${modelName}',
        config: ${lowerName}FormConfig,
        formData: ${formDataObject},
        values: {},
        action: '/${pluralName}/create',
        isEdit: false,
    })
})

// Create action
router.post('/create', async (req, res) => {
    try {
        const { ${destructure} } = req.body
        
        await prisma.${lowerName}.create({
            data: {
${dataFields}
            },
        })
        res.redirect('/${pluralName}')
    } catch (error) {
        console.error('Create ${lowerName} error:', error)
        res.redirect('/${pluralName}/create')
    }
})

// Edit form
router.get('/:id/edit', async (req, res) => {
    const ${lowerName} = await prisma.${lowerName}.findUnique({ where: { id: req.params.id } })
    if (!${lowerName}) return res.redirect('/${pluralName}')
    
${formDataFetches}
    
    res.render('${pluralName}/form', {
        title: 'Edit ${modelName}',
        config: ${lowerName}FormConfig,
        formData: ${formDataObject},
        values: ${lowerName},
        action: \`/${pluralName}/\${${lowerName}.id}/edit\`,
        isEdit: true,
    })
})

// Edit action
router.post('/:id/edit', async (req, res) => {
    try {
        const { ${destructure} } = req.body
        
        await prisma.${lowerName}.update({
            where: { id: req.params.id },
            data: {
${dataFields}
            },
        })
        res.redirect('/${pluralName}')
    } catch (error) {
        console.error('Update ${lowerName} error:', error)
        res.redirect(\`/${pluralName}/\${req.params.id}/edit\`)
    }
})

// Delete
router.post('/:id/delete', async (req, res) => {
    try {
        await prisma.${lowerName}.delete({ where: { id: req.params.id } })
    } catch (error) {
        console.error('Delete ${lowerName} error:', error)
    }
    res.redirect('/${pluralName}')
})

export default router
`
}

// Generate list view
function generateListView(modelName: string, fields: ReturnType<typeof parsePrismaSchema>) {
    const lowerName = modelName.toLowerCase()
    const pluralName = lowerName + 's'

    // Pick display fields (max 4)
    const displayFields = fields.slice(0, 4)

    const headers = displayFields.map(f => `<th>${f.name.charAt(0).toUpperCase() + f.name.slice(1)}</th>`).join('\n                    ')

    const cells = displayFields.map(f => {
        if (f.isRelation) {
            return `<td>\${item.${f.name}?.name || '-'}</td>`
        }
        if (f.type === 'Boolean') {
            return `<td><span class="badge badge-\${item.${f.name} ? 'success' : 'error'}">\${item.${f.name} ? 'Yes' : 'No'}</span></td>`
        }
        if (f.type === 'Float') {
            return `<td>\${item.${f.name}?.toFixed(2) || '0.00'}</td>`
        }
        return `<td>\${item.${f.name} || '-'}</td>`
    }).join('\n                    ')

    return `<%- include('../layouts/main', { body: \`
<div class="page-header">
    <h2>${modelName}s</h2>
    <a href="/${pluralName}/create" class="btn btn-primary">Add ${modelName}</a>
</div>

<div class="card">
    <div class="card-body">
        \${${pluralName}.length > 0 ? \`
        <table class="table">
            <thead>
                <tr>
                    ${headers}
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                \${${pluralName}.map(item => \`
                <tr>
                    ${cells}
                    <td class="actions">
                        <a href="/${pluralName}/\${item.id}/edit" class="btn btn-sm btn-outline">Edit</a>
                        <form action="/${pluralName}/\${item.id}/delete" method="POST" class="inline" onsubmit="return confirm('Delete?')">
                            <button type="submit" class="btn btn-sm btn-danger">Delete</button>
                        </form>
                    </td>
                </tr>
                \`).join('')}
            </tbody>
        </table>
        \` : '<p class="text-muted">No ${pluralName} found.</p>'}
    </div>
</div>
\` }) %>
`
}

// Generate form view
function generateFormView(modelName: string) {
    return `<%- include('../layouts/main', { body: \`
<div class="page-header">
    <h2>\${isEdit ? 'Edit' : 'Create'} ${modelName}</h2>
</div>

<div class="card">
    <div class="card-body">
        \${include('../partials/dynamic-form')}
    </div>
</div>
\` }) %>
`
}

// Update form configs index
function updateFormConfigsIndex(modelName: string) {
    const configPath = path.join(ROOT, 'src', 'config', 'forms', 'index.ts')
    let content = fs.readFileSync(configPath, 'utf-8')

    const lowerName = modelName.toLowerCase()

    // Check if already exists
    if (content.includes(`${lowerName}FormConfig`)) {
        console.log(`⚠️  Form config for ${modelName} already exists`)
        return
    }

    // Find the formConfigs object and add new config
    const configRegex = /(export const formConfigs.*?=.*?\{)/s
    content = content.replace(configRegex, `$1\n    ${modelName}: ${lowerName}FormConfig,`)

    // Add the new config export before formConfigs
    const insertPoint = content.indexOf('export const formConfigs')
    const newConfig = generateFormConfig(modelName, parsePrismaSchema(modelName))
    content = content.slice(0, insertPoint) + newConfig + '\n' + content.slice(insertPoint)

    fs.writeFileSync(configPath, content)
    console.log(`✅ Updated src/config/forms/index.ts`)
}

// Update app.ts with new route
function updateAppTs(modelName: string) {
    const appPath = path.join(ROOT, 'src', 'app.ts')
    let content = fs.readFileSync(appPath, 'utf-8')

    const lowerName = modelName.toLowerCase()
    const pluralName = lowerName + 's'

    // Check if already exists
    if (content.includes(`/${pluralName}`)) {
        console.log(`⚠️  Route for ${modelName} already exists in app.ts`)
        return
    }

    // Add import
    const lastImport = content.lastIndexOf("import ")
    const importEnd = content.indexOf('\n', lastImport)
    const newImport = `\nimport ${lowerName}Routes from './routes/${pluralName}.js'`
    content = content.slice(0, importEnd) + newImport + content.slice(importEnd)

    // Add route (before error handlers)
    const errorHandler = content.indexOf("// 404 handler")
    if (errorHandler > 0) {
        const newRoute = `app.use('/${pluralName}', authMiddleware, ${lowerName}Routes)\n\n`
        content = content.slice(0, errorHandler) + newRoute + content.slice(errorHandler)
    }

    fs.writeFileSync(appPath, content)
    console.log(`✅ Updated src/app.ts`)
}

// Update sidebar
function updateSidebar(modelName: string) {
    const sidebarPath = path.join(ROOT, 'src', 'views', 'partials', 'sidebar.ejs')
    let content = fs.readFileSync(sidebarPath, 'utf-8')

    const lowerName = modelName.toLowerCase()
    const pluralName = lowerName + 's'

    // Check if already exists
    if (content.includes(`/${pluralName}`)) {
        console.log(`⚠️  Sidebar link for ${modelName} already exists`)
        return
    }

    // Find Content section and add link
    const contentSection = content.indexOf('Content</span>')
    if (contentSection > 0) {
        const nextSection = content.indexOf('</div>', contentSection)
        const newLink = `
            <a href="/${pluralName}" class="nav-item <%= currentPath.startsWith('/${pluralName}') ? 'active' : '' %>">
                <span class="nav-icon">📦</span>
                <span class="nav-text">${modelName}s</span>
            </a>`
        content = content.slice(0, nextSection) + newLink + content.slice(nextSection)
    }

    fs.writeFileSync(sidebarPath, content)
    console.log(`✅ Updated sidebar`)
}

// Main execution
console.log(`\n🚀 Generating CRUD for "${modelName}"...\n`)

// Parse schema
const fields = parsePrismaSchema(modelName)
console.log(`📋 Found ${fields.length} fields: ${fields.map(f => f.name).join(', ')}`)

const lowerName = modelName.toLowerCase()
const pluralName = lowerName + 's'

// Create routes file
const routesDir = path.join(ROOT, 'src', 'routes')
const routesFile = path.join(routesDir, `${pluralName}.ts`)
if (!fs.existsSync(routesFile)) {
    fs.writeFileSync(routesFile, generateRoutes(modelName, fields))
    console.log(`✅ Created src/routes/${pluralName}.ts`)
} else {
    console.log(`⚠️  Routes file already exists`)
}

// Create views
const viewsDir = path.join(ROOT, 'src', 'views', pluralName)
if (!fs.existsSync(viewsDir)) {
    fs.mkdirSync(viewsDir, { recursive: true })
}

const listView = path.join(viewsDir, 'list.ejs')
if (!fs.existsSync(listView)) {
    fs.writeFileSync(listView, generateListView(modelName, fields))
    console.log(`✅ Created src/views/${pluralName}/list.ejs`)
}

const formView = path.join(viewsDir, 'form.ejs')
if (!fs.existsSync(formView)) {
    fs.writeFileSync(formView, generateFormView(modelName))
    console.log(`✅ Created src/views/${pluralName}/form.ejs`)
}

// Update form configs
updateFormConfigsIndex(modelName)

// Update app.ts
updateAppTs(modelName)

// Update sidebar
updateSidebar(modelName)

console.log(`
✨ Done! CRUD for "${modelName}" generated successfully.

📝 Next steps:
   1. Restart dev server (should auto-reload)
   2. Visit http://localhost:4000/${pluralName}
`)
