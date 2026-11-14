"use server";

import { revalidatePath } from "next/cache";
import { getErrorMessage, requireAdmin, STORAGE_BUCKET, supabaseAdmin } from "@/app/actions/adminBookings/utils";

const QRIS_SETTING_ID = "default";
const MAX_QRIS_IMAGE_SIZE = 5 * 1024 * 1024;
const QRIS_IMAGE_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export async function getPublicQrisAction() {
  try {
    const { data, error } = await supabaseAdmin
      .from("payment_settings")
      .select("qris_image_path")
      .eq("id", QRIS_SETTING_ID)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data?.qris_image_path) return { success: true, imageUrl: null };

    const { data: publicUrl } = supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(data.qris_image_path);

    return { success: true, imageUrl: publicUrl.publicUrl };
  } catch (error: unknown) {
    console.error("Gagal mengambil gambar QRIS:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function uploadQrisImageAction(formData: FormData) {
  let uploadedPath: string | null = null;
  let settingSaved = false;

  try {
    await requireAdmin();

    const file = formData.get("qrisImage");
    if (!(file instanceof File) || file.size === 0) {
      return { success: false, error: "Pilih gambar QRIS terlebih dahulu." };
    }

    const extension = QRIS_IMAGE_TYPES.get(file.type);
    if (!extension) {
      return { success: false, error: "Format gambar QRIS harus JPG, PNG, atau WebP." };
    }
    if (file.size > MAX_QRIS_IMAGE_SIZE) {
      return { success: false, error: "Ukuran gambar QRIS maksimal 5 MB." };
    }

    const { data: currentSetting, error: currentSettingError } = await supabaseAdmin
      .from("payment_settings")
      .select("qris_image_path")
      .eq("id", QRIS_SETTING_ID)
      .maybeSingle();
    if (currentSettingError) throw new Error(currentSettingError.message);

    uploadedPath = `qris/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(uploadedPath, file, { contentType: file.type, cacheControl: "3600" });
    if (uploadError) throw new Error(uploadError.message);

    const { error: saveError } = await supabaseAdmin
      .from("payment_settings")
      .upsert(
        { id: QRIS_SETTING_ID, qris_image_path: uploadedPath, updated_at: new Date().toISOString() },
        { onConflict: "id" }
      );
    if (saveError) throw new Error(saveError.message);
      settingSaved = true;

    const previousPath = currentSetting?.qris_image_path;
      if (previousPath?.startsWith("qris/") && previousPath !== uploadedPath) {
      const { error: removeError } = await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([previousPath]);
      if (removeError) console.error("Gagal menghapus gambar QRIS lama:", removeError.message);
    }

    const { data: publicUrl } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(uploadedPath);
    revalidatePath("/admin/qris");
    return { success: true, imageUrl: publicUrl.publicUrl };
  } catch (error: unknown) {
    if (uploadedPath && !settingSaved) {
      const { error: cleanupError } = await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([uploadedPath]);
      if (cleanupError) console.error("Gagal membersihkan upload QRIS yang tidak tersimpan:", cleanupError.message);
    }
    console.error("Gagal mengunggah gambar QRIS:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}
