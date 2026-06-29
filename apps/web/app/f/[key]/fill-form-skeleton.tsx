import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function FillFormSkeleton() {
  return (
    <Card aria-label="Loading public form" className="rounded" role="status">
      <CardHeader className="gap-3 border-b">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-5 w-full" />
      </CardHeader>
      <CardContent className="space-y-5 p-6">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-10 w-36" />
      </CardContent>
    </Card>
  );
}
