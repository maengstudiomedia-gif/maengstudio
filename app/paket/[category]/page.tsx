import { notFound } from "next/navigation";
import MobileHomeApp from "@/app/components/MobileHomeApp";
import { PACKAGE_CATEGORIES } from "@/lib/package-categories";

export default async function PackageCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const normalizedCategory = category.toLowerCase();
  const isCategory = normalizedCategory === "all" || PACKAGE_CATEGORIES.some((item) => item.value === normalizedCategory);

  if (!isCategory && normalizedCategory !== "other") notFound();

  return <MobileHomeApp initialCategory={normalizedCategory} />;
}