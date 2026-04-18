# Vintage Store Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack vintage store with an AI-powered pricing tool for the stock keeper and a customer-facing e-commerce storefront.

**Architecture:** Single Next.js 14 App Router application with `/store`, `/admin`, and `/api` route groups. AI pipeline runs server-side: GPT-4o Vision identifies uploaded items, eBay APIs fetch price data, and the stock keeper reviews/approves before publishing. Customers browse and purchase via Stripe Checkout.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Prisma + PostgreSQL (Supabase), Cloudinary, OpenAI GPT-4o Vision, eBay Browse API + Finding API, Stripe Checkout + Webhooks, Resend (email), Jest + React Testing Library

**Spec:** `docs/superpowers/specs/2026-04-09-vintage-store-design.md`

---

## File Structure

```
vintage-store/
├── app/
│   ├── (store)/
│   │   ├── page.tsx                        # Homepage
│   │   ├── browse/page.tsx                 # Browse + filter
│   │   ├── product/[id]/page.tsx           # Product detail
│   │   ├── cart/page.tsx                   # Cart
│   │   └── checkout/
│   │       ├── page.tsx                    # Checkout form (Stripe redirect)
│   │       └── success/page.tsx            # Order confirmation
│   ├── admin/
│   │   ├── login/page.tsx                  # Password login
│   │   ├── page.tsx                        # Inventory list
│   │   ├── upload/page.tsx                 # Upload & Price tool
│   │   └── orders/page.tsx                 # Orders list
│   └── api/
│       ├── admin/login/route.ts            # Verify password, set cookie
│       ├── upload/route.ts                 # Cloudinary upload
│       ├── ai/identify/route.ts            # GPT-4o + eBay pipeline
│       ├── products/
│       │   ├── route.ts                    # GET (list), POST (create)
│       │   └── [id]/route.ts               # GET, PUT, DELETE
│       ├── orders/
│       │   ├── route.ts                    # GET all (admin)
│       │   └── [id]/route.ts               # PUT (mark shipped)
│       └── stripe/
│           ├── checkout/route.ts           # Create checkout session
│           └── webhook/route.ts            # Handle payment events
├── components/
│   ├── store/
│   │   ├── ProductCard.tsx                 # Single product tile
│   │   ├── ProductGrid.tsx                 # Grid of ProductCards
│   │   ├── FilterBar.tsx                   # Category/price/size filters
│   │   └── CartDrawer.tsx                  # Slide-in cart panel
│   └── admin/
│       ├── ImageUploader.tsx               # Drag-drop + camera upload
│       ├── AIPricePanel.tsx                # Shows AI result + eBay table
│       ├── ProductForm.tsx                 # Editable fields + approve btn
│       ├── InventoryTable.tsx              # Product list with actions
│       └── OrdersTable.tsx                 # Orders list with ship action
├── lib/
│   ├── prisma.ts                           # Prisma client singleton
│   ├── ai.ts                               # GPT-4o Vision identification
│   ├── ebay.ts                             # eBay active + sold price lookup
│   ├── cloudinary.ts                       # Server-side upload helper
│   ├── stripe.ts                           # Stripe client + session builder
│   ├── resend.ts                           # Order confirmation email
│   └── cart.ts                             # localStorage cart helpers (client)
├── middleware.ts                            # Protect /admin/* routes
├── prisma/schema.prisma
├── jest.config.ts
├── jest.setup.ts
└── __tests__/
    ├── lib/
    │   ├── ai.test.ts
    │   ├── ebay.test.ts
    │   └── cart.test.ts
    └── api/
        ├── products.test.ts
        └── stripe-webhook.test.ts
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `vintage-store/` (project root)
- Create: `.env.local`
- Create: `jest.config.ts`
- Create: `jest.setup.ts`

- [ ] **Step 1: Scaffold Next.js app**

```bash
npx create-next-app@latest vintage-store \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --no-src-dir \
  --import-alias="@/*"
cd vintage-store
```

- [ ] **Step 2: Install dependencies**

```bash
npm install prisma @prisma/client
npm install openai
npm install cloudinary
npm install stripe @stripe/stripe-js
npm install resend
npm install @radix-ui/react-dialog @radix-ui/react-select lucide-react
npm install -D jest @types/jest ts-jest jest-environment-jsdom \
  @testing-library/react @testing-library/jest-dom \
  @testing-library/user-event
```

- [ ] **Step 3: Create `.env.local`**

```bash
cat > .env.local << 'EOF'
DATABASE_URL="postgresql://..."        # Supabase connection string
ADMIN_PASSWORD="changeme"              # Single admin password

OPENAI_API_KEY="sk-..."
EBAY_APP_ID="..."                      # eBay developer App ID
EBAY_OAUTH_TOKEN="..."                 # eBay OAuth token for Browse API

CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."

STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

RESEND_API_KEY="re_..."
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
EOF
```

- [ ] **Step 4: Configure Jest**

Create `jest.config.ts`:
```typescript
import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
}

export default createJestConfig(config)
```

Create `jest.setup.ts`:
```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "chore: scaffold Next.js project with dependencies"
```

---

## Task 2: Database Schema

**Files:**
- Create: `prisma/schema.prisma`
- Create: `lib/prisma.ts`

- [ ] **Step 1: Initialize Prisma**

```bash
npx prisma init --datasource-provider postgresql
```

- [ ] **Step 2: Write schema**

Replace `prisma/schema.prisma` contents:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Product {
  id                  String   @id @default(cuid())
  title               String
  description         String
  category            String
  condition           String   // excellent | good | fair
  size                String?
  price               Float
  images              String[] // Cloudinary URLs
  status              String   @default("draft") // draft | live
  aiMetadata          Json?    // raw GPT-4o response
  ebayPriceSnapshot   Json?    // { active: {...}, sold: {...} }
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  orderItems          OrderItem[]
}

model Order {
  id                    String      @id @default(cuid())
  customerName          String
  customerEmail         String
  shippingAddress       Json        // { line1, city, state, zip, country }
  stripePaymentIntentId String      @unique
  status                String      @default("pending") // pending | paid | shipped
  total                 Float
  items                 OrderItem[]
  createdAt             DateTime    @default(now())
  updatedAt             DateTime    @updatedAt
}

model OrderItem {
  id          String  @id @default(cuid())
  orderId     String
  productId   String
  title       String  // snapshot at time of purchase
  price       Float
  imageUrl    String
  order       Order   @relation(fields: [orderId], references: [id])
  product     Product @relation(fields: [productId], references: [id])
}
```

- [ ] **Step 3: Create Prisma client singleton**

Create `lib/prisma.ts`:
```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ['error'] })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 4: Run migration**

```bash
npx prisma migrate dev --name init
npx prisma generate
```

Expected: Migration created and applied, Prisma Client generated.

- [ ] **Step 5: Commit**

```bash
git add prisma/ lib/prisma.ts
git commit -m "feat: add database schema and Prisma client"
```

---

## Task 3: Admin Auth Middleware

**Files:**
- Create: `middleware.ts`
- Create: `app/admin/login/page.tsx`
- Create: `app/api/admin/login/route.ts`
- Create: `__tests__/api/admin-login.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/api/admin-login.test.ts`:
```typescript
import { POST } from '@/app/api/admin/login/route'
import { NextRequest } from 'next/server'

