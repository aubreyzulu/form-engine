import { EditFormPageClient } from '@/app/forms/[key]/edit/edit-form-page-client';

export default async function EditFormPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ version?: string }>;
}) {
  const [{ key }, query] = await Promise.all([params, searchParams]);
  const version = Number(query.version);

  return <EditFormPageClient formKey={key} version={version} />;
}
