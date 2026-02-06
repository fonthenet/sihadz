# AlgeriaMed Test Data Ecosystem

**All accounts use password:** `Test123456!`

## 📊 Summary Statistics
- **Total Accounts:** 25 (5 patients, 5 doctors, 5 pharmacies, 5 clinics, 5 labs)
- **Family Members:** 5 (1 per patient)
- **Appointments:** 10 (6 completed, 2 upcoming, 1 cancelled, 1 refunded)
- **Prescriptions:** 6 (with real medication details)
- **Doctor Records:** 5 (with specialties and fees)

---

## 👥 Patient Accounts (Login at `/login`)

### Patient 1 - Ahmed Benali
- **Email:** patient1@algeriamed.test
- **Profile:** Male, born 1985-03-15
- **Family:** Sara Benali (daughter, 10 years old, has asthma, allergic to peanuts)
- **Medical History:**
  - ✅ Completed cardiology appointment with Dr. Yacine Amrani (Jan 10)
  - 📅 Upcoming pediatrics appointment for child vaccination (Jan 23)
  - 💊 Active prescription: Amlodipine 5mg + Aspirin 100mg (sent to pharmacy)

### Patient 2 - Fatima Boudiaf
- **Email:** patient2@algeriamed.test
- **Profile:** Female, born 1992-07-22
- **Family:** Mohamed Boudiaf (son, 7 years old)
- **Medical History:**
  - ✅ Completed e-visit for flu with Dr. Rachid Benkhaled (Jan 15)
  - ✅ Completed gynecology checkup - pregnancy confirmed (Dec 21)
  - 💊 Filled prescription: Amoxicillin + Paracetamol
  - 💊 Active prescription: Folic Acid (prenatal vitamin)

### Patient 3 - Karim Hadj
- **Email:** patient3@algeriamed.test
- **Profile:** Male, born 1978-11-08
- **Family:** Amira Hadj (wife, has diabetes type 2, allergic to penicillin)
- **Medical History:**
  - ❌ Cancelled cardiology appointment (Jan 18, refunded)
  - ✅ Completed gynecology checkup (Dec 31)
  - 💊 Active prescription: Folic Acid for spouse

### Patient 4 - Amina Zerrouki
- **Email:** patient4@algeriamed.test
- **Profile:** Female, born 1955-02-18
- **Family:** Hassan Zerrouki (father, 98 years old, has hypertension & heart disease)
- **Medical History:**
  - ✅ Completed cardiology follow-up for hypertension (Jan 5)
  - 📅 Upcoming diabetes management appointment (Jan 25)
  - 💊 Filled prescription: Amlodipine + Aspirin

### Patient 5 - Youcef Messaoud
- **Email:** patient5@algeriamed.test
- **Profile:** Male, born 1998-06-30
- **Family:** Lina Messaoud (sister, allergic to shellfish)
- **Medical History:**
  - ✅ Completed dermatology e-visit for skin rash (Jan 17)
  - 📅 Upcoming general consultation (Jan 27)
  - 💊 Active prescription: Hydrocortisone Cream 1% (sent to pharmacy)

---

## 👨‍⚕️ Doctor Accounts (Login at `/professional/auth/login`)

### Doctor 1 - Dr. Yacine Amrani (Cardiology)
- **Email:** doctor1@algeriamed.test
- **Specialty:** Cardiology / طب القلب / Cardiologie
- **Experience:** 15 years
- **Fees:** 3000 DA (in-person), 2500 DA (e-visit)
- **Patients Treated:** Patient 1, Patient 3, Patient 4
- **Prescriptions Issued:** 2

### Doctor 2 - Dr. Samia Khelifi (Pediatrics)
- **Email:** doctor2@algeriamed.test
- **Specialty:** Pediatrics / طب الأطفال / Pédiatrie
- **Experience:** 12 years
- **Fees:** 2500 DA (both types)
- **Upcoming Appointments:** Patient 1, Patient 5

### Doctor 3 - Dr. Rachid Benkhaled (General Medicine)
- **Email:** doctor3@algeriamed.test
- **Specialty:** General Medicine / طب عام / Médecine Générale
- **Experience:** 10 years
- **Fees:** 1500 DA (in-person), 1200 DA (e-visit)
- **Patients Treated:** Patient 2, Patient 4
- **Prescriptions Issued:** 1

### Doctor 4 - Dr. Leila Mammeri (Gynecology)
- **Email:** doctor4@algeriamed.test
- **Specialty:** Gynecology / أمراض النساء / Gynécologie
- **Experience:** 14 years
- **Fees:** 2800 DA (both types)
- **Patients Treated:** Patient 2, Patient 3
- **Prescriptions Issued:** 2

### Doctor 5 - Dr. Omar Zeroual (Dermatology)
- **Email:** doctor5@algeriamed.test
- **Specialty:** Dermatology / الأمراض الجلدية / Dermatologie
- **Experience:** 8 years
- **Fees:** 2000 DA (in-person), 1200 DA (e-visit)
- **Patients Treated:** Patient 5
- **Prescriptions Issued:** 1

---

## 💊 Pharmacy Accounts (Login at `/professional/auth/login`)

