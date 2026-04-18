# Vintage Store — AI-Powered Pricing & Storefront

**Date:** 2026-04-09
**Status:** Approved

---

## Overview

A single-store e-commerce platform for a vintage shop. A stock keeper uploads photos of items; an AI pipeline identifies each item and fetches real-time price comparisons from eBay (both active and sold listings) to suggest a listing price. The stock keeper reviews and approves (or overrides) before the item goes live on the customer-facing storefront. Customers can browse, search, and purchase items online via Stripe.

---

## Architecture

One Next.js 14 (App Router) application serving three concerns:

- `/store/*` — Customer-facing storefront
- `/admin/*` — Stock keeper dashboard (password-protected)
- `/api/*` — Backend API routes (deployed as Vercel serverless functions)

**Hosting**
| Component | Host |
|---|---|
| Next.js app + API routes | Vercel (serverless) |
| PostgreSQL database | Supabase |
| Images | Cloudinary |
| Payments | Stripe (external service) |

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Database | PostgreSQL + Prisma ORM |
| Image Storage | Cloudinary |
| AI Vision | OpenAI GPT-4o Vision |
| Price Lookup | eBay Browse API |
| Payments | Stripe (Checkout + Webhooks) |
| Styling | Tailwind CSS (mobile-first) |
| Admin Auth | Next.js middleware + env secret (single password, no auth library needed) |
| Email | Resend (order confirmation emails) |
| Deployment | Vercel + Supabase |

---

## Features

### Customer Storefront

- **Homepage** — hero banner, featured items, new arrivals section
- **Browse page** — filter by category, size, price range; keyword search
- **Product detail page** — photo gallery, title, description, price, condition, size, "Add to Cart"
- **Cart** — client-side only (localStorage), no login required
- **Checkout** — Stripe-powered, shipping details (flat-rate shipping), order confirmation email via Resend
- Fully mobile-optimized: single-column layouts, thumb-friendly tap targets, responsive images via Cloudinary transformations

### Admin Dashboard (`/admin`)

Protected by a single password stored in an env variable, checked via Next.js middleware. No user accounts — the stock keeper logs in with one shared password. Designed for mobile use (large tap targets, native camera integration for image uploads).

- **Upload & Price Tool** — core AI feature (see AI Pipeline below)
- **Inventory list** — view all products, edit details, publish/unpublish
- **Orders list** — view incoming orders, mark as shipped

---

## AI Pipeline

The core feature. Triggered when the stock keeper uploads a photo.

**Step 1 — Image Upload**
Stock keeper uploads 1–5 photos from desktop or mobile (native camera supported). Images are uploaded to Cloudinary; URLs are passed to the pipeline.

**Step 2 — Item Identification (GPT-4o Vision)**
The primary image is sent to GPT-4o Vision with a structured prompt. The model returns:
- Item type (e.g. jacket, handbag, boots)
- Brand/designer (if visible)
- Estimated era/decade
- Condition (excellent / good / fair)
- Key search terms for eBay lookup

**Step 3 — eBay Price Lookup**
Two eBay Browse API calls using the extracted search terms:
- Active listings → current asking price (min, max, median)
- Sold/completed listings → actual sale prices (min, max, median)

Results displayed as a reference table to the stock keeper.

**Step 4 — Price Suggestion**
Suggested price = median of sold listings. If sold data is sparse (< 5 results), fall back to median of active listings with a small discount (10%).

**Step 5 — Stock Keeper Review**
Stock keeper sees:
- AI-generated title and description (editable)
- Identified item details (editable)
- eBay price comparison table
- Suggested price (editable)
- Category, condition, size fields (editable)

Nothing is published until the stock keeper explicitly approves.

---

## Data Model

### Product
```
id, title, description, category, condition, size, price,
images (array of Cloudinary URLs), status (draft | live),
ai_identified_metadata (JSON), ebay_price_snapshot (JSON),
created_at, updated_at
```

### Order
```
id, customer_name, customer_email, shipping_address,
stripe_payment_intent_id, status (pending | paid | shipped),
items (JSON array of product snapshots), total,
created_at, updated_at
```

---

## Error Handling

| Scenario | Handling |
|---|---|
| AI identifies item poorly | All fields are editable before listing; AI output is always a suggestion |
| eBay returns no results | Show "No comparison data found"; stock keeper sets price manually |
| eBay API rate limit | Cache results per search term in DB for 24 hours |
| Payment failure | Stripe handles retry/decline messaging; order stays "pending" until webhook confirms |
| Image upload fails | Inline error with retry; item cannot be listed without at least one image |

---

## Mobile Optimization

- Tailwind CSS written mobile-first throughout
- Admin upload flow supports native camera on mobile devices
- Browse/filter UI uses a bottom drawer on small screens
- Checkout is single-column, optimized for thumb use
- Product images served via Cloudinary responsive transformations (`srcset`)

---

## Out of Scope

- Multi-store / multi-vendor support
- Push to external marketplaces (eBay, Etsy listing)
- Full CMS for non-product content
- Customer accounts / order history
