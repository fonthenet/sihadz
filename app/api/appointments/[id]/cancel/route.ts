import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase'

export const runtime = "nodejs"
export const dynamic = "force-dynamic"


interface Params {
  params: Promise<{ id: string }>
}

/**
 * Calculate refund percentage based on SOP rules:
 * - 48h+ before = 100%
 * - 24-48h = 50%
 * - <24h = 0%
 * - Provider/system cancellation = always 100%
 */
function calculateRefundPercentage(
  appointmentTime: Date,
  cancelTime: Date = new Date(),
  cancelledBy: 'patient' | 'provider' | 'system' = 'patient'
): number {
  if (cancelledBy === 'provider' || cancelledBy === 'system') {
    return 100
  }
  
  const hoursUntil = (appointmentTime.getTime() - cancelTime.getTime()) / (1000 * 60 * 60)
  
  if (hoursUntil >= 48) return 100
  if (hoursUntil >= 24) return 50
  return 0
}

// ============================================================================
// POST /api/appointments/[id]/cancel - Cancel appointment with refund
// ============================================================================
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id: appointmentId } = await params
    const supabase = await createClient()
    const admin = createAdminClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { reason, cancelled_by } = body
    
    // Get appointment
    const { data: appointment, error: aptError } = await admin
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .single()
    
    if (aptError || !appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }
    
    // Check if already cancelled
    if (appointment.status === 'cancelled') {
      return NextResponse.json({ error: 'Appointment is already cancelled' }, { status: 400 })
    }
    
    // Check permission
    const isPatient = appointment.patient_id === user.id || appointment.user_id === user.id
    let isProvider = false
    
    if (appointment.doctor_id || appointment.professional_id) {
      const { data: prof } = await admin
        .from('professionals')
        .select('auth_user_id')
        .eq('id', appointment.doctor_id || appointment.professional_id)
        .single()
      
      isProvider = prof?.auth_user_id === user.id
    }
    
    if (!isPatient && !isProvider) {
      return NextResponse.json({ error: 'Unauthorized to cancel this appointment' }, { status: 403 })
    }
    
    // Determine who is cancelling
    const actualCancelledBy = isProvider ? 'provider' : (cancelled_by || 'patient')
    
    // Process refund if there's a deposit
    let refundResult: any = null
    
    // Check for deposit in booking_deposits
    const { data: deposit } = await admin
      .from('booking_deposits')
      .select('*')
      .eq('appointment_id', appointmentId)
      .eq('status', 'frozen')
      .single()
    
    if (deposit) {
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
        const { data: wallet } = await admin
          .from('wallets')
          .select('id, balance')
          .eq('user_id', deposit.user_id)
          .single()
        
        if (wallet) {
          const newBalance = parseFloat(wallet.balance) + refundAmount
          
          await admin
            .from('wallets')
            .update({ balance: newBalance })
            .eq('id', wallet.id)
          
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
      
      refundResult = {
        deposit_amount: deposit.amount,
        refund_amount: refundAmount,
        refund_percentage: refundPercentage,
        forfeit_amount: deposit.amount - refundAmount
      }
    } else {
      // Check for legacy wallet transaction deposit
      const { data: txn } = await admin
        .from('wallet_transactions')
        .select('*')
        .eq('reference_type', 'appointment')
        .eq('reference_id', appointmentId)
        .eq('type', 'deposit')
        .single()
      
      if (txn) {
        const depositAmount = Math.abs(txn.amount)
        const appointmentDateTime = new Date(
          `${appointment.appointment_date}T${appointment.appointment_time}`
        )
        const refundPercentage = calculateRefundPercentage(
          appointmentDateTime,
          new Date(),
          actualCancelledBy
        )
        const refundAmount = (depositAmount * refundPercentage) / 100
        
        if (refundAmount > 0) {
          const { data: wallet } = await admin
            .from('wallets')
            .select('id, balance')
            .eq('id', txn.wallet_id)
            .single()
          
          if (wallet) {
            const newBalance = parseFloat(wallet.balance) + refundAmount
            
            await admin
              .from('wallets')
              .update({ balance: newBalance })
              .eq('id', wallet.id)
            
            await admin
              .from('wallet_transactions')
              .insert({
                wallet_id: wallet.id,
                type: 'refund',
                amount: refundAmount,
                description: refundPercentage === 100 
                  ? `Full refund - ${reason || 'Appointment cancelled'}`
                  : `Partial refund (${refundPercentage}%) - ${reason || 'Late cancellation'}`,
                reference_type: 'appointment',
                reference_id: appointmentId,
                balance_after: newBalance
              })
          }
        }
        
        refundResult = {
          deposit_amount: depositAmount,
          refund_amount: refundAmount,
          refund_percentage: refundPercentage,
          forfeit_amount: depositAmount - refundAmount
        }
      }
    }
    
    // Update appointment status
    await admin
      .from('appointments')
      .update({
        status: 'cancelled',
        deposit_status: refundResult 
          ? (refundResult.refund_percentage === 0 ? 'forfeited' : 'refunded')
          : appointment.deposit_status,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)

    
    return NextResponse.json({
      success: true,
      appointment_id: appointmentId,
      cancelled_by: actualCancelledBy,
      reason: reason || 'No reason provided',
      refund: refundResult || {
        deposit_amount: 0,
        refund_amount: 0,
        refund_percentage: 0,
        message: 'No deposit found'
      },
      message: refundResult 
        ? refundResult.refund_percentage === 100
          ? 'Appointment cancelled. Full refund processed.'
          : refundResult.refund_percentage === 50
            ? 'Appointment cancelled. Partial refund (50%) processed.'
            : 'Appointment cancelled. No refund (late cancellation).'
        : 'Appointment cancelled.'
    })
    
  } catch (error: any) {
    console.error('Appointment cancellation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
