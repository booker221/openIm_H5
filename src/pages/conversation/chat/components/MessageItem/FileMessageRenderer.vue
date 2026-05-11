<template>
  <div
    class="file_message_card"
    :class="{ file_message_card_self: isSelfMsg }"
    @click="openFile"
  >
    <img class="file_message_icon" :src="fileIcon" alt="file" />
    <div class="min-w-0 flex-1">
      <div class="file_message_name">{{ fileName }}</div>
      <div class="file_message_meta">
        <span>{{ fileExtLabel }}</span>
        <span v-if="fileSizeLabel">{{ fileSizeLabel }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { bytesToSize, feedbackToast, getFileExtensionLabel, getFileIcon } from '@/utils/common'
import { ExedMessageItem } from './data'

type FileMessageRendererProps = {
  message: ExedMessageItem
  isSelfMsg?: boolean
}

const props = defineProps<FileMessageRendererProps>()

const fileElem = computed(() => props.message.fileElem)
const fileName = computed(() => fileElem.value?.fileName || 'unknown')
const fileIcon = computed(() => getFileIcon(fileName.value))
const fileExtLabel = computed(() => getFileExtensionLabel(fileName.value))
const fileSizeLabel = computed(() =>
  fileElem.value?.fileSize ? bytesToSize(fileElem.value.fileSize) : '',
)

const openFile = () => {
  const fileUrl = fileElem.value?.sourceUrl || fileElem.value?.filePath
  if (!fileUrl) {
    feedbackToast({
      error: new Error('file url missing'),
    })
    return
  }

  const link = document.createElement('a')
  link.href = fileUrl
  link.download = fileName.value
  link.target = '_blank'
  link.rel = 'noopener noreferrer'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
</script>

<style lang="scss" scoped>
.file_message_card {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 220px;
  max-width: min(72vw, 320px);
  padding: 12px;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
}

.file_message_card_self {
  background: #d9edff;
}

.file_message_icon {
  width: 42px;
  min-width: 42px;
  height: 42px;
  object-fit: contain;
}

.file_message_name {
  color: #0c1c33;
  font-size: 14px;
  line-height: 20px;
  word-break: break-all;
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.file_message_meta {
  display: flex;
  gap: 8px;
  margin-top: 6px;
  color: #8e9ab0;
  font-size: 12px;
  line-height: 16px;
  flex-wrap: wrap;
}
</style>
