import { defineStore } from 'pinia'
import store from '../index'
import { getAppConfigs, type AppConfigData } from '@/api/system'

interface StateType {
  appConfig: AppConfigData | null
  loading: boolean
  loaded: boolean
}

const useStore = defineStore('appConfig', {
  state: (): StateType => ({
    appConfig: null,
    loading: false,
    loaded: false,
  }),
  getters: {
    storeAppConfig: (state) => state.appConfig,
    storeLoading: (state) => state.loading,
    storeLoaded: (state) => state.loaded,
    meetingEnabled: (state) => !!state.appConfig?.meeting,
  },
  actions: {
    async fetchAppConfig(silent = true) {
      if (this.loading) return this.appConfig

      this.loading = true
      try {
        const { data } = await getAppConfigs()
        this.appConfig = data ?? null
        return this.appConfig
      } catch (error) {
        if (!silent) {
          console.error('Failed to fetch app config', error)
        }
        return this.appConfig
      } finally {
        this.loading = false
        this.loaded = true
      }
    },
    updateAppConfig(config: Partial<AppConfigData>) {
      this.appConfig = {
        ...(this.appConfig ?? {}),
        ...config,
      }
    },
  },
})

export default function useAppConfigStore() {
  return useStore(store)
}
