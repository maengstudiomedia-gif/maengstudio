/** URL publik aplikasi — dipakai untuk link yang dibagikan ke klien. */
export function getAppBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "https://maengstudio.my.id";
}
