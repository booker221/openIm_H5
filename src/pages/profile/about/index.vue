<template>
  <div class="page_container">
    <NavBar :title="$t('profileMenu.aboutUs')" />

    <div class="mx-3 mt-2 overflow-hidden rounded-md bg-white">
      <div class="flex flex-col items-center border-b border-[#F1F4F8] px-6 py-8">
        <img class="h-[76px] w-[76px]" :src="logo" alt="" />
        <div class="mt-4 text-[17px] font-medium text-[#0C1C33]">{{ version }}</div>
      </div>

      <button
        v-for="(action, index) in actions"
        :key="action.key"
        type="button"
        class="flex w-full items-center justify-between px-4 py-5 text-left"
        :class="{ 'border-t border-[#F1F4F8]': index > 0 }"
        @click="action.onClick"
      >
        <span class="text-[16px] text-[#0C1C33]">{{ action.label }}</span>
        <div class="ml-4 flex items-center">
          <span v-if="action.value" class="mr-2 text-[16px] text-sub-text">
            {{ action.value }}
          </span>
          <img class="h-6 w-6" :src="back" alt="" />
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import NavBar from '@/components/NavBar/index.vue'
import logo from '@assets/images/logo.png'
import back from '@assets/images/profile/back.png'
import { bytesToSize, feedbackToast } from '@/utils/common'
import {
  getApiUrl,
  getChatUrl,
  getIMUserID,
  getSelectedHost,
  getWsUrl,
} from '@/utils/storage'
import { closeToast, showConfirmDialog, showLoadingToast } from 'vant'

type AboutAction = {
  key: string
  label: string
  value?: string
  onClick: () => void | Promise<void>
}

type PreservedStorageEntry = [string, string]

type IndexedDBFactoryWithDatabases = IDBFactory & {
  databases?: () => Promise<Array<{ name?: string | null }>>
}

const { t, locale } = useI18n()

const version = process.env.VERSION || document.title || 'OpenIM H5'
const cacheSize = ref(t('aboutPage.cacheSizeUnknown'))

const actions = computed<AboutAction[]>(() => [
  {
    key: 'check-version',
    label: t('aboutPage.checkNewVersion'),
    onClick: checkNewVersion,
  },
  {
    key: 'upload-logs',
    label: t('aboutPage.uploadAllLogs'),
    onClick: exportAllLogs,
  },
  {
    key: 'clear-cache',
    label: t('aboutPage.clearCache'),
    value: cacheSize.value,
    onClick: clearCache,
  },
])

const estimateStringSize = (storage: Storage) => {
  let total = 0
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index)
    if (!key) continue
    const value = storage.getItem(key) ?? ''
    total += (key.length + value.length) * 2
  }
  return total
}

const getCacheUsage = async () => {
  try {
    const usage = await navigator.storage?.estimate?.()
    if (typeof usage?.usage === 'number' && Number.isFinite(usage.usage)) {
      return usage.usage
    }
  } catch (error) {
    console.error('Failed to estimate storage usage', error)
  }

  return estimateStringSize(localStorage) + estimateStringSize(sessionStorage)
}

const refreshCacheSize = async () => {
  const usage = await getCacheUsage()
  cacheSize.value = usage > 0 ? bytesToSize(usage) : '0 B'
}

const checkNewVersion = () => {
  feedbackToast({
    message: t('aboutPage.currentLatestVersion', {
      version,
    }),
  })
}

const buildDiagnosticsContent = async () => {
  const usage = await getCacheUsage()
  const diagnostics = [
    `time: ${new Date().toISOString()}`,
    `version: ${version}`,
    `locale: ${locale.value}`,
    `url: ${window.location.href}`,
    `userAgent: ${navigator.userAgent}`,
    `userID: ${getIMUserID() ?? ''}`,
    `selectedHost: ${getSelectedHost() ?? ''}`,
    `apiUrl: ${getApiUrl()}`,
    `chatUrl: ${getChatUrl()}`,
    `wsUrl: ${getWsUrl()}`,
    `storageUsage: ${bytesToSize(usage)}`,
  ]
  return diagnostics.join('\n')
}

const downloadTextFile = (content: string, fileName: string) => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

const exportAllLogs = async () => {
  const content = await buildDiagnosticsContent()
  downloadTextFile(content, `openim-h5-diagnostics-${Date.now()}.txt`)
  feedbackToast({
    message: t('aboutPage.logsExported'),
  })
}

const getPreservedLocalStorageEntries = (): PreservedStorageEntry[] => {
  const keys = [
    'IM_TOKEN',
    'IM_CHAT_TOKEN',
    'IM_USERID',
    'wsUrl',
    'apiUrl',
    'chatUrl',
    'selectedHost',
    'logLevel',
    'IMLoginMode',
    'IMPhoneNumber',
    'IMPhoneAreaCode',
    'IMPhoneRememberPassword',
    'IMPhonePassword',
    'IMAccountLogin',
    'IMAccountRememberPassword',
    'IMAccountPassword',
  ]

  return keys
    .map((key) => {
      const value = localStorage.getItem(key)
      return value === null ? null : ([key, value] as PreservedStorageEntry)
    })
    .filter((entry): entry is PreservedStorageEntry => !!entry)
}

const restoreStorageEntries = (storage: Storage, entries: PreservedStorageEntry[]) => {
  entries.forEach(([key, value]) => storage.setItem(key, value))
}

const clearCacheStorage = async () => {
  if (!('caches' in window)) return
  const cacheKeys = await caches.keys()
  await Promise.all(cacheKeys.map((cacheKey) => caches.delete(cacheKey)))
}

const clearIndexedDBStorage = async () => {
  if (typeof indexedDB === 'undefined') return
  const indexedDBWithDatabases = indexedDB as IndexedDBFactoryWithDatabases
  if (!indexedDBWithDatabases.databases) return

  const databases = await indexedDBWithDatabases.databases()
  await Promise.all(
    databases
      .map((database) => database.name)
      .filter((name): name is string => !!name)
      .map(
        (name) =>
          new Promise<void>((resolve, reject) => {
            const request = indexedDB.deleteDatabase(name)
            request.onsuccess = () => resolve()
            request.onblocked = () => resolve()
            request.onerror = () => reject(request.error)
          }),
      ),
  )
}

const clearCache = async () => {
  try {
    await showConfirmDialog({
      message: t('aboutPage.clearCacheConfirm'),
    })
  } catch {
    return
  }

  const preservedLocalStorage = getPreservedLocalStorageEntries()
  const preservedSessionStorage = sessionStorage.getItem('IMI18n')
    ? ([['IMI18n', sessionStorage.getItem('IMI18n')!]] as PreservedStorageEntry[])
    : []

  showLoadingToast({
    message: t('aboutPage.clearingCache'),
    duration: 0,
    forbidClick: true,
  })

  try {
    await clearCacheStorage()
    await clearIndexedDBStorage()

    localStorage.clear()
    sessionStorage.clear()

    restoreStorageEntries(localStorage, preservedLocalStorage)
    restoreStorageEntries(sessionStorage, preservedSessionStorage)

    await refreshCacheSize()

    closeToast()
    feedbackToast({
      message: t('aboutPage.clearCacheSuccess'),
      onClose: () => window.location.reload(),
    })
  } catch (error) {
    closeToast()
    feedbackToast({
      message: t('aboutPage.clearCacheFailed'),
      error,
    })
  }
}

onMounted(() => {
  refreshCacheSize()
})
</script>
