import { useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@apollo/client/react'
import { Header } from '../../components/header'
import { SearchBar } from '../../components/search'
import { Thumbnails } from '../../components/thumbnails'
import {
  useLibrariesStore,
  GET_ALL_LIBRARIES,
  type Library,
} from '../../lib/libraries'

export const Route = createFileRoute('/_authenticated/')({
  component: HomePage,
})

function HomePage() {
  const { auth } = Route.useRouteContext()

  // Fetch libraries from GraphQL
  const { data: librariesData } = useQuery(GET_ALL_LIBRARIES)

  // Zustand store for library state
  const { libraries, activeLibraryId, setLibraries, setActiveLibrary } =
    useLibrariesStore()

  // Sync fetched libraries to store
  useEffect(() => {
    if (librariesData?.allLibraries) {
      setLibraries(librariesData.allLibraries)
    }
  }, [librariesData, setLibraries])

  const profile = auth.user
    ? { username: auth.user.username, email: '' }
    : null

  const handleLibraryChange = (library: Library) => {
    setActiveLibrary(library.id)
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#1d1d1d]">
      <Header
        profile={profile}
        libraries={libraries}
        activeLibraryId={activeLibraryId}
        onLibraryChange={handleLibraryChange}
      />
      <SearchBar />
      <main className="flex-grow overflow-auto">
        <Thumbnails />
      </main>
    </div>
  )
}
