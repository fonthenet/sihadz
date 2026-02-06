// Complete Algeria Wilayas and Cities Database
// All 58 Wilayas with their major communes/cities

export interface City {
  id: string
  nameAr: string
  nameFr: string
  nameEn: string
}

export interface Wilaya {
  code: string // Official wilaya code (01-58)
  nameAr: string
  nameFr: string
  nameEn: string
  cities: City[]
  coordinates?: { lat: number; lng: number }
}

export const WILAYAS: Wilaya[] = [
  {
    code: '01',
    nameAr: 'أدرار',
    nameFr: 'Adrar',
    nameEn: 'Adrar',
    coordinates: { lat: 27.8742, lng: -0.2939 },
    cities: [
      { id: 'adrar', nameAr: 'أدرار', nameFr: 'Adrar', nameEn: 'Adrar' },
      { id: 'reggane', nameAr: 'رقان', nameFr: 'Reggane', nameEn: 'Reggane' },
      { id: 'timimoun', nameAr: 'تيميمون', nameFr: 'Timimoun', nameEn: 'Timimoun' },
      { id: 'aoulef', nameAr: 'أولف', nameFr: 'Aoulef', nameEn: 'Aoulef' },
      { id: 'zaouiet-kounta', nameAr: 'زاوية كنتة', nameFr: 'Zaouiet Kounta', nameEn: 'Zaouiet Kounta' },
    ]
  },
  {
    code: '02',
    nameAr: 'الشلف',
    nameFr: 'Chlef',
    nameEn: 'Chlef',
    coordinates: { lat: 36.1654, lng: 1.3359 },
    cities: [
      { id: 'chlef', nameAr: 'الشلف', nameFr: 'Chlef', nameEn: 'Chlef' },
      { id: 'tenes', nameAr: 'تنس', nameFr: 'Ténès', nameEn: 'Tenes' },
      { id: 'el-karimia', nameAr: 'الكريمية', nameFr: 'El Karimia', nameEn: 'El Karimia' },
      { id: 'oued-fodda', nameAr: 'وادي الفضة', nameFr: 'Oued Fodda', nameEn: 'Oued Fodda' },
      { id: 'ain-merane', nameAr: 'عين مران', nameFr: 'Aïn Merane', nameEn: 'Ain Merane' },
    ]
  },
  {
    code: '03',
    nameAr: 'الأغواط',
    nameFr: 'Laghouat',
    nameEn: 'Laghouat',
    coordinates: { lat: 33.8000, lng: 2.8650 },
    cities: [
      { id: 'laghouat', nameAr: 'الأغواط', nameFr: 'Laghouat', nameEn: 'Laghouat' },
      { id: 'aflou', nameAr: 'أفلو', nameFr: 'Aflou', nameEn: 'Aflou' },
      { id: 'ksar-el-hirane', nameAr: 'قصر الحيران', nameFr: 'Ksar El Hirane', nameEn: 'Ksar El Hirane' },
      { id: 'hassi-rmel', nameAr: 'حاسي الرمل', nameFr: 'Hassi R\'Mel', nameEn: 'Hassi R\'Mel' },
    ]
  },
  {
    code: '04',
    nameAr: 'أم البواقي',
    nameFr: 'Oum El Bouaghi',
    nameEn: 'Oum El Bouaghi',
    coordinates: { lat: 35.8758, lng: 7.1133 },
    cities: [
      { id: 'oum-el-bouaghi', nameAr: 'أم البواقي', nameFr: 'Oum El Bouaghi', nameEn: 'Oum El Bouaghi' },
      { id: 'ain-beida', nameAr: 'عين البيضاء', nameFr: 'Aïn Beïda', nameEn: 'Ain Beida' },
      { id: 'ain-mlila', nameAr: 'عين مليلة', nameFr: 'Aïn M\'lila', nameEn: 'Ain M\'lila' },
      { id: 'meskiana', nameAr: 'مسكيانة', nameFr: 'Meskiana', nameEn: 'Meskiana' },
    ]
  },
  {
    code: '05',
    nameAr: 'باتنة',
    nameFr: 'Batna',
    nameEn: 'Batna',
    coordinates: { lat: 35.5560, lng: 6.1742 },
    cities: [
      { id: 'batna', nameAr: 'باتنة', nameFr: 'Batna', nameEn: 'Batna' },
      { id: 'barika', nameAr: 'بريكة', nameFr: 'Barika', nameEn: 'Barika' },
      { id: 'ain-touta', nameAr: 'عين التوتة', nameFr: 'Aïn Touta', nameEn: 'Ain Touta' },
      { id: 'arris', nameAr: 'أريس', nameFr: 'Arris', nameEn: 'Arris' },
      { id: 'merouana', nameAr: 'مروانة', nameFr: 'Merouana', nameEn: 'Merouana' },
      { id: 'ngaous', nameAr: 'نقاوس', nameFr: 'N\'Gaous', nameEn: 'N\'Gaous' },
    ]
  },
  {
    code: '06',
    nameAr: 'بجاية',
    nameFr: 'Béjaïa',
    nameEn: 'Bejaia',
    coordinates: { lat: 36.7558, lng: 5.0842 },
    cities: [
      { id: 'bejaia', nameAr: 'بجاية', nameFr: 'Béjaïa', nameEn: 'Bejaia' },
      { id: 'akbou', nameAr: 'أقبو', nameFr: 'Akbou', nameEn: 'Akbou' },
      { id: 'el-kseur', nameAr: 'القصر', nameFr: 'El Kseur', nameEn: 'El Kseur' },
      { id: 'seddouk', nameAr: 'صدوق', nameFr: 'Seddouk', nameEn: 'Seddouk' },
      { id: 'amizour', nameAr: 'أميزور', nameFr: 'Amizour', nameEn: 'Amizour' },
      { id: 'kherrata', nameAr: 'خراطة', nameFr: 'Kherrata', nameEn: 'Kherrata' },
    ]
  },
  {
    code: '07',
    nameAr: 'بسكرة',
    nameFr: 'Biskra',
    nameEn: 'Biskra',
    coordinates: { lat: 34.8449, lng: 5.7248 },
    cities: [
      { id: 'biskra', nameAr: 'بسكرة', nameFr: 'Biskra', nameEn: 'Biskra' },
      { id: 'tolga', nameAr: 'طولقة', nameFr: 'Tolga', nameEn: 'Tolga' },
      { id: 'ouled-djellal', nameAr: 'أولاد جلال', nameFr: 'Ouled Djellal', nameEn: 'Ouled Djellal' },
      { id: 'sidi-okba', nameAr: 'سيدي عقبة', nameFr: 'Sidi Okba', nameEn: 'Sidi Okba' },
      { id: 'el-kantara', nameAr: 'القنطرة', nameFr: 'El Kantara', nameEn: 'El Kantara' },
    ]
  },
  {
    code: '08',
    nameAr: 'بشار',
    nameFr: 'Béchar',
    nameEn: 'Bechar',
    coordinates: { lat: 31.6231, lng: -2.2179 },
    cities: [
      { id: 'bechar', nameAr: 'بشار', nameFr: 'Béchar', nameEn: 'Bechar' },
      { id: 'kenadsa', nameAr: 'القنادسة', nameFr: 'Kenadsa', nameEn: 'Kenadsa' },
      { id: 'abadla', nameAr: 'العبادلة', nameFr: 'Abadla', nameEn: 'Abadla' },
      { id: 'taghit', nameAr: 'تاغيت', nameFr: 'Taghit', nameEn: 'Taghit' },
    ]
  },
  {
    code: '09',
    nameAr: 'البليدة',
    nameFr: 'Blida',
    nameEn: 'Blida',
    coordinates: { lat: 36.4700, lng: 2.8300 },
    cities: [
      { id: 'blida', nameAr: 'البليدة', nameFr: 'Blida', nameEn: 'Blida' },
      { id: 'boufarik', nameAr: 'بوفاريك', nameFr: 'Boufarik', nameEn: 'Boufarik' },
      { id: 'el-affroun', nameAr: 'العفرون', nameFr: 'El Affroun', nameEn: 'El Affroun' },
      { id: 'mouzaia', nameAr: 'موزاية', nameFr: 'Mouzaïa', nameEn: 'Mouzaia' },
      { id: 'oued-el-alleug', nameAr: 'وادي العلايق', nameFr: 'Oued El Alleug', nameEn: 'Oued El Alleug' },
      { id: 'bougara', nameAr: 'بوقرة', nameFr: 'Bougara', nameEn: 'Bougara' },
    ]
  },
  {
    code: '10',
    nameAr: 'البويرة',
    nameFr: 'Bouira',
    nameEn: 'Bouira',
    coordinates: { lat: 36.3738, lng: 3.9008 },
    cities: [
      { id: 'bouira', nameAr: 'البويرة', nameFr: 'Bouira', nameEn: 'Bouira' },
      { id: 'lakhdaria', nameAr: 'الأخضرية', nameFr: 'Lakhdaria', nameEn: 'Lakhdaria' },
      { id: 'sour-el-ghozlane', nameAr: 'سور الغزلان', nameFr: 'Sour El Ghozlane', nameEn: 'Sour El Ghozlane' },
      { id: 'mchedallah', nameAr: 'مشدالله', nameFr: 'M\'Chedallah', nameEn: 'M\'Chedallah' },
      { id: 'ain-bessem', nameAr: 'عين بسام', nameFr: 'Aïn Bessem', nameEn: 'Ain Bessem' },
    ]
  },
  {
    code: '11',
    nameAr: 'تمنراست',
    nameFr: 'Tamanrasset',
    nameEn: 'Tamanrasset',
    coordinates: { lat: 22.7903, lng: 5.5293 },
    cities: [
      { id: 'tamanrasset', nameAr: 'تمنراست', nameFr: 'Tamanrasset', nameEn: 'Tamanrasset' },
      { id: 'in-salah', nameAr: 'عين صالح', nameFr: 'In Salah', nameEn: 'In Salah' },
      { id: 'in-guezzam', nameAr: 'عين قزام', nameFr: 'In Guezzam', nameEn: 'In Guezzam' },
    ]
  },
  {
    code: '12',
    nameAr: 'تبسة',
    nameFr: 'Tébessa',
    nameEn: 'Tebessa',
    coordinates: { lat: 35.4072, lng: 8.1244 },
    cities: [
      { id: 'tebessa', nameAr: 'تبسة', nameFr: 'Tébessa', nameEn: 'Tebessa' },
      { id: 'bir-el-ater', nameAr: 'بئر العاتر', nameFr: 'Bir El Ater', nameEn: 'Bir El Ater' },
      { id: 'cheria', nameAr: 'الشريعة', nameFr: 'Chéria', nameEn: 'Cheria' },
      { id: 'el-aouinet', nameAr: 'العوينات', nameFr: 'El Aouinet', nameEn: 'El Aouinet' },
    ]
  },
  {
    code: '13',
    nameAr: 'تلمسان',
    nameFr: 'Tlemcen',
    nameEn: 'Tlemcen',
    coordinates: { lat: 34.8828, lng: -1.3167 },
    cities: [
      { id: 'tlemcen', nameAr: 'تلمسان', nameFr: 'Tlemcen', nameEn: 'Tlemcen' },
      { id: 'maghnia', nameAr: 'مغنية', nameFr: 'Maghnia', nameEn: 'Maghnia' },
      { id: 'ghazaouet', nameAr: 'الغزوات', nameFr: 'Ghazaouet', nameEn: 'Ghazaouet' },
      { id: 'remchi', nameAr: 'الرمشي', nameFr: 'Remchi', nameEn: 'Remchi' },
      { id: 'sebdou', nameAr: 'سبدو', nameFr: 'Sebdou', nameEn: 'Sebdou' },
      { id: 'nedroma', nameAr: 'ندرومة', nameFr: 'Nedroma', nameEn: 'Nedroma' },
    ]
  },
  {
    code: '14',
    nameAr: 'تيارت',
    nameFr: 'Tiaret',
    nameEn: 'Tiaret',
    coordinates: { lat: 35.3711, lng: 1.3178 },
    cities: [
      { id: 'tiaret', nameAr: 'تيارت', nameFr: 'Tiaret', nameEn: 'Tiaret' },
      { id: 'frenda', nameAr: 'فرندة', nameFr: 'Frenda', nameEn: 'Frenda' },
      { id: 'sougueur', nameAr: 'السوقر', nameFr: 'Sougueur', nameEn: 'Sougueur' },
      { id: 'ksar-chellala', nameAr: 'قصر الشلالة', nameFr: 'Ksar Chellala', nameEn: 'Ksar Chellala' },
      { id: 'mahdia', nameAr: 'مهدية', nameFr: 'Mahdia', nameEn: 'Mahdia' },
    ]
  },
  {
    code: '15',
    nameAr: 'تيزي وزو',
    nameFr: 'Tizi Ouzou',
    nameEn: 'Tizi Ouzou',
    coordinates: { lat: 36.7169, lng: 4.0497 },
    cities: [
      { id: 'tizi-ouzou', nameAr: 'تيزي وزو', nameFr: 'Tizi Ouzou', nameEn: 'Tizi Ouzou' },
      { id: 'azazga', nameAr: 'عزازقة', nameFr: 'Azazga', nameEn: 'Azazga' },
      { id: 'draa-el-mizan', nameAr: 'ذراع الميزان', nameFr: 'Draa El Mizan', nameEn: 'Draa El Mizan' },
      { id: 'larbaa-nath-irathen', nameAr: 'لاربعا ناث إيراثن', nameFr: 'Larbaa Nath Irathen', nameEn: 'Larbaa Nath Irathen' },
      { id: 'ain-el-hammam', nameAr: 'عين الحمام', nameFr: 'Aïn El Hammam', nameEn: 'Ain El Hammam' },
      { id: 'boghni', nameAr: 'بوغني', nameFr: 'Boghni', nameEn: 'Boghni' },
    ]
  },
  {
    code: '16',
    nameAr: 'الجزائر',
    nameFr: 'Alger',
    nameEn: 'Algiers',
    coordinates: { lat: 36.7538, lng: 3.0588 },
    cities: [
      { id: 'alger-centre', nameAr: 'الجزائر الوسطى', nameFr: 'Alger Centre', nameEn: 'Algiers Center' },
      { id: 'bab-el-oued', nameAr: 'باب الوادي', nameFr: 'Bab El Oued', nameEn: 'Bab El Oued' },
      { id: 'bir-mourad-rais', nameAr: 'بئر مراد رايس', nameFr: 'Bir Mourad Raïs', nameEn: 'Bir Mourad Rais' },
      { id: 'el-harrach', nameAr: 'الحراش', nameFr: 'El Harrach', nameEn: 'El Harrach' },
      { id: 'hussein-dey', nameAr: 'حسين داي', nameFr: 'Hussein Dey', nameEn: 'Hussein Dey' },
      { id: 'kouba', nameAr: 'القبة', nameFr: 'Kouba', nameEn: 'Kouba' },
      { id: 'hydra', nameAr: 'حيدرة', nameFr: 'Hydra', nameEn: 'Hydra' },
      { id: 'el-biar', nameAr: 'الأبيار', nameFr: 'El Biar', nameEn: 'El Biar' },
      { id: 'bab-ezzouar', nameAr: 'باب الزوار', nameFr: 'Bab Ezzouar', nameEn: 'Bab Ezzouar' },
      { id: 'draria', nameAr: 'الدرارية', nameFr: 'Draria', nameEn: 'Draria' },
      { id: 'ben-aknoun', nameAr: 'بن عكنون', nameFr: 'Ben Aknoun', nameEn: 'Ben Aknoun' },
      { id: 'dely-ibrahim', nameAr: 'دالي إبراهيم', nameFr: 'Dely Ibrahim', nameEn: 'Dely Ibrahim' },
      { id: 'cheraga', nameAr: 'الشراقة', nameFr: 'Chéraga', nameEn: 'Cheraga' },
      { id: 'ain-benian', nameAr: 'عين البنيان', nameFr: 'Aïn Benian', nameEn: 'Ain Benian' },
      { id: 'staoueli', nameAr: 'سطاوالي', nameFr: 'Staouéli', nameEn: 'Staoueli' },
      { id: 'zeralda', nameAr: 'زرالدة', nameFr: 'Zéralda', nameEn: 'Zeralda' },
      { id: 'bordj-el-kiffan', nameAr: 'برج الكيفان', nameFr: 'Bordj El Kiffan', nameEn: 'Bordj El Kiffan' },
      { id: 'rouiba', nameAr: 'الرويبة', nameFr: 'Rouiba', nameEn: 'Rouiba' },
      { id: 'reghaia', nameAr: 'الرغاية', nameFr: 'Reghaïa', nameEn: 'Reghaia' },
    ]
  },
  {
    code: '17',
    nameAr: 'الجلفة',
    nameFr: 'Djelfa',
    nameEn: 'Djelfa',
    coordinates: { lat: 34.6700, lng: 3.2500 },
    cities: [
      { id: 'djelfa', nameAr: 'الجلفة', nameFr: 'Djelfa', nameEn: 'Djelfa' },
      { id: 'messaad', nameAr: 'مسعد', nameFr: 'Messaad', nameEn: 'Messaad' },
      { id: 'ain-oussera', nameAr: 'عين وسارة', nameFr: 'Aïn Oussera', nameEn: 'Ain Oussera' },
      { id: 'hassi-bahbah', nameAr: 'حاسي بحبح', nameFr: 'Hassi Bahbah', nameEn: 'Hassi Bahbah' },
      { id: 'dar-chioukh', nameAr: 'دار الشيوخ', nameFr: 'Dar Chioukh', nameEn: 'Dar Chioukh' },
    ]
  },
  {
    code: '18',
    nameAr: 'جيجل',
    nameFr: 'Jijel',
    nameEn: 'Jijel',
    coordinates: { lat: 36.8214, lng: 5.7667 },
    cities: [
      { id: 'jijel', nameAr: 'جيجل', nameFr: 'Jijel', nameEn: 'Jijel' },
      { id: 'el-milia', nameAr: 'الميلية', nameFr: 'El Milia', nameEn: 'El Milia' },
      { id: 'taher', nameAr: 'الطاهير', nameFr: 'Taher', nameEn: 'Taher' },
      { id: 'el-ancer', nameAr: 'العنصر', nameFr: 'El Ancer', nameEn: 'El Ancer' },
    ]
  },
  {
    code: '19',
    nameAr: 'سطيف',
    nameFr: 'Sétif',
    nameEn: 'Setif',
    coordinates: { lat: 36.1898, lng: 5.4108 },
    cities: [
      { id: 'setif', nameAr: 'سطيف', nameFr: 'Sétif', nameEn: 'Setif' },
      { id: 'el-eulma', nameAr: 'العلمة', nameFr: 'El Eulma', nameEn: 'El Eulma' },
      { id: 'ain-oulmene', nameAr: 'عين ولمان', nameFr: 'Aïn Oulmène', nameEn: 'Ain Oulmene' },
      { id: 'bougaa', nameAr: 'بوقاعة', nameFr: 'Bougaâ', nameEn: 'Bougaa' },
      { id: 'ain-arnat', nameAr: 'عين أرنات', nameFr: 'Aïn Arnat', nameEn: 'Ain Arnat' },
      { id: 'ain-azel', nameAr: 'عين آزال', nameFr: 'Aïn Azel', nameEn: 'Ain Azel' },
    ]
  },
  {
    code: '20',
    nameAr: 'سعيدة',
    nameFr: 'Saïda',
    nameEn: 'Saida',
    coordinates: { lat: 34.8400, lng: 0.1500 },
    cities: [
      { id: 'saida', nameAr: 'سعيدة', nameFr: 'Saïda', nameEn: 'Saida' },
      { id: 'ain-el-hadjar', nameAr: 'عين الحجر', nameFr: 'Aïn El Hadjar', nameEn: 'Ain El Hadjar' },
      { id: 'el-hassasna', nameAr: 'الحساسنة', nameFr: 'El Hassasna', nameEn: 'El Hassasna' },
    ]
  },
  {
    code: '21',
    nameAr: 'سكيكدة',
    nameFr: 'Skikda',
    nameEn: 'Skikda',
    coordinates: { lat: 36.8667, lng: 6.9000 },
    cities: [
      { id: 'skikda', nameAr: 'سكيكدة', nameFr: 'Skikda', nameEn: 'Skikda' },
      { id: 'azzaba', nameAr: 'عزابة', nameFr: 'Azzaba', nameEn: 'Azzaba' },
      { id: 'collo', nameAr: 'القل', nameFr: 'Collo', nameEn: 'Collo' },
      { id: 'el-harrouch', nameAr: 'الحروش', nameFr: 'El Harrouch', nameEn: 'El Harrouch' },
      { id: 'tamalous', nameAr: 'تمالوس', nameFr: 'Tamalous', nameEn: 'Tamalous' },
    ]
  },
  {
    code: '22',
    nameAr: 'سيدي بلعباس',
    nameFr: 'Sidi Bel Abbès',
    nameEn: 'Sidi Bel Abbes',
    coordinates: { lat: 35.1897, lng: -0.6308 },
    cities: [
      { id: 'sidi-bel-abbes', nameAr: 'سيدي بلعباس', nameFr: 'Sidi Bel Abbès', nameEn: 'Sidi Bel Abbes' },
      { id: 'telagh', nameAr: 'تلاغ', nameFr: 'Télagh', nameEn: 'Telagh' },
      { id: 'sfissef', nameAr: 'سفيزف', nameFr: 'Sfissef', nameEn: 'Sfissef' },
      { id: 'ain-el-berd', nameAr: 'عين البرد', nameFr: 'Aïn El Berd', nameEn: 'Ain El Berd' },
    ]
  },
  {
    code: '23',
    nameAr: 'عنابة',
    nameFr: 'Annaba',
    nameEn: 'Annaba',
    coordinates: { lat: 36.8972, lng: 7.7622 },
    cities: [
      { id: 'annaba', nameAr: 'عنابة', nameFr: 'Annaba', nameEn: 'Annaba' },
      { id: 'el-bouni', nameAr: 'البوني', nameFr: 'El Bouni', nameEn: 'El Bouni' },
      { id: 'el-hadjar', nameAr: 'الحجار', nameFr: 'El Hadjar', nameEn: 'El Hadjar' },
      { id: 'berrahal', nameAr: 'برحال', nameFr: 'Berrahal', nameEn: 'Berrahal' },
    ]
  },
  {
    code: '24',
    nameAr: 'قالمة',
    nameFr: 'Guelma',
    nameEn: 'Guelma',
    coordinates: { lat: 36.4622, lng: 7.4264 },
    cities: [
      { id: 'guelma', nameAr: 'قالمة', nameFr: 'Guelma', nameEn: 'Guelma' },
      { id: 'bouchegouf', nameAr: 'بوشقوف', nameFr: 'Bouchegouf', nameEn: 'Bouchegouf' },
      { id: 'oued-zenati', nameAr: 'وادي الزناتي', nameFr: 'Oued Zenati', nameEn: 'Oued Zenati' },
      { id: 'hammam-debagh', nameAr: 'حمام دباغ', nameFr: 'Hammam Debagh', nameEn: 'Hammam Debagh' },
    ]
  },
  {
    code: '25',
    nameAr: 'قسنطينة',
    nameFr: 'Constantine',
    nameEn: 'Constantine',
    coordinates: { lat: 36.3650, lng: 6.6147 },
    cities: [
      { id: 'constantine', nameAr: 'قسنطينة', nameFr: 'Constantine', nameEn: 'Constantine' },
      { id: 'el-khroub', nameAr: 'الخروب', nameFr: 'El Khroub', nameEn: 'El Khroub' },
      { id: 'hamma-bouziane', nameAr: 'حامة بوزيان', nameFr: 'Hamma Bouziane', nameEn: 'Hamma Bouziane' },
      { id: 'didouche-mourad', nameAr: 'ديدوش مراد', nameFr: 'Didouche Mourad', nameEn: 'Didouche Mourad' },
      { id: 'zighoud-youcef', nameAr: 'زيغود يوسف', nameFr: 'Zighoud Youcef', nameEn: 'Zighoud Youcef' },
    ]
  },
  {
    code: '26',
    nameAr: 'المدية',
    nameFr: 'Médéa',
    nameEn: 'Medea',
    coordinates: { lat: 36.2675, lng: 2.7539 },
    cities: [
      { id: 'medea', nameAr: 'المدية', nameFr: 'Médéa', nameEn: 'Medea' },
      { id: 'berrouaghia', nameAr: 'البرواقية', nameFr: 'Berrouaghia', nameEn: 'Berrouaghia' },
      { id: 'ksar-el-boukhari', nameAr: 'قصر البخاري', nameFr: 'Ksar El Boukhari', nameEn: 'Ksar El Boukhari' },
      { id: 'tablat', nameAr: 'تابلاط', nameFr: 'Tablat', nameEn: 'Tablat' },
      { id: 'ain-boucif', nameAr: 'عين بوسيف', nameFr: 'Aïn Boucif', nameEn: 'Ain Boucif' },
    ]
  },
  {
    code: '27',
    nameAr: 'مستغانم',
    nameFr: 'Mostaganem',
    nameEn: 'Mostaganem',
    coordinates: { lat: 35.9311, lng: 0.0892 },
    cities: [
      { id: 'mostaganem', nameAr: 'مستغانم', nameFr: 'Mostaganem', nameEn: 'Mostaganem' },
      { id: 'ain-tedeles', nameAr: 'عين تادلس', nameFr: 'Aïn Tédelès', nameEn: 'Ain Tedeles' },
      { id: 'sidi-ali', nameAr: 'سيدي علي', nameFr: 'Sidi Ali', nameEn: 'Sidi Ali' },
      { id: 'hassi-mameche', nameAr: 'حاسي ماماش', nameFr: 'Hassi Mameche', nameEn: 'Hassi Mameche' },
    ]
  },
  {
    code: '28',
    nameAr: 'المسيلة',
    nameFr: "M'Sila",
    nameEn: "M'Sila",
    coordinates: { lat: 35.7056, lng: 4.5419 },
    cities: [
      { id: 'msila', nameAr: 'المسيلة', nameFr: "M'Sila", nameEn: "M'Sila" },
      { id: 'bou-saada', nameAr: 'بوسعادة', nameFr: 'Bou Saâda', nameEn: 'Bou Saada' },
      { id: 'sidi-aissa', nameAr: 'سيدي عيسى', nameFr: 'Sidi Aïssa', nameEn: 'Sidi Aissa' },
      { id: 'ain-el-melh', nameAr: 'عين الملح', nameFr: 'Aïn El Melh', nameEn: 'Ain El Melh' },
      { id: 'magra', nameAr: 'مقرة', nameFr: 'Magra', nameEn: 'Magra' },
    ]
  },
  {
    code: '29',
    nameAr: 'معسكر',
    nameFr: 'Mascara',
    nameEn: 'Mascara',
    coordinates: { lat: 35.3983, lng: 0.1403 },
    cities: [
      { id: 'mascara', nameAr: 'معسكر', nameFr: 'Mascara', nameEn: 'Mascara' },
      { id: 'sig', nameAr: 'سيق', nameFr: 'Sig', nameEn: 'Sig' },
      { id: 'mohammadia', nameAr: 'المحمدية', nameFr: 'Mohammadia', nameEn: 'Mohammadia' },
      { id: 'tighennif', nameAr: 'تيغنيف', nameFr: 'Tighennif', nameEn: 'Tighennif' },
      { id: 'ghriss', nameAr: 'غريس', nameFr: 'Ghriss', nameEn: 'Ghriss' },
    ]
  },
  {
    code: '30',
    nameAr: 'ورقلة',
    nameFr: 'Ouargla',
    nameEn: 'Ouargla',
    coordinates: { lat: 31.9500, lng: 5.3167 },
    cities: [
      { id: 'ouargla', nameAr: 'ورقلة', nameFr: 'Ouargla', nameEn: 'Ouargla' },
      { id: 'hassi-messaoud', nameAr: 'حاسي مسعود', nameFr: 'Hassi Messaoud', nameEn: 'Hassi Messaoud' },
      { id: 'touggourt', nameAr: 'تقرت', nameFr: 'Touggourt', nameEn: 'Touggourt' },
      { id: 'taibet', nameAr: 'الطيبات', nameFr: 'Taïbet', nameEn: 'Taibet' },
    ]
  },
  {
    code: '31',
    nameAr: 'وهران',
    nameFr: 'Oran',
    nameEn: 'Oran',
    coordinates: { lat: 35.6969, lng: -0.6331 },
    cities: [
      { id: 'oran', nameAr: 'وهران', nameFr: 'Oran', nameEn: 'Oran' },
      { id: 'bir-el-djir', nameAr: 'بئر الجير', nameFr: 'Bir El Djir', nameEn: 'Bir El Djir' },
      { id: 'es-senia', nameAr: 'السانية', nameFr: 'Es Sénia', nameEn: 'Es Senia' },
      { id: 'ain-el-turk', nameAr: 'عين الترك', nameFr: 'Aïn El Türk', nameEn: 'Ain El Turk' },
      { id: 'arzew', nameAr: 'أرزيو', nameFr: 'Arzew', nameEn: 'Arzew' },
      { id: 'bethioua', nameAr: 'بطيوة', nameFr: 'Bethioua', nameEn: 'Bethioua' },
      { id: 'gdyel', nameAr: 'قديل', nameFr: 'Gdyel', nameEn: 'Gdyel' },
      { id: 'oued-tlelat', nameAr: 'وادي تليلات', nameFr: 'Oued Tlelat', nameEn: 'Oued Tlelat' },
    ]
  },
  {
    code: '32',
    nameAr: 'البيض',
    nameFr: 'El Bayadh',
    nameEn: 'El Bayadh',
    coordinates: { lat: 33.6833, lng: 1.0167 },
    cities: [
      { id: 'el-bayadh', nameAr: 'البيض', nameFr: 'El Bayadh', nameEn: 'El Bayadh' },
      { id: 'boualem', nameAr: 'بوعلام', nameFr: 'Boualem', nameEn: 'Boualem' },
      { id: 'el-abiodh-sidi-cheikh', nameAr: 'الأبيض سيدي الشيخ', nameFr: 'El Abiodh Sidi Cheikh', nameEn: 'El Abiodh Sidi Cheikh' },
    ]
  },
  {
    code: '33',
    nameAr: 'إليزي',
    nameFr: 'Illizi',
    nameEn: 'Illizi',
    coordinates: { lat: 26.5000, lng: 8.4833 },
    cities: [
      { id: 'illizi', nameAr: 'إليزي', nameFr: 'Illizi', nameEn: 'Illizi' },
      { id: 'djanet', nameAr: 'جانت', nameFr: 'Djanet', nameEn: 'Djanet' },
      { id: 'in-amenas', nameAr: 'عين أمناس', nameFr: 'In Amenas', nameEn: 'In Amenas' },
    ]
  },
  {
    code: '34',
    nameAr: 'برج بوعريريج',
    nameFr: 'Bordj Bou Arréridj',
    nameEn: 'Bordj Bou Arreridj',
    coordinates: { lat: 36.0686, lng: 4.7617 },
    cities: [
      { id: 'bordj-bou-arreridj', nameAr: 'برج بوعريريج', nameFr: 'Bordj Bou Arréridj', nameEn: 'Bordj Bou Arreridj' },
      { id: 'ras-el-oued', nameAr: 'رأس الوادي', nameFr: 'Ras El Oued', nameEn: 'Ras El Oued' },
      { id: 'medjana', nameAr: 'مجانة', nameFr: 'Medjana', nameEn: 'Medjana' },
      { id: 'el-achir', nameAr: 'الأشير', nameFr: 'El Achir', nameEn: 'El Achir' },
    ]
  },
  {
    code: '35',
    nameAr: 'بومرداس',
    nameFr: 'Boumerdès',
    nameEn: 'Boumerdes',
    coordinates: { lat: 36.7631, lng: 3.4786 },
    cities: [
      { id: 'boumerdes', nameAr: 'بومرداس', nameFr: 'Boumerdès', nameEn: 'Boumerdes' },
      { id: 'bordj-menaiel', nameAr: 'برج منايل', nameFr: 'Bordj Menaïel', nameEn: 'Bordj Menaiel' },
      { id: 'dellys', nameAr: 'دلس', nameFr: 'Dellys', nameEn: 'Dellys' },
      { id: 'khemis-el-khechna', nameAr: 'خميس الخشنة', nameFr: 'Khemis El Khechna', nameEn: 'Khemis El Khechna' },
      { id: 'thenia', nameAr: 'الثنية', nameFr: 'Thénia', nameEn: 'Thenia' },
      { id: 'boudouaou', nameAr: 'بودواو', nameFr: 'Boudouaou', nameEn: 'Boudouaou' },
    ]
  },
  {
    code: '36',
    nameAr: 'الطارف',
    nameFr: 'El Tarf',
    nameEn: 'El Tarf',
    coordinates: { lat: 36.7669, lng: 8.3136 },
    cities: [
      { id: 'el-tarf', nameAr: 'الطارف', nameFr: 'El Tarf', nameEn: 'El Tarf' },
      { id: 'el-kala', nameAr: 'القالة', nameFr: 'El Kala', nameEn: 'El Kala' },
      { id: 'bouhadjar', nameAr: 'بوحجار', nameFr: 'Bouhadjar', nameEn: 'Bouhadjar' },
      { id: 'dréan', nameAr: 'الذرعان', nameFr: 'Dréan', nameEn: 'Drean' },
    ]
  },
  {
    code: '37',
    nameAr: 'تندوف',
    nameFr: 'Tindouf',
    nameEn: 'Tindouf',
    coordinates: { lat: 27.6742, lng: -8.1478 },
    cities: [
      { id: 'tindouf', nameAr: 'تندوف', nameFr: 'Tindouf', nameEn: 'Tindouf' },
    ]
  },
  {
    code: '38',
    nameAr: 'تيسمسيلت',
    nameFr: 'Tissemsilt',
    nameEn: 'Tissemsilt',
    coordinates: { lat: 35.6056, lng: 1.8131 },
    cities: [
      { id: 'tissemsilt', nameAr: 'تيسمسيلت', nameFr: 'Tissemsilt', nameEn: 'Tissemsilt' },
      { id: 'theniet-el-had', nameAr: 'ثنية الحد', nameFr: 'Theniet El Had', nameEn: 'Theniet El Had' },
      { id: 'bordj-bounama', nameAr: 'برج بونعامة', nameFr: 'Bordj Bounama', nameEn: 'Bordj Bounama' },
      { id: 'lardjem', nameAr: 'لرجام', nameFr: 'Lardjem', nameEn: 'Lardjem' },
    ]
  },
  {
    code: '39',
    nameAr: 'الوادي',
    nameFr: 'El Oued',
    nameEn: 'El Oued',
    coordinates: { lat: 33.3683, lng: 6.8675 },
    cities: [
      { id: 'el-oued', nameAr: 'الوادي', nameFr: 'El Oued', nameEn: 'El Oued' },
      { id: 'djamaa', nameAr: 'جامعة', nameFr: 'Djamaa', nameEn: 'Djamaa' },
      { id: 'robbah', nameAr: 'الرباح', nameFr: 'Robbah', nameEn: 'Robbah' },
      { id: 'guemar', nameAr: 'قمار', nameFr: 'Guemar', nameEn: 'Guemar' },
      { id: 'debila', nameAr: 'الدبيلة', nameFr: 'Debila', nameEn: 'Debila' },
    ]
  },
  {
    code: '40',
    nameAr: 'خنشلة',
    nameFr: 'Khenchela',
    nameEn: 'Khenchela',
    coordinates: { lat: 35.4353, lng: 7.1433 },
    cities: [
      { id: 'khenchela', nameAr: 'خنشلة', nameFr: 'Khenchela', nameEn: 'Khenchela' },
      { id: 'kais', nameAr: 'قايس', nameFr: 'Kaïs', nameEn: 'Kais' },
      { id: 'chechar', nameAr: 'ششار', nameFr: 'Chechar', nameEn: 'Chechar' },
      { id: 'el-hamma', nameAr: 'الحامة', nameFr: 'El Hamma', nameEn: 'El Hamma' },
    ]
  },
  {
    code: '41',
    nameAr: 'سوق أهراس',
    nameFr: 'Souk Ahras',
    nameEn: 'Souk Ahras',
    coordinates: { lat: 36.2864, lng: 7.9514 },
    cities: [
      { id: 'souk-ahras', nameAr: 'سوق أهراس', nameFr: 'Souk Ahras', nameEn: 'Souk Ahras' },
      { id: 'sedrata', nameAr: 'سدراتة', nameFr: 'Sedrata', nameEn: 'Sedrata' },
      { id: 'mdaourouch', nameAr: 'مداوروش', nameFr: "M'Daourouch", nameEn: 'Mdaourouch' },
      { id: 'taoura', nameAr: 'تاورة', nameFr: 'Taoura', nameEn: 'Taoura' },
    ]
  },
  {
    code: '42',
    nameAr: 'تيبازة',
    nameFr: 'Tipaza',
    nameEn: 'Tipaza',
    coordinates: { lat: 36.5897, lng: 2.4478 },
    cities: [
      { id: 'tipaza', nameAr: 'تيبازة', nameFr: 'Tipaza', nameEn: 'Tipaza' },
      { id: 'kolea', nameAr: 'القليعة', nameFr: 'Koléa', nameEn: 'Kolea' },
      { id: 'cherchell', nameAr: 'شرشال', nameFr: 'Cherchell', nameEn: 'Cherchell' },
      { id: 'hadjout', nameAr: 'حجوط', nameFr: 'Hadjout', nameEn: 'Hadjout' },
      { id: 'bou-ismail', nameAr: 'بوإسماعيل', nameFr: 'Bou Ismaïl', nameEn: 'Bou Ismail' },
      { id: 'fouka', nameAr: 'فوكة', nameFr: 'Fouka', nameEn: 'Fouka' },
    ]
  },
  {
    code: '43',
    nameAr: 'ميلة',
    nameFr: 'Mila',
    nameEn: 'Mila',
    coordinates: { lat: 36.4503, lng: 6.2644 },
    cities: [
      { id: 'mila', nameAr: 'ميلة', nameFr: 'Mila', nameEn: 'Mila' },
      { id: 'chelghoum-laid', nameAr: 'شلغوم العيد', nameFr: 'Chelghoum Laïd', nameEn: 'Chelghoum Laid' },
      { id: 'ferdjioua', nameAr: 'فرجيوة', nameFr: 'Ferdjioua', nameEn: 'Ferdjioua' },
      { id: 'grarem-gouga', nameAr: 'القرارم قوقة', nameFr: 'Grarem Gouga', nameEn: 'Grarem Gouga' },
    ]
  },
  {
    code: '44',
    nameAr: 'عين الدفلى',
    nameFr: 'Aïn Defla',
    nameEn: 'Ain Defla',
    coordinates: { lat: 36.2539, lng: 1.9689 },
    cities: [
      { id: 'ain-defla', nameAr: 'عين الدفلى', nameFr: 'Aïn Defla', nameEn: 'Ain Defla' },
      { id: 'el-attaf', nameAr: 'العطاف', nameFr: 'El Attaf', nameEn: 'El Attaf' },
      { id: 'miliana', nameAr: 'مليانة', nameFr: 'Miliana', nameEn: 'Miliana' },
      { id: 'khemis-miliana', nameAr: 'خميس مليانة', nameFr: 'Khemis Miliana', nameEn: 'Khemis Miliana' },
      { id: 'djelida', nameAr: 'جليدة', nameFr: 'Djelida', nameEn: 'Djelida' },
    ]
  },
  {
    code: '45',
    nameAr: 'النعامة',
    nameFr: 'Naâma',
    nameEn: 'Naama',
    coordinates: { lat: 33.2667, lng: -0.3167 },
    cities: [
      { id: 'naama', nameAr: 'النعامة', nameFr: 'Naâma', nameEn: 'Naama' },
      { id: 'mecheria', nameAr: 'المشرية', nameFr: 'Mécheria', nameEn: 'Mecheria' },
      { id: 'ain-sefra', nameAr: 'عين الصفراء', nameFr: 'Aïn Sefra', nameEn: 'Ain Sefra' },
    ]
  },
  {
    code: '46',
    nameAr: 'عين تموشنت',
    nameFr: 'Aïn Témouchent',
    nameEn: 'Ain Temouchent',
    coordinates: { lat: 35.2972, lng: -1.1403 },
    cities: [
      { id: 'ain-temouchent', nameAr: 'عين تموشنت', nameFr: 'Aïn Témouchent', nameEn: 'Ain Temouchent' },
      { id: 'el-malah', nameAr: 'المالح', nameFr: 'El Malah', nameEn: 'El Malah' },
      { id: 'hammam-bou-hadjar', nameAr: 'حمام بوحجر', nameFr: 'Hammam Bou Hadjar', nameEn: 'Hammam Bou Hadjar' },
      { id: 'beni-saf', nameAr: 'بني صاف', nameFr: 'Béni Saf', nameEn: 'Beni Saf' },
    ]
  },
  {
    code: '47',
    nameAr: 'غرداية',
    nameFr: 'Ghardaïa',
    nameEn: 'Ghardaia',
    coordinates: { lat: 32.4900, lng: 3.6700 },
    cities: [
      { id: 'ghardaia', nameAr: 'غرداية', nameFr: 'Ghardaïa', nameEn: 'Ghardaia' },
      { id: 'metlili', nameAr: 'متليلي', nameFr: 'Metlili', nameEn: 'Metlili' },
      { id: 'berriane', nameAr: 'بريان', nameFr: 'Berriane', nameEn: 'Berriane' },
      { id: 'el-meniaa', nameAr: 'المنيعة', nameFr: 'El Meniaa', nameEn: 'El Meniaa' },
      { id: 'guerrara', nameAr: 'قرارة', nameFr: 'Guerrara', nameEn: 'Guerrara' },
    ]
  },
  {
    code: '48',
    nameAr: 'غليزان',
    nameFr: 'Relizane',
    nameEn: 'Relizane',
    coordinates: { lat: 35.7372, lng: 0.5558 },
    cities: [
      { id: 'relizane', nameAr: 'غليزان', nameFr: 'Relizane', nameEn: 'Relizane' },
      { id: 'oued-rhiou', nameAr: 'وادي رهيو', nameFr: 'Oued Rhiou', nameEn: 'Oued Rhiou' },
      { id: 'mazouna', nameAr: 'مازونة', nameFr: 'Mazouna', nameEn: 'Mazouna' },
      { id: 'djidiouia', nameAr: 'جديوية', nameFr: 'Djidiouia', nameEn: 'Djidiouia' },
      { id: 'mendes', nameAr: 'منداس', nameFr: 'Mendès', nameEn: 'Mendes' },
    ]
  },
  // New Wilayas (created in 2019)
  {
    code: '49',
    nameAr: 'تيميمون',
    nameFr: 'Timimoun',
    nameEn: 'Timimoun',
    coordinates: { lat: 29.2639, lng: 0.2306 },
    cities: [
      { id: 'timimoun-city', nameAr: 'تيميمون', nameFr: 'Timimoun', nameEn: 'Timimoun' },
      { id: 'aougrout', nameAr: 'أوقروت', nameFr: 'Aougrout', nameEn: 'Aougrout' },
    ]
  },
  {
    code: '50',
    nameAr: 'برج باجي مختار',
    nameFr: 'Bordj Badji Mokhtar',
    nameEn: 'Bordj Badji Mokhtar',
    coordinates: { lat: 21.3275, lng: 0.9489 },
    cities: [
      { id: 'bordj-badji-mokhtar', nameAr: 'برج باجي مختار', nameFr: 'Bordj Badji Mokhtar', nameEn: 'Bordj Badji Mokhtar' },
    ]
  },
  {
    code: '51',
    nameAr: 'أولاد جلال',
    nameFr: 'Ouled Djellal',
    nameEn: 'Ouled Djellal',
    coordinates: { lat: 34.4333, lng: 5.0667 },
    cities: [
      { id: 'ouled-djellal-city', nameAr: 'أولاد جلال', nameFr: 'Ouled Djellal', nameEn: 'Ouled Djellal' },
      { id: 'sidi-khaled', nameAr: 'سيدي خالد', nameFr: 'Sidi Khaled', nameEn: 'Sidi Khaled' },
    ]
  },
  {
    code: '52',
    nameAr: 'بني عباس',
    nameFr: 'Béni Abbès',
    nameEn: 'Beni Abbes',
    coordinates: { lat: 30.1319, lng: -2.1667 },
    cities: [
      { id: 'beni-abbes', nameAr: 'بني عباس', nameFr: 'Béni Abbès', nameEn: 'Beni Abbes' },
      { id: 'el-ouata', nameAr: 'الواتة', nameFr: 'El Ouata', nameEn: 'El Ouata' },
    ]
  },
  {
    code: '53',
    nameAr: 'عين صالح',
    nameFr: 'In Salah',
    nameEn: 'In Salah',
    coordinates: { lat: 27.2000, lng: 2.4833 },
    cities: [
      { id: 'in-salah-city', nameAr: 'عين صالح', nameFr: 'In Salah', nameEn: 'In Salah' },
      { id: 'foggaret-ezzaouia', nameAr: 'فقارة الزاوية', nameFr: 'Foggaret Ezzaouia', nameEn: 'Foggaret Ezzaouia' },
    ]
  },
  {
    code: '54',
    nameAr: 'عين قزام',
    nameFr: 'In Guezzam',
    nameEn: 'In Guezzam',
    coordinates: { lat: 19.5667, lng: 5.7667 },
    cities: [
      { id: 'in-guezzam-city', nameAr: 'عين قزام', nameFr: 'In Guezzam', nameEn: 'In Guezzam' },
      { id: 'tin-zaouatine', nameAr: 'تين زاواتين', nameFr: 'Tin Zaouatine', nameEn: 'Tin Zaouatine' },
    ]
  },
  {
    code: '55',
    nameAr: 'تقرت',
    nameFr: 'Touggourt',
    nameEn: 'Touggourt',
    coordinates: { lat: 33.1000, lng: 6.0667 },
    cities: [
      { id: 'touggourt-city', nameAr: 'تقرت', nameFr: 'Touggourt', nameEn: 'Touggourt' },
      { id: 'temacine', nameAr: 'تماسين', nameFr: 'Temacine', nameEn: 'Temacine' },
      { id: 'megarine', nameAr: 'مقارين', nameFr: 'Mégarine', nameEn: 'Megarine' },
    ]
  },
  {
    code: '56',
    nameAr: 'جانت',
    nameFr: 'Djanet',
    nameEn: 'Djanet',
    coordinates: { lat: 24.5500, lng: 9.4833 },
    cities: [
      { id: 'djanet-city', nameAr: 'جانت', nameFr: 'Djanet', nameEn: 'Djanet' },
    ]
  },
  {
    code: '57',
    nameAr: 'المغير',
    nameFr: 'El MGhair',
    nameEn: 'El M\'Ghair',
    coordinates: { lat: 33.9500, lng: 5.9167 },
    cities: [
      { id: 'el-mghair', nameAr: 'المغير', nameFr: "El M'Ghair", nameEn: "El M'Ghair" },
      { id: 'djamaa-city', nameAr: 'جامعة', nameFr: 'Djamaa', nameEn: 'Djamaa' },
      { id: 'sidi-amrane', nameAr: 'سيدي عمران', nameFr: 'Sidi Amrane', nameEn: 'Sidi Amrane' },
    ]
  },
  {
    code: '58',
    nameAr: 'المنيعة',
    nameFr: 'El Meniaa',
    nameEn: 'El Meniaa',
    coordinates: { lat: 30.5833, lng: 2.8833 },
    cities: [
      { id: 'el-meniaa-city', nameAr: 'المنيعة', nameFr: 'El Meniaa', nameEn: 'El Meniaa' },
      { id: 'hassi-fehal', nameAr: 'حاسي فحل', nameFr: 'Hassi Fehal', nameEn: 'Hassi Fehal' },
    ]
  },
]