### Pharmacy 1 - Pharmacie El Nour
- **Email:** pharmacy1@algeriamed.test
- **Prescriptions Received:** Multiple active and filled prescriptions

### Pharmacy 2-5
- **Emails:** pharmacy2-5@algeriamed.test
- **Names:** Pharmacie Centrale, Pharmacie Essafa, Pharmacie du Centre, Pharmacie de Nuit

---

## 🏥 Clinic Accounts (Login at `/professional/auth/login`)

### Clinics 1-5
- **Emails:** clinic1-5@algeriamed.test
- **Names:** 
  - Clinique El Shifa
  - Clinique Essalam
  - Clinique Ibn Rochd
  - Clinique Avicenne
  - Clinique Parnet

---

## 🔬 Laboratory Accounts (Login at `/professional/auth/login`)

### Labs 1-5
- **Emails:** lab1-5@algeriamed.test
- **Names:**
  - Laboratoire Central
  - Laboratoire Ibn Sina
  - Laboratoire Pasteur
  - Laboratoire Biochimie
  - Laboratoire Analyses

---

## 💊 Sample Prescriptions

### Prescription 1 - Hypertension (Patient 1)
- **Medications:**
  - Amlodipine 5mg - Once daily with food (30 days)
  - Aspirin 100mg - Once daily after meals (30 days)
- **Status:** Sent to pharmacy
- **Total:** 4500 DA

### Prescription 2 - Viral Infection (Patient 2)
- **Medications:**
  - Amoxicillin 500mg - 3 times daily (7 days)
  - Paracetamol 500mg - As needed for fever (5 days)
- **Status:** Filled
- **Total:** 3200 DA

### Prescription 3 - Dermatology (Patient 5)
- **Medications:**
  - Hydrocortisone Cream 1% - Twice daily (14 days)
- **Status:** Sent to pharmacy
- **Total:** 2800 DA

### Prescription 4 - Prenatal (Patient 2, 3)
- **Medications:**
  - Folic Acid 400mcg - Once daily (90 days)
- **Status:** Active/Sent
- **Total:** 1500 DA

---

## 📅 Appointment Scenarios

### ✅ Completed Appointments (Past)
1. **Patient 1 → Doctor 1:** Heart palpitations (Jan 10) - Paid 3000 DA
2. **Patient 2 → Doctor 3:** Flu symptoms via e-visit (Jan 15) - Paid 1200 DA
3. **Patient 3 → Doctor 4:** Regular gynecology checkup (Dec 31) - Paid 2800 DA
4. **Patient 4 → Doctor 1:** Hypertension follow-up (Jan 5) - Paid 3000 DA
5. **Patient 5 → Doctor 5:** Skin rash via e-visit (Jan 17) - Paid 2000 DA
6. **Patient 2 → Doctor 4:** Pregnancy checkup (Dec 21) - Paid 2800 DA

### 📅 Upcoming Appointments (Future)
1. **Patient 1 → Doctor 2:** Child vaccination (Jan 23) - 2500 DA pending
2. **Patient 4 → Doctor 3:** Diabetes management (Jan 25) - 1500 DA pending
3. **Patient 5 → Doctor 2:** General consultation (Jan 27) - 2500 DA pending

### ❌ Cancelled/Refunded
1. **Patient 3 → Doctor 1:** Blood pressure check (Jan 18) - Refunded 3000 DA

---

## 🔗 Interconnections

### Cross-References
- **Families:** Each patient has 1 family member with unique medical needs
- **Appointments:** 10 appointments across 5 doctors covering multiple specialties
- **Prescriptions:** 6 prescriptions with real medication details
- **Pharmacies:** Prescriptions distributed across different pharmacies
- **Payment Status:** Mix of paid, pending, and refunded

### Medical Scenarios Covered
- ✅ Chronic disease management (hypertension, diabetes)
- ✅ Pregnancy care and prenatal vitamins
- ✅ Pediatric care and vaccinations
- ✅ Dermatology consultations
- ✅ E-visits and in-person appointments
- ✅ Emergency and routine appointments
- ✅ Family member medical records
- ✅ Medication allergies and chronic conditions
- ✅ CHIFA eligibility tracking

---

## 🎯 Test Scenarios You Can Explore

1. **Patient Dashboard:** Login as patient1 to see appointment history, upcoming appointments, prescriptions
2. **Doctor Dashboard:** Login as doctor1 to see patient list, appointments, prescriptions issued
3. **Pharmacy Portal:** Login as pharmacy1 to see incoming prescriptions
4. **Family Management:** Patient accounts can view/manage family member records
5. **Appointment Booking:** Patients can book with any doctor
6. **Prescription Fulfillment:** Pharmacies can mark prescriptions as filled
7. **Medical History:** View complete patient medical history with appointments and prescriptions
8. **Multi-specialty Care:** Patients seeing multiple doctors for different conditions
9. **Payment Tracking:** Various payment statuses (paid, pending, refunded)
10. **E-visits vs In-person:** Different appointment types with different pricing

---

**Download this file:** `/test-data-ecosystem.md`  
**CSV Account List:** `/test-accounts-complete.csv`
