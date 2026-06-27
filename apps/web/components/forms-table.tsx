import Link from 'next/link';
import { MoreVertical } from 'lucide-react';

import { FormStatusBadge, type FormStatus } from '@/components/form-status-badge';
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

export type FormListItem = {
  key: string;
  name: string;
  status: FormStatus;
  version: string;
  submissions: number;
  updated: string;
};

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
            <TableCell>
              <div className="flex justify-end gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/forms/${form.key}`}>Manage</Link>
                </Button>
                {form.status === 'Draft' ? (
                  <Button size="sm">
                    <Send data-icon="inline-start" />
                    Publish
                  </Button>
                ) : (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/f/${form.key}`}>
                      <Eye data-icon="inline-start" />
                      Preview
                    </Link>
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      aria-label={`More actions for ${form.name}`}
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
