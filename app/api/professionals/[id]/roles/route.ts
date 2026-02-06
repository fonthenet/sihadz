import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { DEFAULT_ROLES } from '@/lib/roles-defaults'

async function bootstrapDefaultRoles(adminClient: SupabaseClient, professionalId: string) {
  // Insert only roles that don't exist yet. Do NOT overwrite existing roles so users can customize permissions.
  for (const r of DEFAULT_ROLES) {
    await adminClient.from('employee_roles').upsert({
      professional_id: professionalId,
      name: r.name,
      description: r.description,
      permissions: r.permissions,
      is_system: r.is_system,
      is_active: true,
    }, { onConflict: 'professional_id,name', ignoreDuplicates: true })
  }
}

/**
 * GET /api/professionals/[id]/roles
 * List all roles for a professional
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: professionalId } = await params
    const supabase = await createServerClient()

    // Verify user owns this professional
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: professional } = await supabase
      .from('professionals')
      .select('id, auth_user_id')
      .eq('id', professionalId)
      .single()

    if (!professional || professional.auth_user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Use admin client to fetch roles (bypasses RLS; we've verified ownership above)
    const adminClient = createAdminClient()
    const { data: roles, error } = await adminClient
      .from('employee_roles')
      .select('*')
      .eq('professional_id', professionalId)
      .eq('is_active', true)
      .order('is_system', { ascending: false })
      .order('name')

    if (error) {
      console.error('Error fetching roles:', error)
      return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 })
    }

    // Ensure all default roles exist (upsert so new roles like Sales Person, Physician get added for existing professionals)
    try {
      await bootstrapDefaultRoles(adminClient, professionalId)
    } catch (bootstrapErr) {
      console.warn('Roles bootstrap/upsert failed:', bootstrapErr)
    }

    // Re-fetch after upsert so we return the full list including any newly added defaults
    const { data: roleList, error: refetchError } = await adminClient
      .from('employee_roles')
      .select('*')
      .eq('professional_id', professionalId)
      .eq('is_active', true)
      .order('is_system', { ascending: false })
      .order('name')

    if (refetchError) {
      return NextResponse.json({ roles: roles || [] })
    }
    return NextResponse.json({ roles: roleList || [] })
  } catch (error) {
    console.error('Roles GET error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

/**
 * POST /api/professionals/[id]/roles
 * Create a custom role
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: professionalId } = await params
    const supabase = await createServerClient()
    const adminClient = createAdminClient()

    // Verify user owns this professional
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: professional } = await supabase
      .from('professionals')
      .select('id, auth_user_id')
      .eq('id', professionalId)
      .single()

    if (!professional || professional.auth_user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, permissions } = body

    if (!name) {
      return NextResponse.json({ error: 'Role name is required' }, { status: 400 })
    }

    // Check if role name already exists (use maybeSingle to avoid error when no rows)
    const { data: existing } = await adminClient
      .from('employee_roles')
      .select('id')
      .eq('professional_id', professionalId)
      .eq('name', name.trim())
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Role name already exists' }, { status: 400 })
    }

    // Create role
    const { data: role, error } = await adminClient
      .from('employee_roles')
      .insert({
        professional_id: professionalId,
        name,
        description: description || null,
        permissions: permissions || {},
        is_system: false,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating role:', error)
      return NextResponse.json({ error: 'Failed to create role' }, { status: 500 })
    }

    return NextResponse.json({ role })
  } catch (error) {
    console.error('Roles POST error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/professionals/[id]/roles
 * Update a role
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: professionalId } = await params
    const supabase = await createServerClient()
    const adminClient = createAdminClient()

    // Verify user owns this professional
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: professional } = await supabase
      .from('professionals')
      .select('id, auth_user_id')
      .eq('id', professionalId)
      .single()

    if (!professional || professional.auth_user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { roleId, name, description, permissions } = body

    if (!roleId) {
      return NextResponse.json({ error: 'Role ID is required' }, { status: 400 })
    }

    // Check if role exists and is not a system role (for name changes)
    const { data: existingRole } = await adminClient
      .from('employee_roles')
      .select('id, is_system, name')
      .eq('id', roleId)
      .eq('professional_id', professionalId)
      .single()

    if (!existingRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    // System roles can only have permissions updated, not name
    if (!existingRole.is_system && name !== undefined) {
      // Check if new name conflicts
      if (name !== existingRole.name) {
        const { data: conflict } = await adminClient
          .from('employee_roles')
          .select('id')
          .eq('professional_id', professionalId)
          .eq('name', name)
          .neq('id', roleId)
          .single()

        if (conflict) {
          return NextResponse.json({ error: 'Role name already exists' }, { status: 400 })
        }
      }
      updates.name = name
    }

    if (description !== undefined) updates.description = description
    if (permissions !== undefined) updates.permissions = permissions

    // Update role
    const { data: role, error } = await adminClient
      .from('employee_roles')
      .update(updates)
      .eq('id', roleId)
      .eq('professional_id', professionalId)
      .select()
      .single()

    if (error) {
      console.error('Error updating role:', error)
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
    }

    return NextResponse.json({ role })
  } catch (error) {
    console.error('Roles PATCH error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/professionals/[id]/roles
 * Delete a custom role (system roles cannot be deleted)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: professionalId } = await params
    const supabase = await createServerClient()
    const adminClient = createAdminClient()

    // Verify user owns this professional
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: professional } = await supabase
      .from('professionals')
      .select('id, auth_user_id')
      .eq('id', professionalId)
      .single()

    if (!professional || professional.auth_user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const roleId = searchParams.get('roleId')

    if (!roleId) {
      return NextResponse.json({ error: 'Role ID is required' }, { status: 400 })
    }

    // Check if role is a system role
    const { data: role } = await adminClient
      .from('employee_roles')
      .select('id, is_system')
      .eq('id', roleId)
      .eq('professional_id', professionalId)
      .single()

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    if (role.is_system) {
      return NextResponse.json({ error: 'Cannot delete system roles' }, { status: 400 })
    }

    // Soft delete by marking as inactive
    const { error } = await adminClient
      .from('employee_roles')
      .update({ is_active: false })
      .eq('id', roleId)
      .eq('professional_id', professionalId)

    if (error) {
      console.error('Error deleting role:', error)
      return NextResponse.json({ error: 'Failed to delete role' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Roles DELETE error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
