/**
 * Projects API
 * GET /api/projects - Liste des projets publiés
 * POST /api/projects - Créer un nouveau projet (vendor/admin)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { z } from 'zod'

// Schéma de validation pour la création de projet (aligné sur le schéma SQL)
const createProjectSchema = z.object({
  title: z.string().min(3).max(100),
  slug: z.string().min(3).max(100),
  description: z.string().min(10).max(5000),
  problem: z.string().min(10).max(5000),
  solution: z.string().min(10).max(5000),
  maturity_level: z.enum(['idea', 'roadmap', 'mvp', 'production']),
  tech_stack: z.array(z.string().min(1)).min(1),
  license_type: z.enum(['exclusive', 'non-exclusive']),
  category: z.string().min(1),
  tags: z.array(z.string().min(1)).optional(),
  price: z.number().positive().max(100000),
  currency: z.string().min(3).max(3).optional(),
  thumbnail_url: z.string().url().optional(),
})

// GET /api/projects - Liste des projets publiés
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { searchParams } = new URL(request.url)

    const status = searchParams.get('status') || 'published'
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10) || 20, 100)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0)

    const buildQuery = (select: string) => {
      let query = supabase
        .from('projects')
        .select(select)
        .eq('status', status)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (category) {
        query = query.eq('category', category)
      }

      if (search) {
        // Recherche dans le titre et la description
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
      }

      return query
    }

    const selectOptions = [
      {
        label: 'full',
        select: `
          id,
          title,
          slug,
          description,
          price,
          currency,
          category,
          tags,
          thumbnail_url,
          status,
          created_at,
          seller:users!seller_id (
            id,
            username,
            avatar_url,
            avg_rating,
            seller_verified
          )
        `,
      },
      {
        label: 'seller-id-only',
        select: `
          id,
          title,
          slug,
          description,
          price,
          currency,
          category,
          tags,
          thumbnail_url,
          status,
          created_at,
          seller:users!seller_id (
            id
          )
        `,
      },
      {
        label: 'no-seller',
        select: `
          id,
          title,
          slug,
          description,
          price,
          currency,
          category,
          tags,
          thumbnail_url,
          status,
          created_at
        `,
      },
    ]

    let projects = null
    let error = null

    for (const option of selectOptions) {
      const result = await buildQuery(option.select)
      projects = result.data
      error = result.error

      if (!error) {
        if (option.label !== 'full') {
          console.warn(`Projects GET: fallback select applied (${option.label}).`)
        }
        break
      }

      const shouldFallback =
        error.code === '42703' || error.code === '42P01'

      if (!shouldFallback) {
        break
      }
    }

    if (error) {
      console.error('Error fetching projects:', error)
      return NextResponse.json(
        { error: 'Failed to fetch projects' },
        { status: 500 }
      )
    }

    return NextResponse.json({ projects })
  } catch (error) {
    console.error('Projects GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/projects - Créer un nouveau projet
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()

    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Vérifier que l'utilisateur est un vendor/admin
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'vendor' && profile.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Only vendors can create projects' },
        { status: 403 }
      )
    }

    // Parser et valider le body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    const validationResult = createProjectSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const projectData = validationResult.data

    // Créer le projet
    const { data: project, error: createError } = await supabase
      .from('projects')
      .insert({
        ...projectData,
        seller_id: user.id,
        status: 'draft', // Les nouveaux projets sont en brouillon
        currency: projectData.currency || 'USD',
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating project:', createError)
      return NextResponse.json(
        { error: 'Failed to create project' },
        { status: 500 }
      )
    }

    return NextResponse.json({ project }, { status: 201 })
  } catch (error) {
    console.error('Projects POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