describe('POST /api/admin/login', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    process.env = { ...OLD_ENV, ADMIN_PASSWORD: 'secret123' }
  })

  afterEach(() => {
    process.env = OLD_ENV
  })

  it('returns 200 and sets cookie for correct password', async () => {
    const req = new NextRequest('http://localhost/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password: 'secret123' }),
      headers: { 'content-type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('set-cookie')).toContain('admin_auth=')
  })

  it('returns 401 for wrong password', async () => {
    const req = new NextRequest('http://localhost/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password: 'wrong' }),
      headers: { 'content-type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest admin-login --no-coverage
```
Expected: FAIL — module not found

- [ ] **Step 3: Create login API route**

Create `app/api/admin/login/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { password } = await req.json()

  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set('admin_auth', process.env.ADMIN_PASSWORD!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })
  return res
}
```

- [ ] **Step 4: Create middleware**

Create `middleware.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (!pathname.startsWith('/admin')) return NextResponse.next()
  if (pathname === '/admin/login') return NextResponse.next()

  const cookie = req.cookies.get('admin_auth')
  if (cookie?.value === process.env.ADMIN_PASSWORD) return NextResponse.next()

  return NextResponse.redirect(new URL('/admin/login', req.url))
}

export const config = {
  matcher: ['/admin/:path*'],
}
```

- [ ] **Step 5: Create login page**

Create `app/admin/login/page.tsx`:
```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLogin() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      router.push('/admin')
    } else {
      setError('Incorrect password')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-stone-800">Admin Login</h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full border border-stone-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-stone-400"
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          className="w-full bg-stone-800 text-white py-3 rounded-lg text-base font-medium active:bg-stone-700"
        >
          Log in
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npx jest admin-login --no-coverage
```
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add middleware.ts app/admin/login/ app/api/admin/ __tests__/api/admin-login.test.ts lib/prisma.ts
git commit -m "feat: admin password auth with middleware and cookie"
```

---

## Task 4: Cloudinary Upload

**Files:**
- Create: `lib/cloudinary.ts`
- Create: `app/api/upload/route.ts`

- [ ] **Step 1: Create Cloudinary helper**

Create `lib/cloudinary.ts`:
```typescript
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function uploadImage(fileBuffer: Buffer, filename: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'vintage-store', public_id: filename, resource_type: 'image' },
      (error, result) => {
        if (error || !result) return reject(error)
        resolve(result.secure_url)
      }
    )
    stream.end(fileBuffer)
  })
}
```

- [ ] **Step 2: Create upload API route**

Create `app/api/upload/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { uploadImage } from '@/lib/cloudinary'
import { nanoid } from 'crypto'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const filename = `${Date.now()}-${nanoid(8)}`

  try {
    const url = await uploadImage(buffer, filename)
    return NextResponse.json({ url })
  } catch {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Verify manually**

Start the dev server and test with a curl:
```bash
npm run dev
# In another terminal:
curl -X POST http://localhost:3000/api/upload \
  -F "file=@/path/to/test-image.jpg"
```
Expected: `{ "url": "https://res.cloudinary.com/..." }`

- [ ] **Step 4: Commit**

```bash
git add lib/cloudinary.ts app/api/upload/
git commit -m "feat: Cloudinary image upload API"
```

---

## Task 5: AI Identification Service

**Files:**
- Create: `lib/ai.ts`
- Create: `__tests__/lib/ai.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/ai.test.ts`:
```typescript
import { identifyItem } from '@/lib/ai'

jest.mock('openai', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: {
                content: JSON.stringify({
                  itemType: 'denim jacket',
                  brand: "Levi's",
                  era: '1970s',
                  condition: 'good',
                  searchTerms: ["Levi's denim jacket vintage 1970s men's"],
                  description: "A classic 1970s Levi's denim trucker jacket in good condition.",
                })
              }
            }]
          })
        }
      }
    }))
  }
})

describe('identifyItem', () => {
  it('returns structured item data from an image URL', async () => {
    const result = await identifyItem('https://example.com/image.jpg')
    expect(result.itemType).toBe('denim jacket')
    expect(result.brand).toBe("Levi's")
    expect(result.era).toBe('1970s')
    expect(result.condition).toBe('good')
    expect(result.searchTerms).toHaveLength(1)
    expect(result.description).toBeTruthy()
  })

  it('throws if response is not valid JSON', async () => {
    const OpenAI = require('openai').default
    OpenAI.mockImplementation(() => ({
      chat: { completions: { create: jest.fn().mockResolvedValue({
        choices: [{ message: { content: 'not json' } }]
      }) } }
    }))
    await expect(identifyItem('https://example.com/image.jpg')).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest ai.test --no-coverage
```
Expected: FAIL — module not found

- [ ] **Step 3: Implement `lib/ai.ts`**

Create `lib/ai.ts`:
```typescript
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export interface ItemIdentification {
  itemType: string
  brand: string | null
  era: string | null
  condition: 'excellent' | 'good' | 'fair'
  searchTerms: string[]
  description: string
}

const SYSTEM_PROMPT = `You are an expert vintage item appraiser. Analyze the image and return ONLY valid JSON with these exact fields:
- itemType: string (e.g. "denim jacket", "leather handbag", "ankle boots")
- brand: string or null (visible brand/designer, or null if not visible)
- era: string or null (estimated decade, e.g. "1970s", "1980s", or null if unclear)
- condition: "excellent" | "good" | "fair"
- searchTerms: string[] (2-3 eBay search queries to find this item, be specific)
- description: string (2-3 sentence listing description)`

export async function identifyItem(imageUrl: string): Promise<ItemIdentification> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: SYSTEM_PROMPT },
        { type: 'image_url', image_url: { url: imageUrl } },
      ],
    }],
    max_tokens: 500,
  })

  const content = response.choices[0].message.content
  if (!content) throw new Error('No response from AI')

  try {
    return JSON.parse(content) as ItemIdentification
  } catch {
    throw new Error(`AI returned invalid JSON: ${content}`)
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest ai.test --no-coverage
```
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/ai.ts __tests__/lib/ai.test.ts
git commit -m "feat: GPT-4o Vision item identification service"
```

---

## Task 6: eBay Price Lookup

**Files:**
- Create: `lib/ebay.ts`
- Create: `__tests__/lib/ebay.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/ebay.test.ts`:
```typescript
import { fetchEbayPrices, PriceStats } from '@/lib/ebay'

global.fetch = jest.fn()

const mockActiveResponse = {
  itemSummaries: [
    { price: { value: '45.00' } },
    { price: { value: '60.00' } },
    { price: { value: '55.00' } },
  ]
}

const mockSoldResponse = {
  searchResult: [{
    item: [
      { sellingStatus: [{ convertedCurrentPrice: [{ __value__: '40.00' }] }] },
      { sellingStatus: [{ convertedCurrentPrice: [{ __value__: '50.00' }] }] },
      { sellingStatus: [{ convertedCurrentPrice: [{ __value__: '35.00' }] }] },
    ]
  }]
}

describe('fetchEbayPrices', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockReset()
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => mockActiveResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => mockSoldResponse })
  })

  it('returns active and sold price stats', async () => {
    const result = await fetchEbayPrices("Levi's denim jacket vintage")
    expect(result.active.min).toBe(45)
    expect(result.active.max).toBe(60)
    expect(result.active.median).toBe(55)
    expect(result.sold.min).toBe(35)
    expect(result.sold.max).toBe(50)
    expect(result.sold.median).toBe(40)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest ebay.test --no-coverage
```
Expected: FAIL — module not found

- [ ] **Step 3: Implement `lib/ebay.ts`**

Create `lib/ebay.ts`:
```typescript
export interface PriceStats {
  min: number
  max: number
  median: number
  count: number
}

export interface EbayPrices {
  active: PriceStats
  sold: PriceStats
}

function calcStats(prices: number[]): PriceStats {
  if (prices.length === 0) return { min: 0, max: 0, median: 0, count: 0 }
  const sorted = [...prices].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const median = sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    median: Math.round(median * 100) / 100,
    count: sorted.length,
  }
}

async function fetchActivePrices(query: string): Promise<number[]> {
  const url = new URL('https://api.ebay.com/buy/browse/v1/item_summary/search')
  url.searchParams.set('q', query)
  url.searchParams.set('limit', '20')
  url.searchParams.set('filter', 'buyingOptions:{FIXED_PRICE}')

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${process.env.EBAY_OAUTH_TOKEN}`,
      'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
    },
  })

  if (!res.ok) return []
  const data = await res.json()
  return (data.itemSummaries ?? []).map((item: { price: { value: string } }) =>
    parseFloat(item.price.value)
  )
}

