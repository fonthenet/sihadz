/**
 * PharmaConnect Global v3 — Static Data
 * Agencies, Partners, Market, Rare Disease, Algeria, Email Templates
 */

export const T = {
  accent: '#3B82F6',
  green: '#10B981',
  red: '#EF4444',
  yellow: '#F59E0B',
  purple: '#8B5CF6',
  cyan: '#06B6D4',
  pink: '#EC4899',
  orange: '#F97316',
}

/** Country/region name or code → flag emoji */
export const COUNTRY_FLAGS: Record<string, string> = {
  France: '🇫🇷',
  India: '🇮🇳',
  Germany: '🇩🇪',
  Jordan: '🇯🇴',
  China: '🇨🇳',
  Spain: '🇪🇸',
  Italy: '🇮🇹',
  US: '🇺🇸',
  EU: '🇪🇺',
  CN: '🇨🇳',
  JP: '🇯🇵',
  IN: '🇮🇳',
  'IN/CN': '🇮🇳🇨🇳',
  Other: '🌐',
}

/** Region → flag emoji for filter buttons */
export const REGION_FLAGS: Record<string, string> = {
  Americas: '🌎',
  Europe: '🇪🇺',
  'Asia-Pacific': '🌏',
  MENA: '🕌',
  Africa: '🌍',
  'North America': '🌎',
}

export const CHART_COLORS = [
  T.accent,
  T.green,
  T.purple,
  T.yellow,
  T.red,
  T.cyan,
  T.pink,
  T.orange,
  '#6366F1',
  '#14B8A6',
]

export const THEMES = {
  dark: {
    bg: '#060910',
    card: 'rgba(255,255,255,0.022)',
    cardSolid: '#0d1117',
    border: 'rgba(255,255,255,0.06)',
    text: '#fff',
    sub: 'rgba(255,255,255,0.45)',
    dim: 'rgba(255,255,255,0.2)',
    input: 'rgba(255,255,255,0.03)',
    inputBorder: 'rgba(255,255,255,0.08)',
    hover: 'rgba(255,255,255,0.06)',
    navBg: 'rgba(6,9,16,0.95)',
  },
  light: {
    bg: '#f5f7fa',
    card: '#ffffff',
    cardSolid: '#ffffff',
    border: '#e2e8f0',
    text: '#1a202c',
    sub: '#718096',
    dim: '#a0aec0',
    input: '#f7fafc',
    inputBorder: '#e2e8f0',
    hover: '#edf2f7',
    navBg: 'rgba(255,255,255,0.95)',
  },
} as const

