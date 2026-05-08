// file: app/actions/publicActions.ts
"use server";

import { createClient } from "@supabase/supabase-js";

// PERBAIKAN: Gunakan SERVICE ROLE KEY agar bisa mengambil data 
// tanpa terblokir oleh RLS (Row Level Security) Supabase
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getPublicPackages() {
  try {
    const { data, error } = await supabaseAdmin
      .from("packages")
      .select("*")
      .order("price", { ascending: true });
    
    if (error) {
      console.error("Database Error (Packages):", error.message);
      return { success: false, error: error.message };
    }
    
    return { success: true, data: data || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getClientShowcase() {
  try {
    const { data, error } = await supabaseAdmin
      .from("bookings")
      .select("client_name, notes, event_type")
      .not("notes", "is", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Database Error (Showcase):", error.message);
      return { success: false, error: error.message };
    }

    // Filter hanya yang memiliki url foto di dalam json notes
    const showcase = (data || []).map(b => {
      try {
        let notesObj = typeof b.notes === 'string' ? JSON.parse(b.notes) : (b.notes || {});
        
        // Membaca dari struktur JSON "process"
        const processData = notesObj.process || notesObj; 
        const url = processData?.pickupProofUrl;
        
        if (url) {
            return {
                name: b.client_name,
                event: b.event_type,
                image: url
            };
        }
      } catch (parseError) {
        // Abaikan jika ada format notes lama yang tidak sesuai
      }
      return null;
    }).filter(Boolean); // Membuang nilai null

    return { success: true, data: showcase };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}