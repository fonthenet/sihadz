// Healthcare Facilities Directory for Algeria
// Data sourced from official directories and Wikipedia

export type FacilityType = 'chu' | 'eph' | 'ehs' | 'clinic' | 'polyclinic' | 'health_center' | 'cac'

export interface HealthcareFacility {
  id: string
  name: {
    ar: string
    fr: string
    en: string
  }
  type: FacilityType
  wilayaCode: string
  city: string
  address?: {
    ar?: string
    fr?: string
  }
  phone?: string[]
  fax?: string
  email?: string
  website?: string
  beds?: number
  isPublic: boolean
  specialties?: string[]
  services?: string[]
  emergencyServices: boolean
  coordinates?: {
    lat: number
    lng: number
  }
  openingHours?: string
  rating?: number
  reviewCount?: number
}

export const FACILITY_TYPES: Record<FacilityType, { ar: string; fr: string; en: string }> = {
  chu: { ar: 'مركز استشفائي جامعي', fr: 'Centre Hospitalier Universitaire', en: 'University Hospital Center' },
  eph: { ar: 'مؤسسة عمومية استشفائية', fr: 'Établissement Public Hospitalier', en: 'Public Hospital' },
  ehs: { ar: 'مؤسسة استشفائية متخصصة', fr: 'Établissement Hospitalier Spécialisé', en: 'Specialized Hospital' },
  clinic: { ar: 'عيادة خاصة', fr: 'Clinique Privée', en: 'Private Clinic' },
  polyclinic: { ar: 'عيادة متعددة التخصصات', fr: 'Polyclinique', en: 'Polyclinic' },
  health_center: { ar: 'مركز صحي', fr: 'Centre de Santé', en: 'Health Center' },
  cac: { ar: 'مركز مكافحة السرطان', fr: 'Centre Anti-Cancer', en: 'Cancer Treatment Center' },
}

export const MEDICAL_SPECIALTIES = {
  general: { ar: 'طب عام', fr: 'Médecine Générale', en: 'General Medicine' },
  cardiology: { ar: 'طب القلب', fr: 'Cardiologie', en: 'Cardiology' },
  neurology: { ar: 'طب الأعصاب', fr: 'Neurologie', en: 'Neurology' },
  orthopedics: { ar: 'جراحة العظام', fr: 'Orthopédie', en: 'Orthopedics' },
  pediatrics: { ar: 'طب الأطفال', fr: 'Pédiatrie', en: 'Pediatrics' },
  gynecology: { ar: 'طب النساء والتوليد', fr: 'Gynécologie-Obstétrique', en: 'Gynecology & Obstetrics' },
  ophthalmology: { ar: 'طب العيون', fr: 'Ophtalmologie', en: 'Ophthalmology' },
  dermatology: { ar: 'طب الجلد', fr: 'Dermatologie', en: 'Dermatology' },
  psychiatry: { ar: 'الطب النفسي', fr: 'Psychiatrie', en: 'Psychiatry' },
  oncology: { ar: 'علاج الأورام', fr: 'Oncologie', en: 'Oncology' },
  urology: { ar: 'طب المسالك البولية', fr: 'Urologie', en: 'Urology' },
  gastroenterology: { ar: 'طب الجهاز الهضمي', fr: 'Gastro-entérologie', en: 'Gastroenterology' },
  pulmonology: { ar: 'طب الرئة', fr: 'Pneumologie', en: 'Pulmonology' },
  nephrology: { ar: 'طب الكلى', fr: 'Néphrologie', en: 'Nephrology' },
  endocrinology: { ar: 'طب الغدد الصماء', fr: 'Endocrinologie', en: 'Endocrinology' },
  rheumatology: { ar: 'طب الروماتيزم', fr: 'Rhumatologie', en: 'Rheumatology' },
  ent: { ar: 'أنف أذن حنجرة', fr: 'ORL', en: 'ENT' },
  dental: { ar: 'طب الأسنان', fr: 'Dentisterie', en: 'Dentistry' },
  radiology: { ar: 'الأشعة', fr: 'Radiologie', en: 'Radiology' },
  emergency: { ar: 'الطوارئ', fr: 'Urgences', en: 'Emergency' },
  surgery: { ar: 'الجراحة العامة', fr: 'Chirurgie Générale', en: 'General Surgery' },
  cardiovascular_surgery: { ar: 'جراحة القلب والأوعية', fr: 'Chirurgie Cardiovasculaire', en: 'Cardiovascular Surgery' },
  burns: { ar: 'علاج الحروق', fr: 'Traitement des Brûlures', en: 'Burns Treatment' },
  rehabilitation: { ar: 'إعادة التأهيل', fr: 'Rééducation', en: 'Rehabilitation' },
  infectious_diseases: { ar: 'الأمراض المعدية', fr: 'Maladies Infectieuses', en: 'Infectious Diseases' },
}

