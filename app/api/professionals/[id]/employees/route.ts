import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import { hashPin, validatePinFormat, generateRandomPin } from '@/lib/employee-auth'

/**
 * GET /api/professionals/[id]/employees
 * List all employees for a professional
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

    // Get employees with roles
    const { data: employees, error } = await supabase
      .from('professional_employees')
      .select(`
        *,
        role:employee_roles!role_id (
          id,
          name,
          description,
          permissions,
          is_system
        )
      `)
      .eq('professional_id', professionalId)
      .order('display_name')

    if (error) {
      console.error('Error fetching employees:', error)
      return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 })
    }

    return NextResponse.json({ employees: employees || [] })
  } catch (error) {
    console.error('Employees GET error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

/**
 * POST /api/professionals/[id]/employees
 * Create a new employee
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
    const {
      username,
      displayName,
      pin,
      roleId,
      phone,
      email,
      notes,
      permissionsOverride,
    } = body

    // Validate required fields
    if (!username || !displayName) {
      return NextResponse.json(
        { error: 'Username and display name are required' },
        { status: 400 }
      )
    }

    // Validate username format
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return NextResponse.json(
        { error: 'Username must be 3-20 characters, alphanumeric and underscores only' },
        { status: 400 }
      )
    }

    // Generate or validate PIN
    const finalPin = pin || generateRandomPin(4)
    if (!validatePinFormat(finalPin)) {
      return NextResponse.json(
        { error: 'PIN must be 4-6 digits' },
        { status: 400 }
      )
    }

    // Hash the PIN
    const pinHash = await hashPin(finalPin)

    // Check if username already exists for this professional
    const { data: existing } = await adminClient
      .from('professional_employees')
      .select('id')
      .eq('professional_id', professionalId)
      .eq('username', username.toLowerCase())
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 400 }
      )
    }

    // Create employee
    const { data: employee, error } = await adminClient
      .from('professional_employees')
      .insert({
        professional_id: professionalId,
        username: username.toLowerCase(),
        display_name: displayName,
        pin_hash: pinHash,
        role_id: roleId || null,
        phone: phone || null,
        email: email || null,
        notes: notes || null,
        permissions_override: permissionsOverride || null,
        created_by: professionalId,
      })
      .select(`
        *,
        role:employee_roles!role_id (
          id,
          name,
          description,
          permissions,
          is_system
        )
      `)
      .single()

    if (error) {
      console.error('Error creating employee:', error)
      return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 })
    }

    // Return employee with temporary PIN (only shown once)
    return NextResponse.json({
      employee,
      temporaryPin: pin ? undefined : finalPin, // Only return if we generated it
      message: pin ? 'Employee created' : `Employee created. Temporary PIN: ${finalPin}`,
    })
  } catch (error) {
    console.error('Employees POST error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/professionals/[id]/employees
 * Update an employee
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
    const {
      employeeId,
      displayName,
      roleId,
      phone,
      email,
      notes,
      isActive,
      permissionsOverride,
      resetPin,
      newPin,
    } = body

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 })
    }

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (displayName !== undefined) updates.display_name = displayName
    if (roleId !== undefined) updates.role_id = roleId || null
    if (phone !== undefined) updates.phone = phone || null
    if (email !== undefined) updates.email = email || null
    if (notes !== undefined) updates.notes = notes || null
    if (isActive !== undefined) updates.is_active = isActive
    if (permissionsOverride !== undefined) updates.permissions_override = permissionsOverride

    // Handle PIN reset
    let temporaryPin: string | undefined
    if (resetPin || newPin) {
      const pinToSet = newPin || generateRandomPin(4)
      if (!validatePinFormat(pinToSet)) {
        return NextResponse.json({ error: 'PIN must be 4-6 digits' }, { status: 400 })
      }
      updates.pin_hash = await hashPin(pinToSet)
      if (!newPin) temporaryPin = pinToSet
    }

    // Update employee
    const { data: employee, error } = await adminClient
      .from('professional_employees')
      .update(updates)
      .eq('id', employeeId)
      .eq('professional_id', professionalId)
      .select(`
        *,
        role:employee_roles!role_id (
          id,
          name,
          description,
          permissions,
          is_system
        )
      `)
      .single()

    if (error) {
      console.error('Error updating employee:', error)
      return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 })
    }

    return NextResponse.json({
      employee,
      temporaryPin,
      message: temporaryPin ? `PIN reset. New PIN: ${temporaryPin}` : 'Employee updated',
    })
  } catch (error) {
    console.error('Employees PATCH error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/professionals/[id]/employees
 * Delete an employee
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
    const employeeId = searchParams.get('employeeId')

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 })
    }

    // Delete employee (cascade deletes sessions and schedules)
    const { error } = await adminClient
      .from('professional_employees')
      .delete()
      .eq('id', employeeId)
      .eq('professional_id', professionalId)

    if (error) {
      console.error('Error deleting employee:', error)
      return NextResponse.json({ error: 'Failed to delete employee' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Employees DELETE error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
