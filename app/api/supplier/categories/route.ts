import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - List product categories
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const supplierType = searchParams.get('supplier_type')

    let query = supabase
      .from('supplier_product_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (supplierType) {
      query = query.or(`supplier_type.eq.${supplierType},supplier_type.eq.both`)
    }

    const { data: categories, error } = await query

    if (error) {
      console.error('Error fetching categories:', error)
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
    }

    return NextResponse.json(categories || [])
  } catch (error) {
    console.error('Error in supplier categories GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
