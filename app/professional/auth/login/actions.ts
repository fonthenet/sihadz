"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function checkProfessionalStatus(authUserId: string) {
  const supabase = createAdminClient();
  
  console.log("[v0] Server: Checking professional status for authUserId:", authUserId);

  // First check professionals table
  const { data: professional, error } = await supabase
    .from("professionals")
    .select("id, email, type, status")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  console.log("[v0] Server: Professionals check result:", { professional, error });

  if (error) {
    console.error("[v0] Server: Error checking professional status:", error);
    return { professional: null, error: error.message };
  }

  if (professional) {
    console.log("[v0] Server: Found in professionals table");
    return { professional, error: null };
  }

  // If not in professionals table, check if they're a doctor in doctors table
  const { data: doctor, error: doctorError } = await supabase
    .from("doctors")
    .select("id, user_id, specialty, is_verified, is_active")
    .eq("user_id", authUserId)
    .eq("is_active", true)
    .maybeSingle();

  console.log("[v0] Server: Doctors check result:", { doctor, doctorError });

  if (doctorError) {
    console.error("[v0] Server: Error checking doctor status:", doctorError);
  }

  if (doctor) {
    console.log("[v0] Server: Found doctor, returning professional format");
    // Return doctor in professional format
    return { 
      professional: { 
        id: doctor.id, 
        type: 'doctor', 
        status: doctor.is_verified ? 'approved' : 'pending' 
      }, 
      error: null 
    };
  }

  // Check if they're a pharmacy in pharmacies table
  const { data: pharmacy, error: pharmacyError } = await supabase
    .from("pharmacies")
    .select("id, user_id, name, is_verified")
    .eq("user_id", authUserId)
    .eq("is_active", true)
    .maybeSingle();

  if (pharmacyError) {
    console.error("[v0] Server: Error checking pharmacy status:", pharmacyError);
  }

  if (pharmacy) {
    // Return pharmacy in professional format
    return { 
      professional: { 
        id: pharmacy.id, 
        type: 'pharmacy', 
        status: pharmacy.is_verified ? 'approved' : 'pending' 
      }, 
      error: null 
    };
  }

  // If none found, user is not a professional
  return { professional: null, error: "This account is not registered as a professional. Please use patient login or sign up as a professional." };
}