async function fetchSoldPrices(query: string): Promise<number[]> {
  const url = new URL('https://svcs.ebay.com/services/search/FindingService/v1')
  url.searchParams.set('OPERATION-NAME', 'findCompletedItems')
  url.searchParams.set('SERVICE-VERSION', '1.0.0')
  url.searchParams.set('SECURITY-APPNAME', process.env.EBAY_APP_ID!)
  url.searchParams.set('RESPONSE-DATA-FORMAT', 'JSON')
  url.searchParams.set('keywords', query)
  url.searchParams.set('itemFilter(0).name', 'SoldItemsOnly')
  url.searchParams.set('itemFilter(0).value', 'true')
  url.searchParams.set('paginationInput.entriesPerPage', '20')

  const res = await fetch(url.toString())
  if (!res.ok) return []
  const data = await res.json()

  const items = data?.searchResult?.[0]?.item ?? []
  return items.map((item: { sellingStatus: [{ convertedCurrentPrice: [{ __value__: string }] }] }) =>
    parseFloat(item.sellingStatus[0].convertedCurrentPrice[0].__value__)
  )
}

export async function fetchEbayPrices(query: string): Promise<EbayPrices> {
  const [activePrices, soldPrices] = await Promise.all([
    fetchActivePrices(query),
    fetchSoldPrices(query),
  ])

  return {
    active: calcStats(activePrices),
    sold: calcStats(soldPrices),
  }
}

export function suggestPrice(prices: EbayPrices): number {
  if (prices.sold.count >= 5) {
    return Math.round(prices.sold.median * 100) / 100
  }
  // Sparse sold data: use active median with 10% discount
  return Math.round(prices.active.median * 0.9 * 100) / 100
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest ebay.test --no-coverage
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/ebay.ts __tests__/lib/ebay.test.ts
git commit -m "feat: eBay active and sold price lookup service"
```

---

## Task 7: AI Pipeline API Route

**Files:**
- Create: `app/api/ai/identify/route.ts`

- [ ] **Step 1: Create the identify route**

Create `app/api/ai/identify/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { identifyItem } from '@/lib/ai'
import { fetchEbayPrices, suggestPrice } from '@/lib/ebay'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const { imageUrl, searchTermOverride } = await req.json()

  if (!imageUrl) {
    return NextResponse.json({ error: 'imageUrl required' }, { status: 400 })
  }

  // Step 1: Identify item with GPT-4o Vision
  let identification
  try {
    identification = await identifyItem(imageUrl)
  } catch {
    return NextResponse.json({ error: 'AI identification failed' }, { status: 500 })
  }

  // Step 2: Fetch eBay prices (use first search term, or override)
  const query = searchTermOverride ?? identification.searchTerms[0]

  // Check cache first (24-hour TTL)
  const cacheKey = query.toLowerCase().trim()
  const cachedProduct = await prisma.product.findFirst({
    where: {
      ebayPriceSnapshot: { path: ['query'], equals: cacheKey },
      updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    select: { ebayPriceSnapshot: true },
  })

  let ebayPrices
  if (cachedProduct?.ebayPriceSnapshot) {
    ebayPrices = (cachedProduct.ebayPriceSnapshot as { prices: typeof ebayPrices }).prices
  } else {
    try {
      ebayPrices = await fetchEbayPrices(query)
    } catch {
      ebayPrices = null
    }
  }

  const suggested = ebayPrices ? suggestPrice(ebayPrices) : null

  return NextResponse.json({
    identification,
    ebayPrices,
    suggestedPrice: suggested,
    searchQuery: query,
  })
}
```

- [ ] **Step 2: Verify manually with dev server**

```bash
npm run dev
curl -X POST http://localhost:3000/api/ai/identify \
  -H "content-type: application/json" \
  -d '{"imageUrl":"https://res.cloudinary.com/.../test.jpg"}'
```
Expected: JSON with `identification`, `ebayPrices`, `suggestedPrice`

- [ ] **Step 3: Commit**

```bash
git add app/api/ai/
git commit -m "feat: AI pipeline API route combining GPT-4o and eBay"
```

---

## Task 8: Products API

**Files:**
- Create: `app/api/products/route.ts`
- Create: `app/api/products/[id]/route.ts`
- Create: `__tests__/api/products.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/api/products.test.ts`:
```typescript
import { GET, POST } from '@/app/api/products/route'
import { GET as GET_ONE, PUT, DELETE } from '@/app/api/products/[id]/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    product: {
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('GET /api/products', () => {
  it('returns live products for storefront', async () => {
    (mockPrisma.product.findMany as jest.Mock).mockResolvedValue([{ id: '1', title: 'Jacket', status: 'live' }])
    const req = new NextRequest('http://localhost/api/products')
    const res = await GET(req)
    const data = await res.json()
    expect(data.products).toHaveLength(1)
    expect(mockPrisma.product.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: 'live' },
    }))
  })

  it('returns all products when admin=true', async () => {
    (mockPrisma.product.findMany as jest.Mock).mockResolvedValue([{ id: '1', status: 'draft' }])
    const req = new NextRequest('http://localhost/api/products?admin=true')
    const res = await GET(req)
    const data = await res.json()
    expect(data.products).toHaveLength(1)
    expect(mockPrisma.product.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {},
    }))
  })
})

