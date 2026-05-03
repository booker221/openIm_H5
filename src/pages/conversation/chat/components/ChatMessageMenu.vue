<template>
  <Teleport to="body">
    <div v-if="show" class="menu_mask" @click="emit('close')"></div>
    <div
      v-if="show"
      class="message_menu"
      :style="{
        top: `${top}px`,
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

defineProps<{
  show: boolean
  top: number
  items: MenuItem[]
}>()

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'select', key: MessageMenuKey): void
}>()
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
  display: flex;
  align-items: stretch;
  overflow-x: auto;
  border-radius: 12px;
  background: rgba(20, 20, 20, 0.92);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.24);
  padding: 10px 8px;
}

.menu_item {
  border: none;
  background: transparent;
  color: #fff;
  min-width: 68px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 12px;
  line-height: 1;
}
</style>
