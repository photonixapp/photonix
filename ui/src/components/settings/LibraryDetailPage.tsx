import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { Check, Copy, X } from 'lucide-react'
import { Button, Input, Switch } from '../ui'
import { Avatar } from '../ui/Avatar'
import { SettingsCard } from './SettingsCard'
import { AnalysisDisabledNotice, ANALYSIS_DISABLED_TITLE } from './AnalysisDisabledNotice'
import { useAuth } from '../../lib/auth/auth-context'
import { ENVIRONMENT, GET_PROFILE } from '../../lib/auth/graphql'
import {
  ADD_LIBRARY_USER,
  CREATE_LIBRARY_INVITATION,
  GET_LIBRARY_INVITATIONS,
  GET_LIBRARY_SETTING,
  GET_LIBRARY_USERS,
  REMOVE_LIBRARY_USER,
  REVOKE_LIBRARY_INVITATION,
  SET_LIBRARY_USER_OWNER,
  UPDATE_LIBRARY,
  type UpdateLibraryInput,
} from '../../lib/settings/graphql'
import { getErrorMessage } from '../../lib/onboarding'
import { addToast } from '../../lib/ui/store'

// Same classifier copy as onboarding step 5, so both surfaces stay consistent.
const CLASSIFIERS = [
  {
    key: 'classificationColorEnabled' as const,
    label: 'Color Analysis',
    description: 'Identify dominant colors in your photos for color-based searching',
  },
  {
    key: 'classificationStyleEnabled' as const,
    label: 'Style Detection',
    description: 'Detect photo styles like portrait, landscape, macro, etc.',
  },
  {
    key: 'classificationObjectEnabled' as const,
    label: 'Object Recognition',
    description: 'Identify objects, animals, and scenes in your photos',
  },
  {
    key: 'classificationLocationEnabled' as const,
    label: 'Location Awareness',
    description: 'Extract and organize photos by GPS location data',
  },
  {
    key: 'classificationFaceEnabled' as const,
    label: 'Face Detection',
    description: 'Detect and group photos by faces for people-based browsing',
  },
]

type ToggleKey =
  | 'watchPhotos'
  | (typeof CLASSIFIERS)[number]['key']

export function LibraryDetailPage({ libraryId }: { libraryId: string }) {
  const { data, error, loading } = useQuery(GET_LIBRARY_SETTING, {
    variables: { libraryId },
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  })

  const setting = data?.librarySetting ?? null
  // librarySetting is owner-gated on the server, so an error with no data
  // means "member but not owner" (or not a member at all).
  const isOwner = !!setting

  return (
    <>
      {setting && (
        <>
          <GeneralCard
            key={`general-${setting.library.name}`}
            libraryId={libraryId}
            name={setting.library.name}
          />
          <StorageCard
            key={`storage-${setting.sourceFolder}-${setting.importPath}`}
            libraryId={libraryId}
            setting={setting}
          />
          <AnalysisCard libraryId={libraryId} setting={setting} />
        </>
      )}
      {!setting && !loading && error && (
        <SettingsCard title="Library settings" data-testid="library-not-owner">
          <p className="text-sm text-neutral-400">
            Only this library's owners can change its settings. You can see its
            members below.
          </p>
        </SettingsCard>
      )}
      <MembersCard libraryId={libraryId} isOwner={isOwner} />
    </>
  )
}

const generalSchema = z.object({
  name: z.string().min(3, 'Library name must be at least 3 characters'),
})

function GeneralCard({ libraryId, name }: { libraryId: string; name: string }) {
  const [updateLibrary, { loading }] = useMutation(UPDATE_LIBRARY, {
    refetchQueries: ['GetAllLibraries'],
  })
  const [saved, setSaved] = useState(false)

  const form = useForm({
    defaultValues: { name },
    validators: { onSubmit: generalSchema },
    onSubmit: async ({ value }) => {
      setSaved(false)
      try {
        await updateLibrary({
          variables: { input: { libraryId, name: value.name } },
        })
        setSaved(true)
      } catch (err) {
        addToast(err instanceof Error ? err.message : "Couldn't rename library")
      }
    },
  })

  return (
    <SettingsCard title="General" data-testid="library-general-card">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          form.handleSubmit()
        }}
        className="space-y-4"
      >
        <form.Field name="name">
          {(field) => (
            <Input
              label="Library name"
              name={field.name}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              error={getErrorMessage(field.state.meta.errors)}
              data-testid="library-name-input"
            />
          )}
        </form.Field>
        {saved && (
          <div
            className="rounded-md bg-green-800/60 p-3 text-sm text-green-200"
            data-testid="library-general-success"
          >
            Saved!
          </div>
        )}
        <div className="flex justify-end">
          <Button type="submit" isLoading={loading} data-testid="library-name-save">
            Save
          </Button>
        </div>
      </form>
    </SettingsCard>
  )
}

