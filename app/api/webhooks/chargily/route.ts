import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyWebhookSignature } from '@/lib/payments/chargily'

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const signature = request.headers.get('signature')
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    const rawBody = await request.text()
    const secretKey = process.env.CHARGILY_SECRET_KEY!

    // Verify webhook signature
    const isValid = verifyWebhookSignature(rawBody, signature, secretKey)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }

    const event = JSON.parse(rawBody)
    console.log('[Chargily Webhook] Received event:', event.type)

    // Handle different event types
    switch (event.type) {
      case 'checkout.paid':
        await handleCheckoutPaid(event.data)
        break
      case 'checkout.failed':
        await handleCheckoutFailed(event.data)
        break
      case 'checkout.canceled':
        await handleCheckoutCanceled(event.data)
        break
      case 'checkout.expired':
        await handleCheckoutExpired(event.data)
        break
      default:
        console.log('[Chargily Webhook] Unhandled event type:', event.type)
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error('[Chargily Webhook] Error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

async function handleCheckoutPaid(data: any) {
  const { id, metadata, amount, payment_method } = data
  console.log('[Chargily Webhook] Checkout paid:', id)

  // Update payment record in database
  const { error } = await supabase
    .from('payments')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      payment_method: payment_method,
    })
    .eq('chargily_checkout_id', id)

  if (error) {
    console.error('[Chargily Webhook] Error updating payment:', error)
    return
  }

  // If this payment is for an appointment, confirm the appointment
  if (metadata?.appointment_id) {
    const { error: appointmentError } = await supabase
      .from('appointments')
      .update({
        status: 'confirmed',
        payment_status: 'paid',
      })
      .eq('id', metadata.appointment_id)

    if (appointmentError) {
      console.error('[Chargily Webhook] Error updating appointment:', appointmentError)
    }

    // Create notification for the patient
    const { data: appointment } = await supabase
      .from('appointments')
      .select('patient_id, doctor:doctors(user_id, profiles(full_name))')
      .eq('id', metadata.appointment_id)
      .single()

    if (appointment) {
      await supabase.from('notifications').insert({
        user_id: appointment.patient_id,
        title: 'Payment Confirmed',
        title_ar: 'تم تأكيد الدفع',
        title_fr: 'Paiement confirmé',
        message: 'Your appointment has been confirmed and payment received.',
        message_ar: 'تم تأكيد موعدك واستلام الدفع.',
        message_fr: 'Votre rendez-vous a été confirmé et le paiement reçu.',
        type: 'payment',
        read: false,
      })
    }
  }

  // If this payment is for a prescription, update prescription status
  if (metadata?.prescription_id) {
    const { error: prescriptionError } = await supabase
      .from('prescriptions')
      .update({
        payment_status: 'paid',
      })
      .eq('id', metadata.prescription_id)

    if (prescriptionError) {
      console.error('[Chargily Webhook] Error updating prescription:', prescriptionError)
    }
  }
}

async function handleCheckoutFailed(data: any) {
  const { id } = data
  console.log('[Chargily Webhook] Checkout failed:', id)

  await supabase
    .from('payments')
    .update({ status: 'failed' })
    .eq('chargily_checkout_id', id)
}

async function handleCheckoutCanceled(data: any) {
  const { id } = data
  console.log('[Chargily Webhook] Checkout canceled:', id)

  await supabase
    .from('payments')
    .update({ status: 'canceled' })
    .eq('chargily_checkout_id', id)
}

async function handleCheckoutExpired(data: any) {
  const { id } = data
  console.log('[Chargily Webhook] Checkout expired:', id)

  await supabase
    .from('payments')
    .update({ status: 'expired' })
    .eq('chargily_checkout_id', id)
}
