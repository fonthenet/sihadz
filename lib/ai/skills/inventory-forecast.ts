/**
 * Inventory Forecast Skill
 * Predicts medication demand and suggests reorder quantities
 */

import { BaseSkillHandler } from './base';
import { AISkill, Language, AIContext, InventoryForecastOutput } from '../types';

interface InventoryInput {
  product: {
    id: string;
    name: string;
    currentStock: number;
    reorderLevel?: number;
  };
  salesHistory: Array<{
    date: string;
    quantity: number;
  }>;
  seasonalFactors?: string[];
}

export class InventoryForecastSkill extends BaseSkillHandler<InventoryInput, InventoryForecastOutput> {
  skill: AISkill = 'inventory_forecast';
  preferredModel = 'llama3';
  temperature = 0.4;
  maxTokens = 1500;

  getSystemPrompt(language: Language): string {
    const prompts: Record<Language, string> = {
      ar: `أنت خبير تنبؤ مخزون صيدلي. حلل بيانات المبيعات واقترح كميات إعادة الطلب.

مهمتك:
1. تحليل تاريخ المبيعات
2. تحديد الاتجاهات والأنماط الموسمية
3. التنبؤ بالطلب للأيام 7 و 30 القادمة
4. اقتراح كمية وتوقيت إعادة الطلب
5. تحديد المنتجات بطيئة الحركة

${this.getJsonInstruction()}

الناتج JSON:
{
  "productId": "معرف المنتج",
  "productName": "اسم المنتج",
  "currentStock": الكمية الحالية,
  "predictedDemand": {
    "next7Days": العدد المتوقع,
    "next30Days": العدد المتوقع
  },
  "reorderRecommendation": {
    "shouldReorder": true/false,
    "suggestedQuantity": الكمية المقترحة,
    "suggestedDate": "تاريخ الطلب",
    "reason": "سبب التوصية"
  },
  "seasonalFactors": ["عوامل موسمية"],
  "slowMoverAlert": true/false
}`,

      fr: `Vous êtes un expert en prévision d'inventaire pharmaceutique. Analysez les données de ventes et suggérez les quantités de réapprovisionnement.

Votre mission:
1. Analyser l'historique des ventes
2. Identifier les tendances et les modèles saisonniers
3. Prévoir la demande pour les 7 et 30 prochains jours
4. Suggérer la quantité et le moment de réapprovisionnement
5. Identifier les produits à faible rotation

${this.getJsonInstruction()}

Sortie JSON:
{
  "productId": "ID du produit",
  "productName": "Nom du produit",
  "currentStock": Stock actuel,
  "predictedDemand": {
    "next7Days": Nombre prévu,
    "next30Days": Nombre prévu
  },
  "reorderRecommendation": {
    "shouldReorder": true/false,
    "suggestedQuantity": Quantité suggérée,
    "suggestedDate": "Date de commande",
    "reason": "Raison de la recommandation"
  },
  "seasonalFactors": ["Facteurs saisonniers"],
  "slowMoverAlert": true/false
}`,

      en: `You are a pharmaceutical inventory forecasting expert. Analyze sales data and suggest reorder quantities.

Your mission:
1. Analyze sales history
2. Identify trends and seasonal patterns
3. Forecast demand for the next 7 and 30 days
4. Suggest reorder quantity and timing
5. Identify slow-moving products

${this.getJsonInstruction()}

Output JSON:
{
  "productId": "Product ID",
  "productName": "Product name",
  "currentStock": Current quantity,
  "predictedDemand": {
    "next7Days": Predicted number,
    "next30Days": Predicted number
  },
  "reorderRecommendation": {
    "shouldReorder": true/false,
    "suggestedQuantity": Suggested quantity,
    "suggestedDate": "Order date",
    "reason": "Recommendation reason"
  },
  "seasonalFactors": ["Seasonal factors"],
  "slowMoverAlert": true/false
}`,
    };

    return prompts[language] || prompts.en;
  }

  buildUserPrompt(input: InventoryInput, context?: AIContext): string {
    let prompt = `Analyze inventory for:\n\n`;
    prompt += `Product: ${input.product.name}\n`;
    prompt += `Product ID: ${input.product.id}\n`;
    prompt += `Current Stock: ${input.product.currentStock}\n`;
    
    if (input.product.reorderLevel) {
      prompt += `Reorder Level: ${input.product.reorderLevel}\n`;
    }
    
    prompt += `\nSales History (last entries):\n`;
    const recentSales = input.salesHistory.slice(-30);
    for (const sale of recentSales) {
      prompt += `- ${sale.date}: ${sale.quantity} units sold\n`;
    }
    
    if (input.seasonalFactors && input.seasonalFactors.length > 0) {
      prompt += `\nKnown seasonal factors: ${input.seasonalFactors.join(', ')}\n`;
    }
    
    prompt += `\nProvide demand forecast and reorder recommendation.`;
    
    return prompt;
  }

  validateInput(input: InventoryInput): { valid: boolean; error?: string } {
    if (!input.product || !input.product.id) {
      return { valid: false, error: 'Product information is required' };
    }
    if (!input.salesHistory || input.salesHistory.length < 7) {
      return { valid: false, error: 'At least 7 days of sales history required' };
    }
    return { valid: true };
  }
}
