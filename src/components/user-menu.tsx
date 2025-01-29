'use client'

import { createClient } from '@/utils/supabase/client'
import { Menu, Transition } from '@headlessui/react'
import { Fragment, useEffect, useState } from 'react'
import { UserIcon } from '@heroicons/react/24/solid'
import { User } from '@supabase/supabase-js'
import {
  HomeIcon,
  BuildingOfficeIcon,
  DocumentIcon,
  BuildingLibraryIcon,
  Cog6ToothIcon,
  ChatBubbleLeftRightIcon,
  QuestionMarkCircleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { usePathname } from 'next/navigation'

interface UserMenuProps {
  variant?: 'navbar' | 'sidebar'
}

interface NavItem {
  name: string
  href: string
  icon: typeof HomeIcon
  current?: boolean
}

export function UserMenu({ variant = 'navbar' }: UserMenuProps) {
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClient()
  const pathname = usePathname()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const navigation: NavItem[] = [
    { name: 'Home', href: '/', icon: HomeIcon, current: pathname === '/' },
    { name: 'Facilities', href: '/facilities', icon: BuildingOfficeIcon, current: pathname.startsWith('/facilities') },
    { name: 'Documents', href: '/documents', icon: DocumentIcon, current: pathname.startsWith('/documents') },
    { name: 'Organizations', href: '/organizations', icon: BuildingLibraryIcon, current: pathname.startsWith('/organizations') },
    { name: 'Chat', href: '/chat', icon: ChatBubbleLeftRightIcon, current: pathname.startsWith('/chat') },
    { name: 'Settings', href: '/settings', icon: Cog6ToothIcon, current: pathname.startsWith('/settings') },
  ]

  const secondaryNavigation: NavItem[] = [
    { name: 'Support', href: '#', icon: QuestionMarkCircleIcon },
    { name: 'Changelog', href: '#', icon: SparklesIcon },
  ]

  const ButtonComponent = variant === 'navbar' ? 'button' : 'div'
  const buttonClasses = variant === 'navbar' 
    ? 'flex items-center gap-2 rounded-full bg-gray-400/10 p-1 text-sm font-semibold leading-6 text-gray-400 hover:bg-gray-400/20'
    : 'flex items-center gap-2 rounded-lg p-2 text-sm font-semibold leading-6 text-gray-400 hover:bg-gray-400/10'

  const content = (
    <>
      {user?.user_metadata?.avatar_url ? (
        <img
          className="h-8 w-8 rounded-full bg-gray-800"
          src={user.user_metadata.avatar_url}
          alt=""
        />
      ) : (
        <UserIcon className="h-8 w-8 rounded-full bg-gray-800 p-1" />
      )}
      <span className="hidden lg:block">{user?.email ?? 'Guest'}</span>
    </>
  )

  return (
    <Menu as="div" className="relative">
      <Menu.Button as={ButtonComponent} className={buttonClasses}>
        {content}
      </Menu.Button>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 z-10 mt-2.5 w-56 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 focus:outline-none">
          {/* User Profile Section */}
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">{user?.email}</p>
            <p className="text-xs text-gray-500">Signed in as {user?.user_metadata?.full_name || user?.email?.split('@')[0]}</p>
          </div>

          {/* Primary Navigation */}
          <div className="py-1">
            {navigation.map((item) => (
              <Menu.Item key={item.name}>
                {({ active }) => (
                  <a
                    href={item.href}
                    className={`${
                      active ? 'bg-gray-50' : ''
                    } ${
                      item.current ? 'text-blue-600' : 'text-gray-700'
                    } group flex items-center px-4 py-2 text-sm`}
                  >
                    <item.icon
                      className={`mr-3 h-5 w-5 ${
                        item.current ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
                      }`}
                      aria-hidden="true"
                    />
                    {item.name}
                  </a>
                )}
              </Menu.Item>
            ))}
          </div>

          {/* Secondary Navigation */}
          <div className="py-1 border-t border-gray-100">
            {secondaryNavigation.map((item) => (
              <Menu.Item key={item.name}>
                {({ active }) => (
                  <a
                    href={item.href}
                    className={`${
                      active ? 'bg-gray-50' : ''
                    } group flex items-center px-4 py-2 text-sm text-gray-700`}
                  >
                    <item.icon
                      className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500"
                      aria-hidden="true"
                    />
                    {item.name}
                  </a>
                )}
              </Menu.Item>
            ))}
          </div>

          {/* Sign Out Button */}
          <div className="py-1 border-t border-gray-100">
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={handleSignOut}
                  className={`${
                    active ? 'bg-gray-50' : ''
                  } w-full px-4 py-2 text-left text-sm text-red-600 hover:text-red-700`}
                >
                  Sign out
                </button>
              )}
            </Menu.Item>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  )
}