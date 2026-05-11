import type { GroupItem } from '@openim/wasm-client-sdk/lib/types/entity'

export type GroupExtra = {
  isTop?: boolean
  [key: string]: unknown
}

export const parseGroupExtra = (ex?: string): GroupExtra => {
  if (!ex) {
    return {}
  }

  try {
    const parsed = JSON.parse(ex)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as GroupExtra
    }
  } catch (error) {}

  return {}
}

export const buildMergedGroupExtra = (
  ex: string | undefined,
  patch: GroupExtra,
) => JSON.stringify({
  ...parseGroupExtra(ex),
  ...patch,
})

export const isGroupAnnouncementPinned = (group?: Partial<GroupItem>) =>
  parseGroupExtra(group?.ex).isTop === true
