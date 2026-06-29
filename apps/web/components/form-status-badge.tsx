import { Badge } from '@/components/ui/badge';

export type FormStatus = 'Archived' | 'Draft' | 'Published';

export function FormStatusBadge({ status }: { status: FormStatus }) {
  const className =
    status === 'Published'
      ? 'bg-success/15 text-success'
      : status === 'Archived'
        ? 'bg-muted text-muted-foreground line-through'
        : 'bg-muted text-muted-foreground';

  return <Badge className={className}>{status}</Badge>;
}