describe('POST /api/products', () => {
  it('creates a product and returns it', async () => {
    const product = { id: '1', title: 'Jacket', price: 45, status: 'live' }
    ;(mockPrisma.product.create as jest.Mock).mockResolvedValue(product)
    const req = new NextRequest('http://localhost/api/products', {
      method: 'POST',
      body: JSON.stringify({ title: 'Jacket', price: 45, status: 'live', category: 'Outerwear', condition: 'good', description: 'Nice', images: [] }),
      headers: { 'content-type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.product.id).toBe('1')
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npx jest products.test --no-coverage
```
Expected: FAIL — module not found

- [ ] **Step 3: Create products list/create route**

Create `app/api/products/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const isAdmin = req.nextUrl.searchParams.get('admin') === 'true'
  const category = req.nextUrl.searchParams.get('category')
  const minPrice = req.nextUrl.searchParams.get('minPrice')
  const maxPrice = req.nextUrl.searchParams.get('maxPrice')
  const size = req.nextUrl.searchParams.get('size')
  const search = req.nextUrl.searchParams.get('q')

  const where: Record<string, unknown> = isAdmin ? {} : { status: 'live' }
  if (category) where.category = category
  if (size) where.size = size
  if (minPrice || maxPrice) {
    where.price = {
      ...(minPrice ? { gte: parseFloat(minPrice) } : {}),
      ...(maxPrice ? { lte: parseFloat(maxPrice) } : {}),
    }
  }
  if (search) {
    where.title = { contains: search, mode: 'insensitive' }
  }

  const products = await prisma.product.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, title: true, price: true, category: true,
      condition: true, size: true, images: true, status: true, createdAt: true,
    },
  })

  return NextResponse.json({ products })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const product = await prisma.product.create({
    data: {
      title: body.title,
      description: body.description,
      category: body.category,
      condition: body.condition,
      size: body.size ?? null,
      price: body.price,
      images: body.images,
      status: body.status ?? 'draft',
      aiMetadata: body.aiMetadata ?? null,
      ebayPriceSnapshot: body.ebayPriceSnapshot ?? null,
    },
  })
  return NextResponse.json({ product }, { status: 201 })
}
```

- [ ] **Step 4: Create single product route**

Create `app/api/products/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const product = await prisma.product.findUnique({ where: { id: params.id } })
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ product })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const product = await prisma.product.update({
    where: { id: params.id },
    data: body,
  })
  return NextResponse.json({ product })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.product.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx jest products.test --no-coverage
```
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/api/products/ __tests__/api/products.test.ts
git commit -m "feat: products CRUD API with filter support"
```

---

## Task 9: Cart Utility

**Files:**
- Create: `lib/cart.ts`
- Create: `__tests__/lib/cart.test.ts`

- [ ] **Step 1: Write failing test**

Create `__tests__/lib/cart.test.ts`:
```typescript
import { getCart, addToCart, removeFromCart, clearCart, CartItem } from '@/lib/cart'

const mockItem: CartItem = {
  id: 'prod-1',
  title: 'Vintage Jacket',
  price: 45,
  imageUrl: 'https://example.com/image.jpg',
}

describe('cart utilities', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('getCart returns empty array when nothing stored', () => {
    expect(getCart()).toEqual([])
  })

  it('addToCart stores item and getCart retrieves it', () => {
    addToCart(mockItem)
    expect(getCart()).toHaveLength(1)
    expect(getCart()[0].id).toBe('prod-1')
  })

  it('addToCart does not add duplicates', () => {
    addToCart(mockItem)
    addToCart(mockItem)
    expect(getCart()).toHaveLength(1)
  })

  it('removeFromCart removes item by id', () => {
    addToCart(mockItem)
    removeFromCart('prod-1')
    expect(getCart()).toHaveLength(0)
  })

  it('clearCart empties the cart', () => {
    addToCart(mockItem)
    clearCart()
    expect(getCart()).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npx jest cart.test --no-coverage
```
Expected: FAIL — module not found

- [ ] **Step 3: Implement `lib/cart.ts`**

Create `lib/cart.ts`:
```typescript
const CART_KEY = 'vintage_store_cart'

export interface CartItem {
  id: string
  title: string
  price: number
  imageUrl: string
}

export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function addToCart(item: CartItem): void {
  const cart = getCart()
  if (cart.find((i) => i.id === item.id)) return
  localStorage.setItem(CART_KEY, JSON.stringify([...cart, item]))
}

export function removeFromCart(id: string): void {
  const cart = getCart().filter((i) => i.id !== id)
  localStorage.setItem(CART_KEY, JSON.stringify(cart))
}

export function clearCart(): void {
  localStorage.removeItem(CART_KEY)
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest cart.test --no-coverage
```
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/cart.ts __tests__/lib/cart.test.ts
git commit -m "feat: localStorage cart utilities"
```

---

## Task 10: Stripe Checkout + Webhook

**Files:**
- Create: `lib/stripe.ts`
- Create: `lib/resend.ts`
- Create: `app/api/stripe/checkout/route.ts`
- Create: `app/api/stripe/webhook/route.ts`
- Create: `__tests__/api/stripe-webhook.test.ts`

- [ ] **Step 1: Create Stripe and Resend helpers**

Create `lib/stripe.ts`:
```typescript
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})
```

Create `lib/resend.ts`:
```typescript
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendOrderConfirmation(opts: {
  to: string
  customerName: string
  orderId: string
  total: number
  items: { title: string; price: number }[]
}) {
  await resend.emails.send({
    from: 'orders@yourvintagestore.com',
    to: opts.to,
    subject: `Order Confirmed — #${opts.orderId.slice(-8).toUpperCase()}`,
    html: `
      <h1>Thanks, ${opts.customerName}!</h1>
      <p>Your order <strong>#${opts.orderId.slice(-8).toUpperCase()}</strong> has been confirmed.</p>
      <ul>
        ${opts.items.map((i) => `<li>${i.title} — $${i.price.toFixed(2)}</li>`).join('')}
      </ul>
      <p><strong>Total: $${opts.total.toFixed(2)}</strong> (includes flat-rate shipping)</p>
      <p>We'll email you again when your order ships.</p>
    `,
  })
}
```

- [ ] **Step 2: Create checkout session route**

Create `app/api/stripe/checkout/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const { items } = await req.json() as { items: { id: string; title: string; price: number; imageUrl: string }[] }

  if (!items?.length) {
    return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
  }

  // Verify all items are still live and prices match
  const productIds = items.map((i) => i.id)
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, status: 'live' },
  })

  if (products.length !== items.length) {
    return NextResponse.json({ error: 'One or more items are no longer available' }, { status: 409 })
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: products.map((p) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: p.title,
          images: p.images.slice(0, 1),
        },
        unit_amount: Math.round(p.price * 100),
      },
      quantity: 1,
    })),
    shipping_address_collection: { allowed_countries: ['US', 'CA', 'GB'] },
    shipping_options: [{
      shipping_rate_data: {
        type: 'fixed_amount',
        fixed_amount: { amount: 800, currency: 'usd' },
        display_name: 'Standard Shipping',
        delivery_estimate: {
          minimum: { unit: 'business_day', value: 5 },
          maximum: { unit: 'business_day', value: 10 },
        },
      },
    }],
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/cart`,
    metadata: { productIds: JSON.stringify(productIds) },
  })

  return NextResponse.json({ url: session.url })
}
```

- [ ] **Step 3: Write the webhook test**

Create `__tests__/api/stripe-webhook.test.ts`:
```typescript
import { POST } from '@/app/api/stripe/webhook/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: {
      constructEvent: jest.fn(),
    },
  },
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    order: { create: jest.fn().mockResolvedValue({ id: 'order-1' }) },
    product: { update: jest.fn().mockResolvedValue({}) },
  },
}))

jest.mock('@/lib/resend', () => ({
  sendOrderConfirmation: jest.fn().mockResolvedValue({}),
}))

import { stripe } from '@/lib/stripe'

describe('POST /api/stripe/webhook', () => {
  it('creates order on checkout.session.completed', async () => {
    const mockSession = {
      id: 'sess_1',
      payment_intent: 'pi_1',
      customer_details: { name: 'John Doe', email: 'john@example.com' },
      shipping_details: { address: { line1: '123 Main St', city: 'NYC', state: 'NY', postal_code: '10001', country: 'US' } },
      amount_total: 5300,
      metadata: { productIds: JSON.stringify(['prod-1']) },
    }

    ;(stripe.webhooks.constructEvent as jest.Mock).mockReturnValue({
      type: 'checkout.session.completed',
      data: { object: mockSession },
    })

    const req = new NextRequest('http://localhost/api/stripe/webhook', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'stripe-signature': 'sig_test' },
    })

    const res = await POST(req)
    expect(res.status).toBe(200)

    const { prisma } = require('@/lib/prisma')
    expect(prisma.order.create).toHaveBeenCalled()
  })
})
```

