"use client"

import { useState, use } from "react";
import Link from "next/link"
import { useLanguage } from "@/lib/i18n/language-context"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Star,
  MapPin,
  Clock,
  Phone,
  GraduationCap,
  Award,
  Calendar,
  Video,
  Building,
  Languages,
  CheckCircle,
  MessageSquare,
} from "lucide-react"

const doctors = {
  "1": {
    id: "1",
    name: { ar: "د. أحمد بن علي", fr: "Dr. Ahmed Benali", en: "Dr. Ahmed Benali" },
    specialty: { ar: "طب القلب", fr: "Cardiologie", en: "Cardiology" },
    rating: 4.9,
    reviews: 234,
    experience: 15,
    price: 3000,
    eVisitPrice: 2000,
    location: { ar: "الجزائر العاصمة، حيدرة", fr: "Alger, Hydra", en: "Algiers, Hydra" },
    languages: ["العربية", "Français", "English"],
    availableToday: true,
    eVisitAvailable: true,
    nextAvailable: "Today, 14:00",
    about: {
      ar: "طبيب قلب متخصص مع أكثر من 15 عامًا من الخبرة في تشخيص وعلاج أمراض القلب والأوعية الدموية. حاصل على شهادة البورد من جامعة الجزائر ومتخصص في قسطرة القلب.",
      fr: "Cardiologue spécialisé avec plus de 15 ans d'expérience dans le diagnostic et le traitement des maladies cardiovasculaires. Certifié par l'Université d'Alger et spécialisé en cathétérisme cardiaque.",
      en: "Specialized cardiologist with over 15 years of experience in diagnosing and treating cardiovascular diseases. Board certified from the University of Algiers and specialized in cardiac catheterization.",
    },
    education: [
      { degree: { ar: "دكتوراه في الطب", fr: "Doctorat en Médecine", en: "Doctor of Medicine" }, institution: { ar: "جامعة الجزائر", fr: "Université d'Alger", en: "University of Algiers" }, year: "2008" },
      { degree: { ar: "تخصص طب القلب", fr: "Spécialisation Cardiologie", en: "Cardiology Specialization" }, institution: { ar: "مستشفى مصطفى باشا", fr: "Hôpital Mustapha Pacha", en: "Mustapha Pacha Hospital" }, year: "2012" },
    ],
    services: [
      { ar: "فحص القلب الشامل", fr: "Bilan cardiaque complet", en: "Complete cardiac checkup" },
      { ar: "تخطيط القلب", fr: "Électrocardiogramme", en: "Electrocardiogram (ECG)" },
      { ar: "إيكو القلب", fr: "Échocardiographie", en: "Echocardiography" },
      { ar: "متابعة ضغط الدم", fr: "Suivi de l'hypertension", en: "Blood pressure monitoring" },
      { ar: "استشارة عن بعد", fr: "Téléconsultation", en: "Telemedicine consultation" },
    ],
    workingHours: {
      ar: ["السبت - الأربعاء: 09:00 - 17:00", "الخميس: 09:00 - 13:00"],
      fr: ["Samedi - Mercredi: 09:00 - 17:00", "Jeudi: 09:00 - 13:00"],
      en: ["Saturday - Wednesday: 09:00 - 17:00", "Thursday: 09:00 - 13:00"],
    },
    phone: "+213 21 XX XX XX",
  },
  "2": {
    id: "2",
    name: { ar: "د. فاطمة زهراء", fr: "Dr. Fatima Zahra", en: "Dr. Fatima Zahra" },
    specialty: { ar: "طب الأطفال", fr: "Pédiatrie", en: "Pediatrics" },
    rating: 4.8,
    reviews: 189,
    experience: 12,
    price: 2500,
    eVisitPrice: 1800,
    location: { ar: "وهران، المدينة الجديدة", fr: "Oran, Es Senia", en: "Oran, Es Senia" },
    languages: ["العربية", "Français"],
    availableToday: true,
    eVisitAvailable: true,
    nextAvailable: "Today, 15:30",
    about: {
      ar: "طبيبة أطفال متخصصة في رعاية الأطفال من الولادة حتى المراهقة. خبرة واسعة في التطعيمات ونمو الطفل والأمراض المعدية.",
      fr: "Pédiatre spécialisée dans les soins aux enfants de la naissance à l'adolescence. Grande expérience en vaccinations, développement de l'enfant et maladies infectieuses.",
      en: "Pediatrician specialized in child care from birth to adolescence. Extensive experience in vaccinations, child development, and infectious diseases.",
    },
    education: [
      { degree: { ar: "دكتوراه في الطب", fr: "Doctorat en Médecine", en: "Doctor of Medicine" }, institution: { ar: "جامعة وهران", fr: "Université d'Oran", en: "University of Oran" }, year: "2011" },
    ],
    services: [
      { ar: "فحص الأطفال", fr: "Examen pédiatrique", en: "Pediatric examination" },
      { ar: "التطعيمات", fr: "Vaccinations", en: "Vaccinations" },
      { ar: "متابعة النمو", fr: "Suivi de croissance", en: "Growth monitoring" },
    ],
    workingHours: {
      ar: ["السبت - الخميس: 08:00 - 16:00"],
      fr: ["Samedi - Jeudi: 08:00 - 16:00"],
      en: ["Saturday - Thursday: 08:00 - 16:00"],
    },
    phone: "+213 41 XX XX XX",
  },
}

