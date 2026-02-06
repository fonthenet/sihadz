import { NextRequest, NextResponse } from 'next/server'
import { createCheckout, parseAmount } from '@/lib/payments/chargily'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase admin client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      amount, // in DZD
      paymentMethod,
      appointmentId,
      prescriptionId,
      customerName,
      customerEmail,
      customerPhone,
      description,
      locale = 'ar',
    } = body

    // Validate required fields
    if (!amount || amount < 100) {
      return NextResponse.json(
        { error: 'Amount must be at least 100 DZD' },
        { status: 400 }
      )
    }

    if (paymentMethod === 'cash') {
      // For cash payments, create a pending payment record without Chargily
      const { data: payment, error } = await supabase
        .from('payments')
        .insert({
          amount: amount,
          currency: 'dzd',
          payment_method: 'cash',
          status: 'pending',
          appointment_id: appointmentId || null,
          prescription_id: prescriptionId || null,
          customer_name: customerName,
          customer_phone: customerPhone,
          metadata: { description },
        })
        .select()
        .single()

      if (error) {
        console.error('[Payment API] Error creating cash payment:', error)
        return NextResponse.json(
          { error: 'Failed to create payment record' },
          { status: 500 }
        )
      }

      // Update appointment status if applicable
      if (appointmentId) {
        await supabase
          .from('appointments')
          .update({
            status: 'confirmed',
            payment_status: 'pay_at_clinic',
          })
          .eq('id', appointmentId)
      }

      return NextResponse.json({
        success: true,
        paymentMethod: 'cash',
        paymentId: payment.id,
        message: 'Appointment confirmed. Please pay at the clinic.',
      })
    }

    // For online payments (edahabia, cib, flexy, mobilis, ooredoo), create Chargily checkout
    // Note: Only required if using online payment methods
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'
    
    const metadata: Record<string, string> = {}
    if (appointmentId) metadata.appointment_id = appointmentId
    if (prescriptionId) metadata.prescription_id = prescriptionId

    const amountInCentimes = await parseAmount(amount) // Convert to centimes

    console.log('[v0] Creating Chargily checkout with:', {
      amount: amountInCentimes,
      paymentMethod,
      customerName,
      customerEmail,
    })

    const checkout = await createCheckout({
      amount: amountInCentimes,
      description: description || 'DZDoc Payment',
      successUrl: `${baseUrl}/payment/success?session_id={CHECKOUT_ID}`,
      failureUrl: `${baseUrl}/payment/failed?session_id={CHECKOUT_ID}`,
      webhookEndpoint: `${baseUrl}/api/webhooks/chargily`,
      paymentMethod: paymentMethod,
      customerName,
      customerEmail,
      customerPhone,
      metadata,
      locale,
      passFees: false,
    })

    console.log('[v0] Chargily checkout created successfully:', checkout.id)

    // Create payment record in database
    const { data: payment, error } = await supabase
      .from('payments')
      .insert({
        amount: amount,
        currency: 'dzd',
        payment_method: paymentMethod,
        status: 'pending',
        chargily_checkout_id: checkout.id,
        chargily_checkout_url: checkout.checkout_url,
        appointment_id: appointmentId || null,
        prescription_id: prescriptionId || null,
        customer_name: customerName,
        customer_phone: customerPhone,
        metadata,
      })
      .select()
      .single()

    if (error) {
      console.error('[Payment API] Error creating payment record:', error)
    }

    return NextResponse.json({
      success: true,
      checkoutId: checkout.id,
      checkoutUrl: checkout.checkout_url,
      paymentId: payment?.id,
    })
  } catch (error) {
    console.error('[Payment API] Error:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      error: error,
    })
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to create checkout'
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    )
  }
}
