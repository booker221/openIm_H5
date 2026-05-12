<template>
  <div class="emoji_panel">
    <div class="emoji_panel__body">
      <div v-if="isLoading" class="emoji_panel__loading">
        <van-loading size="22" color="#0089FF" />
      </div>
      <div v-else class="emoji_panel__grid">
        <button
          v-for="item in currentEmojiList"
          :key="`${activeCategory}-${item.group}-${item.order}-${item.emoji}`"
          class="emoji_panel__item"
          type="button"
          @click="emit('select', item.emoji)"
        >
          {{ item.emoji }}
        </button>
      </div>
    </div>
    <div class="emoji_panel__tabs">
      <button
        v-for="category in categories"
        :key="category.id"
        class="emoji_panel__tab"
        :class="{ 'emoji_panel__tab_active': category.id === activeCategory }"
        type="button"
        @click="activeCategory = category.id"
      >
        {{ category.icon }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface EmojiRecord {
  emoji: string
  group: number
  order: number
  annotation?: string
  tags?: string[]
  shortcodes?: string[]
}

type EmojiPickerPanelProps = {
  visible: boolean
}

type EmojiCategoryConfig = {
  id:
    | 'face'
    | 'people'
    | 'nature'
    | 'food'
    | 'travel'
    | 'activity'
    | 'object'
    | 'symbol'
    | 'flag'
  icon: string
  groups: number[]
  includeHearts?: boolean
}

const props = defineProps<EmojiPickerPanelProps>()

const emit = defineEmits<{
  (event: 'select', emoji: string): void
}>()

const PRIORITY_FLOWER_EMOJIS = [
  '🌹',
  '🌷',
  '🌺',
  '🌸',
  '🌻',
  '🌼',
  '💐',
  '🥀',
  '🪷',
]

const HEART_EMOJIS = [
  '💘',
  '💝',
  '💖',
  '💗',
  '💓',
  '💕',
  '💞',
  '💟',
  '❣️',
  '💔',
  '❤️',
  '🩷',
  '🧡',
  '💛',
  '💚',
  '💙',
  '🩵',
  '💜',
  '🤎',
  '🖤',
  '🩶',
  '🤍',
  '❤️‍🔥',
  '❤️‍🩹',
]

const CATEGORY_CONFIG: EmojiCategoryConfig[] = [
  { id: 'face', icon: '😀', groups: [0] },
  { id: 'people', icon: '👍', groups: [1] },
  { id: 'nature', icon: '🌸', groups: [3] },
  { id: 'food', icon: '🍔', groups: [4] },
  { id: 'travel', icon: '✈️', groups: [5] },
  { id: 'activity', icon: '⚽', groups: [6] },
  { id: 'object', icon: '💡', groups: [7] },
  { id: 'symbol', icon: '❤️', groups: [8], includeHearts: true },
  { id: 'flag', icon: '🏳️', groups: [9] },
]

const FALLBACK_EMOJIS: EmojiRecord[] = [
  { emoji: '😀', group: 0, order: 1 },
  { emoji: '😁', group: 0, order: 2 },
  { emoji: '😂', group: 0, order: 3 },
  { emoji: '🤣', group: 0, order: 4 },
  { emoji: '😊', group: 0, order: 5 },
  { emoji: '😍', group: 0, order: 6 },
  { emoji: '😘', group: 0, order: 7 },
  { emoji: '🥳', group: 0, order: 8 },
  { emoji: '😎', group: 0, order: 9 },
  { emoji: '😭', group: 0, order: 10 },
  { emoji: '😡', group: 0, order: 11 },
  { emoji: '👍', group: 1, order: 12 },
  { emoji: '👏', group: 1, order: 13 },
  { emoji: '🙏', group: 1, order: 14 },
  { emoji: '💪', group: 1, order: 15 },
  { emoji: '🌹', group: 3, order: 16 },
  { emoji: '🌷', group: 3, order: 17 },
  { emoji: '🌺', group: 3, order: 18 },
  { emoji: '🌸', group: 3, order: 19 },
  { emoji: '🌻', group: 3, order: 20 },
  { emoji: '🍔', group: 4, order: 21 },
  { emoji: '🍟', group: 4, order: 22 },
  { emoji: '🍰', group: 4, order: 23 },
  { emoji: '☕', group: 4, order: 24 },
  { emoji: '✈️', group: 5, order: 25 },
  { emoji: '🚗', group: 5, order: 26 },
  { emoji: '🏠', group: 5, order: 27 },
  { emoji: '⚽', group: 6, order: 28 },
  { emoji: '🏀', group: 6, order: 29 },
  { emoji: '🎉', group: 6, order: 30 },
  { emoji: '💡', group: 7, order: 31 },
  { emoji: '📱', group: 7, order: 32 },
  { emoji: '💻', group: 7, order: 33 },
  { emoji: '❤️', group: 8, order: 34 },
  { emoji: '💯', group: 8, order: 35 },
  { emoji: '✅', group: 8, order: 36 },
  { emoji: '🏳️', group: 9, order: 37 },
]

const isLoading = ref(false)
const hasLoaded = ref(false)
const emojiList = ref<EmojiRecord[]>([])
const activeCategory = ref<EmojiCategoryConfig['id']>('face')

const isFlowerEmoji = (item: EmojiRecord) =>
  PRIORITY_FLOWER_EMOJIS.includes(item.emoji) ||
  item.annotation?.toLowerCase().includes('flower') ||
  item.tags?.some((tag) => tag.toLowerCase() === 'flower')

const isHeartEmoji = (item: EmojiRecord) =>
  HEART_EMOJIS.includes(item.emoji) ||
  item.annotation?.toLowerCase().includes('heart') ||
  item.tags?.some((tag) => tag.toLowerCase().includes('heart')) ||
  item.shortcodes?.some((shortcode) => shortcode.toLowerCase().includes('heart'))

const sortEmojiList = (list: EmojiRecord[]) => {
  return [...list].sort((prev, next) => {
    if (prev.group !== next.group) {
      return prev.group - next.group
    }

    if (prev.group === 3 || next.group === 3) {
      const prevPriority = PRIORITY_FLOWER_EMOJIS.indexOf(prev.emoji)
      const nextPriority = PRIORITY_FLOWER_EMOJIS.indexOf(next.emoji)

      if (prevPriority !== -1 || nextPriority !== -1) {
        if (prevPriority === -1) return 1
        if (nextPriority === -1) return -1
        return prevPriority - nextPriority
      }
    }

    return prev.order - next.order
  })
}

const sortCategoryEmojiList = (
  list: EmojiRecord[],
  categoryID: EmojiCategoryConfig['id'],
) => {
  return [...list].sort((prev, next) => {
    if (categoryID === 'nature') {
      const prevFlower = isFlowerEmoji(prev)
      const nextFlower = isFlowerEmoji(next)
      if (prevFlower !== nextFlower) {
        return prevFlower ? -1 : 1
      }
    }

    if (categoryID === 'symbol') {
      const prevHeart = isHeartEmoji(prev)
      const nextHeart = isHeartEmoji(next)
      if (prevHeart !== nextHeart) {
        return prevHeart ? -1 : 1
      }
    }

    return prev.order - next.order
  })
}

const ensureEmojiList = async () => {
  if (hasLoaded.value || isLoading.value) {
    return
  }

  isLoading.value = true
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}emojis.json`)
    if (!response.ok) {
      throw new Error(`failed to fetch emoji data: ${response.status}`)
    }

    const data = (await response.json()) as EmojiRecord[]
    emojiList.value = sortEmojiList(data)
  } catch (error) {
    console.error(error)
    emojiList.value = sortEmojiList(FALLBACK_EMOJIS)
  } finally {
    hasLoaded.value = true
    isLoading.value = false
  }
}

const categories = computed(() => {
  const groupSet = new Set<number>()
  emojiList.value.forEach((item) => groupSet.add(item.group))

  return CATEGORY_CONFIG.filter((category) => {
    if (category.includeHearts && emojiList.value.some(isHeartEmoji)) {
      return true
    }
    return category.groups.some((group) => groupSet.has(group))
  })
})

const currentEmojiList = computed(() => {
  const category = categories.value.find((item) => item.id === activeCategory.value)
  if (!category) {
    return []
  }

  return sortCategoryEmojiList(
    emojiList.value.filter(
      (item) =>
        category.groups.includes(item.group) ||
        (category.includeHearts && isHeartEmoji(item)),
    ),
    category.id,
  )
})

watch(
  () => props.visible,
  async (visible) => {
    if (!visible) {
      return
    }

    await ensureEmojiList()

    if (!categories.value.some((item) => item.id === activeCategory.value)) {
      activeCategory.value = categories.value[0]?.id ?? 'face'
    }
  },
  { immediate: true },
)
</script>

<style lang="scss" scoped>
.emoji_panel {
  height: 300px;
  display: flex;
  flex-direction: column;
  background: #f0f2f6;
  border-top: 1px solid #e3e7ef;
}

.emoji_panel__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px;
  -webkit-overflow-scrolling: touch;
}

.emoji_panel__loading {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.emoji_panel__grid {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 8px;
  align-content: start;
}

.emoji_panel__item {
  height: 40px;
  border: none;
  border-radius: 10px;
  background: #fff;
  font-size: 24px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.emoji_panel__item:active {
  background: #e7eef8;
}

.emoji_panel__tabs {
  display: flex;
  align-items: center;
  gap: 8px;
  border-top: 1px solid #e3e7ef;
  padding: 8px 12px calc(8px + env(safe-area-inset-bottom));
  overflow-x: auto;
}

.emoji_panel__tab {
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 10px;
  background: transparent;
  font-size: 20px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.emoji_panel__tab_active {
  background: #fff;
  box-shadow: inset 0 0 0 1px #d7deea;
}
</style>
