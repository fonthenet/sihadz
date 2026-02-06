'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Package,
  Calendar,
  Sparkles,
  RefreshCw,
  ShoppingCart,
  Clock,
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/page-loading'

interface AIInventoryForecastProps {
  productId: string
  productName: string
  currentStock: number
  minStockLevel?: number
  onReorderClick?: (quantity: number) => void
}

interface ForecastResult {
  productId: string
  productName: string
  currentStock: number
  predictedDemand: {
    next7Days: number
    next30Days: number
  }
  reorderRecommendation: {
    shouldReorder: boolean
    suggestedQuantity: number
    suggestedDate: string
    reason: string
  }
  seasonalFactors: string[]
  slowMoverAlert: boolean
}

export default function AIInventoryForecast({
  productId,
  productName,
  currentStock,
  minStockLevel = 10,
  onReorderClick,
}: AIInventoryForecastProps) {
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(false)
  const [forecast, setForecast] = useState<ForecastResult | null>(null)
  const [aiProvider, setAiProvider] = useState('')
  
  const generateForecast = useCallback(async () => {
    setLoading(true)
    setForecast(null)
    
    try {
      const res = await fetch('/api/ai/inventory-forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          language: 'fr',
        }),
      })
      
      const data = await res.json()
      
      if (res.ok && data.success && data.data) {
        setForecast(data.data)
        setAiProvider(data.metadata?.provider || '')
      } else {
        toast({
          title: 'Forecast failed',
          description: data.error || 'Failed to generate forecast',
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to connect to AI service',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [productId, toast])
  
  const stockHealthPercent = Math.min(100, (currentStock / (minStockLevel * 3)) * 100)
  const stockStatus = currentStock <= minStockLevel ? 'critical' : currentStock <= minStockLevel * 2 ? 'low' : 'healthy'
  
  return (
    <Card className="border-violet-200 dark:border-violet-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
              <Brain className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                AI Demand Forecast
                {aiProvider && (
                  <Badge variant="outline" className="text-xs font-normal">
                    {aiProvider}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs">
                {productName}
              </CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={generateForecast}
            disabled={loading}
          >
            {loading ? (
              <LoadingSpinner size="sm" />
            ) : forecast ? (
              <RefreshCw className="h-4 w-4" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            <span className="ml-1.5">{forecast ? 'Refresh' : 'Analyze'}</span>
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Current Stock Display */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Current Stock</span>
            <span className="font-medium">{currentStock} units</span>
          </div>
          <Progress 
            value={stockHealthPercent} 
            className={`h-2 ${
              stockStatus === 'critical' ? '[&>div]:bg-red-500' :
              stockStatus === 'low' ? '[&>div]:bg-orange-500' :
              '[&>div]:bg-green-500'
            }`}
          />
          <div className="flex items-center gap-1.5">
            <Badge variant={stockStatus === 'critical' ? 'destructive' : stockStatus === 'low' ? 'default' : 'secondary'} className="text-xs">
              {stockStatus === 'critical' ? 'Critical' : stockStatus === 'low' ? 'Low Stock' : 'Healthy'}
            </Badge>
            {stockStatus !== 'healthy' && (
              <span className="text-xs text-muted-foreground">
                Min level: {minStockLevel}
              </span>
            )}
          </div>
        </div>
        
        {/* Forecast Results */}
        {forecast && (
          <>
            {/* Demand Prediction */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  Next 7 days
                </div>
                <div className="text-lg font-semibold flex items-center gap-1">
                  {forecast.predictedDemand.next7Days}
                  <span className="text-xs font-normal text-muted-foreground">units</span>
                  {forecast.predictedDemand.next7Days > currentStock && (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                </div>
              </div>
              <div className="rounded-lg border p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  Next 30 days
                </div>
                <div className="text-lg font-semibold flex items-center gap-1">
                  {forecast.predictedDemand.next30Days}
                  <span className="text-xs font-normal text-muted-foreground">units</span>
                </div>
              </div>
            </div>
            
            {/* Seasonal Factors */}
            {forecast.seasonalFactors && forecast.seasonalFactors.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Seasonal factors:</p>
                <div className="flex flex-wrap gap-1.5">
                  {forecast.seasonalFactors.map((factor, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {factor}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* Slow Mover Alert */}
            {forecast.slowMoverAlert && (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <strong>Slow-moving product</strong>
                  <p className="mt-0.5">This product has low sales velocity. Consider reducing order quantities or running promotions.</p>
                </div>
              </div>
            )}
            
            {/* Reorder Recommendation */}
            {forecast.reorderRecommendation && (
              <div className={`rounded-lg p-3 space-y-2 ${
                forecast.reorderRecommendation.shouldReorder 
                  ? 'bg-primary/5 border border-primary/20' 
                  : 'bg-muted/50'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className={`h-4 w-4 ${forecast.reorderRecommendation.shouldReorder ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="text-sm font-medium">
                      {forecast.reorderRecommendation.shouldReorder ? 'Reorder Recommended' : 'No Reorder Needed'}
                    </span>
                  </div>
                  {forecast.reorderRecommendation.shouldReorder && onReorderClick && (
                    <Button 
                      size="sm" 
                      onClick={() => onReorderClick(forecast.reorderRecommendation.suggestedQuantity)}
                    >
                      <Package className="h-3.5 w-3.5 mr-1" />
                      Order {forecast.reorderRecommendation.suggestedQuantity}
                    </Button>
                  )}
                </div>
                
                {forecast.reorderRecommendation.shouldReorder && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p><strong>Quantity:</strong> {forecast.reorderRecommendation.suggestedQuantity} units</p>
                    <p><strong>By:</strong> {forecast.reorderRecommendation.suggestedDate}</p>
                    <p><strong>Reason:</strong> {forecast.reorderRecommendation.reason}</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
        
        {/* Disclaimer */}
        {forecast && (
          <p className="text-xs text-muted-foreground">
            ⚠️ Forecast based on historical data. Actual demand may vary.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
