<template>
  <div
    ref="inputRef"
    class="custom_rich_input"
    :class="{ needsclick: !input }"
    :placeholder="placeholder ?? $t('placeholder.typingMessage')"
    :contenteditable="!disable"
    @input="emitChange"
  />
</template>

<script setup lang="ts">
import { onBeforeUnmount } from 'vue'

interface CustomEditProps {
  placeholder?: string
  disable?: boolean
  input: string
}

const props = withDefaults(defineProps<CustomEditProps>(), {
  disable: false,
})

const { input, placeholder, disable } = toRefs(props)
const emit = defineEmits(['update:input', 'change', 'triggerAt'])

const inputRef = ref<HTMLDivElement>()
let latestHtml = ''
let cursorPos: Range | undefined

onUpdated(() => {
  latestHtml = input.value
})

const emitChange = () => {
  const content = inputRef.value?.innerHTML
  emit('change', content)
  if (content !== latestHtml) {
    emit('update:input', content)
  }
  latestHtml = content!
}

const clear = () => {
  inputRef.value!.innerHTML = ''
  latestHtml = ''
}

const buildRangeAtEnd = () => {
  const range = document.createRange()
  range.selectNodeContents(inputRef.value!)
  range.collapse(false)
  return range
}

const focusAtEnd = () => {
  if (!inputRef.value) return

  inputRef.value.focus()
  const selection = window.getSelection()
  const range = buildRangeAtEnd()
  selection?.removeAllRanges()
  selection?.addRange(range)
  cursorPos = range
}

const insertAtCursor = (nodes: Node[]) => {
  if (!inputRef.value) return

  const selection = window.getSelection()
  const range = cursorPos?.cloneRange() ?? buildRangeAtEnd()

  selection?.removeAllRanges()
  selection?.addRange(range)

  range.deleteContents()
  nodes.forEach((node) => {
    range.insertNode(node)
    range.setStartAfter(node)
  })
  range.collapse(false)
  selection?.removeAllRanges()
  selection?.addRange(range)
  cursorPos = range.cloneRange()
  emitChange()
}

const deletePreviousChar = () => {
  if (!cursorPos) return
  const range = cursorPos.cloneRange()
  const previousChar = range.startContainer.textContent!.charAt(range.startOffset - 1)
  if (previousChar === '@') {
    range.setStart(range.startContainer, range.startOffset - 1)
    range.deleteContents()
  }
}

const updateCursorPosition = () => {
  const selection = window.getSelection()
  if (selection && selection.rangeCount > 0) {
    cursorPos = selection.getRangeAt(0)
  }
}

const onSelectionChange = () => {
  if (inputRef.value === document.activeElement) {
    updateCursorPosition()
  }
}

onMounted(() => {
  document.addEventListener('selectionchange', onSelectionChange)
})

onBeforeUnmount(() => {
  document.removeEventListener('selectionchange', onSelectionChange)
})

defineExpose({
  inputRef,
  insertAtCursor,
  deletePreviousChar,
  clear,
  focusAtEnd,
})
</script>

<style lang="scss" scoped>
.custom_rich_input {
  position: relative;
  padding: 5px 8px;
  border-radius: 4px;
  color: rgba(0, 0, 0, 0.85);
  font-size: 14px;
  transition: all 0.3s;
  outline: none;
  white-space: pre-wrap;
  word-break: break-all;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  cursor: text;
  min-height: 32px;
  max-height: 60px;
  user-select: auto;
  // fix safari input
  -webkit-user-select: auto;

  :deep(.face_el) {
    display: inline-block;
    vertical-align: text-bottom;
  }

  &::-webkit-scrollbar {
    display: none;
  }
}

.needsclick {
  &::before {
    position: absolute;
    content: attr(placeholder);
    color: rgb(169, 169, 169);
  }
}
</style>
