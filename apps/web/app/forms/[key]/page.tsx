import { ManageFormPageClient } from '@/app/forms/[key]/manage-form-page-client';

type ManageFormPageProps = {
  params: Promise<{ key: string }>;
};

export default async function ManageFormPage({ params }: ManageFormPageProps) {
  const { key } = await params;
  return <ManageFormPageClient formKey={key} />;
}
