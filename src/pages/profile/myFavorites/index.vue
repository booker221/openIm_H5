<template>
  <div class="page_container min-h-full bg-[#f8f9fa]">
    <NavBar :title="$t('profileMenu.myFavorites')" />

    <div class="px-4 pb-6 pt-3">
      <van-search
        v-model="keyword"
        shape="round"
        :placeholder="$t('profileMenu.searchFavorites')"
        @search="search"
        @clear="clearSearch"
      />

      <van-list
        v-if="favorites.length"
        v-model:loading="loading"
        :finished="finished"
        :finished-text="$t('noMore')"
        @load="loadMore"
      >
        <div
          v-for="item in favorites"
          :key="item.id"
          class="mt-3 rounded-md bg-white p-4"
        >
          <div class="flex items-center justify-between">
            <div class="rounded-full bg-[#f4f7fb] px-2 py-1 text-xs text-primary">
              {{ getFavoriteTypeName(item.type) }}
            </div>
            <div class="text-xs text-sub-text">{{ formatTime(item.createTime) }}</div>
          </div>

          <div class="mt-3 text-sm font-medium text-[#0C1C33]">
            {{ getFavoriteTitle(item) }}
          </div>
          <div class="mt-1 break-all text-sm text-sub-text">
            {{ getFavoriteDesc(item) }}
          </div>

          <img
            v-if="item.thumbnail"
            class="mt-3 h-[120px] w-[120px] rounded-md object-cover"
            :src="item.thumbnail"
            alt=""
            @click="previewFavorite(item)"
          />

          <div class="mt-3 flex justify-end">
            <van-button size="small" plain danger @click="removeFavorite(item)">
              {{ $t('buttons.remove') }}
            </van-button>
          </div>
        </div>
      </van-list>

      <CommonEmpty
        v-else-if="!loading"
        :description="
          keyword.trim()
            ? $t('profileMenu.emptySearchFavorites')
            : $t('profileMenu.emptyFavorites')
        "
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import { showConfirmDialog, showImagePreview } from 'vant'
import NavBar from '@/components/NavBar/index.vue'
import CommonEmpty from '@/components/CommonEmpty/index.vue'
import { deleteFavorite, getFavoriteList, searchFavorite } from '@/api/favorite'
import type { FavoriteItem } from '@/api/data'
import { feedbackToast } from '@/utils/common'

const { t } = useI18n()
const keyword = ref('')
const favorites = ref<FavoriteItem[]>([])
const pageNumber = ref(1)
const pageSize = 20
const total = ref(0)
const loading = ref(false)
const finished = ref(false)

const loadFavorites = async (refresh = false) => {
  if (loading.value) return

  loading.value = true
  try {
    if (refresh) {
      pageNumber.value = 1
      finished.value = false
    }

    const request = keyword.value.trim()
      ? searchFavorite({
          keyword: keyword.value.trim(),
          pageNumber: pageNumber.value,
          showNumber: pageSize,
        })
      : getFavoriteList({
          pageNumber: pageNumber.value,
          showNumber: pageSize,
        })

    const { data } = await request
    const items = data?.favorites ?? []
    total.value = data?.total ?? 0

    if (refresh) {
      favorites.value = items
    } else {
      favorites.value.push(...items)
    }

    finished.value = favorites.value.length >= total.value || items.length < pageSize
    if (!finished.value) {
      pageNumber.value += 1
    }
  } catch (error) {
    finished.value = true
  } finally {
    loading.value = false
  }
}

const search = () => loadFavorites(true)

const clearSearch = () => {
  keyword.value = ''
  loadFavorites(true)
}

const loadMore = () => {
  if (!finished.value) {
    loadFavorites(pageNumber.value === 1)
  }
}

const getFavoriteTypeName = (type: number) => {
  switch (type) {
    case 1:
      return '文本'
    case 2:
      return '图片'
    case 3:
      return '链接'
    case 4:
      return '文件'
    case 5:
      return '语音'
    case 6:
      return '视频'
    case 7:
      return '位置'
    default:
      return '未知'
  }
}

const getFavoriteTitle = (item: FavoriteItem) =>
  item.title || item.description || item.content || `[${getFavoriteTypeName(item.type)}]`

const getFavoriteDesc = (item: FavoriteItem) => {
  if (item.title && item.content && item.content !== item.title) return item.content
  return item.description || item.content || ''
}

const formatTime = (time?: number) =>
  time ? dayjs(time).format('YYYY-MM-DD HH:mm') : ''

const previewFavorite = (item: FavoriteItem) => {
  if (item.type === 2 && item.content) {
    showImagePreview({
      images: [item.content],
    })
    return
  }

  if ((item.type === 3 || item.type === 6) && item.content) {
    window.open(item.content, '_blank')
  }
}

const removeFavorite = async (item: FavoriteItem) => {
  try {
    await showConfirmDialog({
      message: t('messageTip.deleteFavoriteConfirm'),
    })
    await deleteFavorite([item.id])
    feedbackToast({
      message: t('messageTip.deleteSuccess'),
    })
    await loadFavorites(true)
  } catch (error) {}
}

onMounted(() => loadFavorites(true))
</script>
