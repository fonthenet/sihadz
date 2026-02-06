'use client'

import Link from 'next/link'
import { Phone, Mail, MapPin, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/language-context'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { AppLogo } from '@/components/app-logo'
import { Input } from '@/components/ui/input'

export function Footer() {
  const { t, language } = useLanguage()
  const { user } = useAuth()

  const labels = {
    ar: {
      aboutUs: 'من نحن',
      aboutDesc: 'Siha DZ هي المنصة الرائدة لحجز المواعيد الطبية في الجزائر. نربط المرضى بأفضل مقدمي الرعاية الصحية في جميع أنحاء الوطن.',
      quickLinks: 'روابط سريعة',
      findDoctor: 'البحث عن مقدم رعاية صحية',
      eConsultation: 'استشارة عن بعد',
      findPharmacy: 'البحث عن صيدلية',
      myAppointments: 'مواعيدي',
      myPrescriptions: 'وصفاتي الطبية',
      professionals: 'للمهنيين',
      joinAsDoctor: 'انضم كطبيب',
      joinAsPharmacy: 'انضم كصيدلية',
      doctorLogin: 'دخول الأطباء',
      pharmacyLogin: 'دخول الصيدليات',
      contactUs: 'تواصل معنا',
      address: 'الجزائر العاصمة، الجزائر',
      newsletter: 'النشرة الإخبارية',
      newsletterDesc: 'اشترك للحصول على آخر الأخبار والتحديثات الصحية',
      subscribe: 'اشترك',
      emailPlaceholder: 'بريدك الإلكتروني',
      copyright: 'جميع الحقوق محفوظة',
      terms: 'الشروط والأحكام',
      privacy: 'سياسة الخصوصية',
      cookies: 'سياسة ملفات تعريف الارتباط',
    },
    fr: {
      aboutUs: 'À propos',
      aboutDesc: 'Siha DZ est la plateforme leader de prise de rendez-vous médicaux en Algérie. Nous connectons les patients aux meilleurs professionnels de santé à travers le pays.',
      quickLinks: 'Liens rapides',
      findDoctor: 'Trouver un professionnel de santé',
      eConsultation: 'Téléconsultation',
      findPharmacy: 'Trouver une pharmacie',
      myAppointments: 'Mes rendez-vous',
      myPrescriptions: 'Mes ordonnances',
      professionals: 'Professionnels',
      joinAsDoctor: 'Rejoindre en tant que médecin',
      joinAsPharmacy: 'Rejoindre en tant que pharmacie',
      doctorLogin: 'Connexion médecin',
      pharmacyLogin: 'Connexion pharmacie',
      contactUs: 'Contactez-nous',
      address: 'Alger, Algérie',
      newsletter: 'Newsletter',
      newsletterDesc: 'Abonnez-vous pour recevoir les dernières nouvelles et mises à jour santé',
      subscribe: "S'abonner",
      emailPlaceholder: 'Votre email',
      copyright: 'Tous droits réservés',
      terms: 'Conditions générales',
      privacy: 'Politique de confidentialité',
      cookies: 'Politique de cookies',
    },
    en: {
      aboutUs: 'About Us',
      aboutDesc: 'Siha DZ is the leading medical appointment booking platform in Algeria. We connect patients with the best Health Providers across the country.',
      quickLinks: 'Quick Links',
      findDoctor: 'Find a Health Provider',
      eConsultation: 'E-Consultation',
      findPharmacy: 'Find a Pharmacy',
      myAppointments: 'My Appointments',
      myPrescriptions: 'My Prescriptions',
      professionals: 'Professionals',
      joinAsDoctor: 'Join as Doctor',
      joinAsPharmacy: 'Join as Pharmacy',
      doctorLogin: 'Doctor Login',
      pharmacyLogin: 'Pharmacy Login',
      contactUs: 'Contact Us',
      address: 'Algiers, Algeria',
      newsletter: 'Newsletter',
      newsletterDesc: 'Subscribe to receive the latest health news and updates',
      subscribe: 'Subscribe',
      emailPlaceholder: 'Your email',
      copyright: 'All rights reserved',
      terms: 'Terms & Conditions',
      privacy: 'Privacy Policy',
      cookies: 'Cookie Policy',
    },
  }

  const l = labels[language]
  
  return (
    <footer className="border-t bg-muted/30">
      {/* Newsletter Section - hidden on mobile */}
      <div className="hidden md:block border-b bg-primary/5">
        <div className="container mx-auto px-4 py-4 sm:py-5">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="text-center md:text-start w-full">
              <h3 className="text-base sm:text-lg font-semibold text-foreground">{l.newsletter}</h3>
              <p className="text-sm text-muted-foreground">{l.newsletterDesc}</p>
            </div>
            <div className="flex w-full max-w-md gap-2 flex-col sm:flex-row">
              <Input 
                type="email" 
                placeholder={l.emailPlaceholder}
                className="bg-background"
              />
              <Button>{l.subscribe}</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer - hidden on mobile */}
      <div className="hidden md:block container mx-auto px-4 py-6 sm:py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5 [dir=rtl]:auto-cols-fr">
          {/* About */}
          <div className="lg:col-span-2">
            <div className="mb-4 flex items-center gap-3 [dir=rtl]:flex-row-reverse">
              <AppLogo size="lg" className="h-11 w-auto" />
              <div>
                <span className="text-xl font-bold text-foreground">{t('appName')}</span>
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'منصة الرعاية الصحية الذكية' : language === 'fr' ? 'Plateforme de santé intelligente' : 'Smart Healthcare Platform'}
                </p>
              </div>
            </div>
            <p className="text-pretty text-sm text-muted-foreground leading-relaxed mb-4">
              {l.aboutDesc}
            </p>
            
            {/* Social Links */}
            <div className="flex gap-2 [dir=rtl]:flex-row-reverse">
              <Button variant="outline" size="icon" className="h-9 w-9 rounded-full bg-transparent">
                <Facebook className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-9 w-9 rounded-full bg-transparent">
                <Twitter className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-9 w-9 rounded-full bg-transparent">
                <Instagram className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-9 w-9 rounded-full bg-transparent">
                <Linkedin className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="mb-4 text-sm font-semibold text-foreground">{l.quickLinks}</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/search?type=in-person" className="text-muted-foreground hover:text-primary transition-colors">
                  {l.findDoctor}
                </Link>
              </li>
              <li>
                <Link href="/search?type=e-visit" className="text-muted-foreground hover:text-primary transition-colors">
                  {l.eConsultation}
                </Link>
              </li>
              <li>
                <Link href="/pharmacies" className="text-muted-foreground hover:text-primary transition-colors">
                  {l.findPharmacy}
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-muted-foreground hover:text-primary transition-colors">
                  {l.myAppointments}
                </Link>
              </li>
              <li>
                <Link href="/dashboard/prescriptions" className="text-muted-foreground hover:text-primary transition-colors">
                  {l.myPrescriptions}
                </Link>
              </li>
            </ul>
          </div>

          {/* Professionals - hide when logged in */}
          {!user && (
            <div>
              <h4 className="mb-4 text-sm font-semibold text-foreground">{l.professionals}</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link href="/register/doctor" className="text-muted-foreground hover:text-primary transition-colors">
                    {l.joinAsDoctor}
                  </Link>
                </li>
                <li>
                  <Link href="/professional/auth/signup" className="text-muted-foreground hover:text-primary transition-colors">
                    {l.joinAsPharmacy}
                  </Link>
                </li>
                <li>
                  <Link href="/professional/auth/login" className="text-muted-foreground hover:text-primary transition-colors">
                    {l.doctorLogin}
                  </Link>
                </li>
                <li>
                  <Link href="/professional/auth/login" className="text-muted-foreground hover:text-primary transition-colors">
                    {l.pharmacyLogin}
                  </Link>
                </li>
              </ul>
            </div>
          )}

          {/* Contact */}
          <div>
            <h4 className="mb-4 text-sm font-semibold text-foreground">{l.contactUs}</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2 text-muted-foreground [dir=rtl]:flex-row-reverse">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <span>{l.address}</span>
              </li>
              <li className="flex items-center gap-2 text-muted-foreground [dir=rtl]:flex-row-reverse">
                <Phone className="h-4 w-4 shrink-0 text-primary" />
                <span dir="ltr">+213 21 00 00 00</span>
              </li>
              <li className="flex items-center gap-2 text-muted-foreground [dir=rtl]:flex-row-reverse">
                <Mail className="h-4 w-4 shrink-0 text-primary" />
                <span>contact@sihadz.com</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t bg-muted/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col items-center justify-between gap-4 text-xs text-muted-foreground md:flex-row">
            <p>&copy; 2024 {t('appName')}. {l.copyright}.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/terms" className="hover:text-primary transition-colors">{l.terms}</Link>
              <Link href="/privacy" className="hover:text-primary transition-colors">{l.privacy}</Link>
              <Link href="/cookies" className="hover:text-primary transition-colors">{l.cookies}</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