// Helper functions
export function getWilayaName(wilaya: Wilaya, language: 'ar' | 'fr' | 'en'): string {
  switch (language) {
    case 'ar': return wilaya.nameAr
    case 'fr': return wilaya.nameFr
    case 'en': return wilaya.nameEn
    default: return wilaya.nameFr
  }
}

export function getCityName(city: City, language: 'ar' | 'fr' | 'en'): string {
  switch (language) {
    case 'ar': return city.nameAr
    case 'fr': return city.nameFr
    case 'en': return city.nameEn
    default: return city.nameFr
  }
}

export function getWilayaByCode(code: string): Wilaya | undefined {
  return WILAYAS.find(w => w.code === code)
}

export function searchWilayas(query: string, language: 'ar' | 'fr' | 'en'): Wilaya[] {
  const lowerQuery = query.toLowerCase()
  return WILAYAS.filter(wilaya => 
    getWilayaName(wilaya, language).toLowerCase().includes(lowerQuery) ||
    wilaya.code.includes(query)
  )
}

export function searchCities(query: string, language: 'ar' | 'fr' | 'en', wilayaCode?: string): { wilaya: Wilaya; city: City }[] {
  const lowerQuery = query.toLowerCase()
  const results: { wilaya: Wilaya; city: City }[] = []
  
  const wilayasToSearch = wilayaCode 
    ? WILAYAS.filter(w => w.code === wilayaCode)
    : WILAYAS
  
  for (const wilaya of wilayasToSearch) {
    for (const city of wilaya.cities) {
      if (getCityName(city, language).toLowerCase().includes(lowerQuery)) {
        results.push({ wilaya, city })
      }
    }
  }
  
  return results
}

// Find nearest wilaya based on coordinates
export function findNearestWilaya(lat: number, lng: number): Wilaya | null {
  let nearestWilaya: Wilaya | null = null
  let shortestDistance = Infinity
  
  for (const wilaya of WILAYAS) {
    if (wilaya.coordinates) {
      const distance = calculateDistance(lat, lng, wilaya.coordinates.lat, wilaya.coordinates.lng)
      if (distance < shortestDistance) {
        shortestDistance = distance
        nearestWilaya = wilaya
      }
    }
  }
  
  return nearestWilaya
}

// Haversine formula to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

// Alias for backward compatibility
export const algeriaWilayas = WILAYAS
export const wilayas = WILAYAS.map(w => ({
  code: w.code,
  name: w.nameFr,
  nameAr: w.nameAr,
  nameEn: w.nameEn,
}))