export const LANG = {
  en: {
    appName: 'PharmaConnect Global',
    subtitle: 'Global Pharma Intelligence · Algeria 🇩🇿',
    dashboard: 'Dashboard',
    regulatory: 'Regulatory',
    partners: 'Partners',
    market: 'Market Analysis',
    rare: 'Rare Disease',
    portfolio: 'My Portfolio',
    projects: 'Projects',
    dataHub: 'Data Hub',
    aiAssistant: 'AI Assistant',
    tasks: 'Tasks',
    algeria: 'Algeria Analyzer',
    emails: 'Email Templates',
    search: 'Search...',
    darkMode: 'Dark',
    lightMode: 'Light',
    welcome: 'Your command center for global pharmaceutical expansion',
    agencies: 'Regulatory Agencies',
    globalPartners: 'Global Partners',
    rarePrograms: 'Rare Disease Programs',
    marketCats: 'Market Categories',
    stepByStep: 'Step-by-Step Guide',
    documents: 'Required Documents',
    proTips: 'Pro Tips & Strategy',
    tipsForAlgeria: 'Tips for Algerian Companies',
    addDrug: '+ Add Drug',
    analyze: 'Analyze',
    remove: 'Remove',
    newProject: '+ New Project',
    addAction: '+ Add Action',
    addMeeting: '+ Add Meeting',
    overdue: 'Overdue',
    upcoming: 'Upcoming',
    completed: 'Completed',
    progress: 'Progress',
    send: 'Send',
    save: 'Save',
    cancel: 'Cancel',
    back: '← Back',
    teamMembers: 'Team Members',
    notes: 'Notes',
    history: 'History',
    timeline: 'Timeline',
    meetings: 'Meetings',
    overview: 'Overview',
    alerts: 'Alerts',
    notifications: 'Notifications',
    fetchFDA: 'Fetch from openFDA',
    fetchEMA: 'Fetch from EMA',
    fetchingData: 'Fetching...',
    dataSourceFDA: 'FDA (US)',
    dataSourceEMA: 'EMA (EU)',
    liveData: 'Live Data',
    askAI: 'Ask your AI pharma advisor...',
    aiThinking: 'Thinking...',
    algeriaMarket: 'Algerian Pharma Market',
    importData: 'Import Trends',
    localProduction: 'Local Production',
    emailSubject: 'Subject',
    emailTo: 'To',
    emailBody: 'Body',
    useTemplate: 'Use Template',
    uploadDoc: 'Upload Document',
    dragDrop: 'Drag & drop files here',
    ganttChart: 'Project Timeline',
    budgetTracker: 'Budget',
    riskMatrix: 'Risk Matrix',
    newTaskPlaceholder: 'New task...',
    priorityHigh: '🔴 High',
    priorityMedium: '🟡 Medium',
    priorityLow: '🟢 Low',
    addBtn: '+ Add',
    filterAll: 'All',
    filterActive: 'Active',
    filterDone: 'Done',
    taskManagerDesc: 'Personal task manager',
    products: 'Products',
    contacts: 'Contacts',
    bdStrategy: 'BD Strategy',
    keyProducts: 'Key Products',
    bestApproach: 'Best Approach',
    actionPlan: 'Action Plan',
    brandName: 'Brand Name',
    genericInn: 'Generic / INN',
    therapeuticArea: 'Therapeutic Area',
    selectPlaceholder: 'Select...',
    indication: 'Indication',
    stage: 'Stage',
    type: 'Type',
    gmpCertified: 'GMP Certified',
    whoPrequalified: 'WHO Prequalified',
    globalSize: 'Global Size',
    growth: 'Growth',
    entryDifficulty: 'Entry Difficulty',
    marketAnalysisFor: 'Market Analysis for',
    yourProduct: 'your product',
    matchingPartners: 'Matching Partners',
    recommendedMarkets: 'Recommended Markets',
    footerDisclaimer: 'PharmaConnect Global v3 · Feb 2026 · Not legal/medical advice',
    footerHub: '🇩🇿 Algeria Pharma Intelligence Hub',
    marketSizeLabel: 'Market Size',
    populationLabel: 'Population',
    importsLabel: 'Imports',
    marketSizeTrend: 'Market Size Trend',
    importSources: 'Import Sources',
    keyLocalPlayers: 'Key Local Players',
    topOpportunities: 'Top Opportunities',
    regulatoryEnv: 'Regulatory Environment',
    stepByStepGuides: 'Step-by-step FDA, EMA, SFDA, JFDA guides',
    partnersDesc: '15+ global pharma companies + MENA',
    marketDesc: 'Global & Algerian market intelligence',
    aiDesc: 'AI advisor for pharma strategy',
    portfolioDesc: 'Enter your drugs & find opportunities',
    projectsDesc: 'Track projects A to Z',
    dataHubDesc: 'Live openFDA data & web scraping',
    algeriaDesc: 'Algerian market deep analysis',
    revenue: 'Revenue',
    details: 'Details',
    contactsCount: 'contacts',
    emailsDesc: 'Professional email templates for pharma BD',
    dataHubSearchError: 'Enter a company or drug name to search',
    dataHubNoResults: 'No results found. Try a different search term (e.g. Pfizer, Johnson).',
    aiConnectionError: 'Connection error. Please try again.',
  },
  fr: {
    appName: 'PharmaConnect Global',
    subtitle: 'Intelligence Pharma Mondiale · Algérie 🇩🇿',
    dashboard: 'Tableau de bord',
    regulatory: 'Réglementaire',
    partners: 'Partenaires',
    market: 'Analyse Marché',
    rare: 'Maladies Rares',
    portfolio: 'Mon Portefeuille',
    projects: 'Projets',
    dataHub: 'Hub Données',
    aiAssistant: 'Assistant IA',
    tasks: 'Tâches',
    algeria: 'Analyseur Algérie',
    emails: 'Modèles Email',
    search: 'Rechercher...',
    darkMode: 'Sombre',
    lightMode: 'Clair',
    welcome: "Votre centre de commande pour l'expansion pharmaceutique mondiale",
    agencies: 'Agences Réglementaires',
    globalPartners: 'Partenaires Mondiaux',
    rarePrograms: 'Programmes Maladies Rares',
    proTips: 'Conseils & Stratégie',
    tipsForAlgeria: 'Conseils pour les Entreprises Algériennes',
    addDrug: '+ Ajouter Médicament',
    analyze: 'Analyser',
    remove: 'Supprimer',
    newProject: '+ Nouveau Projet',
    addAction: '+ Ajouter Action',
    addMeeting: '+ Ajouter Réunion',
    overdue: 'En retard',
    upcoming: 'À venir',
    completed: 'Terminé',
    progress: 'Progrès',
    send: 'Envoyer',
    save: 'Sauvegarder',
    cancel: 'Annuler',
    back: '← Retour',
    teamMembers: "Membres de l'Équipe",
    notes: 'Notes',
    history: 'Historique',
    timeline: 'Chronologie',
    meetings: 'Réunions',
    overview: "Vue d'ensemble",
    alerts: 'Alertes',
    notifications: 'Notifications',
    fetchFDA: 'Récupérer depuis openFDA',
    fetchEMA: 'Récupérer depuis EMA',
    fetchingData: 'Chargement...',
    dataSourceFDA: 'FDA (US)',
    dataSourceEMA: 'EMA (EU)',
    liveData: 'Données en Direct',
    askAI: "Posez votre question à l'assistant IA...",
    aiThinking: 'Réflexion...',
    algeriaMarket: 'Marché Pharma Algérien',
    importData: 'Tendances Import',
    localProduction: 'Production Locale',
    emailSubject: 'Objet',
    emailTo: 'À',
    emailBody: 'Corps',
    useTemplate: 'Utiliser Modèle',
    uploadDoc: 'Télécharger Document',
    dragDrop: 'Glisser-déposer les fichiers ici',
    ganttChart: 'Chronologie Projet',
    budgetTracker: 'Budget',
    riskMatrix: 'Matrice de Risques',
    stepByStep: 'Guide Étape par Étape',
    documents: 'Documents Requis',
    marketCats: 'Catégories de Marché',
    newTaskPlaceholder: 'Nouvelle tâche...',
    priorityHigh: '🔴 Élevé',
    priorityMedium: '🟡 Moyen',
    priorityLow: '🟢 Bas',
    addBtn: '+ Ajouter',
    filterAll: 'Tout',
    filterActive: 'Actif',
    filterDone: 'Terminé',
    taskManagerDesc: 'Gestionnaire de tâches personnel',
    products: 'Produits',
    contacts: 'Contacts',
    bdStrategy: 'Stratégie BD',
    keyProducts: 'Produits Clés',
    bestApproach: 'Meilleure Approche',
    actionPlan: "Plan d'Action",
    brandName: 'Nom Commercial',
    genericInn: 'Générique / DCI',
    therapeuticArea: 'Domaine Thérapeutique',
    selectPlaceholder: 'Sélectionner...',
    indication: 'Indication',
    stage: 'Étape',
    type: 'Type',
    gmpCertified: 'Certifié GMP',
    whoPrequalified: 'Préqualifié OMS',
    globalSize: 'Taille Mondiale',
    growth: 'Croissance',
    entryDifficulty: 'Difficulté d\'Accès',
    marketAnalysisFor: 'Analyse Marché pour',
    yourProduct: 'votre produit',
    matchingPartners: 'Partenaires Correspondants',
    recommendedMarkets: 'Marchés Recommandés',
    footerDisclaimer: 'PharmaConnect Global v3 · Fév 2026 · Pas de conseil juridique/médical',
    footerHub: '🇩🇿 Hub Intelligence Pharma Algérie',
    marketSizeLabel: 'Taille Marché',
    populationLabel: 'Population',
    importsLabel: 'Importations',
    marketSizeTrend: 'Tendance Taille Marché',
    importSources: 'Sources d\'Import',
    keyLocalPlayers: 'Acteurs Locaux Clés',
    topOpportunities: 'Meilleures Opportunités',
    regulatoryEnv: 'Environnement Réglementaire',
    stepByStepGuides: 'Guides étape par étape FDA, EMA, SFDA, JFDA',
    partnersDesc: '15+ sociétés pharma mondiales + MENA',
    marketDesc: 'Intelligence marché mondial & algérien',
    aiDesc: 'Conseiller IA pour stratégie pharma',
    portfolioDesc: 'Entrez vos médicaments et trouvez des opportunités',
    projectsDesc: 'Suivi des projets de A à Z',
    dataHubDesc: 'Données openFDA live et scraping web',
    algeriaDesc: 'Analyse approfondie du marché algérien',
    revenue: 'Revenus',
    details: 'Détails',
    contactsCount: 'contacts',
    emailsDesc: 'Modèles email professionnels pour BD pharma',
    dataHubSearchError: 'Entrez un nom d\'entreprise ou de médicament',
    dataHubNoResults: 'Aucun résultat. Essayez un autre terme (ex. Pfizer, Johnson).',
    aiConnectionError: 'Erreur de connexion. Réessayez.',
  },
  ar: {
    appName: 'فارما كونكت العالمية',
    subtitle: 'الذكاء الصيدلاني العالمي · الجزائر 🇩🇿',
    dashboard: 'لوحة القيادة',
    regulatory: 'التنظيمية',
    partners: 'الشركاء',
    market: 'تحليل السوق',
    rare: 'الأمراض النادرة',
    portfolio: 'محفظتي',
    projects: 'المشاريع',
    dataHub: 'مركز البيانات',
    aiAssistant: 'المساعد الذكي',
    tasks: 'المهام',
    algeria: 'محلل الجزائر',
    emails: 'قوالب البريد',
    search: 'بحث...',
    darkMode: 'داكن',
    lightMode: 'فاتح',
    welcome: 'مركز القيادة الخاص بك للتوسع الصيدلاني العالمي',
    agencies: 'الوكالات التنظيمية',
    globalPartners: 'الشركاء العالميون',
    rarePrograms: 'برامج الأمراض النادرة',
    proTips: 'نصائح واستراتيجيات',
    tipsForAlgeria: 'نصائح للشركات الجزائرية',
    addDrug: '+ إضافة دواء',
    analyze: 'تحليل',
    remove: 'حذف',
    newProject: '+ مشروع جديد',
    addAction: '+ إضافة إجراء',
    addMeeting: '+ إضافة اجتماع',
    overdue: 'متأخر',
    upcoming: 'قادم',
    completed: 'مكتمل',
    progress: 'التقدم',
    send: 'إرسال',
    save: 'حفظ',
    cancel: 'إلغاء',
    back: '→ رجوع',
    teamMembers: 'أعضاء الفريق',
    notes: 'ملاحظات',
    history: 'السجل',
    timeline: 'الجدول الزمني',
    meetings: 'الاجتماعات',
    overview: 'نظرة عامة',
    alerts: 'التنبيهات',
    notifications: 'الإشعارات',
    fetchFDA: 'جلب من openFDA',
    fetchEMA: 'جلب من EMA',
    fetchingData: 'جاري التحميل...',
    dataSourceFDA: 'FDA (الولايات المتحدة)',
    dataSourceEMA: 'EMA (الاتحاد الأوروبي)',
    liveData: 'بيانات مباشرة',
    askAI: 'اسأل مستشارك الذكي...',
    aiThinking: 'جاري التفكير...',
    algeriaMarket: 'سوق الأدوية الجزائري',
    importData: 'اتجاهات الاستيراد',
    localProduction: 'الإنتاج المحلي',
    emailSubject: 'الموضوع',
    emailTo: 'إلى',
    emailBody: 'النص',
    useTemplate: 'استخدام قالب',
    uploadDoc: 'رفع مستند',
    dragDrop: 'اسحب الملفات هنا',
    ganttChart: 'الجدول الزمني للمشروع',
    budgetTracker: 'الميزانية',
    riskMatrix: 'مصفوفة المخاطر',
    stepByStep: 'دليل خطوة بخطوة',
    documents: 'المستندات المطلوبة',
    marketCats: 'فئات السوق',
    newTaskPlaceholder: 'مهمة جديدة...',
    priorityHigh: '🔴 عالي',
    priorityMedium: '🟡 متوسط',
    priorityLow: '🟢 منخفض',
    addBtn: '+ إضافة',
    filterAll: 'الكل',
    filterActive: 'نشط',
    filterDone: 'مكتمل',
    taskManagerDesc: 'مدير المهام الشخصي',
    products: 'المنتجات',
    contacts: 'جهات الاتصال',
    bdStrategy: 'استراتيجية BD',
    keyProducts: 'المنتجات الرئيسية',
    bestApproach: 'أفضل نهج',
    actionPlan: 'خطة العمل',
    brandName: 'الاسم التجاري',
    genericInn: 'العام / الدواء الأساسي',
    therapeuticArea: 'المجال العلاجي',
    selectPlaceholder: 'اختر...',
    indication: 'الدواعي',
    stage: 'المرحلة',
    type: 'النوع',
    gmpCertified: 'معتمد GMP',
    whoPrequalified: 'معتمد مسبقاً من منظمة الصحة العالمية',
    globalSize: 'الحجم العالمي',
    growth: 'النمو',
    entryDifficulty: 'صعوبة الدخول',
    marketAnalysisFor: 'تحليل السوق لـ',
    yourProduct: 'منتجك',
    matchingPartners: 'الشركاء المطابقون',
    recommendedMarkets: 'الأسواق الموصى بها',
    footerDisclaimer: 'PharmaConnect Global v3 · شباط 2026 · ليست مشورة قانونية/طبية',
    footerHub: '🇩🇿 مركز الذكاء الصيدلاني الجزائري',
    marketSizeLabel: 'حجم السوق',
    populationLabel: 'السكان',
    importsLabel: 'الواردات',
    marketSizeTrend: 'اتجاه حجم السوق',
    importSources: 'مصادر الاستيراد',
    keyLocalPlayers: 'اللاعبون المحليون الرئيسيون',
    topOpportunities: 'أفضل الفرص',
    regulatoryEnv: 'البيئة التنظيمية',
    stepByStepGuides: 'دليل خطوة بخطوة FDA و EMA و SFDA و JFDA',
    partnersDesc: '15+ شركة أدوية عالمية + MENA',
    marketDesc: 'ذكاء السوق العالمي والجزائري',
    aiDesc: 'مستشار الذكاء الاصطناعي لاستراتيجية الأدوية',
    portfolioDesc: 'أدخل أدويتك واعثر على الفرص',
    projectsDesc: 'تتبع المشاريع من A إلى Z',
    dataHubDesc: 'بيانات openFDA المباشرة وجمع البيانات',
    algeriaDesc: 'تحليل عميق للسوق الجزائري',
    revenue: 'الإيرادات',
    details: 'التفاصيل',
    contactsCount: 'جهات اتصال',
    emailsDesc: 'قوالب بريد إلكتروني احترافية لـ BD الصيدلانية',
    dataHubSearchError: 'أدخل اسم شركة أو دواء للبحث',
    dataHubNoResults: 'لم يتم العثور على نتائج. جرب مصطلحًا مختلفًا (مثل Pfizer، Johnson).',
    aiConnectionError: 'خطأ في الاتصال. يرجى المحاولة مرة أخرى.',
  },
} as const