interface LibrarySettingShape {
  library: {
    name: string
    classificationColorEnabled: boolean
    classificationLocationEnabled: boolean
    classificationFaceEnabled: boolean
    classificationStyleEnabled: boolean
    classificationObjectEnabled: boolean
  }
  sourceFolder: string | null
  watchPhotos: boolean | null
  importPath: string | null
  deleteAfterImport: boolean | null
}

/** Shared optimistic-toggle helper: flip instantly, save one field via the
 * consolidated mutation, revert with a toast on failure. */
function useLibraryToggles(
  libraryId: string,
  setting: LibrarySettingShape,
  analysisDisabled = false
) {
  const [updateLibrary] = useMutation(UPDATE_LIBRARY)
  const [overrides, setOverrides] = useState<Partial<Record<ToggleKey, boolean>>>({})

  const serverValues = useMemo<Record<ToggleKey, boolean>>(
    () => ({
      watchPhotos: !!setting.watchPhotos,
      classificationColorEnabled: setting.library.classificationColorEnabled,
      classificationLocationEnabled: setting.library.classificationLocationEnabled,
      classificationFaceEnabled: setting.library.classificationFaceEnabled,
      classificationStyleEnabled: setting.library.classificationStyleEnabled,
      classificationObjectEnabled: setting.library.classificationObjectEnabled,
    }),
    [setting]
  )

  const valueOf = (key: ToggleKey) =>
    overrides[key] !== undefined ? overrides[key]! : serverValues[key]

  const toggle = (key: ToggleKey) => {
    const newValue = !valueOf(key)
    // Stored-results mode: a classifier can't be switched on, so say why and send nothing.
    if (analysisDisabled && newValue && key.startsWith('classification')) {
      addToast(ANALYSIS_DISABLED_TITLE)
      return
    }
    setOverrides((prev) => ({ ...prev, [key]: newValue }))
    const input: UpdateLibraryInput = { libraryId, [key]: newValue }
    updateLibrary({ variables: { input } }).catch((err: unknown) => {
      setOverrides((prev) => ({ ...prev, [key]: !newValue }))
      addToast(err instanceof Error ? err.message : "Couldn't save setting")
    })
  }

  return { valueOf, toggle }
}

const storageSchema = z.object({
  sourceFolder: z.string().min(1, 'Source folder is required'),
  importPath: z.string(),
})

function StorageCard({
  libraryId,
  setting,
}: {
  libraryId: string
  setting: LibrarySettingShape
}) {
  const { valueOf, toggle } = useLibraryToggles(libraryId, setting)
  const [updateLibrary, { loading }] = useMutation(UPDATE_LIBRARY)
  const [deleteAfterImport, setDeleteAfterImport] = useState(
    !!setting.deleteAfterImport
  )
  const [saved, setSaved] = useState(false)

  const form = useForm({
    defaultValues: {
      sourceFolder: setting.sourceFolder ?? '',
      importPath: setting.importPath ?? '',
    },
    validators: { onSubmit: storageSchema },
    onSubmit: async ({ value }) => {
      setSaved(false)
      try {
        await updateLibrary({
          variables: {
            input: {
              libraryId,
              sourceFolder: value.sourceFolder,
              importPath: value.importPath,
              deleteAfterImport,
            },
          },
        })
        setSaved(true)
      } catch (err) {
        addToast(err instanceof Error ? err.message : "Couldn't save storage settings")
      }
    },
  })

  return (
    <SettingsCard
      title="Storage & Import"
      description="Where this library's photos live and how new ones arrive."
      data-testid="library-storage-card"
    >
      <div className="space-y-4">
        <Switch
          label="Watch folder for new photos"
          description="Import photos automatically when files change on disk"
          checked={valueOf('watchPhotos')}
          onChange={() => toggle('watchPhotos')}
          data-testid="setting-watchPhotos"
        />

        <form
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit()
          }}
          className="space-y-4 border-t border-white/5 pt-4"
        >
          <form.Field name="sourceFolder">
            {(field) => (
              <Input
                label="Source folder"
                name={field.name}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                error={getErrorMessage(field.state.meta.errors)}
                hint="Base path on the server where photos are stored"
                data-testid="library-source-folder-input"
              />
            )}
          </form.Field>
          <form.Field name="importPath">
            {(field) => (
              <Input
                label="Import path (optional)"
                name={field.name}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                hint="Additional folder to import from; leave empty for none"
                data-testid="library-import-path-input"
              />
            )}
          </form.Field>
          <Switch
            label="Delete after import"
            description="Remove photos from the import path once imported"
            checked={deleteAfterImport}
            onChange={(e) => setDeleteAfterImport(e.target.checked)}
            data-testid="library-delete-after-import"
          />
          {saved && (
            <div
              className="rounded-md bg-green-800/60 p-3 text-sm text-green-200"
              data-testid="library-storage-success"
            >
              Saved!
            </div>
          )}
          <div className="flex justify-end">
            <Button
              type="submit"
              isLoading={loading}
              data-testid="library-storage-save"
            >
              Save
            </Button>
          </div>
        </form>
      </div>
    </SettingsCard>
  )
}