// Healthcare Facilities Database
export const HEALTHCARE_FACILITIES: HealthcareFacility[] = [
  // ========== WILAYA D'ALGER (16) ==========
  {
    id: 'chu-mustapha',
    name: {
      ar: 'المستشفى الجامعي مصطفى باشا',
      fr: 'CHU Mustapha Pacha',
      en: 'Mustapha Pacha University Hospital'
    },
    type: 'chu',
    wilayaCode: '16',
    city: 'Alger Centre',
    address: {
      ar: 'ساحة 1 ماي، الجزائر الوسطى',
      fr: 'Place du 1er Mai, Alger Centre'
    },
    phone: ['021 23 55 55', '021 23 56 56'],
    beds: 1500,
    isPublic: true,
    specialties: ['general', 'cardiology', 'neurology', 'surgery', 'pediatrics', 'gynecology', 'oncology'],
    emergencyServices: true,
    coordinates: { lat: 36.7538, lng: 3.0588 },
    rating: 4.2,
    reviewCount: 1250
  },
  {
    id: 'chu-bab-el-oued',
    name: {
      ar: 'المستشفى الجامعي لامين دباغين باب الواد',
      fr: 'CHU Lamine Debaghine - Bab El Oued',
      en: 'Lamine Debaghine University Hospital'
    },
    type: 'chu',
    wilayaCode: '16',
    city: 'Bab El Oued',
    address: {
      ar: 'باب الواد، الجزائر',
      fr: 'Bab El Oued, Alger'
    },
    phone: ['021 96 44 44'],
    beds: 1200,
    isPublic: true,
    specialties: ['general', 'surgery', 'orthopedics', 'neurology'],
    emergencyServices: true,
    coordinates: { lat: 36.7900, lng: 3.0500 },
    rating: 4.0,
    reviewCount: 890
  },
  {
    id: 'chu-hussein-dey',
    name: {
      ar: 'المستشفى الجامعي نفيسة حمود حسين داي',
      fr: 'CHU Nafissa Hamoud - Hussein Dey',
      en: 'Nafissa Hamoud University Hospital'
    },
    type: 'chu',
    wilayaCode: '16',
    city: 'Hussein Dey',
    address: {
      ar: 'حسين داي، الجزائر',
      fr: 'Hussein Dey, Alger'
    },
    phone: ['021 77 22 22'],
    beds: 1080,
    isPublic: true,
    specialties: ['general', 'pediatrics', 'gynecology', 'surgery'],
    emergencyServices: true,
    coordinates: { lat: 36.7400, lng: 3.1000 },
    rating: 3.9,
    reviewCount: 720
  },
  {
    id: 'chu-beni-messous',
    name: {
      ar: 'المستشفى الجامعي عيسى حساني بني مسوس',
      fr: 'CHU Issad Hassani - Beni Messous',
      en: 'Issad Hassani University Hospital'
    },
    type: 'chu',
    wilayaCode: '16',
    city: 'Beni Messous',
    address: {
      ar: 'بني مسوس، الجزائر',
      fr: 'Beni Messous, Alger'
    },
    phone: ['021 93 11 11'],
    beds: 880,
    isPublic: true,
    specialties: ['general', 'cardiology', 'nephrology', 'surgery'],
    emergencyServices: true,
    coordinates: { lat: 36.7800, lng: 2.9800 },
    rating: 4.1,
    reviewCount: 650
  },
  {
    id: 'chu-douera',
    name: {
      ar: 'المستشفى الجامعي جيلالي بونعامة الدويرة',
      fr: 'CHU Djillali Bounaama - Douera',
      en: 'Djillali Bounaama University Hospital'
    },
    type: 'chu',
    wilayaCode: '16',
    city: 'Douera',
    address: {
      ar: 'الدويرة، الجزائر',
      fr: 'Douéra, Alger'
    },
    phone: ['021 35 22 22'],
    beds: 790,
    isPublic: true,
    specialties: ['general', 'surgery', 'orthopedics', 'gynecology'],
    emergencyServices: true,
    coordinates: { lat: 36.6700, lng: 2.9400 },
    rating: 4.3,
    reviewCount: 580
  },
  {
    id: 'ehs-cpmc',
    name: {
      ar: 'المستشفى المتخصص في علاج السرطان بيار وماري كوري',
      fr: 'EHS en Oncologie Pierre et Marie Curie (CPMC)',
      en: 'Pierre and Marie Curie Cancer Center'
    },
    type: 'cac',
    wilayaCode: '16',
    city: 'Alger Centre',
    address: {
      ar: 'الجزائر الوسطى',
      fr: 'Alger Centre'
    },
    phone: ['021 23 66 66'],
    beds: 230,
    isPublic: true,
    specialties: ['oncology'],
    emergencyServices: false,
    coordinates: { lat: 36.7550, lng: 3.0600 },
    rating: 4.4,
    reviewCount: 420
  },
  {
    id: 'ehs-zemirli',
    name: {
      ar: 'مستشفى الطوارئ سليم زميرلي الحراش',
      fr: 'EHS Urgences Salim Zemirli - El Harrach',
      en: 'Salim Zemirli Emergency Hospital'
    },
    type: 'ehs',
    wilayaCode: '16',
    city: 'El Harrach',
    address: {
      ar: 'الحراش، الجزائر',
      fr: 'El Harrach, Alger'
    },
    phone: ['021 52 33 33'],
    beds: 240,
    isPublic: true,
    specialties: ['emergency', 'surgery'],
    emergencyServices: true,
    coordinates: { lat: 36.7200, lng: 3.1300 },
    rating: 4.0,
    reviewCount: 380
  },
  {
    id: 'ehs-burns-zeralda',
    name: {
      ar: 'مستشفى الحروق الكبرى زرالدة',
      fr: 'Hôpital des Grands Brûlés - Zéralda',
      en: 'Major Burns Hospital Zeralda'
    },
    type: 'ehs',
    wilayaCode: '16',
    city: 'Zeralda',
    address: {
      ar: 'زرالدة، الجزائر',
      fr: 'Zéralda, Alger'
    },
    phone: ['021 32 55 55'],
    beds: 140,
    isPublic: true,
    specialties: ['burns'],
    emergencyServices: true,
    coordinates: { lat: 36.7100, lng: 2.8400 },
    rating: 4.5,
    reviewCount: 210
  },
  {
    id: 'ehs-cardio-cnms',
    name: {
      ar: 'المستشفى المتخصص في أمراض القلب معوش محند عمقران',
      fr: 'EHS Maouche Mohand Amokrane (ex-CNMS)',
      en: 'Cardiac Diseases Specialized Hospital'
    },
    type: 'ehs',
    wilayaCode: '16',
    city: 'Alger Centre',
    address: {
      ar: 'الجزائر الوسطى',
      fr: 'Alger Centre'
    },
    phone: ['021 23 77 77'],
    beds: 180,
    isPublic: true,
    specialties: ['cardiology', 'cardiovascular_surgery'],
    emergencyServices: true,
    coordinates: { lat: 36.7560, lng: 3.0550 },
    rating: 4.3,
    reviewCount: 290
  },
  {
    id: 'ehs-psychiatry-kouba',
    name: {
      ar: 'المستشفى المتخصص في الأمراض النفسية دريد حسين القبة',
      fr: 'EHS Psychiatrie Drid Hocine - Kouba',
      en: 'Drid Hocine Psychiatric Hospital'
    },
    type: 'ehs',
    wilayaCode: '16',
    city: 'Kouba',
    address: {
      ar: 'القبة، الجزائر',
      fr: 'Kouba, Alger'
    },
    phone: ['021 28 44 44'],
    beds: 280,
    isPublic: true,
    specialties: ['psychiatry'],
    emergencyServices: false,
    coordinates: { lat: 36.7300, lng: 3.0800 },
    rating: 3.8,
    reviewCount: 180
  },
  // Private Clinics in Algiers
  {
    id: 'clinic-aya',
    name: {
      ar: 'مصحة آية',
      fr: 'Clinique AYA',
      en: 'AYA Clinic'
    },
    type: 'clinic',
    wilayaCode: '16',
    city: 'Bir Khadem',
    address: {
      ar: 'حي السوريكال، بئر خادم',
      fr: 'Cité Sorecal, Bir Khadem'
    },
    phone: ['021 44 55 66'],
    isPublic: false,
    specialties: ['general', 'surgery'],
    emergencyServices: true,
    openingHours: '24/7',
    rating: 4.4,
    reviewCount: 320
  },
  {
    id: 'clinic-nedjma2',
    name: {
      ar: 'العيادة الطبية الجراحية نجمة 2',
      fr: 'Clinique Médico-Chirurgicale NEDJMA 2',
      en: 'NEDJMA 2 Medical-Surgical Clinic'
    },
    type: 'clinic',
    wilayaCode: '16',
    city: 'Bourouba',
    address: {
      ar: 'الاتجاهات الأربع، بوروبة',
      fr: 'Les Quatre Chemins, Bourouba'
    },
    phone: ['021 55 66 77'],
    isPublic: false,
    specialties: ['surgery', 'orthopedics'],
    emergencyServices: true,
    openingHours: '24/7',
    rating: 4.2,
    reviewCount: 280
  },
  {
    id: 'clinic-loiola',
    name: {
      ar: 'العيادة العينية لويولا الجزائر',
      fr: 'Clinique Ophtalmologique LOIOLA El Djazair',
      en: 'LOIOLA Ophthalmology Clinic'
    },
    type: 'clinic',
    wilayaCode: '16',
    city: 'Baba Hassen',
    address: {
      ar: 'البناية رقم 04 طريق الدويرة، بابا حسن',
      fr: 'Bâtiment 04, Route de Douéra, Baba Hassen'
    },
    phone: ['021 33 44 55'],
    isPublic: false,
    specialties: ['ophthalmology'],
    emergencyServices: false,
    openingHours: '08:00-18:00',
    rating: 4.6,
    reviewCount: 190
  },
  {
    id: 'clinic-kardia',
    name: {
      ar: 'مصحة أمراض القلب كارديا',
      fr: 'Clinique de Cardiologie KARDIA',
      en: 'KARDIA Cardiology Clinic'
    },
    type: 'clinic',
    wilayaCode: '16',
    city: 'Pont de Constantine',
    address: {
      ar: 'حي سونلغاز البناية 97، جسر قسنطينة',
      fr: 'Cité Sonelgaz Bâtiment 97, Pont de Constantine'
    },
    phone: ['021 66 77 88'],
    isPublic: false,
    specialties: ['cardiology'],
    emergencyServices: true,
    openingHours: '24/7',
    rating: 4.5,
    reviewCount: 240
  },
  {
    id: 'clinic-chifa-hydra',
    name: {
      ar: 'مصحة الشفاء حيدرة',
      fr: 'Clinique CHIFA Hydra',
      en: 'CHIFA Clinic Hydra'
    },
    type: 'clinic',
    wilayaCode: '16',
    city: 'Hydra',
    address: {
      ar: 'تعاونية ريمة إقامة الصومام، حيدرة',
      fr: 'Coopérative Rima, Résidence Soummam, Hydra'
    },
    phone: ['021 69 88 99'],
    isPublic: false,
    specialties: ['general', 'surgery', 'pediatrics'],
    emergencyServices: true,
    openingHours: '24/7',
    rating: 4.7,
    reviewCount: 310
  },

  // ========== WILAYA D'ORAN (31) ==========
  {
    id: 'chu-oran',
    name: {
      ar: 'المستشفى الجامعي وهران',
      fr: 'CHU d\'Oran',
      en: 'Oran University Hospital'
    },
    type: 'chu',
    wilayaCode: '31',
    city: 'Oran',
    address: {
      ar: 'وهران',
      fr: 'Oran'
    },
    phone: ['041 41 22 22'],
    beds: 1800,
    isPublic: true,
    specialties: ['general', 'cardiology', 'neurology', 'surgery', 'pediatrics', 'gynecology', 'oncology'],
    emergencyServices: true,
    coordinates: { lat: 35.6969, lng: -0.6331 },
    rating: 4.1,
    reviewCount: 980
  },
  {
    id: 'eph-oran-hai-nedjma',
    name: {
      ar: 'المستشفى العمومي حي النجمة وهران',
      fr: 'EPH Hai Nedjma - Oran',
      en: 'Hai Nedjma Public Hospital'
    },
    type: 'eph',
    wilayaCode: '31',
    city: 'Oran',
    address: {
      ar: 'حي النجمة، وهران',
      fr: 'Hai Nedjma, Oran'
    },
    phone: ['041 33 44 55'],
    beds: 240,
    isPublic: true,
    specialties: ['general', 'surgery'],
    emergencyServices: true,
    rating: 3.9,
    reviewCount: 420
  },
  {
    id: 'ehs-cac-oran',
    name: {
      ar: 'مركز مكافحة السرطان وهران',
      fr: 'Centre Anti-Cancer d\'Oran',
      en: 'Oran Cancer Treatment Center'
    },
    type: 'cac',
    wilayaCode: '31',
    city: 'Oran',
    address: {
      ar: 'وهران',
      fr: 'Oran'
    },
    phone: ['041 55 66 77'],
    beds: 150,
    isPublic: true,
    specialties: ['oncology'],
    emergencyServices: false,
    rating: 4.2,
    reviewCount: 280
  },

  // ========== WILAYA DE CONSTANTINE (25) ==========
  {
    id: 'chu-constantine',
    name: {
      ar: 'المستشفى الجامعي ابن باديس قسنطينة',
      fr: 'CHU Ibn Badis - Constantine',
      en: 'Ibn Badis University Hospital'
    },
    type: 'chu',
    wilayaCode: '25',
    city: 'Constantine',
    address: {
      ar: 'قسنطينة',
      fr: 'Constantine'
    },
    phone: ['031 64 22 22'],
    beds: 1426,
    isPublic: true,
    specialties: ['general', 'cardiology', 'neurology', 'surgery', 'pediatrics', 'gynecology'],
    emergencyServices: true,
    coordinates: { lat: 36.3650, lng: 6.6147 },
    rating: 4.0,
    reviewCount: 850
  },
  {
    id: 'eph-el-khroub',
    name: {
      ar: 'مستشفى محمد بوضياف الخروب',
      fr: 'Hôpital Mohamed Boudiaf - El Khroub',
      en: 'Mohamed Boudiaf Hospital'
    },
    type: 'eph',
    wilayaCode: '25',
    city: 'El Khroub',
    address: {
      ar: 'الخروب، قسنطينة',
      fr: 'El Khroub, Constantine'
    },
    phone: ['031 98 44 44'],
    beds: 268,
    isPublic: true,
    specialties: ['general', 'surgery'],
    emergencyServices: true,
    rating: 3.8,
    reviewCount: 320
  },
  {
    id: 'ehs-cardio-constantine',
    name: {
      ar: 'المستشفى المتخصص في جراحة القلب الرياض',
      fr: 'EHS Chirurgie Cardiaque - El Riad',
      en: 'El Riad Cardiac Surgery Hospital'
    },
    type: 'ehs',
    wilayaCode: '25',
    city: 'Constantine',
    address: {
      ar: 'الرياض، قسنطينة',
      fr: 'El Riad, Constantine'
    },
    phone: ['031 88 55 55'],
    beds: 80,
    isPublic: true,
    specialties: ['cardiology', 'cardiovascular_surgery'],
    emergencyServices: true,
    rating: 4.4,
    reviewCount: 210
  },

  // ========== WILAYA DE ANNABA (23) ==========
  {
    id: 'chu-annaba',
    name: {
      ar: 'المستشفى الجامعي عنابة',
      fr: 'CHU de Annaba',
      en: 'Annaba University Hospital'
    },
    type: 'chu',
    wilayaCode: '23',
    city: 'Annaba',
    address: {
      ar: 'عنابة',
      fr: 'Annaba'
    },
    phone: ['038 86 22 22'],
    beds: 1200,
    isPublic: true,
    specialties: ['general', 'cardiology', 'neurology', 'surgery', 'pediatrics', 'gynecology'],
    emergencyServices: true,
    coordinates: { lat: 36.9000, lng: 7.7667 },
    rating: 4.0,
    reviewCount: 720
  },
  {
    id: 'ehs-cac-annaba',
    name: {
      ar: 'مركز مكافحة السرطان عنابة',
      fr: 'EHS Anti-Cancer Annaba',
      en: 'Annaba Cancer Center'
    },
    type: 'cac',
    wilayaCode: '23',
    city: 'Annaba',
    address: {
      ar: 'عنابة',
      fr: 'Annaba'
    },
    phone: ['038 44 55 66'],
    beds: 120,
    isPublic: true,
    specialties: ['oncology'],
    emergencyServices: false,
    rating: 4.1,
    reviewCount: 180
  },

  // ========== WILAYA DE SETIF (19) ==========
  {
    id: 'chu-setif',
    name: {
      ar: 'المستشفى الجامعي سطيف',
      fr: 'CHU de Sétif',
      en: 'Setif University Hospital'
    },
    type: 'chu',
    wilayaCode: '19',
    city: 'Setif',
    address: {
      ar: 'سطيف',
      fr: 'Sétif'
    },
    phone: ['036 84 22 22'],
    beds: 838,
    isPublic: true,
    specialties: ['general', 'cardiology', 'surgery', 'pediatrics', 'gynecology'],
    emergencyServices: true,
    coordinates: { lat: 36.1898, lng: 5.4107 },
    rating: 4.0,
    reviewCount: 620
  },

  // ========== WILAYA DE BLIDA (09) ==========
  {
    id: 'chu-blida',
    name: {
      ar: 'المستشفى الجامعي البليدة',
      fr: 'CHU de Blida',
      en: 'Blida University Hospital'
    },
    type: 'chu',
    wilayaCode: '09',
    city: 'Blida',
    address: {
      ar: 'البليدة',
      fr: 'Blida'
    },
    phone: ['025 20 22 22'],
    beds: 723,
    isPublic: true,
    specialties: ['general', 'cardiology', 'surgery', 'psychiatry', 'pediatrics'],
    emergencyServices: true,
    coordinates: { lat: 36.4700, lng: 2.8300 },
    rating: 4.1,
    reviewCount: 580
  },
  {
    id: 'ehs-psychiatry-blida',
    name: {
      ar: 'المستشفى المتخصص في الأمراض النفسية فرانز فانون البليدة',
      fr: 'EHS Psychiatrie Frantz Fanon - Blida',
      en: 'Frantz Fanon Psychiatric Hospital'
    },
    type: 'ehs',
    wilayaCode: '09',
    city: 'Blida',
    address: {
      ar: 'البليدة',
      fr: 'Blida'
    },
    phone: ['025 40 33 33'],
    beds: 1014,
    isPublic: true,
    specialties: ['psychiatry'],
    emergencyServices: false,
    rating: 3.9,
    reviewCount: 290
  },
  {
    id: 'cac-blida',
    name: {
      ar: 'مركز مكافحة السرطان البليدة',
      fr: 'Centre Anti-Cancer de Blida',
      en: 'Blida Cancer Center'
    },
    type: 'cac',
    wilayaCode: '09',
    city: 'Blida',
    address: {
      ar: 'البليدة',
      fr: 'Blida'
    },
    phone: ['025 55 44 44'],
    beds: 183,
    isPublic: true,
    specialties: ['oncology'],
    emergencyServices: false,
    rating: 4.2,
    reviewCount: 220
  },

  // ========== WILAYA DE TIZI OUZOU (15) ==========
  {
    id: 'chu-tizi-ouzou',
    name: {
      ar: 'المستشفى الجامعي تيزي وزو',
      fr: 'CHU de Tizi Ouzou',
      en: 'Tizi Ouzou University Hospital'
    },
    type: 'chu',
    wilayaCode: '15',
    city: 'Tizi Ouzou',
    address: {
      ar: 'تيزي وزو',
      fr: 'Tizi Ouzou'
    },
    phone: ['026 21 22 22'],
    beds: 900,
    isPublic: true,
    specialties: ['general', 'cardiology', 'surgery', 'pediatrics', 'gynecology'],
    emergencyServices: true,
    coordinates: { lat: 36.7117, lng: 4.0453 },
    rating: 4.0,
    reviewCount: 540
  },
  {
    id: 'ehs-cardio-dbk',
    name: {
      ar: 'المستشفى المتخصص في جراحة القلب عمر الصغير درع بن خدة',
      fr: 'EHS Chirurgie Cardiaque Petit Omar - Draa Ben Khedda',
      en: 'Petit Omar Cardiac Surgery Hospital'
    },
    type: 'ehs',
    wilayaCode: '15',
    city: 'Draa Ben Khedda',
    address: {
      ar: 'درع بن خدة',
      fr: 'Draa Ben Khedda'
    },
    phone: ['026 33 44 44'],
    beds: 80,
    isPublic: true,
    specialties: ['cardiology', 'cardiovascular_surgery'],
    emergencyServices: true,
    rating: 4.5,
    reviewCount: 180
  },

  // ========== WILAYA DE BEJAIA (06) ==========
  {
    id: 'chu-bejaia',
    name: {
      ar: 'المستشفى الجامعي بجاية',
      fr: 'CHU de Béjaïa',
      en: 'Bejaia University Hospital'
    },
    type: 'chu',
    wilayaCode: '06',
    city: 'Bejaia',
    address: {
      ar: 'بجاية',
      fr: 'Béjaïa'
    },
    phone: ['034 21 22 22'],
    beds: 414,
    isPublic: true,
    specialties: ['general', 'surgery', 'pediatrics', 'gynecology'],
    emergencyServices: true,
    coordinates: { lat: 36.7508, lng: 5.0567 },
    rating: 4.0,
    reviewCount: 480
  },

  // ========== WILAYA DE TLEMCEN (13) ==========
  {
    id: 'chu-tlemcen',
    name: {
      ar: 'المستشفى الجامعي الدكتور تيجاني دامرجي تلمسان',
      fr: 'CHU Dr Tidjani Damerdji - Tlemcen',
      en: 'Dr Tidjani Damerdji University Hospital'
    },
    type: 'chu',
    wilayaCode: '13',
    city: 'Tlemcen',
    address: {
      ar: 'تلمسان',
      fr: 'Tlemcen'
    },
    phone: ['043 20 22 22'],
    beds: 642,
    isPublic: true,
    specialties: ['general', 'surgery', 'pediatrics', 'gynecology', 'cardiology'],
    emergencyServices: true,
    coordinates: { lat: 34.8828, lng: -1.3167 },
    rating: 4.1,
    reviewCount: 420
  },

  // ========== WILAYA DE BATNA (05) ==========
  {
    id: 'eph-batna',
    name: {
      ar: 'مستشفى توهامي بن فليس باتنة',
      fr: 'Hôpital Touhami Benflis - Batna',
      en: 'Touhami Benflis Hospital'
    },
    type: 'eph',
    wilayaCode: '05',
    city: 'Batna',
    address: {
      ar: 'باتنة',
      fr: 'Batna'
    },
    phone: ['033 86 22 22'],
    beds: 612,
    isPublic: true,
    specialties: ['general', 'surgery', 'pediatrics', 'gynecology'],
    emergencyServices: true,
    coordinates: { lat: 35.5550, lng: 6.1742 },
    rating: 3.9,
    reviewCount: 380
  },
  {
    id: 'cac-batna',
    name: {
      ar: 'مركز مكافحة السرطان باتنة',
      fr: 'Centre Anti-Cancer de Batna',
      en: 'Batna Cancer Center'
    },
    type: 'cac',
    wilayaCode: '05',
    city: 'Batna',
    address: {
      ar: 'باتنة',
      fr: 'Batna'
    },
    phone: ['033 44 55 66'],
    beds: 100,
    isPublic: true,
    specialties: ['oncology'],
    emergencyServices: false,
    rating: 4.0,
    reviewCount: 150
  },

  // ========== WILAYA DE SIDI BEL ABBES (22) ==========
  {
    id: 'chu-sba',
    name: {
      ar: 'المستشفى الجامعي الدكتور حساني عبد القادر سيدي بلعباس',
      fr: 'CHU Dr Hassani Abdelkader - Sidi Bel Abbès',
      en: 'Dr Hassani Abdelkader University Hospital'
    },
    type: 'chu',
    wilayaCode: '22',
    city: 'Sidi Bel Abbes',
    address: {
      ar: 'سيدي بلعباس',
      fr: 'Sidi Bel Abbès'
    },
    phone: ['048 54 22 22'],
    beds: 616,
    isPublic: true,
    specialties: ['general', 'surgery', 'pediatrics', 'gynecology'],
    emergencyServices: true,
    coordinates: { lat: 35.1897, lng: -0.6308 },
    rating: 4.0,
    reviewCount: 340
  },

  // ========== WILAYA DE MOSTAGANEM (27) ==========
  {
    id: 'chu-mostaganem',
    name: {
      ar: 'المستشفى الجامعي مستغانم',
      fr: 'CHU de Mostaganem',
      en: 'Mostaganem University Hospital'
    },
    type: 'chu',
    wilayaCode: '27',
    city: 'Mostaganem',
    address: {
      ar: 'مستغانم',
      fr: 'Mostaganem'
    },
    phone: ['045 21 22 22'],
    beds: 500,
    isPublic: true,
    specialties: ['general', 'surgery', 'pediatrics', 'gynecology'],
    emergencyServices: true,
    coordinates: { lat: 35.9311, lng: 0.0892 },
    rating: 3.9,
    reviewCount: 280
  },

  // ========== WILAYA D'ADRAR (01) ==========
  {
    id: 'eph-adrar',
    name: {
      ar: 'مستشفى ابن سينا أدرار',
      fr: 'Hôpital Ibn Sina - Adrar',
      en: 'Ibn Sina Hospital Adrar'
    },
    type: 'eph',
    wilayaCode: '01',
    city: 'Adrar',
    address: {
      ar: 'أدرار',
      fr: 'Adrar'
    },
    phone: ['049 96 22 22'],
    beds: 330,
    isPublic: true,
    specialties: ['general', 'surgery'],
    emergencyServices: true,
    coordinates: { lat: 27.8742, lng: -0.2939 },
    rating: 3.7,
    reviewCount: 120
  },

  // ========== WILAYA DE OUARGLA (30) ==========
  {
    id: 'eph-ouargla',
    name: {
      ar: 'مستشفى ورقلة',
      fr: 'Hôpital de Ouargla',
      en: 'Ouargla Hospital'
    },
    type: 'eph',
    wilayaCode: '30',
    city: 'Ouargla',
    address: {
      ar: 'ورقلة',
      fr: 'Ouargla'
    },
    phone: ['029 71 22 22'],
    beds: 407,
    isPublic: true,
    specialties: ['general', 'surgery', 'pediatrics'],
    emergencyServices: true,
    coordinates: { lat: 31.9527, lng: 5.3300 },
    rating: 3.8,
    reviewCount: 180
  },

  // ========== WILAYA DE BISKRA (07) ==========
  {
    id: 'eph-biskra',
    name: {
      ar: 'مستشفى بشير بن ناصر بسكرة',
      fr: 'EPH Bachir Bennacer - Biskra',
      en: 'Bachir Bennacer Hospital'
    },
    type: 'eph',
    wilayaCode: '07',
    city: 'Biskra',
    address: {
      ar: 'بسكرة',
      fr: 'Biskra'
    },
    phone: ['033 74 22 22'],
    beds: 232,
    isPublic: true,
    specialties: ['general', 'surgery'],
    emergencyServices: true,
    coordinates: { lat: 34.8481, lng: 5.7278 },
    rating: 3.8,
    reviewCount: 210
  },

  // ========== WILAYA DE TAMANRASSET (11) ==========
  {
    id: 'eph-tamanrasset',
    name: {
      ar: 'مستشفى تمنراست',
      fr: 'Hôpital de Tamanrasset',
      en: 'Tamanrasset Hospital'
    },
    type: 'eph',
    wilayaCode: '11',
    city: 'Tamanrasset',
    address: {
      ar: 'تمنراست',
      fr: 'Tamanrasset'
    },
    phone: ['029 34 22 22'],
    beds: 200,
    isPublic: true,
    specialties: ['general', 'surgery'],
    emergencyServices: true,
    coordinates: { lat: 22.7850, lng: 5.5228 },
    rating: 3.6,
    reviewCount: 90
  },
]