export type LangKey = keyof typeof LANG

export const SC: Record<string, string> = {
  'Top Seller': '#FFD700',
  'Mega Blockbuster': '#FFD700',
  'Rising Star': '#00E676',
  'High Growth': '#00E676',
  'Fast Growing': '#00E676',
  'Strong Growth': '#69F0AE',
  'New Launch': '#448AFF',
  'Pipeline Star': '#E040FB',
  Flagship: '#FFD700',
  Blockbuster: '#FF9100',
  'Patent Cliff': '#FF5252',
  Mature: '#78909C',
  Stable: '#90A4AE',
  Established: '#78909C',
  Growing: '#4FC3F7',
  Emerging: '#4FC3F7',
  'Pfizer $6B Deal': '#FF1744',
}

export { AGENCIES_DATA } from './pharma-global-v3-agencies'
export { PARTNERS_DATA } from './pharma-global-v3-partners'

export const MARKET_CATS = [
  { name: 'Oncology', size: 223, growth: 12, topMarkets: ['US 45%', 'EU 22%', 'CN 12%', 'JP 8%'], hot: ['ADCs', 'Bispecifics', 'CAR-T', 'IO combos'], difficulty: 5, opportunity: 'High unmet need in emerging markets. Biosimilar oncology growing.' },
  { name: 'Immunology', size: 95, growth: 8, topMarkets: ['US 50%', 'EU 25%', 'JP 8%'], hot: ['IL-4/13', 'IL-17', 'JAK inhibitors', 'Oral biologics'], difficulty: 4, opportunity: 'Biosimilars of aging biologics. Novel oral formulations.' },
  { name: 'GLP-1/Obesity', size: 80, growth: 30, topMarkets: ['US 55%', 'EU 20%', 'JP 5%', 'CN 8%'], hot: ['GLP-1 agonists', 'Oral GLP-1', 'Triple agonists'], difficulty: 5, opportunity: 'Massive demand > supply. Manufacturing partnerships. Oral formulations.' },
  { name: 'Vaccines', size: 70, growth: 10, topMarkets: ['US 35%', 'EU 25%', 'CN 15%'], hot: ['mRNA', 'RSV', 'Combo vaccines', 'Pandemic prep'], difficulty: 3, opportunity: 'EXCELLENT for Algeria. WHO PQ opens global procurement. Tech transfer proven.' },
  { name: 'Rare Disease', size: 52, growth: 12, topMarkets: ['US 55%', 'EU 30%', 'JP 8%'], hot: ['Gene therapy', 'ERT', 'ASO/siRNA', 'CRISPR'], difficulty: 4, opportunity: 'High pricing, orphan exclusivity. Growing global focus.' },
  { name: 'Generics & Biosimilars', size: 430, growth: 7, topMarkets: ['US 28%', 'EU 25%', 'IN/CN 20%'], hot: ['Complex generics', 'Biosimilars', '505(b)(2)'], difficulty: 2, opportunity: 'BEST entry for Algeria. Lower R&D. Large global demand. WHO PQ.' },
  { name: 'Anti-infectives', size: 55, growth: 5, topMarkets: ['US 30%', 'EU 20%', 'CN 15%'], hot: ['AMR antibiotics', 'Antifungals', 'Antivirals'], difficulty: 2, opportunity: 'Good for Algeria. AMR is global priority. GARDP partnerships.' },
  { name: 'CNS/Neuroscience', size: 85, growth: 8, topMarkets: ['US 50%', 'EU 25%', 'JP 10%'], hot: ["Alzheimer's", 'Depression', "Parkinson's"], difficulty: 4, opportunity: "Huge unmet need. Many failed trials = opportunity for novel approaches." },
]

