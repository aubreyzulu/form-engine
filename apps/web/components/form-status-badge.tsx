import { Badge } from '@/components/ui/badge';

export type FormStatus = 'Draft' | 'Published';

export function FormStatusBadge({ status }: { status: FormStatus }) {
  return (
    <Badge
      className={
        status === 'Published' ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'
      }
    >
      {status}
    </Badge>
  );
}