export default function DoctorProfilePage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const { id } = params
  const { language, dir } = useLanguage()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)

  const doctor = doctors[id as keyof typeof doctors] || doctors["1"]

  const labels = {
    ar: {
      bookAppointment: "حجز موعد",
      bookEVisit: "حجز استشارة عن بعد",
      about: "نبذة عني",
      education: "التعليم والشهادات",
      services: "الخدمات المقدمة",
      reviews: "التقييمات",
      workingHours: "ساعات العمل",
      yearsExperience: "سنة خبرة",
      patients: "مريض",
      inPerson: "حضوري",
      eVisit: "عن بعد",
      dzd: "د.ج",
      verified: "طبيب موثق",
      selectDate: "اختر التاريخ",
      selectTime: "اختر الوقت",
      today: "اليوم",
      tomorrow: "غداً",
      available: "متاح",
      morning: "صباحاً",
      afternoon: "مساءً",
      continueBooking: "متابعة الحجز",
      callClinic: "اتصل بالعيادة",
      writeReview: "اكتب تقييم",
    },
    fr: {
      bookAppointment: "Prendre rendez-vous",
      bookEVisit: "Réserver téléconsultation",
      about: "À propos",
      education: "Formation",
      services: "Services",
      reviews: "Avis",
      workingHours: "Horaires",
      yearsExperience: "ans d'expérience",
      patients: "patients",
      inPerson: "En cabinet",
      eVisit: "Téléconsultation",
      dzd: "DA",
      verified: "Médecin vérifié",
      selectDate: "Choisir la date",
      selectTime: "Choisir l'heure",
      today: "Aujourd'hui",
      tomorrow: "Demain",
      available: "Disponible",
      morning: "Matin",
      afternoon: "Après-midi",
      continueBooking: "Continuer",
      callClinic: "Appeler le cabinet",
      writeReview: "Écrire un avis",
    },
    en: {
      bookAppointment: "Book Appointment",
      bookEVisit: "Book E-Visit",
      about: "About",
      education: "Education",
      services: "Services",
      reviews: "Reviews",
      workingHours: "Working Hours",
      yearsExperience: "years experience",
      patients: "patients",
      inPerson: "In-Person",
      eVisit: "E-Visit",
      dzd: "DZD",
      verified: "Verified Doctor",
      selectDate: "Select Date",
      selectTime: "Select Time",
      today: "Today",
      tomorrow: "Tomorrow",
      available: "Available",
      morning: "Morning",
      afternoon: "Afternoon",
      continueBooking: "Continue Booking",
      callClinic: "Call Clinic",
      writeReview: "Write Review",
    },
  }

  const l = labels[language]

  const dates = [
    { label: l.today, date: new Date().toISOString().split("T")[0] },
    { label: l.tomorrow, date: new Date(Date.now() + 86400000).toISOString().split("T")[0] },
    { label: "22 Jan", date: "2026-01-22" },
    { label: "23 Jan", date: "2026-01-23" },
  ]

  const timeSlots = {
    morning: ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"],
    afternoon: ["14:00", "14:30", "15:00", "15:30", "16:00", "16:30"],
  }

  return (
    <div className="min-h-screen bg-background flex flex-col" dir={dir}>
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Doctor Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row gap-6">
                  <Avatar className="h-32 w-32 mx-auto sm:mx-0">
                    <AvatarFallback className="text-3xl bg-primary/10 text-primary">
                      {doctor.name[language].split(" ").slice(-1)[0].charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-center sm:text-start">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-center sm:justify-start">
                      <h1 className="text-2xl font-bold">{doctor.name[language]}</h1>
                      <Badge variant="secondary" className="w-fit mx-auto sm:mx-0">
                        <CheckCircle className="h-3 w-3 me-1" />
                        {l.verified}
                      </Badge>
                    </div>
                    <p className="text-lg text-primary mt-1">{doctor.specialty[language]}</p>
                    <div className="flex items-center gap-4 mt-3 justify-center sm:justify-start flex-wrap">
                      <div className="flex items-center gap-1">
                        <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">{doctor.rating}</span>
                        <span className="text-muted-foreground">({doctor.reviews})</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Award className="h-4 w-4" />
                        <span>{doctor.experience} {l.yearsExperience}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 justify-center sm:justify-start">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{doctor.location[language]}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2 justify-center sm:justify-start">
                      <Languages className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{doctor.languages.join(" • ")}</span>
                    </div>
                    <div className="flex gap-3 mt-4 justify-center sm:justify-start flex-wrap">
                      <Badge variant="outline" className="text-base px-4 py-1">
                        <Building className="h-4 w-4 me-2" />
                        {l.inPerson}: {doctor.price.toLocaleString()} {l.dzd}
                      </Badge>
                      {doctor.eVisitAvailable && (
                        <Badge variant="outline" className="text-base px-4 py-1 border-primary text-primary">
                          <Video className="h-4 w-4 me-2" />
                          {l.eVisit}: {doctor.eVisitPrice.toLocaleString()} {l.dzd}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="about">
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="about">{l.about}</TabsTrigger>
                <TabsTrigger value="education">{l.education}</TabsTrigger>
                <TabsTrigger value="services">{l.services}</TabsTrigger>
                <TabsTrigger value="reviews">{l.reviews}</TabsTrigger>
              </TabsList>
              <TabsContent value="about" className="mt-4">
                <Card>
                  <CardContent className="p-6">
                    <p className="text-muted-foreground leading-relaxed">{doctor.about[language]}</p>
                    <div className="mt-6">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {l.workingHours}
                      </h3>
                      <ul className="space-y-1 text-muted-foreground">
                        {doctor.workingHours[language].map((hours, idx) => (
                          <li key={idx}>{hours}</li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="education" className="mt-4">
                <Card>
                  <CardContent className="p-6 space-y-4">
                    {doctor.education.map((edu, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <GraduationCap className="h-5 w-5 text-primary mt-1" />
                        <div>
                          <p className="font-medium">{edu.degree[language]}</p>
                          <p className="text-muted-foreground">{edu.institution[language]} - {edu.year}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="services" className="mt-4">
                <Card>
                  <CardContent className="p-6">
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {doctor.services.map((service, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-primary" />
                          <span>{service[language]}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="reviews" className="mt-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
                        <span className="text-2xl font-bold">{doctor.rating}</span>
                        <span className="text-muted-foreground">({doctor.reviews} {l.reviews.toLowerCase()})</span>
                      </div>
                      <Button variant="outline">
                        <MessageSquare className="h-4 w-4 me-2" />
                        {l.writeReview}
                      </Button>
                    </div>
                    <div className="space-y-4">
                      {[5, 4, 3, 2, 1].map((stars) => (
                        <div key={stars} className="flex items-center gap-3">
                          <span className="w-3">{stars}</span>
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <div className="flex-1 bg-muted rounded-full h-2">
                            <div
                              className="bg-yellow-400 h-2 rounded-full"
                              style={{ width: `${stars === 5 ? 70 : stars === 4 ? 20 : stars === 3 ? 7 : 2}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Booking Card */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {l.bookAppointment}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <p className="text-sm font-medium mb-3">{l.selectDate}</p>
                  <div className="grid grid-cols-4 gap-2">
                    {dates.map((d) => (
                      <Button
                        key={d.date}
                        variant={selectedDate === d.date ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedDate(d.date)}
                        className="flex flex-col h-auto py-2"
                      >
                        <span className="text-xs">{d.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                {selectedDate && (
                  <div>
                    <p className="text-sm font-medium mb-3">{l.selectTime}</p>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">{l.morning}</p>
                        <div className="grid grid-cols-3 gap-2">
                          {timeSlots.morning.map((time) => (
                            <Button
                              key={time}
                              variant={selectedTime === time ? "default" : "outline"}
                              size="sm"
                              onClick={() => setSelectedTime(time)}
                            >
                              {time}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">{l.afternoon}</p>
                        <div className="grid grid-cols-3 gap-2">
                          {timeSlots.afternoon.map((time) => (
                            <Button
                              key={time}
                              variant={selectedTime === time ? "default" : "outline"}
                              size="sm"
                              onClick={() => setSelectedTime(time)}
                            >
                              {time}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3 pt-4 border-t">
                  <Button asChild className="w-full" disabled={!selectedDate || !selectedTime}>
                    <Link href={`/booking/new?doctor=${doctor.id}&date=${selectedDate}&time=${selectedTime}&type=in-person`}>
                      <Building className="h-4 w-4 me-2" />
                      {l.bookAppointment}
                    </Link>
                  </Button>
                  {doctor.eVisitAvailable && (
                    <Button asChild variant="outline" className="w-full border-primary text-primary hover:bg-primary/10 bg-transparent" disabled={!selectedDate || !selectedTime}>
                      <Link href={`/booking/new?doctor=${doctor.id}&date=${selectedDate}&time=${selectedTime}&type=e-visit`}>
                        <Video className="h-4 w-4 me-2" />
                        {l.bookEVisit}
                      </Link>
                    </Button>
                  )}
                  <Button variant="ghost" className="w-full">
                    <Phone className="h-4 w-4 me-2" />
                    {l.callClinic}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
