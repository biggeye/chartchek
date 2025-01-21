// app/page.tsx
import Chat from '@/components/Chat'
import ChatHeader from '@/components/ChatHeader'
// import { AppSidebar } from '@/components/AppSidebar'
// (Import any other needed components)

export default function Page() {
  return (
    <main className="flex h-screen flex-col">
      {/* Top Header */}
      <ChatHeader />

      {/* Main area: Sidebar + Chat */}
      <div className="flex flex-1">
       
        <div className="flex-1 flex flex-col">
          {/* The Chat component includes the input, the message list, etc. */}
          <Chat />
        </div>
      </div>
    </main>
  )
}