export const RARE_DISEASES = [
  { name: 'Spinal Muscular Atrophy', prevalence: '1:10,000', area: 'Neurology', status: 'Active', leads: ['Novartis (Zolgensma)', 'Roche (Evrysdi)', 'Biogen'], approach: 'Gene therapy, SMN enhancement', opportunity: 'Gene therapy manufacturing partnerships' },
  { name: 'Duchenne Muscular Dystrophy', prevalence: '1:5,000 males', area: 'Neurology', status: 'Active', leads: ['Sarepta', 'Solid Bio', 'Pfizer'], approach: 'Gene therapy, exon skipping', opportunity: 'Gene therapy mfg, ASO development' },
  { name: 'Cystic Fibrosis', prevalence: '1:3,500', area: 'Pulmonology', status: 'Breakthrough', leads: ['Vertex (Trikafta)', 'AbbVie'], approach: 'CFTR modulators, gene therapy', opportunity: 'Next-gen CFTR modulators' },
  { name: 'Sickle Cell Disease', prevalence: '1:365 (African descent)', area: 'Hematology', status: 'Gene Therapy Era', leads: ['Vertex/CRISPR (Casgevy)', 'Bluebird Bio'], approach: 'CRISPR gene editing, HbF induction', opportunity: 'HUGE for Africa. Affordable therapies needed.' },
  { name: 'Hemophilia A & B', prevalence: '1:5,000 (A)', area: 'Hematology', status: 'Revolution', leads: ['Roche (Hemlibra)', 'BioMarin', 'Pfizer'], approach: 'Bispecifics, gene therapy', opportunity: 'Gene therapy mfg, subcutaneous factors' },
  { name: 'Gaucher Disease', prevalence: '1:40,000', area: 'Metabolic', status: 'Treated', leads: ['Sanofi (Cerdelga)', 'Takeda'], approach: 'ERT, substrate reduction', opportunity: 'Oral therapies, gene therapy' },
  { name: 'PKU', prevalence: '1:12,000', area: 'Metabolic', status: 'Active', leads: ['BioMarin (Palynziq)'], approach: 'Enzyme substitution, gene therapy', opportunity: 'Gene therapy, dietary products' },
  { name: 'ALS', prevalence: '2:100,000', area: 'Neurology', status: 'Active', leads: ['Biogen/Ionis', 'Amylyx'], approach: 'Antisense, SOD1 targeting', opportunity: 'Novel targets, biomarker development' },
]

