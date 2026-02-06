/**
 * POST /api/ai/inventory-forecast
 * Predict medication demand and suggest reorder quantities
 * For pharmacy inventory management
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { executeAI, InventoryForecastOutput } from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a pharmacy professional
    const admin = createAdminClient();
    const { data: prof } = await admin
      .from('professionals')
      .select('id, type')
      .eq('auth_user_id', user.id)
      .single();

    if (!prof || prof.type !== 'pharmacy') {
      return NextResponse.json({ error: 'Access denied. Pharmacy professionals only.' }, { status: 403 });
    }

    const body = await request.json();
    const { productId, language = 'fr' } = body;

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Get product details
    const { data: product, error: productError } = await admin
      .from('pharmacy_products')
      .select('id, name, current_stock, min_stock_level, reorder_quantity')
      .eq('id', productId)
      .eq('pharmacy_id', prof.id)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Get sales history (last 60 days)
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const { data: sales } = await admin
      .from('pos_sale_items')
      .select(`
        quantity,
        sale:pos_sales(created_at)
      `)
      .eq('product_id', productId)
      .gte('sale.created_at', sixtyDaysAgo.toISOString());

    // Aggregate sales by date
    const salesByDate: Record<string, number> = {};
    if (sales) {
      for (const item of sales) {
        const date = (item.sale as any)?.created_at?.split('T')[0];
        if (date) {
          salesByDate[date] = (salesByDate[date] || 0) + item.quantity;
        }
      }
    }

    const salesHistory = Object.entries(salesByDate).map(([date, quantity]) => ({
      date,
      quantity,
    })).sort((a, b) => a.date.localeCompare(b.date));

    // Check if we have enough history
    if (salesHistory.length < 7) {
      return NextResponse.json({
        success: true,
        data: {
          productId: product.id,
          productName: product.name,
          currentStock: product.current_stock,
          predictedDemand: { next7Days: 0, next30Days: 0 },
          reorderRecommendation: {
            shouldReorder: product.current_stock <= (product.min_stock_level || 10),
            suggestedQuantity: product.reorder_quantity || 20,
            suggestedDate: new Date().toISOString().split('T')[0],
            reason: 'Insufficient sales history for accurate forecast. Using default reorder settings.',
          },
          seasonalFactors: [],
          slowMoverAlert: salesHistory.length === 0,
        },
        disclaimer: 'Insufficient data for AI forecast. Using default settings.',
        metadata: {
          provider: 'none',
          model: 'fallback',
          tokens: { input: 0, output: 0 },
          latencyMs: 0,
          cached: false,
          auditId: '',
        },
      });
    }

    // Determine seasonal factors
    const now = new Date();
    const month = now.getMonth();
    const seasonalFactors: string[] = [];
    
    // Winter months (flu season in Algeria)
    if (month >= 10 || month <= 2) {
      seasonalFactors.push('Flu season - increased demand for cold medications');
    }
    // Ramadan adjustment (varies by year)
    if (month >= 2 && month <= 4) {
      seasonalFactors.push('Ramadan period - adjusted consumption patterns');
    }
    // Summer
    if (month >= 5 && month <= 8) {
      seasonalFactors.push('Summer - increased demand for hydration and sun protection');
    }

    const response = await executeAI<InventoryForecastOutput>({
      skill: 'inventory_forecast',
      input: {
        product: {
          id: product.id,
          name: product.name,
          currentStock: product.current_stock || 0,
          reorderLevel: product.min_stock_level,
        },
        salesHistory,
        seasonalFactors,
      },
      userId: user.id,
      userRole: 'pharmacy',
      language,
      context: {
        providerId: prof.id,
      },
    });

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('[AI inventory-forecast] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate forecast' },
      { status: 500 }
    );
  }
}
