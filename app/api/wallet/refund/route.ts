import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase'

/**
 * Refund calculation based on SOP rules:
 * - 48h+ before appointment = 100%
 * - 24-48h before = 50%
 * - <24h before = 0%
 * - Provider cancellation = always 100%
 */
function calculateRefundPercentage(
  appointmentTime: Date,
  cancelTime: Date = new Date(),
  cancelledBy: 'patient' | 'provider' | 'system' = 'patient'
): number {
  // Provider or system cancellation = always 100%
  if (cancelledBy === 'provider' || cancelledBy === 'system') {
    return 100
  }
  
  const hoursUntil = (appointmentTime.getTime() - cancelTime.getTime()) / (1000 * 60 * 60)
  
  if (hoursUntil >= 48) return 100
  if (hoursUntil >= 24) return 50
  return 0
}

// ============================================================================
// GET /api/wallet/refund - Calculate refund for an appointment (preview)
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const admin = createAdminClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const appointmentId = searchParams.get('appointment_id')
    const depositId = searchParams.get('deposit_id')
    
    if (!appointmentId && !depositId) {
      return NextResponse.json({ error: 'appointment_id or deposit_id required' }, { status: 400 })
    }
    
    let deposit: any = null
    let appointment: any = null
    
    if (depositId) {
      const { data } = await admin
        .from('booking_deposits')
        .select('*, appointments(*)')
        .eq('id', depositId)
        .single()
      
      deposit = data
      appointment = data?.appointments
    } else if (appointmentId) {
      const { data: apt } = await admin
        .from('appointments')
        .select('*, booking_deposits(*)')
        .eq('id', appointmentId)
        .single()
      
      appointment = apt
      deposit = apt?.booking_deposits?.[0] || null
      
      // If no deposit record, check for wallet transaction
      if (!deposit) {
        const { data: txn } = await admin
          .from('wallet_transactions')
          .select('*')
          .eq('reference_type', 'appointment')
          .eq('reference_id', appointmentId)
          .eq('type', 'deposit')
          .single()
        
        if (txn) {
          deposit = {
            id: null,
            amount: Math.abs(txn.amount),
            status: 'frozen',
            user_id: user.id
          }
        }
      }
    }
    
    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }
    
    // Check ownership
    if (appointment.user_id !== user.id && appointment.professional_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    // Calculate appointment datetime
    const appointmentDateTime = new Date(
      `${appointment.appointment_date}T${appointment.appointment_time}`
    )
    
    // Calculate refund preview
    const refundPercentage = calculateRefundPercentage(appointmentDateTime)
    const depositAmount = deposit?.amount || 0
    const refundAmount = (depositAmount * refundPercentage) / 100
    const forfeitAmount = depositAmount - refundAmount
    
    return NextResponse.json({
      appointment_id: appointment.id,
      deposit_id: deposit?.id || null,
      deposit_amount: depositAmount,
      deposit_status: deposit?.status || 'none',
      refund_percentage: refundPercentage,
      refund_amount: refundAmount,
      forfeit_amount: forfeitAmount,
      appointment_time: appointmentDateTime.toISOString(),
      hours_until: Math.max(0, (appointmentDateTime.getTime() - Date.now()) / (1000 * 60 * 60)),
      can_refund: deposit?.status === 'frozen',
      refund_policy: {
        '48h+': '100% refund',
        '24-48h': '50% refund',
        '<24h': 'No refund'
      }
    })
    
  } catch (error: any) {
    console.error('Refund preview error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// ============================================================================
// POST /api/wallet/refund - Process refund for cancellation
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const admin = createAdminClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { 
      appointment_id, 
      deposit_id,
      cancelled_by = 'patient',
      reason 
    } = body
    
    if (!appointment_id && !deposit_id) {
      return NextResponse.json({ error: 'appointment_id or deposit_id required' }, { status: 400 })
    }
    
    // Get appointment
    const { data: appointment, error: aptError } = await admin
      .from('appointments')
      .select('*')
      .eq('id', appointment_id)
      .single()
    
    if (aptError || !appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }
    
    // Check permission (patient or provider)
    const isPatient = appointment.user_id === user.id
    const isProvider = appointment.professional_id === user.id
    
    // Get professional's auth_user_id for provider check
    if (!isPatient && !isProvider) {
      const { data: prof } = await admin
        .from('professionals')
        .select('auth_user_id')
        .eq('id', appointment.professional_id)
        .single()
      
      if (!prof || prof.auth_user_id !== user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    }
    
    // Determine who is cancelling
    const actualCancelledBy = isProvider ? 'provider' : cancelled_by
    
    // Get deposit record or create from transaction
    let deposit: any = null
    
    if (deposit_id) {
      const { data } = await admin
        .from('booking_deposits')
        .select('*')
        .eq('id', deposit_id)
        .single()
      deposit = data
    } else {
      // Check for deposit in booking_deposits
      const { data: existingDeposit } = await admin
        .from('booking_deposits')
        .select('*')
        .eq('appointment_id', appointment_id)
        .eq('status', 'frozen')
        .single()
      
      if (existingDeposit) {
        deposit = existingDeposit
      } else {
        // Check wallet_transactions for legacy deposits
        const { data: txn } = await admin
          .from('wallet_transactions')
          .select('*')
          .eq('reference_type', 'appointment')
          .eq('reference_id', appointment_id)
          .eq('type', 'deposit')
          .single()
        
        if (txn) {
          // Create deposit record from transaction
          const { data: newDeposit } = await admin
            .from('booking_deposits')
            .insert({
              user_id: appointment.user_id,
              appointment_id: appointment_id,
              amount: Math.abs(txn.amount),
              status: 'frozen',
              debit_transaction_id: txn.id
            })
            .select()
            .single()
          
          deposit = newDeposit
        }
      }
    }
    
    if (!deposit) {
      return NextResponse.json({ 
        success: true,
        message: 'No deposit found for this appointment',
        refund_amount: 0,
        refund_percentage: 0
      })
    }
    
    if (deposit.status !== 'frozen') {
      return NextResponse.json({ 
        error: `Deposit is already ${deposit.status}`,
        deposit_status: deposit.status
      }, { status: 400 })
    }
    
    // Calculate refund
    const appointmentDateTime = new Date(
      `${appointment.appointment_date}T${appointment.appointment_time}`
    )
    const refundPercentage = calculateRefundPercentage(
      appointmentDateTime, 
      new Date(), 
      actualCancelledBy
    )
    const refundAmount = (deposit.amount * refundPercentage) / 100
    
    let refundTransactionId: string | null = null
    
    // Process refund to wallet if > 0
    if (refundAmount > 0) {
      // Get wallet
      const { data: wallet } = await admin
        .from('wallets')
        .select('id, balance')
        .eq('user_id', deposit.user_id)
        .single()
      
      if (wallet) {
        // Update wallet balance
        const newBalance = parseFloat(wallet.balance) + refundAmount
        
        await admin
          .from('wallets')
          .update({ balance: newBalance })
          .eq('id', wallet.id)
        
        // Create refund transaction
        const { data: txn } = await admin
          .from('wallet_transactions')
          .insert({
            wallet_id: wallet.id,
            type: 'refund',
            amount: refundAmount,
            description: refundPercentage === 100 
              ? `Full refund - ${reason || 'Appointment cancelled'}`
              : `Partial refund (${refundPercentage}%) - ${reason || 'Late cancellation'}`,
            reference_type: 'deposit',
            reference_id: deposit.id,
            balance_after: newBalance
          })
          .select()
          .single()
        
        refundTransactionId = txn?.id
      }
    }
    
    // Update deposit status
    const newStatus = refundPercentage === 0 ? 'forfeited' : 'refunded'
    
    await admin
      .from('booking_deposits')
      .update({
        status: newStatus,
        refund_amount: refundAmount,
        refund_percentage: refundPercentage,
        refund_reason: reason || `Cancelled by ${actualCancelledBy}`,
        refunded_at: new Date().toISOString(),
        refund_transaction_id: refundTransactionId,
        updated_at: new Date().toISOString()
      })
      .eq('id', deposit.id)
    
    // Update appointment deposit_status
    await admin
      .from('appointments')
      .update({ deposit_status: newStatus })
      .eq('id', appointment_id)
    
    return NextResponse.json({
      success: true,
      deposit_id: deposit.id,
      deposit_amount: deposit.amount,
      refund_amount: refundAmount,
      refund_percentage: refundPercentage,
      forfeit_amount: deposit.amount - refundAmount,
      new_status: newStatus,
      message: refundPercentage === 100 
        ? 'Full refund processed'
        : refundPercentage === 50
          ? 'Partial refund (50%) processed'
          : 'No refund - late cancellation (deposit forfeited)'
    })
    
  } catch (error: any) {
    console.error('Refund processing error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
