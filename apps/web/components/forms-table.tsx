import Link from 'next/link';
import { MoreVertical } from 'lucide-react';

import { FormStatusBadge } from '@/components/form-status-badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { type FormListItem } from '@/lib/form-list';

export type { FormListItem } from '@/lib/form-list';

export function FormsTable({ forms }: { forms: FormListItem[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="h-11 px-6">Name</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Version</TableHead>
          <TableHead>Submissions</TableHead>
          <TableHead>Updated</TableHead>
          <TableHead className="px-6">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {forms.map((form) => (
          <TableRow key={form.key}>
            <TableCell className="px-6 py-5">
              <Link
                className="font-medium underline-offset-4 hover:text-primary hover:underline"
                href={`/forms/${form.key}`}
              >
                {form.name}
              </Link>
            </TableCell>
            <TableCell>
              <FormStatusBadge status={form.status} />
            </TableCell>
            <TableCell>{form.version}</TableCell>
            <TableCell>{form.submissions}</TableCell>
            <TableCell className="text-muted-foreground">{form.updated}</TableCell>
            <TableCell className="px-6">
              <div className="flex items-center gap-4">
                <Link
                  className="font-medium text-primary underline-offset-4 hover:underline"
                  href={`/forms/${form.key}`}
                >
                  Manage
                </Link>
                {form.publishedVersion ? (
                  <Link
                    className="font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    href={`/f/${form.key}`}
                  >
                    Open live form
                  </Link>
                ) : (
                  <span className="font-medium text-muted-foreground/70">No live form</span>
                )}
                {form.status === 'Draft' && (
                  <Link
                    className="font-medium text-primary underline-offset-4 hover:underline"
                    href={`/forms/${form.key}`}
                  >
                    Publish
                  </Link>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      aria-label={`More actions for ${form.name}`}
                      className="ml-auto"
                      size="icon-sm"
                      variant="ghost"
                    >
                      <MoreVertical />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuGroup>
                      <DropdownMenuItem>Copy link</DropdownMenuItem>
                      <DropdownMenuItem>Duplicate</DropdownMenuItem>
                      <DropdownMenuItem>View submissions</DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