- [ ] **Step 4: Run to verify failure**

```bash
npx jest stripe-webhook.test --no-coverage
```
Expected: FAIL — module not found

- [ ] **Step 5: Create webhook handler**

Create `app/api/stripe/webhook/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { sendOrderConfirmation } from '@/lib/resend'
import Stripe from 'stripe'

export const config = { api: { bodyParser: false } }

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const productIds: string[] = JSON.parse(session.metadata?.productIds ?? '[]')

    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, title: true, price: true, images: true },
    })

    const shippingCost = (session.shipping_cost?.amount_total ?? 800) / 100
    const total = (session.amount_total ?? 0) / 100

    const order = await prisma.order.create({
      data: {
        customerName: session.customer_details?.name ?? 'Customer',
        customerEmail: session.customer_details?.email ?? '',
        shippingAddress: session.shipping_details?.address ?? {},
        stripePaymentIntentId: session.payment_intent as string,
        status: 'paid',
        total,
        items: {
          create: products.map((p) => ({
            productId: p.id,
            title: p.title,
            price: p.price,
            imageUrl: p.images[0] ?? '',
          })),
        },
      },
    })

    // Mark products as sold (unpublish)
    await prisma.product.updateMany({
      where: { id: { in: productIds } },
      data: { status: 'draft' },
    })

    await sendOrderConfirmation({
      to: order.customerEmail,
      customerName: order.customerName,
      orderId: order.id,
      total: order.total,
      items: products.map((p) => ({ title: p.title, price: p.price })),
    })
  }

  return NextResponse.json({ received: true })
}
```

- [ ] **Step 6: Run tests**

```bash
npx jest stripe-webhook.test --no-coverage
```
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add lib/stripe.ts lib/resend.ts app/api/stripe/ __tests__/api/stripe-webhook.test.ts
git commit -m "feat: Stripe checkout session and webhook with order creation"
```

---

## Task 11: Admin Upload & Price Tool UI

**Files:**
- Create: `components/admin/ImageUploader.tsx`
- Create: `components/admin/AIPricePanel.tsx`
- Create: `components/admin/ProductForm.tsx`
- Create: `app/admin/upload/page.tsx`

- [ ] **Step 1: Create ImageUploader component**

Create `components/admin/ImageUploader.tsx`:
```typescript
'use client'
import { useState, useRef } from 'react'

interface Props {
  onUploadComplete: (urls: string[]) => void
}

export default function ImageUploader({ onUploadComplete }: Props) {
  const [uploading, setUploading] = useState(false)
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(files: FileList) {
    setUploading(true)
    const uploaded: string[] = []

    for (const file of Array.from(files)) {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const { url } = await res.json()
      uploaded.push(url)
      setPreviewUrls((prev) => [...prev, url])
    }

    setUploading(false)
    onUploadComplete(uploaded)
  }

  return (
    <div className="space-y-3">
      <div
        className="border-2 border-dashed border-stone-300 rounded-xl p-8 text-center cursor-pointer active:bg-stone-50"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
      >
        <p className="text-stone-500 text-sm">Tap to upload or drag photos here</p>
        <p className="text-stone-400 text-xs mt-1">Up to 5 images</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />
      {uploading && <p className="text-stone-500 text-sm">Uploading...</p>}
      {previewUrls.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {previewUrls.map((url) => (
            <img key={url} src={url} alt="" className="h-20 w-20 object-cover rounded-lg" />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create AIPricePanel component**

Create `components/admin/AIPricePanel.tsx`:
```typescript
import { EbayPrices } from '@/lib/ebay'
import { ItemIdentification } from '@/lib/ai'

interface Props {
  identification: ItemIdentification
  ebayPrices: EbayPrices | null
  suggestedPrice: number | null
}

export default function AIPricePanel({ identification, ebayPrices, suggestedPrice }: Props) {
  return (
    <div className="space-y-4 bg-stone-50 rounded-xl p-4">
      <div>
        <h3 className="font-semibold text-stone-800">AI Identified</h3>
        <p className="text-sm text-stone-600 mt-1">
          {identification.itemType}
          {identification.brand ? ` · ${identification.brand}` : ''}
          {identification.era ? ` · ${identification.era}` : ''}
          {` · ${identification.condition}`}
        </p>
      </div>

      {ebayPrices ? (
        <div>
          <h3 className="font-semibold text-stone-800 mb-2">eBay Price Comparison</h3>
          <table className="w-full text-sm text-stone-700">
            <thead>
              <tr className="text-left text-stone-500 text-xs uppercase tracking-wide">
                <th className="pb-1">Type</th>
                <th className="pb-1">Min</th>
                <th className="pb-1">Median</th>
                <th className="pb-1">Max</th>
                <th className="pb-1">Count</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-1">Active</td>
                <td>${ebayPrices.active.min.toFixed(2)}</td>
                <td>${ebayPrices.active.median.toFixed(2)}</td>
                <td>${ebayPrices.active.max.toFixed(2)}</td>
                <td>{ebayPrices.active.count}</td>
              </tr>
              <tr>
                <td className="py-1">Sold</td>
                <td>${ebayPrices.sold.min.toFixed(2)}</td>
                <td>${ebayPrices.sold.median.toFixed(2)}</td>
                <td>${ebayPrices.sold.max.toFixed(2)}</td>
                <td>{ebayPrices.sold.count}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-stone-500">No eBay comparison data found.</p>
      )}

      {suggestedPrice && (
        <div className="bg-white border border-stone-200 rounded-lg p-3">
          <p className="text-xs text-stone-500 uppercase tracking-wide">Suggested Price</p>
          <p className="text-2xl font-bold text-stone-800">${suggestedPrice.toFixed(2)}</p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create ProductForm component**

Create `components/admin/ProductForm.tsx`:
```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ItemIdentification } from '@/lib/ai'

const CATEGORIES = ['Outerwear', 'Tops', 'Bottoms', 'Dresses', 'Shoes', 'Bags', 'Accessories', 'Jewelry', 'Home Decor', 'Other']
const CONDITIONS = ['excellent', 'good', 'fair']

interface Props {
  imageUrls: string[]
  identification: ItemIdentification
  suggestedPrice: number | null
  ebayPriceSnapshot: unknown
}

export default function ProductForm({ imageUrls, identification, suggestedPrice, ebayPriceSnapshot }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(identification.itemType)
  const [description, setDescription] = useState(identification.description)
  const [category, setCategory] = useState(CATEGORIES[0])
  const [condition, setCondition] = useState<string>(identification.condition)
  const [size, setSize] = useState('')
  const [price, setPrice] = useState(suggestedPrice?.toFixed(2) ?? '')
  const [saving, setSaving] = useState(false)

  async function handlePublish(status: 'live' | 'draft') {
    setSaving(true)
    await fetch('/api/products', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title, description, category, condition, size: size || null,
        price: parseFloat(price), images: imageUrls, status,
        aiMetadata: identification, ebayPriceSnapshot,
      }),
    })
    router.push('/admin')
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)}
          className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-base" />
      </div>
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)}
          rows={4} className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-base" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-base">
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Condition</label>
          <select value={condition} onChange={(e) => setCondition(e.target.value)}
            className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-base">
            {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Size (optional)</label>
          <input value={size} onChange={(e) => setSize(e.target.value)}
            placeholder="S, M, L, 32, etc."
            className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-base" />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Price ($)</label>
          <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)}
            className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-base" />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={() => handlePublish('live')} disabled={saving}
          className="flex-1 bg-stone-800 text-white py-3 rounded-xl font-semibold text-base disabled:opacity-50">
          {saving ? 'Publishing...' : 'Publish Now'}
        </button>
        <button onClick={() => handlePublish('draft')} disabled={saving}
          className="flex-1 border border-stone-300 text-stone-700 py-3 rounded-xl font-semibold text-base disabled:opacity-50">
          Save Draft
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create upload page**

