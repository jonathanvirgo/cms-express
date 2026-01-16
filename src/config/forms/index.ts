export type FieldType =
    | 'text'
    | 'email'
    | 'password'
    | 'number'
    | 'textarea'
    | 'checkbox'
    | 'select'
    | 'relation'
    | 'multi-relation'
    | 'date'
    | 'file'
    | 'rich-text'

export interface FormField {
    name: string
    label: string
    type: FieldType
    required?: boolean
    placeholder?: string
    description?: string
    defaultValue?: unknown
    hidden?: boolean
    disabled?: boolean
    // Select options
    options?: Array<{ value: string; label: string }>
    // Relation config
    relation?: {
        model: string
        displayField: string
        valueField: string
    }
    // File config
    accept?: string
    multiple?: boolean
    // Textarea/Rich-text
    rows?: number
    minHeight?: number
    // Number config
    min?: number
    max?: number
    step?: number
}

export interface FormConfig {
    modelName: string
    title: string
    description?: string
    fields: FormField[]
}

// User form config
export const userFormConfig: FormConfig = {
    modelName: 'User',
    title: 'User',
    fields: [
        { name: 'name', label: 'Full Name', type: 'text', required: true },
        { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'password', label: 'Password', type: 'password', required: true },
        {
            name: 'roleId',
            label: 'Role',
            type: 'relation',
            required: true,
            relation: { model: 'Role', displayField: 'name', valueField: 'id' }
        },
        { name: 'isActive', label: 'Active', type: 'checkbox', defaultValue: true },
    ],
}

// Role form config
export const roleFormConfig: FormConfig = {
    modelName: 'Role',
    title: 'Role',
    fields: [
        { name: 'name', label: 'Role Name', type: 'text', required: true },
        { name: 'description', label: 'Description', type: 'textarea', rows: 3 },
        { name: 'permissions', label: 'Permissions (JSON)', type: 'textarea', rows: 5, defaultValue: '[]' },
    ],
}

// Category form config
export const categoryFormConfig: FormConfig = {
    modelName: 'Category',
    title: 'Category',
    fields: [
        { name: 'name', label: 'Name', type: 'text', required: true },
        { name: 'slug', label: 'Slug', type: 'text', required: true },
        { name: 'description', label: 'Description', type: 'textarea', rows: 3 },
    ],
}

// Tag form config
export const tagFormConfig: FormConfig = {
    modelName: 'Tag',
    title: 'Tag',
    fields: [
        { name: 'name', label: 'Name', type: 'text', required: true },
        { name: 'slug', label: 'Slug', type: 'text', required: true },
    ],
}

// Post form config
export const postFormConfig: FormConfig = {
    modelName: 'Post',
    title: 'Post',
    fields: [
        { name: 'title', label: 'Title', type: 'text', required: true },
        { name: 'slug', label: 'Slug', type: 'text', required: true },
        { name: 'excerpt', label: 'Excerpt', type: 'textarea', rows: 2 },
        { name: 'content', label: 'Content', type: 'rich-text', minHeight: 300 },
        { name: 'featuredImage', label: 'Featured Image', type: 'file', accept: 'image/*' },
        {
            name: 'status',
            label: 'Status',
            type: 'select',
            options: [
                { value: 'draft', label: 'Draft' },
                { value: 'published', label: 'Published' },
                { value: 'archived', label: 'Archived' },
            ],
            defaultValue: 'draft',
        },
        {
            name: 'categoryId',
            label: 'Category',
            type: 'relation',
            relation: { model: 'Category', displayField: 'name', valueField: 'id' }
        },
    ],
}

// Product form config - Auto-generated
export const productFormConfig: FormConfig = {
    modelName: 'Product',
    title: 'Product',
    fields: [
        { name: 'name', label: 'Name', type: 'text', required: true },
        { name: 'slug', label: 'Slug', type: 'text', required: true },
        { name: 'description', label: 'Description', type: 'textarea', rows: 3 },
        { name: 'price', label: 'Price', type: 'number', step: 0.01 },
        { name: 'stock', label: 'Stock', type: 'number' },
        { name: 'isActive', label: 'IsActive', type: 'checkbox', defaultValue: true },
        { name: 'categoryId', label: 'CategoryId', type: 'text' },
        { name: 'category', label: 'Category', type: 'relation',
            relation: { model: 'Category', displayField: 'name', valueField: 'id' } },
    ],
}

export const formConfigs: Record<string, FormConfig> = {
    Product: productFormConfig,
    User: userFormConfig,
    Role: roleFormConfig,
    Category: categoryFormConfig,
    Tag: tagFormConfig,
    Post: postFormConfig,
}