export const ALGERIA_DATA = {
  marketSize: '$4.2B',
  growth: '+8.5% CAGR',
  population: '46M+',
  localProduction: '52%',
  imports: '48%',
  topImportSources: [
    { name: 'France', pct: 22, flag: '🇫🇷' },
    { name: 'India', pct: 18, flag: '🇮🇳' },
    { name: 'Germany', pct: 12, flag: '🇩🇪' },
    { name: 'Jordan', pct: 8, flag: '🇯🇴' },
    { name: 'China', pct: 7, flag: '🇨🇳' },
    { name: 'Spain', pct: 6, flag: '🇪🇸' },
    { name: 'Italy', pct: 5, flag: '🇮🇹' },
    { name: 'Other', pct: 22, flag: '🌐' },
  ],
  topCategories: [
    { name: 'Anti-infectives', pct: 18 },
    { name: 'Cardiovascular', pct: 15 },
    { name: 'CNS', pct: 12 },
    { name: 'Diabetes', pct: 11 },
    { name: 'Oncology', pct: 10 },
    { name: 'Respiratory', pct: 8 },
    { name: 'GI', pct: 7 },
    { name: 'Dermatology', pct: 5 },
    { name: 'Other', pct: 14 },
  ],
  yearlyTrend: [
    { yr: '2020', val: 3.1 },
    { yr: '2021', val: 3.4 },
    { yr: '2022', val: 3.6 },
    { yr: '2023', val: 3.8 },
    { yr: '2024', val: 4.0 },
    { yr: '2025', val: 4.2 },
    { yr: '2026P', val: 4.5 },
    { yr: '2027P', val: 4.9 },
  ],
  localVsImport: [
    { yr: '2019', local: 42, imp: 58 },
    { yr: '2020', local: 44, imp: 56 },
    { yr: '2021', local: 46, imp: 54 },
    { yr: '2022', local: 48, imp: 52 },
    { yr: '2023', local: 50, imp: 50 },
    { yr: '2024', local: 52, imp: 48 },
    { yr: '2025P', local: 55, imp: 45 },
  ],
  keyPlayers: ['Saidal Group', 'Biopharm', 'El Kendi', 'Sanofi Algeria', 'Novo Nordisk Algeria', 'Hikma Algeria', 'LPA (Laboratoire Pharmaceutique Algérien)'],
  regulations: 'ANPP (Agence Nationale des Produits Pharmaceutiques) regulates. Govt promotes local production (target 70% by 2030). Import substitution policy. Price controls. Mandatory local registration.',
  opportunities: ['Biosimilar manufacturing (govt incentives)', 'Vaccine production (post-COVID priority)', 'Oncology generics (growing demand)', 'Diabetes treatments (high prevalence)', 'Contract manufacturing for Africa', 'Technology transfer partnerships', 'Generic API production'],
}

