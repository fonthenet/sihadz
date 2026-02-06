import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPharmacyIdFromRequest } from '@/lib/pharmacy/auth'

/**
 * GET /api/pharmacy/inventory/alerts
 * Get stock alerts (low stock, expiring, expired) - owner or employee
 */
export async function GET(request: NextRequest) {
  try {
    // Support both owner and employee auth
    const auth = await getPharmacyIdFromRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const pharmacyId = auth.pharmacyId

    const { searchParams } = new URL(request.url)
    const alertType = searchParams.get('type') // low_stock, expiring, expired, all

    // Get products with their stock levels
    const { data: products } = await admin
      .from('pharmacy_products')
      .select(`
        id, name, name_ar, barcode, min_stock_level,
        inventory:pharmacy_inventory(id, quantity, reserved_quantity, expiry_date, batch_number)
      `)
      .eq('pharmacy_id', pharmacyId)
      .eq('is_active', true)

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const in7Days = new Date(today)
    in7Days.setDate(in7Days.getDate() + 7)
    const in30Days = new Date(today)
    in30Days.setDate(in30Days.getDate() + 30)

    const alerts: any[] = []

    for (const product of products || []) {
      const inventory = product.inventory || []
      const activeInventory = inventory.filter((i: any) => i.quantity > 0)
      
      // Calculate total stock
      const totalStock = activeInventory.reduce((sum: number, i: any) => sum + i.quantity, 0)

      // Low stock alert
      if ((!alertType || alertType === 'all' || alertType === 'low_stock') && 
          product.min_stock_level > 0) {
        if (totalStock === 0) {
          alerts.push({
            id: `${product.id}-out`,
            product_id: product.id,
            product_name: product.name,
            product_barcode: product.barcode,
            alert_type: 'out_of_stock',
            severity: 'critical',
            message: `${product.name} - Out of stock`,
            current_quantity: 0,
            min_stock_level: product.min_stock_level
          })
        } else if (totalStock < product.min_stock_level) {
          alerts.push({
            id: `${product.id}-low`,
            product_id: product.id,
            product_name: product.name,
            product_barcode: product.barcode,
            alert_type: 'low_stock',
            severity: totalStock < product.min_stock_level / 2 ? 'critical' : 'warning',
            message: `${product.name} - Low stock (${totalStock} units)`,
            current_quantity: totalStock,
            min_stock_level: product.min_stock_level
          })
        }
      }

      // Expiry alerts
      if (!alertType || alertType === 'all' || alertType === 'expiring' || alertType === 'expired') {
        for (const inv of activeInventory) {
          if (!inv.expiry_date) continue
          
          const expiryDate = new Date(inv.expiry_date)
          expiryDate.setHours(0, 0, 0, 0)
          
          if (expiryDate < today) {
            // Expired
            if (!alertType || alertType === 'all' || alertType === 'expired') {
              alerts.push({
                id: `${inv.id}-expired`,
                product_id: product.id,
                inventory_id: inv.id,
                product_name: product.name,
                product_barcode: product.barcode,
                batch_number: inv.batch_number,
                alert_type: 'expired',
                severity: 'critical',
                message: `${product.name} (Batch: ${inv.batch_number || 'N/A'}) - EXPIRED`,
                expiry_date: inv.expiry_date,
                quantity: inv.quantity,
                days_until_expiry: Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
              })
            }
          } else if (expiryDate <= in7Days) {
            // Expiring within 7 days
            if (!alertType || alertType === 'all' || alertType === 'expiring') {
              const daysLeft = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
              alerts.push({
                id: `${inv.id}-exp7`,
                product_id: product.id,
                inventory_id: inv.id,
                product_name: product.name,
                product_barcode: product.barcode,
                batch_number: inv.batch_number,
                alert_type: 'expiring_7',
                severity: 'critical',
                message: `${product.name} (Batch: ${inv.batch_number || 'N/A'}) - Expires in ${daysLeft} day(s)`,
                expiry_date: inv.expiry_date,
                quantity: inv.quantity,
                days_until_expiry: daysLeft
              })
            }
          } else if (expiryDate <= in30Days) {
            // Expiring within 30 days
            if (!alertType || alertType === 'all' || alertType === 'expiring') {
              const daysLeft = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
              alerts.push({
                id: `${inv.id}-exp30`,
                product_id: product.id,
                inventory_id: inv.id,
                product_name: product.name,
                product_barcode: product.barcode,
                batch_number: inv.batch_number,
                alert_type: 'expiring_30',
                severity: 'warning',
                message: `${product.name} (Batch: ${inv.batch_number || 'N/A'}) - Expires in ${daysLeft} days`,
                expiry_date: inv.expiry_date,
                quantity: inv.quantity,
                days_until_expiry: daysLeft
              })
            }
          }
        }
      }
    }

    // Sort alerts by severity (critical first) then by type
    const severityOrder = { critical: 0, warning: 1, info: 2 }
    alerts.sort((a, b) => {
      const sevDiff = (severityOrder[a.severity as keyof typeof severityOrder] || 2) - 
                      (severityOrder[b.severity as keyof typeof severityOrder] || 2)
      if (sevDiff !== 0) return sevDiff
      return (a.days_until_expiry || 999) - (b.days_until_expiry || 999)
    })

    // Summary counts
    const summary = {
      total: alerts.length,
      critical: alerts.filter(a => a.severity === 'critical').length,
      warning: alerts.filter(a => a.severity === 'warning').length,
      out_of_stock: alerts.filter(a => a.alert_type === 'out_of_stock').length,
      low_stock: alerts.filter(a => a.alert_type === 'low_stock').length,
      expired: alerts.filter(a => a.alert_type === 'expired').length,
      expiring_7: alerts.filter(a => a.alert_type === 'expiring_7').length,
      expiring_30: alerts.filter(a => a.alert_type === 'expiring_30').length
    }

    return NextResponse.json({
      alerts,
      summary
    })
  } catch (error: any) {
    console.error('[Alerts API] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
