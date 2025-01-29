'use client'

import { Avatar } from '@/components/avatar'
import {
  Dropdown,
  DropdownButton,
  DropdownDivider,
  DropdownItem,
  DropdownLabel,
  DropdownMenu,
} from '@/components/dropdown'
import { Navbar, NavbarItem, NavbarSection, NavbarSpacer } from '@/components/navbar'
import {
  Sidebar,
  SidebarBody,
  SidebarFooter,
  SidebarHeader,
  SidebarHeading,
  SidebarItem,
  SidebarLabel,
  SidebarSection,
  SidebarSpacer,
} from '@/components/sidebar'
import { SidebarLayout } from '@/components/sidebar-layout'
import {
  ArrowRightStartOnRectangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Cog8ToothIcon,
  LightBulbIcon,
  PlusIcon,
  ShieldCheckIcon,
  UserCircleIcon,
} from '@heroicons/react/16/solid'
import {
  BuildingOfficeIcon,
  BuildingLibraryIcon,
  Cog6ToothIcon,
  DocumentIcon,
  HomeIcon,
  QuestionMarkCircleIcon,
  SparklesIcon,
  Square2StackIcon,
  TicketIcon,
} from '@heroicons/react/20/solid'
import { usePathname } from 'next/navigation'
import { UserMenu } from '@/components/user-menu'
import { AppSidebar } from '@/components/custom/AppSidebar'
import { ChatBubbleLeftRightIcon } from '@heroicons/react/20/solid'

function AccountDropdownMenu({ anchor }: { anchor: 'top start' | 'bottom end' }) {
  return (
    <DropdownMenu className="min-w-64" anchor={anchor}>
      <DropdownItem href="#">
        <UserCircleIcon />
        <DropdownLabel>My account</DropdownLabel>
      </DropdownItem>
      <DropdownDivider />
      <DropdownItem href="#">
        <ShieldCheckIcon />
        <DropdownLabel>Privacy policy</DropdownLabel>
      </DropdownItem>
      <DropdownItem href="#">
        <LightBulbIcon />
        <DropdownLabel>Share feedback</DropdownLabel>
      </DropdownItem>
      <DropdownDivider />
      <DropdownItem href="#">
        <ArrowRightStartOnRectangleIcon />
        <DropdownLabel>Sign out</DropdownLabel>
      </DropdownItem>
    </DropdownMenu>
  )
}

export function ApplicationLayout({

  children
}: {
  
  children: React.ReactNode
}) {
  let pathname = usePathname()

  return (
    <SidebarLayout
      navbar={
        <Navbar>
          <NavbarSpacer />
          // In the navbar
<NavbarSection>
  <UserMenu variant="navbar" />
</NavbarSection>


        </Navbar>
      }
      sidebar={
        pathname.startsWith('/chat') ? (
          <AppSidebar />
        ) : (
          <Sidebar>
            <SidebarHeader>
              <Dropdown>
                <DropdownButton as={SidebarItem}>
                  <Avatar src="/teams/chartchek.svg" />
                  <SidebarLabel>ChartChek</SidebarLabel>
                  <ChevronDownIcon />
                </DropdownButton>
                <DropdownMenu className="min-w-80 lg:min-w-64" anchor="bottom start">
                  <DropdownItem href="/settings">
                    <Cog8ToothIcon />
                    <DropdownLabel>Settings</DropdownLabel>
                  </DropdownItem>
                  <DropdownDivider />
                  <DropdownItem href="#">
                    <Avatar slot="icon" src="/teams/chartchek.svg" />
                    <DropdownLabel>ChartChek</DropdownLabel>
                  </DropdownItem>
                  <DropdownItem href="#">
                    <Avatar slot="icon" initials="TJC" className="bg-blue-500 text-white" />
                    <DropdownLabel>The Joint Commission</DropdownLabel>
                  </DropdownItem>
                  <DropdownItem href="#">
                    <Avatar slot="icon" initials="DHCS" className="bg-green-500 text-white" />
                    <DropdownLabel>DHCS</DropdownLabel>
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </SidebarHeader>

            <SidebarBody>
              <SidebarSection>
                <SidebarItem href="/" current={pathname === '/'}>
                  <HomeIcon />
                  <SidebarLabel>Home</SidebarLabel>
                </SidebarItem>
                <SidebarItem href="/facilities" current={pathname.startsWith('/facilities')}>
                  <BuildingOfficeIcon />
                  <SidebarLabel>Facilities</SidebarLabel>
                </SidebarItem>
                <SidebarItem href="/documents" current={pathname.startsWith('/documents')}>
                  <DocumentIcon />
                  <SidebarLabel>Documents</SidebarLabel>
                </SidebarItem>
                <SidebarItem href="/organizations" current={pathname.startsWith('/organizations')}>
                  <BuildingLibraryIcon />
                  <SidebarLabel>Organizations</SidebarLabel>
                </SidebarItem>
                <SidebarItem href="/chat" current={pathname.startsWith('/chat')}>
                  <ChatBubbleLeftRightIcon />
                  <SidebarLabel>Chat</SidebarLabel>
                </SidebarItem>
                <SidebarItem href="/settings" current={pathname.startsWith('/settings')}>
                  <Cog6ToothIcon />
                  <SidebarLabel>Settings</SidebarLabel>
                </SidebarItem>
              </SidebarSection>

              <SidebarSpacer />

              <SidebarSection>
                <SidebarItem href="#">
                  <QuestionMarkCircleIcon />
                  <SidebarLabel>Support</SidebarLabel>
                </SidebarItem>
                <SidebarItem href="#">
                  <SparklesIcon />
                  <SidebarLabel>Changelog</SidebarLabel>
                </SidebarItem>
              </SidebarSection>
            </SidebarBody>

            <SidebarFooter className="max-lg:hidden">
              <UserMenu variant="sidebar" />
            </SidebarFooter>
          </Sidebar>
        )
      }
    >
      {children}
    </SidebarLayout>
  )
}
