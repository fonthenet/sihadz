import Link from 'next/link'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" />
          Retour à l&apos;accueil
        </Link>
        <h1 className="text-3xl font-bold mb-6">Politique de confidentialité</h1>
        <div className="prose prose-muted dark:prose-invert mb-8">
          <p className="text-muted-foreground">
            La politique de confidentialité est en cours de préparation.
            Pour toute question, contactez-nous à contact@sihadz.com.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  )
}
