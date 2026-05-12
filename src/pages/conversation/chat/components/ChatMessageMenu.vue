<template>
  <Teleport to="body">
    <div v-if="show" class="menu_mask" @click="emit('close')"></div>
    <div
      v-if="show"
      class="message_menu"
      :style="{
        top: `${top}px`,
        gridTemplateColumns: `repeat(${menuColumns}, minmax(0, 1fr))`,
      }"
      @click.stop
    >
      <button
        v-for="item in items"
        :key="item.key"
        class="menu_item"
        type="button"
        @click="emit('select', item.key)"
      >
        <van-icon :name="item.icon" size="24" />
        <span>{{ item.label }}</span>
      </button>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type MessageMenuKey =
  | 'copy'
  | 'forward'
  | 'favorite'
  | 'reply'
  | 'multiple'
  | 'revoke'
  | 'delete'

interface MenuItem {
  key: MessageMenuKey
  icon: string
  label: string
}

const props = defineProps<{
  show: boolean
  top: number
  items: MenuItem[]
}>()

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'select', key: MessageMenuKey): void
}>()

const menuColumns = computed(() => {
  const count = props.items.length
  if (count <= 0) return 1
  if (count <= 5) return count
  return 4
})
</script>

<style lang="scss" scoped>
.menu_mask {
  position: fixed;
  inset: 0;
  background: transparent;
  z-index: 99;
}

.message_menu {
  position: fixed;
  left: 16px;
  right: 16px;
  z-index: 100;
  display: grid;
  align-items: stretch;
  border-radius: 12px;
  background: rgba(20, 20, 20, 0.92);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.24);
  padding: 12px 6px;
  row-gap: 8px;
  column-gap: 4px;
}

.menu_item {
  border: none;
  background: transparent;
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 0;
  min-height: 52px;
  padding: 4px 0;
  font-size: 12px;
  line-height: 1.1;
  text-align: center;
}
</style>