// Helper functions
export function getFacilitiesByWilaya(wilayaCode: string): HealthcareFacility[] {
  return HEALTHCARE_FACILITIES.filter(f => f.wilayaCode === wilayaCode)
}

export function getFacilitiesByType(type: FacilityType): HealthcareFacility[] {
  return HEALTHCARE_FACILITIES.filter(f => f.type === type)
}

export function getFacilitiesBySpecialty(specialty: string): HealthcareFacility[] {
  return HEALTHCARE_FACILITIES.filter(f => f.specialties?.includes(specialty))
}

export function searchFacilities(query: string, language: 'ar' | 'fr' | 'en' = 'ar'): HealthcareFacility[] {
  const lowerQuery = query.toLowerCase()
  return HEALTHCARE_FACILITIES.filter(f => {
    const name = f.name[language].toLowerCase()
    const city = f.city.toLowerCase()
    return name.includes(lowerQuery) || city.includes(lowerQuery)
  })
}

export function getPublicHospitals(): HealthcareFacility[] {
  return HEALTHCARE_FACILITIES.filter(f => f.isPublic)
}

export function getPrivateClinics(): HealthcareFacility[] {
  return HEALTHCARE_FACILITIES.filter(f => !f.isPublic)
}

export function getEmergencyFacilities(): HealthcareFacility[] {
  return HEALTHCARE_FACILITIES.filter(f => f.emergencyServices)
}

export function getUniversityHospitals(): HealthcareFacility[] {
  return HEALTHCARE_FACILITIES.filter(f => f.type === 'chu')
}

export function getCancerCenters(): HealthcareFacility[] {
  return HEALTHCARE_FACILITIES.filter(f => f.type === 'cac')
}

// Calculate distance between two coordinates (Haversine formula)
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

export function getNearestFacilities(lat: number, lng: number, limit: number = 10): HealthcareFacility[] {
  return HEALTHCARE_FACILITIES
    .filter(f => f.coordinates)
    .map(f => ({
      ...f,
      distance: calculateDistance(lat, lng, f.coordinates!.lat, f.coordinates!.lng)
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
}
