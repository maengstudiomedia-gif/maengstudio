import { getPublicPackages } from "@/app/actions/publicActions";
import BookingPageClient from "./BookingPageClient";

interface BookPageProps {
  searchParams?: {
    name?: string;
    phone?: string;
    packageId?: string;
  };
}

export default async function BookPage({ searchParams }: BookPageProps) {
  const packagesRes = await getPublicPackages();
  const packages = packagesRes.success ? packagesRes.data || [] : [];

  const initialName = String(searchParams?.name || "");
  const initialPhone = String(searchParams?.phone || "");
  const initialPackageId = String(searchParams?.packageId || "");

  return (
    <BookingPageClient
      initialName={initialName}
      initialPhone={initialPhone}
      initialPackageId={initialPackageId}
      packages={packages}
    />
  );
}
