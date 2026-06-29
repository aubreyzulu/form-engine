'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { FileText, Grid2X2, type LucideIcon } from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
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

type CreatorSection = 'dashboard' | 'forms';

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
      <div className="hidden md:block">
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
        </Sidebar>
      </div>

      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
