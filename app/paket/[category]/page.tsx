import { notFound } from "next/navigation";
import MobileHomeApp from "@/app/components/MobileHomeApp";
import { PACKAGE_CATEGORIES } from "@/lib/package-categories";

export default async function PackageCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  let decodedCategory = category;
  try {
    decodedCategory = decodeURIComponent(category);
  } catch {
    decodedCategory = category;
  }
  const normalizedCategory = decodedCategory.toLowerCase().replace(/-/g, " ");
  const isCategory = PACKAGE_CATEGORIES.some((item) => item.value === normalizedCategory);

  if (!isCategory && normalizedCategory !== "other") notFound();

  return <MobileHomeApp initialCategory={normalizedCategory} />;
}