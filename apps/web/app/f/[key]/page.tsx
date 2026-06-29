import { FillFormPageClient } from '@/app/f/[key]/fill-form-page-client';

type FillFormPageProps = {
  params: Promise<{ key: string }>;
};

export default async function FillFormPage({ params }: FillFormPageProps) {
  const { key } = await params;
  return <FillFormPageClient formKey={key} />;
}
