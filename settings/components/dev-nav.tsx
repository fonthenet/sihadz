"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronDown, ChevronUp, Layout, User, Stethoscope, Search, Calendar, Settings, Video, UserPlus, LogIn, FileText, Pill, MapPin, CreditCard, Brain, Bell, Users, Shield, FolderHeart, Clock, Building2, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"

const devPages = [
  { 
    category: "Public Pages",
    pages: [
      { name: "Home", href: "/", icon: Layout },
      { name: "Search Doctors", href: "/search", icon: Search },
      { name: "Doctor Profile", href: "/doctors/1", icon: Stethoscope },
      { name: "Find Pharmacies", href: "/pharmacies", icon: MapPin },
      { name: "Pharmacie de Garde", href: "/pharmacie-de-garde", icon: Clock },
      { name: "AI Symptom Checker", href: "/symptom-checker", icon: Brain },
      { name: "Healthcare Directory", href: "/healthcare-directory", icon: Building2 },
    ]
  },
  {
    category: "Booking Flow",
    pages: [
      { name: "New Booking", href: "/booking/new?doctorId=1", icon: Calendar },
      { name: "Booking Success", href: "/booking/success?id=123", icon: Calendar },
      { name: "Payment", href: "/payment?type=consultation&amount=3000", icon: CreditCard },
    ]
  },
  {
    category: "Patient Area",
    pages: [
      { name: "Patient Dashboard", href: "/dashboard", icon: User },
      { name: "My Documents", href: "/dashboard/documents", icon: FileText },
      { name: "My Prescriptions", href: "/dashboard/prescriptions", icon: Pill },
      { name: "Medical Records", href: "/medical-records", icon: FolderHeart },
      { name: "Family Members", href: "/family", icon: Users },
      { name: "Notifications", href: "/notifications", icon: Bell },
      { name: "E-Visit Room", href: "/e-visit/1", icon: Video },
      { name: "Settings", href: "/settings", icon: Settings },
    ]
  },
  {
    category: "Doctor Area",
    pages: [
      { name: "Doctor Dashboard", href: "/doctor-dashboard", icon: Stethoscope },
      { name: "Create Prescription", href: "/doctor-dashboard/prescriptions/new?patientId=1", icon: FileText },
    ]
  },
  {
    category: "Pharmacy Area",
    pages: [
      { name: "Pharmacy Dashboard", href: "/pharmacy-dashboard", icon: Pill },
      { name: "Pharmacy Register", href: "/register/pharmacy", icon: UserPlus },
    ]
  },
  {
    category: "Admin",
    pages: [
      { name: "Admin Dashboard", href: "/admin", icon: Shield },
    ]
  },
  {
    category: "Auth Pages",
    pages: [
      { name: "Login", href: "/login", icon: LogIn },
      { name: "Patient Register", href: "/register", icon: UserPlus },
      { name: "Doctor Register", href: "/register/doctor", icon: UserPlus },
    ]
  },
]

export function DevNav() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`bg-foreground text-background rounded-lg shadow-2xl overflow-hidden transition-all duration-300 ${isOpen ? 'w-72 max-h-[80vh]' : 'w-auto'}`}>
        {isOpen && (
          <div className="p-4 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-sm">Dev Navigation</span>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">Testing Mode</span>
              </div>
            </div>
            
            {devPages.map((section) => (
              <div key={section.category} className="mb-4">
                <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                  {section.category}
                </h3>
                <div className="space-y-1">
                  {section.pages.map((page) => (
                    <Link
                      key={page.href}
                      href={page.href}
                      className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-background/10 transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      <page.icon className="h-4 w-4" />
                      {page.name}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            
            <div className="pt-3 mt-3 border-t border-background/20 text-xs text-muted-foreground">
              Remove this component before production
            </div>
          </div>
        )}
        
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-center gap-2 rounded-none bg-foreground hover:bg-foreground/90"
          size="sm"
        >
          {isOpen ? (
            <>
              <ChevronDown className="h-4 w-4" />
              <span>Close</span>
            </>
          ) : (
            <>
              <ChevronUp className="h-4 w-4" />
              <span>Dev Nav</span>
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