export const EMAIL_TEMPLATES = [
  {
    id: 'intro',
    name: 'Initial Introduction',
    subject: 'Partnership Inquiry — [Your Company] Algeria',
    body: `Dear [Partner Name] Team,

I am writing from [Your Company], a pharmaceutical [manufacturer/laboratory] based in Algeria, to explore potential collaboration opportunities.

We specialize in [your therapeutic areas] and currently have [X products] registered with ANPP (Algerian National Pharmaceutical Agency). Our facility is GMP-certified and we are interested in expanding our international footprint.

We are particularly interested in:
- [Area 1: e.g., licensing agreements for your products in MENA/Africa]
- [Area 2: e.g., technology transfer for manufacturing]
- [Area 3: e.g., joint development of biosimilars]

We would welcome the opportunity to discuss this further at your convenience, or to meet at [upcoming conference/event].

Best regards,
[Your Name]
[Your Title]
[Your Company]
[Phone] | [Email]`,
  },
  {
    id: 'followup',
    name: 'Meeting Follow-up',
    subject: 'Follow-up: Meeting on [Date] — [Project Name]',
    body: `Dear [Name],

Thank you for the productive meeting on [Date]. I wanted to summarize the key points discussed and next steps:

Key Discussion Points:
1. [Point 1]
2. [Point 2]
3. [Point 3]

Agreed Next Steps:
- [Action 1] — Responsible: [Name] — Deadline: [Date]
- [Action 2] — Responsible: [Name] — Deadline: [Date]
- [Action 3] — Responsible: [Name] — Deadline: [Date]

Please confirm these action items at your earliest convenience. Our next meeting is scheduled for [Date/Time].

Best regards,
[Your Name]`,
  },
  {
    id: 'nda',
    name: 'NDA / Confidentiality Request',
    subject: 'Confidentiality Agreement — [Project Name]',
    body: `Dear [Name],

As discussed, we would like to proceed with formalizing our discussions through a mutual Non-Disclosure Agreement (NDA).

Please find attached our proposed CDA/NDA template. Key terms:
- Mutual confidentiality obligations
- Duration: [X] years
- Governing law: [Jurisdiction]

We are open to using your standard template if preferred. Please review and advise on any amendments needed.

We look forward to progressing our discussions once the NDA is in place.

Best regards,
[Your Name]`,
  },
  {
    id: 'regulatory',
    name: 'Regulatory Inquiry',
    subject: 'Regulatory Inquiry — [Product Name] Registration in [Country]',
    body: `Dear [Agency/Contact],

We are writing to inquire about the registration requirements for [Product Name] ([generic name]) in [Country].

Product Details:
- Product: [Brand Name] ([Generic/INN])
- Dosage Form: [e.g., Film-coated tablets, 500mg]
- Therapeutic Area: [e.g., Anti-infectives]
- Currently registered in: [List countries]
- GMP Status: [Certified by whom]

We would appreciate guidance on:
1. Required documentation for registration
2. Current processing timelines
3. Fee schedule
4. Any expedited pathways available

Please advise on the best way to proceed with a formal application.

Best regards,
[Your Name]`,
  },
  {
    id: 'proposal',
    name: 'Business Proposal',
    subject: 'Business Proposal — Strategic Partnership for [Region/Product]',
    body: `Dear [Name],

Executive Summary:
[Your Company] proposes a strategic partnership with [Partner] for [describe objective].

Our Capabilities:
- GMP-certified facility in Algeria ([capacity])
- [X] registered products across [Y] therapeutic areas
- Distribution network covering [regions]
- Regulatory expertise in MENA/Africa markets

Proposed Collaboration:
- Model: [Licensing / JV / Distribution / Tech Transfer]
- Products: [List target products]
- Markets: [Target markets]
- Timeline: [Proposed timeline]

Value Proposition:
- Access to Algeria ($4.2B market) and MENA/Africa
- Local manufacturing incentives (Algerian government 2030 plan)
- Competitive manufacturing costs
- Established regulatory relationships

We have prepared a detailed proposal deck and would welcome the opportunity to present it to your BD team.

Best regards,
[Your Name]`,
  },
]