function AnalysisCard({
  libraryId,
  setting,
}: {
  libraryId: string
  setting: LibrarySettingShape
}) {
  const { data: environmentData, loading: environmentLoading } = useQuery(ENVIRONMENT)
  const analysisDisabled = !!environmentData?.environment?.analysisDisabled
  // Refuse "on" clicks until the environment is known; the notice waits for the answer.
  const { valueOf, toggle } = useLibraryToggles(
    libraryId,
    setting,
    analysisDisabled || environmentLoading
  )

  return (
    <SettingsCard
      title="Image Analysis"
      description="Photonix analyses photos in the background so you can search and filter by what's in them."
      data-testid="library-analysis-card"
    >
      <div className="space-y-4">
        {analysisDisabled && <AnalysisDisabledNotice />}
        {CLASSIFIERS.map(({ key, label, description }) => (
          <Switch
            key={key}
            label={label}
            description={description}
            checked={valueOf(key)}
            onChange={() => toggle(key)}
            data-testid={`setting-${key}`}
          />
        ))}
      </div>
    </SettingsCard>
  )
}

function MembersCard({
  libraryId,
  isOwner,
}: {
  libraryId: string
  isOwner: boolean
}) {
  const { user: authUser } = useAuth()
  const { data: profileData } = useQuery(GET_PROFILE)
  const myId = profileData?.profile?.id
  const myUsername = profileData?.profile?.username ?? authUser?.username

  const { data, refetch } = useQuery(GET_LIBRARY_USERS, {
    variables: { libraryId },
    fetchPolicy: 'cache-and-network',
  })
  const { data: invitationsData, refetch: refetchInvitations } = useQuery(
    GET_LIBRARY_INVITATIONS,
    {
      variables: { libraryId },
      fetchPolicy: 'cache-and-network',
      skip: !isOwner,
      errorPolicy: 'all',
    }
  )

  const [addLibraryUser, { loading: adding }] = useMutation(ADD_LIBRARY_USER)
  const [removeLibraryUser] = useMutation(REMOVE_LIBRARY_USER)
  const [setLibraryUserOwner] = useMutation(SET_LIBRARY_USER_OWNER)
  const [createInvitation, { loading: inviting }] = useMutation(
    CREATE_LIBRARY_INVITATION
  )
  const [revokeInvitation] = useMutation(REVOKE_LIBRARY_INVITATION)

  const [addUsername, setAddUsername] = useState('')
  const [createdInviteUrl, setCreatedInviteUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const members = data?.libraryUsers ?? []

  const onAdd = async () => {
    if (!addUsername.trim()) return
    try {
      await addLibraryUser({
        variables: { libraryId, username: addUsername.trim() },
      })
      addToast(`Added ${addUsername.trim()}`, 'success')
      setAddUsername('')
      refetch()
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Couldn't add member")
    }
  }

  const onRemove = async (userId: string, username: string, isSelf: boolean) => {
    const message = isSelf
      ? 'Leave this library? You will lose access to its photos.'
      : `Remove ${username} from this library?`
    if (!window.confirm(message)) return
    try {
      await removeLibraryUser({ variables: { libraryId, userId } })
      refetch()
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Couldn't remove member")
    }
  }

  const onToggleOwner = async (userId: string, owner: boolean) => {
    try {
      await setLibraryUserOwner({ variables: { libraryId, userId, owner } })
      refetch()
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Couldn't change owner")
    }
  }

  const onCreateInvite = async () => {
    try {
      const result = await createInvitation({ variables: { libraryId } })
      const url = result.data?.createLibraryInvitation.invitation.url
      if (url) {
        setCreatedInviteUrl(`${window.location.origin}${url}`)
        setCopied(false)
      }
      refetchInvitations()
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Couldn't create invite link")
    }
  }

  const onCopyInvite = async () => {
    if (!createdInviteUrl) return
    try {
      await navigator.clipboard.writeText(createdInviteUrl)
      setCopied(true)
    } catch {
      addToast("Couldn't copy — select the link text and copy manually")
    }
  }

  const onRevoke = async (invitationId: string) => {
    try {
      await revokeInvitation({ variables: { invitationId } })
      refetchInvitations()
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Couldn't revoke invitation")
    }
  }

  const invitations = invitationsData?.libraryInvitations ?? []

  return (
    <SettingsCard
      title="Members"
      description={
        isOwner
          ? 'People with access to this library. Owners can change settings and manage members.'
          : 'People with access to this library.'
      }
      data-testid="library-members-card"
    >
      <ul className="divide-y divide-white/5" data-testid="library-members-list">
        {members.map((member) => {
          const isSelf = member.user.id === myId || member.user.username === myUsername
          return (
            <li
              key={member.id}
              className="flex items-center gap-3 py-3"
              data-testid={`member-row-${member.user.username}`}
            >
              <Avatar
                username={member.user.username}
                avatarUrl={member.user.avatarUrl}
                size={36}
              />
              <div className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-neutral-200">
                  {member.user.username}
                  {isSelf && <span className="text-neutral-500"> (you)</span>}
                </span>
                {member.owner && (
                  <span className="text-xs text-teal-300">Owner</span>
                )}
              </div>
              {isOwner && !isSelf && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleOwner(member.user.id, !member.owner)}
                  data-testid={`member-owner-toggle-${member.user.username}`}
                >
                  {member.owner ? 'Remove owner' : 'Make owner'}
                </Button>
              )}
              {(isOwner || isSelf) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-300 hover:text-red-200"
                  onClick={() =>
                    onRemove(member.user.id, member.user.username, isSelf)
                  }
                  data-testid={`member-remove-${member.user.username}`}
                >
                  {isSelf ? 'Leave' : 'Remove'}
                </Button>
              )}
            </li>
          )
        })}
      </ul>

      {isOwner && (
        <div className="mt-4 space-y-5 border-t border-white/5 pt-4">
          <div>
            <span className="mb-1.5 block text-sm font-medium text-neutral-300">
              Add a user from this server
            </span>
            <div className="flex gap-2">
              <Input
                name="add-member-username"
                placeholder="Exact username"
                value={addUsername}
                onChange={(e) => setAddUsername(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    onAdd()
                  }
                }}
                data-testid="add-member-input"
              />
              <Button
                type="button"
                onClick={onAdd}
                isLoading={adding}
                disabled={!addUsername.trim()}
                data-testid="add-member-button"
              >
                Add
              </Button>
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-sm font-medium text-neutral-300">
              Or invite someone with a link
            </span>
            <p className="mb-2 text-xs text-neutral-500">
              Anyone with the link can join this library (or create an account
              first). Links are single-use and expire after 14 days.
            </p>
            <Button
              type="button"
              variant="secondary"
              onClick={onCreateInvite}
              isLoading={inviting}
              data-testid="create-invite-button"
            >
              Create invite link
            </Button>

            {createdInviteUrl && (
              <div
                className="mt-3 flex items-center gap-2 rounded-md bg-neutral-900 p-2.5"
                data-testid="invite-link-box"
              >
                <code
                  className="flex-1 truncate text-xs text-neutral-300"
                  data-testid="invite-link-url"
                >
                  {createdInviteUrl}
                </code>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onCopyInvite}
                  data-testid="invite-link-copy"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            )}

            {invitations.length > 0 && (
              <ul className="mt-3 space-y-1.5" data-testid="pending-invites-list">
                {invitations.map((invitation) => (
                  <li
                    key={invitation.id}
                    className="flex items-center gap-2 text-xs text-neutral-400"
                  >
                    <span className="flex-1 truncate">
                      Pending invite · expires{' '}
                      {new Date(invitation.expiresAt).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => onRevoke(invitation.id)}
                      className="cursor-pointer rounded p-1 text-neutral-500 hover:bg-white/10 hover:text-red-300"
                      aria-label="Revoke invitation"
                      data-testid={`revoke-invite-${invitation.id}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </SettingsCard>
  )
}
