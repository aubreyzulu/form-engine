'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  BarChart3,
  ChevronDown,
  ChevronLeft,
  FileText,
  Grid2X2,
  type LucideIcon,
  Settings,
} from 'lucide-react';

import { Separator } from '@/components/ui/separator';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from '@/components/ui/sidebar';

type CreatorNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  value: CreatorSection;
};

type CreatorSection = 'dashboard' | 'forms' | 'responses' | 'settings';

const navigation: CreatorNavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: Grid2X2,
    value: 'dashboard',
  },
  {
    label: 'Forms',
    href: '/forms',
    icon: FileText,
    value: 'forms',
  },
  {
    label: 'Responses',
    href: '/responses',
    icon: BarChart3,
    value: 'responses',
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    value: 'settings',
  },
];

export function CreatorAppShell({
  active,
  children,
}: {
  active: CreatorSection;
  children: ReactNode;
}) {
  return (
    <SidebarProvider>
      <Sidebar className="border-r bg-card" collapsible="none">
        <SidebarHeader className="gap-8 px-6 py-6">
          <Link className="flex items-center gap-3" href="/dashboard">
            <span className="grid size-8 grid-cols-2 gap-1" aria-hidden="true">
              <span className="rounded-full bg-primary" />
              <span className="rounded-full bg-primary/80" />
              <span className="rounded-full bg-primary/80" />
              <span className="rounded-full bg-primary" />
            </span>
            <span className="text-xl font-semibold tracking-normal">Form Builder</span>
          </Link>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup className="px-0">
            <SidebarGroupContent>
              <SidebarMenu className="gap-2">
                {navigation.map((item) => {
                  const Icon = item.icon;

                  return (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        asChild
                        className="h-12 rounded-none px-7 text-base"
                        isActive={active === item.value}
                      >
                        <Link href={item.href}>
                          <Icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="gap-5 px-6 py-6">
          <Separator />
          <button className="flex items-center justify-between gap-3 text-left text-sm">
            <span className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-full bg-muted text-xs font-medium">
                CO
              </span>
              <span>Compliance Officer</span>
            </span>
            <ChevronDown />
          </button>
          <Separator />
          <button className="flex items-center gap-3 text-sm text-muted-foreground">
            <ChevronLeft />
            <span>Collapse</span>
          </button>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
