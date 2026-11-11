"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/app/actions/adminBookings/utils";

// Gunakan Admin Key agar bebas hambatan saat melakukan operasi CRUD
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Konstanta nama bucket storage di Supabase (Sesuaikan jika nama bucket Anda berbeda)
const STORAGE_BUCKET = "images";

// FUNGSI HELPER: Untuk mengupload gambar ke Supabase Storage
async function uploadImage(file: File): Promise<string | null> {
  try {
    // Buat nama file unik
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `packages/${fileName}`; // akan disimpan di folder 'packages/' di dalam bucket

    // Upload file
    const { error: uploadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file);

    if (uploadError) {
      console.error("Error uploading to Supabase Storage:", uploadError.message);
      return null;
    }

    // Dapatkan Public URL
    const { data: publicUrlData } = supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error("Upload error:", error);
    return null;
  }
}


// FUNGSI UNTUK KLIEN: Mengambil semua paket
export async function getPackagesAction() {
  const { data, error } = await supabaseAdmin
    .from('packages')
    .select('*')
    .order('price', { ascending: true }); // Urutkan dari harga termurah

  if (error) throw new Error(error.message);
  return data;
}

// FUNGSI UNTUK ADMIN: Menambah paket baru
export async function createPackageAction(formData: FormData) {
  try {
    await requireAdmin();
    // 1. Ekstrak data teks dari FormData
    const type = formData.get("type") as string;
    const name = formData.get("name") as string;
    const price = Number(formData.get("price"));
    const price_unit = String(formData.get("price_unit") || "").trim();
    if (!price_unit) return { success: false, error: "Satuan harga wajib diisi." };
    const allow_extra_days = formData.get("allow_extra_days") === "true";
    const extra_day_price = allow_extra_days && formData.get("charge_extra_day") === "true"
      ? Number(formData.get("extra_day_price"))
      : 0;
    if (!Number.isFinite(extra_day_price) || extra_day_price < 0 || (allow_extra_days && formData.get("charge_extra_day") === "true" && extra_day_price === 0)) {
      return { success: false, error: "Harga tambahan per hari tidak valid." };
    }
    const description = formData.get("description") as string;
    const is_popular = formData.get("is_popular") === "true";
    const features = JSON.parse(formData.get("features") as string);
    
    const printResultsRaw = formData.get("print_results");
    const print_results = printResultsRaw ? JSON.parse(printResultsRaw as string) : [];

    // 2. Ekstrak dan Upload File Gambar (jika ada)
    const imageFile = formData.get("image") as File | null;
    let image_url = null;

    if (imageFile && imageFile.size > 0) {
      image_url = await uploadImage(imageFile);
    }

    // 3. Simpan ke Database
    const { error } = await supabaseAdmin
      .from('packages')
      .insert([{
        type,
        name,
        price,
        price_unit,
        allow_extra_days,
        extra_day_price,
        description,
        is_popular,
        features,
        print_results,
        image_url
      }]);

    if (error) return { success: false, error: error.message };
    
    // Refresh halaman agar data baru langsung muncul di admin & booking publik
    revalidatePath("/admin/packages");
    revalidatePath("/book");
    revalidatePath("/");
    
    return { success: true };
  } catch (error: any) {
    console.error("Create Package Error:", error);
    return { success: false, error: error.message || "Gagal membuat paket" };
  }
}

// FUNGSI UNTUK ADMIN: Mengupdate paket (Edit)
export async function updatePackageAction(formData: FormData) {
  try {
    await requireAdmin();
    // 1. Dapatkan ID Paket yang mau diedit
    const id = formData.get("id") as string;
    if (!id) return { success: false, error: "ID paket tidak ditemukan" };

    // 2. Ekstrak data teks lainnya
    const type = formData.get("type") as string;
    const name = formData.get("name") as string;
    const price = Number(formData.get("price"));
    const price_unit = String(formData.get("price_unit") || "").trim();
    if (!price_unit) return { success: false, error: "Satuan harga wajib diisi." };
    const allow_extra_days = formData.get("allow_extra_days") === "true";
    const extra_day_price = allow_extra_days && formData.get("charge_extra_day") === "true"
      ? Number(formData.get("extra_day_price"))
      : 0;
    if (!Number.isFinite(extra_day_price) || extra_day_price < 0 || (allow_extra_days && formData.get("charge_extra_day") === "true" && extra_day_price === 0)) {
      return { success: false, error: "Harga tambahan per hari tidak valid." };
    }
    const description = formData.get("description") as string;
    const is_popular = formData.get("is_popular") === "true";
    const features = JSON.parse(formData.get("features") as string);
    
    const printResultsRaw = formData.get("print_results");
    const print_results = printResultsRaw ? JSON.parse(printResultsRaw as string) : [];

    // Siapkan object data yang akan diupdate
    const updateData: any = {
      type,
      name,
      price,
      price_unit,
      allow_extra_days,
      extra_day_price,
      description,
      is_popular,
      features,
      print_results
    };

    // 3. Cek apakah admin mengupload gambar baru
    const imageFile = formData.get("image") as File | null;
    if (imageFile && imageFile.size > 0) {
      const image_url = await uploadImage(imageFile);
      if (!image_url) return { success: false, error: "Gagal mengupload gambar paket. Silakan coba lagi." };
      updateData.image_url = image_url;
    }

    // 4. Update data di Database
    const { error } = await supabaseAdmin
      .from('packages')
      .update(updateData)
      .eq('id', id);

    if (error) return { success: false, error: error.message };
    
    revalidatePath("/admin/packages");
    revalidatePath("/book");
    revalidatePath("/");

    return { success: true };
  } catch (error: any) {
    console.error("Update Package Error:", error);
    return { success: false, error: error.message || "Gagal mengupdate paket" };
  }
}

// Tambahkan fungsi ini di file @/app/actions/packages.ts

export async function deletePackageAction(id: string, imageUrl?: string) {
  try {
    await requireAdmin();
    // 1. Jika ada gambar, hapus dari Storage dulu
    if (imageUrl) {
      const path = imageUrl.split(`${STORAGE_BUCKET}/`)[1]; // Ambil path relatifnya
      if (path) {
        await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([path]);
      }
    }

    // 2. Hapus data dari tabel
    const { error } = await supabaseAdmin
      .from('packages')
      .delete()
      .eq('id', id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/packages");
    revalidatePath("/book");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}