Create `app/admin/upload/page.tsx`:
```typescript
'use client'
import { useState } from 'react'
import ImageUploader from '@/components/admin/ImageUploader'
import AIPricePanel from '@/components/admin/AIPricePanel'
import ProductForm from '@/components/admin/ProductForm'
import { ItemIdentification } from '@/lib/ai'
import { EbayPrices } from '@/lib/ebay'

type Step = 'upload' | 'analyzing' | 'review'

export default function UploadPage() {
  const [step, setStep] = useState<Step>('upload')
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [identification, setIdentification] = useState<ItemIdentification | null>(null)
  const [ebayPrices, setEbayPrices] = useState<EbayPrices | null>(null)
  const [suggestedPrice, setSuggestedPrice] = useState<number | null>(null)
  const [ebaySnapshot, setEbaySnapshot] = useState<unknown>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleUploadComplete(urls: string[]) {
    setImageUrls(urls)
    setStep('analyzing')
    setError(null)

    const res = await fetch('/api/ai/identify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ imageUrl: urls[0] }),
    })

    if (!res.ok) {
      setError('AI analysis failed. Please try again.')
      setStep('upload')
      return
    }

    const data = await res.json()
    setIdentification(data.identification)
    setEbayPrices(data.ebayPrices)
    setSuggestedPrice(data.suggestedPrice)
    setEbaySnapshot(data.ebayPrices)
    setStep('review')
  }

  return (
    <div className="min-h-screen bg-stone-50 p-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-stone-800 mb-6">Add New Item</h1>

      {step === 'upload' && (
        <>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <ImageUploader onUploadComplete={handleUploadComplete} />
        </>
      )}

      {step === 'analyzing' && (
        <div className="text-center py-16 space-y-3">
          <div className="w-10 h-10 border-2 border-stone-800 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-stone-600">Identifying item and fetching prices...</p>
        </div>
      )}

      {step === 'review' && identification && (
        <div className="space-y-6">
          <AIPricePanel
            identification={identification}
            ebayPrices={ebayPrices}
            suggestedPrice={suggestedPrice}
          />
          <ProductForm
            imageUrls={imageUrls}
            identification={identification}
            suggestedPrice={suggestedPrice}
            ebayPriceSnapshot={ebaySnapshot}
          />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add components/admin/ app/admin/upload/
git commit -m "feat: admin upload and AI price tool UI"
```

---

## Task 12: Admin Inventory + Orders Pages

**Files:**
- Create: `components/admin/InventoryTable.tsx`
- Create: `components/admin/OrdersTable.tsx`
- Create: `app/admin/page.tsx`
- Create: `app/admin/orders/page.tsx`
- Create: `app/api/orders/route.ts`
- Create: `app/api/orders/[id]/route.ts`

- [ ] **Step 1: Create orders API routes**

Create `app/api/orders/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    include: { items: true },
  })
  return NextResponse.json({ orders })
}
```

Create `app/api/orders/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { status } = await req.json()
  const order = await prisma.order.update({
    where: { id: params.id },
    data: { status },
  })
  return NextResponse.json({ order })
}
```

- [ ] **Step 2: Create InventoryTable component**

Create `components/admin/InventoryTable.tsx`:
```typescript
'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface Product {
  id: string
  title: string
  price: number
  category: string
  status: string
  images: string[]
}

interface Props {
  products: Product[]
  onStatusChange: (id: string, status: string) => void
  onDelete: (id: string) => void
}

export default function InventoryTable({ products, onStatusChange, onDelete }: Props) {
  return (
    <div className="space-y-3">
      {products.map((p) => (
        <div key={p.id} className="bg-white rounded-xl p-3 flex gap-3 items-center shadow-sm">
          {p.images[0] && (
            <Image src={p.images[0]} alt={p.title} width={64} height={64}
              className="rounded-lg object-cover w-16 h-16 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-stone-800 truncate">{p.title}</p>
            <p className="text-sm text-stone-500">{p.category} · ${p.price.toFixed(2)}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              p.status === 'live' ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'
            }`}>
              {p.status}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => onStatusChange(p.id, p.status === 'live' ? 'draft' : 'live')}
              className="text-xs border border-stone-300 rounded-lg px-2 py-1 text-stone-700"
            >
              {p.status === 'live' ? 'Unpublish' : 'Publish'}
            </button>
            <button onClick={() => onDelete(p.id)}
              className="text-xs text-red-500 border border-red-200 rounded-lg px-2 py-1">
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Create admin inventory page**

Create `app/admin/page.tsx`:
```typescript
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import InventoryTable from '@/components/admin/InventoryTable'

interface Product {
  id: string; title: string; price: number; category: string; status: string; images: string[]
}

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([])

  useEffect(() => {
    fetch('/api/products?admin=true')
      .then((r) => r.json())
      .then((d) => setProducts(d.products))
  }, [])

  async function handleStatusChange(id: string, status: string) {
    await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setProducts((prev) => prev.map((p) => p.id === id ? { ...p, status } : p))
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this item?')) return
    await fetch(`/api/products/${id}`, { method: 'DELETE' })
    setProducts((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <div className="min-h-screen bg-stone-50 p-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-stone-800">Inventory</h1>
        <div className="flex gap-2">
          <Link href="/admin/orders" className="text-sm text-stone-600 border border-stone-300 rounded-lg px-3 py-2">Orders</Link>
          <Link href="/admin/upload" className="text-sm bg-stone-800 text-white rounded-lg px-3 py-2">+ Add Item</Link>
        </div>
      </div>
      {products.length === 0
        ? <p className="text-stone-500 text-center py-16">No items yet. Add your first item.</p>
        : <InventoryTable products={products} onStatusChange={handleStatusChange} onDelete={handleDelete} />
      }
    </div>
  )
}
```

- [ ] **Step 4: Create OrdersTable component and orders page**

