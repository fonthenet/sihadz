'use client'

import React, { useState } from 'react'
import { useLanguage } from '@/lib/i18n/language-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { 
  Star, 
  ThumbsUp, 
  MessageSquare, 
  CheckCircle,
  Flag,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

interface Review {
  id: string
  patientName: string
  patientInitials: string
  rating: number
  date: string
  visitType: 'in-person' | 'e-visit'
  verified: boolean
  comment: string
  doctorResponse?: {
    text: string
    date: string
  }
  helpful: number
}

interface ReviewsSectionProps {
  doctorId: string
  doctorName: string
  reviews?: Review[]
  averageRating?: number
  totalReviews?: number
  ratingDistribution?: { [key: number]: number }
}

// Reviews will be fetched from database
const defaultReviews: Review[] = [
  {
    id: '1',
    patientName: 'أحمد',
    patientInitials: 'أ',
    rating: 5,
    date: '2023-10-01',
    visitType: 'in-person',
    verified: true,
    comment: 'أفضل طبيب زرته. المعاملة الراقية والخبرة العالية واضحة.',
    helpful: 15
  }
]

export function ReviewsSection({ 
  doctorId,
  doctorName,
  reviews = [],
  averageRating = 0,
  totalReviews = 0,
  ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
}: ReviewsSectionProps) {
  const { language, dir } = useLanguage()
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [newRating, setNewRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [newComment, setNewComment] = useState('')
  const [showAllReviews, setShowAllReviews] = useState(false)
  const [expandedResponses, setExpandedResponses] = useState<Set<string>>(new Set())

  const texts = {
    ar: {
      reviews: 'التقييمات',
      basedOn: 'بناءً على',
      reviewCount: 'تقييم',
      writeReview: 'اكتب تقييمك',
      yourRating: 'تقييمك',
      yourComment: 'اكتب تعليقك',
      commentPlaceholder: 'شارك تجربتك مع هذا الطبيب...',
      submit: 'إرسال التقييم',
      cancel: 'إلغاء',
      verifiedVisit: 'زيارة موثقة',
      inPerson: 'زيارة في العيادة',
      eVisit: 'استشارة عن بعد',
      helpful: 'مفيد',
      doctorResponse: 'رد الطبيب',
      showMore: 'عرض المزيد',
      showLess: 'عرض أقل',
      report: 'إبلاغ',
      stars: 'نجوم',
      noReviews: 'لا توجد تقييمات بعد',
      beFirst: 'كن أول من يقيم هذا الطبيب'
    },
    fr: {
      reviews: 'Avis',
      basedOn: 'Basé sur',
      reviewCount: 'avis',
      writeReview: 'Écrire un avis',
      yourRating: 'Votre note',
      yourComment: 'Votre commentaire',
      commentPlaceholder: 'Partagez votre expérience avec ce médecin...',
      submit: 'Soumettre',
      cancel: 'Annuler',
      verifiedVisit: 'Visite vérifiée',
      inPerson: 'Consultation en cabinet',
      eVisit: 'Téléconsultation',
      helpful: 'Utile',
      doctorResponse: 'Réponse du médecin',
      showMore: 'Voir plus',
      showLess: 'Voir moins',
      report: 'Signaler',
      stars: 'étoiles',
      noReviews: 'Pas encore d\'avis',
      beFirst: 'Soyez le premier à évaluer ce médecin'
    },
    en: {
      reviews: 'Reviews',
      basedOn: 'Based on',
      reviewCount: 'reviews',
      writeReview: 'Write a Review',
      yourRating: 'Your Rating',
      yourComment: 'Your Comment',
      commentPlaceholder: 'Share your experience with this doctor...',
      submit: 'Submit Review',
      cancel: 'Cancel',
      verifiedVisit: 'Verified Visit',
      inPerson: 'In-Person Visit',
      eVisit: 'E-Visit',
      helpful: 'Helpful',
      doctorResponse: 'Doctor\'s Response',
      showMore: 'Show More',
      showLess: 'Show Less',
      report: 'Report',
      stars: 'stars',
      noReviews: 'No reviews yet',
      beFirst: 'Be the first to review this doctor'
    }
  }

  const txt = texts[language]

  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 3)

  const toggleResponse = (reviewId: string) => {
    const newExpanded = new Set(expandedResponses)
    if (newExpanded.has(reviewId)) {
      newExpanded.delete(reviewId)
    } else {
      newExpanded.add(reviewId)
    }
    setExpandedResponses(newExpanded)
  }

  const renderStars = (rating: number, interactive = false, size = 'h-5 w-5') => {
    return (
      <div className={`flex gap-1 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${size} cursor-${interactive ? 'pointer' : 'default'} transition-colors ${
              star <= (interactive ? (hoverRating || newRating) : rating)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
            onClick={interactive ? () => setNewRating(star) : undefined}
            onMouseEnter={interactive ? () => setHoverRating(star) : undefined}
            onMouseLeave={interactive ? () => setHoverRating(0) : undefined}
          />
        ))}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className={`flex items-center justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <CardTitle className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            <MessageSquare className="h-5 w-5 text-primary" />
            {txt.reviews}
          </CardTitle>
          <Button 
            onClick={() => setShowReviewForm(!showReviewForm)}
            variant={showReviewForm ? "outline" : "default"}
            className={showReviewForm ? "bg-transparent" : ""}
          >
            {showReviewForm ? txt.cancel : txt.writeReview}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Rating Summary */}
        <div className={`flex gap-8 p-4 bg-muted/50 rounded-lg ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
          {/* Average Rating */}
          <div className={`text-center ${dir === 'rtl' ? 'text-right' : ''}`}>
            <div className="text-5xl font-bold text-primary">{averageRating.toFixed(1)}</div>
            <div className="mt-2">{renderStars(Math.round(averageRating))}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {txt.basedOn} {totalReviews} {txt.reviewCount}
            </p>
          </div>

          {/* Rating Distribution */}
          <div className="flex-1 space-y-2">
            {[5, 4, 3, 2, 1].map((star) => (
              <div key={star} className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <span className="w-12 text-sm text-muted-foreground">
                  {star} {txt.stars}
                </span>
                <Progress 
                  value={(ratingDistribution[star] / totalReviews) * 100} 
                  className="flex-1 h-2"
                />
                <span className="w-8 text-sm text-muted-foreground">
                  {ratingDistribution[star]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Write Review Form */}
        {showReviewForm && (
          <Card className="border-primary/50">
            <CardContent className="pt-6 space-y-4">
              <div className={dir === 'rtl' ? 'text-right' : ''}>
                <label className="text-sm font-medium">{txt.yourRating}</label>
                <div className="mt-2">
                  {renderStars(newRating, true, 'h-8 w-8')}
                </div>
              </div>

              <div className={dir === 'rtl' ? 'text-right' : ''}>
                <label className="text-sm font-medium">{txt.yourComment}</label>
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={txt.commentPlaceholder}
                  className={`mt-2 min-h-[100px] ${dir === 'rtl' ? 'text-right' : ''}`}
                />
              </div>

              <div className={`flex gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <Button 
                  onClick={() => {
                    // Submit review logic
                    setShowReviewForm(false)
                    setNewRating(0)
                    setNewComment('')
                  }}
                  disabled={newRating === 0 || !newComment.trim()}
                >
                  {txt.submit}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowReviewForm(false)}
                  className="bg-transparent"
                >
                  {txt.cancel}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reviews List */}
        {reviews.length === 0 ? (
          <div className={`text-center py-8 ${dir === 'rtl' ? 'text-right' : ''}`}>
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">{txt.noReviews}</p>
            <p className="text-sm text-muted-foreground">{txt.beFirst}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedReviews.map((review) => (
              <div key={review.id} className="border-b pb-4 last:border-0">
                {/* Review Header */}
                <div className={`flex items-start gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {review.patientInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`flex-1 ${dir === 'rtl' ? 'text-right' : ''}`}>
                    <div className={`flex items-center gap-2 flex-wrap ${dir === 'rtl' ? 'flex-row-reverse justify-end' : ''}`}>
                      <span className="font-semibold">{review.patientName}</span>
                      {review.verified && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <CheckCircle className="h-3 w-3" />
                          {txt.verifiedVisit}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {review.visitType === 'in-person' ? txt.inPerson : txt.eVisit}
                      </Badge>
                    </div>
                    <div className={`flex items-center gap-2 mt-1 ${dir === 'rtl' ? 'flex-row-reverse justify-end' : ''}`}>
                      {renderStars(review.rating, false, 'h-4 w-4')}
                      <span className="text-sm text-muted-foreground">
                        {new Date(review.date).toLocaleDateString(
                          language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-FR' : 'en-US'
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Review Content */}
                <p className={`mt-3 text-foreground ${dir === 'rtl' ? 'text-right' : ''}`}>
                  {review.comment}
                </p>

                {/* Doctor Response */}
                {review.doctorResponse && (
                  <div className={`mt-3 p-3 bg-primary/5 rounded-lg border-s-4 border-primary ${dir === 'rtl' ? 'text-right border-e-4 border-s-0' : ''}`}>
                    <button
                      onClick={() => toggleResponse(review.id)}
                      className={`flex items-center gap-2 text-sm font-medium text-primary ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}
                    >
                      {txt.doctorResponse}
                      {expandedResponses.has(review.id) ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                    {expandedResponses.has(review.id) && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {review.doctorResponse.text}
                      </p>
                    )}
                  </div>
                )}

                {/* Review Actions */}
                <div className={`flex items-center gap-4 mt-3 ${dir === 'rtl' ? 'flex-row-reverse justify-end' : ''}`}>
                  <button className={`flex items-center gap-1 text-sm text-muted-foreground hover:text-primary ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                    <ThumbsUp className="h-4 w-4" />
                    {txt.helpful} ({review.helpful})
                  </button>
                  <button className={`flex items-center gap-1 text-sm text-muted-foreground hover:text-destructive ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                    <Flag className="h-4 w-4" />
                    {txt.report}
                  </button>
                </div>
              </div>
            ))}

            {/* Show More/Less */}
            {reviews.length > 3 && (
              <Button
                variant="outline"
                onClick={() => setShowAllReviews(!showAllReviews)}
                className={`w-full gap-2 bg-transparent ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}
              >
                {showAllReviews ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    {txt.showLess}
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    {txt.showMore} ({reviews.length - 3})
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