Create `components/admin/OrdersTable.tsx`:
```typescript
'use client'
interface OrderItem { title: string; price: number }
interface Order {
  id: string; customerName: string; customerEmail: string; total: number
  status: string; createdAt: string; items: OrderItem[]
}

interface Props { orders: Order[]; onShip: (id: string) => void }

export default function OrdersTable({ orders, onShip }: Props) {
  return (
    <div className="space-y-3">
      {orders.map((o) => (
        <div key={o.id} className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="font-medium text-stone-800">{o.customerName}</p>
              <p className="text-sm text-stone-500">{o.customerEmail}</p>
              <p className="text-xs text-stone-400 mt-0.5">#{o.id.slice(-8).toUpperCase()}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold">${o.total.toFixed(2)}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                o.status === 'shipped' ? 'bg-green-100 text-green-700' :
                o.status === 'paid' ? 'bg-blue-100 text-blue-700' :
                'bg-stone-100 text-stone-500'
              }`}>{o.status}</span>
            </div>
          </div>
          <ul className="text-sm text-stone-600 mb-3">
            {o.items.map((item, i) => (
              <li key={i}>{item.title} — ${item.price.toFixed(2)}</li>
            ))}
          </ul>
          {o.status === 'paid' && (
            <button onClick={() => onShip(o.id)}
              className="w-full border border-stone-300 text-stone-700 py-2 rounded-lg text-sm">
              Mark as Shipped
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
```

Create `app/admin/orders/page.tsx`:
```typescript
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import OrdersTable from '@/components/admin/OrdersTable'

export default function OrdersPage() {
  const [orders, setOrders] = useState([])

  useEffect(() => {
    fetch('/api/orders').then((r) => r.json()).then((d) => setOrders(d.orders))
  }, [])

  async function handleShip(id: string) {
    await fetch(`/api/orders/${id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'shipped' }),
    })
    setOrders((prev: { id: string; status: string }[]) => prev.map((o) => o.id === id ? { ...o, status: 'shipped' } : o))
  }

  return (
    <div className="min-h-screen bg-stone-50 p-4 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="text-stone-500">← Back</Link>
        <h1 className="text-2xl font-bold text-stone-800">Orders</h1>
      </div>
      {orders.length === 0
        ? <p className="text-stone-500 text-center py-16">No orders yet.</p>
        : <OrdersTable orders={orders} onShip={handleShip} />
      }
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add components/admin/ app/admin/ app/api/orders/
git commit -m "feat: admin inventory and orders management pages"
```

---

## Task 13: Customer Storefront — Homepage + Browse

**Files:**
- Create: `components/store/ProductCard.tsx`
- Create: `components/store/ProductGrid.tsx`
- Create: `components/store/FilterBar.tsx`
- Create: `app/(store)/page.tsx`
- Create: `app/(store)/browse/page.tsx`

- [ ] **Step 1: Create ProductCard**

Create `components/store/ProductCard.tsx`:
```typescript
import Link from 'next/link'
import Image from 'next/image'

interface Props {
  id: string
  title: string
  price: number
  category: string
  condition: string
  images: string[]
}

export default function ProductCard({ id, title, price, category, condition, images }: Props) {
  return (
    <Link href={`/product/${id}`} className="group block">
      <div className="aspect-square relative rounded-xl overflow-hidden bg-stone-100">
        {images[0] && (
          <Image
            src={images[0]}
            alt={title}
            fill
            sizes="(max-width: 640px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        )}
      </div>
      <div className="mt-2 px-1">
        <p className="text-sm font-medium text-stone-800 truncate">{title}</p>
        <p className="text-xs text-stone-500">{category} · {condition}</p>
        <p className="text-sm font-semibold text-stone-800 mt-0.5">${price.toFixed(2)}</p>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Create ProductGrid**

Create `components/store/ProductGrid.tsx`:
```typescript
import ProductCard from './ProductCard'

interface Product {
  id: string; title: string; price: number; category: string; condition: string; images: string[]
}

export default function ProductGrid({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return <p className="text-center text-stone-500 py-16">No items found.</p>
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
      {products.map((p) => <ProductCard key={p.id} {...p} />)}
    </div>
  )
}
```

- [ ] **Step 3: Create FilterBar**

Create `components/store/FilterBar.tsx`:
```typescript
'use client'
import { useRouter, useSearchParams } from 'next/navigation'

const CATEGORIES = ['All', 'Outerwear', 'Tops', 'Bottoms', 'Dresses', 'Shoes', 'Bags', 'Accessories', 'Jewelry', 'Home Decor', 'Other']

export default function FilterBar() {
  const router = useRouter()
  const params = useSearchParams()
  const active = params.get('category') ?? 'All'

  function setCategory(cat: string) {
    const p = new URLSearchParams(params.toString())
    if (cat === 'All') p.delete('category')
    else p.set('category', cat)
    router.push(`/browse?${p.toString()}`)
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => setCategory(cat)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            active === cat
              ? 'bg-stone-800 text-white'
              : 'bg-stone-100 text-stone-600 active:bg-stone-200'
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Create Homepage**

Create `app/(store)/page.tsx`:
```typescript
import Link from 'next/link'
import ProductGrid from '@/components/store/ProductGrid'

async function getFeaturedProducts() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products?limit=6`, {
    next: { revalidate: 60 },
  })
  const data = await res.json()
  return data.products ?? []
}

export default async function HomePage() {
  const products = await getFeaturedProducts()

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="bg-stone-900 text-white px-4 py-16 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-3">Vintage Finds</h1>
        <p className="text-stone-300 text-lg mb-6">Curated vintage clothing, bags & more</p>
        <Link href="/browse"
          className="inline-block bg-white text-stone-900 px-6 py-3 rounded-full font-semibold text-base">
          Shop Now
        </Link>
      </div>

      {/* New Arrivals */}
      <div className="px-4 py-8 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-stone-800">New Arrivals</h2>
          <Link href="/browse" className="text-sm text-stone-500 underline">View all</Link>
        </div>
        <ProductGrid products={products} />
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create Browse page**

Create `app/(store)/browse/page.tsx`:
```typescript
import { Suspense } from 'react'
import FilterBar from '@/components/store/FilterBar'
import ProductGrid from '@/components/store/ProductGrid'

async function getProducts(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products?${qs}`, {
    next: { revalidate: 30 },
  })
  const data = await res.json()
  return data.products ?? []
}

export default async function BrowsePage({ searchParams }: { searchParams: Record<string, string> }) {
  const products = await getProducts(searchParams)

  return (
    <div className="min-h-screen bg-white">
      <div className="px-4 py-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-stone-800 mb-4">Browse</h1>

        {/* Search */}
        <form method="GET" className="mb-4">
          <input
            name="q"
            defaultValue={searchParams.q ?? ''}
            placeholder="Search..."
            className="w-full border border-stone-300 rounded-xl px-4 py-3 text-base"
          />
        </form>

        {/* Filters */}
        <Suspense>
          <FilterBar />
        </Suspense>

        <div className="mt-5">
          <ProductGrid products={products} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add components/store/ app/\(store\)/
git commit -m "feat: storefront homepage and browse page with filters"
```

---

## Task 14: Product Detail + Cart

**Files:**
- Create: `app/(store)/product/[id]/page.tsx`
- Create: `components/store/CartDrawer.tsx`
- Create: `app/(store)/cart/page.tsx`

- [ ] **Step 1: Create Product Detail page**

Create `app/(store)/product/[id]/page.tsx`:
```typescript
'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import { addToCart, CartItem } from '@/lib/cart'

interface Product {
  id: string; title: string; description: string; price: number
  category: string; condition: string; size?: string; images: string[]
}

export default function ProductPage() {
  const { id } = useParams<{ id: string }>()
  const [product, setProduct] = useState<Product | null>(null)
  const [added, setAdded] = useState(false)
  const [activeImg, setActiveImg] = useState(0)

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then((r) => r.json())
      .then((d) => setProduct(d.product))
  }, [id])

  if (!product) return <div className="p-8 text-center text-stone-400">Loading...</div>

  function handleAddToCart() {
    const item: CartItem = {
      id: product!.id,
      title: product!.title,
      price: product!.price,
      imageUrl: product!.images[0] ?? '',
    }
    addToCart(item)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="min-h-screen bg-white max-w-lg mx-auto">
      {/* Image gallery */}
      <div className="relative aspect-square bg-stone-100">
        {product.images[activeImg] && (
          <Image src={product.images[activeImg]} alt={product.title} fill className="object-cover" />
        )}
      </div>
      {product.images.length > 1 && (
        <div className="flex gap-2 px-4 py-2">
          {product.images.map((url, i) => (
            <button key={url} onClick={() => setActiveImg(i)}
              className={`h-14 w-14 rounded-lg overflow-hidden border-2 ${i === activeImg ? 'border-stone-800' : 'border-transparent'}`}>
              <Image src={url} alt="" width={56} height={56} className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Details */}
      <div className="px-4 py-4 space-y-3">
        <h1 className="text-2xl font-bold text-stone-800">{product.title}</h1>
        <p className="text-2xl font-semibold text-stone-800">${product.price.toFixed(2)}</p>
        <div className="flex gap-2 text-sm text-stone-500">
          <span>{product.category}</span>
          <span>·</span>
          <span>{product.condition}</span>
          {product.size && <><span>·</span><span>Size {product.size}</span></>}
        </div>
        <p className="text-stone-600 text-base leading-relaxed">{product.description}</p>

        <button
          onClick={handleAddToCart}
          className="w-full bg-stone-800 text-white py-4 rounded-xl font-semibold text-base mt-4"
        >
          {added ? 'Added to Cart ✓' : 'Add to Cart'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create Cart page**

Create `app/(store)/cart/page.tsx`:
```typescript
'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { getCart, removeFromCart, CartItem } from '@/lib/cart'

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { setItems(getCart()) }, [])

  function handleRemove(id: string) {
    removeFromCart(id)
    setItems(getCart())
  }

  const total = items.reduce((sum, i) => sum + i.price, 0)

  async function handleCheckout() {
    setLoading(true)
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ items }),
    })
    const { url, error } = await res.json()
    if (error) { alert(error); setLoading(false); return }
    window.location.href = url
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-stone-500 text-lg">Your cart is empty</p>
        <Link href="/browse" className="bg-stone-800 text-white px-6 py-3 rounded-xl font-semibold">Browse Items</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white max-w-lg mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-stone-800 mb-6">Cart</h1>
      <div className="space-y-4 mb-6">
        {items.map((item) => (
          <div key={item.id} className="flex gap-3 items-center">
            <Image src={item.imageUrl} alt={item.title} width={72} height={72}
              className="rounded-xl object-cover w-18 h-18 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-stone-800">{item.title}</p>
              <p className="text-stone-600">${item.price.toFixed(2)}</p>
            </div>
            <button onClick={() => handleRemove(item.id)} className="text-stone-400 text-sm">Remove</button>
          </div>
        ))}
      </div>
      <div className="border-t border-stone-200 pt-4 space-y-3">
        <div className="flex justify-between text-stone-600">
          <span>Subtotal</span><span>${total.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-stone-600">
          <span>Shipping</span><span>$8.00</span>
        </div>
        <div className="flex justify-between font-bold text-stone-800 text-lg">
          <span>Total</span><span>${(total + 8).toFixed(2)}</span>
        </div>
        <button onClick={handleCheckout} disabled={loading}
          className="w-full bg-stone-800 text-white py-4 rounded-xl font-semibold text-base disabled:opacity-50">
          {loading ? 'Redirecting...' : 'Checkout'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(store\)/product/ app/\(store\)/cart/
git commit -m "feat: product detail page and cart"
```

---

## Task 15: Checkout Success + Layout + Navigation

**Files:**
- Create: `app/(store)/checkout/success/page.tsx`
- Create: `app/(store)/layout.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create checkout success page**

Create `app/(store)/checkout/success/page.tsx`:
```typescript
'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { clearCart } from '@/lib/cart'

export default function SuccessPage() {
  useEffect(() => { clearCart() }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-3xl">✓</div>
      <h1 className="text-2xl font-bold text-stone-800">Order Confirmed!</h1>
      <p className="text-stone-500 max-w-xs">
        Thanks for your purchase. You'll receive a confirmation email shortly.
      </p>
      <Link href="/browse" className="bg-stone-800 text-white px-6 py-3 rounded-xl font-semibold">
        Continue Shopping
      </Link>
    </div>
  )
}
```

- [ ] **Step 2: Create storefront layout with nav**

Create `app/(store)/layout.tsx`:
```typescript
import Link from 'next/link'

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav className="sticky top-0 z-50 bg-white border-b border-stone-200">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-stone-800 tracking-tight">
            Vintage Finds
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/browse" className="text-sm text-stone-600">Browse</Link>
            <Link href="/cart" className="text-sm text-stone-800 font-medium">Cart</Link>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </>
  )
}
```

- [ ] **Step 3: Update root layout**

Edit `app/layout.tsx` — replace the body className with Tailwind base and add viewport meta:
```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Vintage Finds',
  description: 'Curated vintage clothing, bags & more',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-white text-stone-900 antialiased`}>
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 4: Run all tests**

```bash
npx jest --no-coverage
```
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add app/\(store\)/ app/layout.tsx
git commit -m "feat: storefront layout, nav, and checkout success page"
```

---

## Task 16: End-to-End Smoke Test + Final Polish

**Files:**
- No new files — manual verification pass

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Verify admin flow**

1. Go to `http://localhost:3000/admin` → redirected to `/admin/login`
2. Enter password from `.env.local` → redirected to `/admin`
3. Click "Add Item" → `/admin/upload`
4. Upload a photo → wait for AI analysis
5. Verify eBay price table appears with suggested price
6. Edit title, set price, click "Publish Now"
7. Confirm redirect to `/admin` and item appears in inventory list

- [ ] **Step 3: Verify storefront flow**

1. Go to `http://localhost:3000` → homepage shows the new item
2. Click "Browse" → item appears in grid
3. Click item → product detail page loads with image and details
4. Click "Add to Cart" → "Added to Cart ✓" confirmation
5. Go to `/cart` → item appears, total is correct
6. Click "Checkout" → Stripe hosted checkout opens

- [ ] **Step 4: Verify Stripe test checkout**

Use test card `4242 4242 4242 4242`, any future expiry, any CVC.
Expected: Redirected to `/checkout/success`, confirmation email sent.

- [ ] **Step 5: Verify mobile layout**

Open Chrome DevTools → toggle device toolbar → test at 375px width:
- [ ] Nav fits on one line
- [ ] Product grid shows 2 columns
- [ ] Cart is readable and checkout button is easily tappable
- [ ] Admin upload page has large tap targets
- [ ] Admin inventory items are readable on small screen

- [ ] **Step 6: Build check**

```bash
npm run build
```
Expected: No build errors. Note any TypeScript warnings and fix them.

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat: complete vintage store with AI pricing, storefront, and checkout"
```
