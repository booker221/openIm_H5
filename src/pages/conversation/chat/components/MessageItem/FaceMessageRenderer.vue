<template>
  <div class="need_bg face_message">
    <img v-if="isImageFace" class="face_message__image" :src="faceSource" alt="emoji" />
    <span v-else class="face_message__text">{{ faceSource }}</span>
  </div>
</template>

<script setup lang="ts">
import { ExedMessageItem } from './data'

type FaceMessageRendererProps = {
  message: ExedMessageItem
}

const props = defineProps<FaceMessageRendererProps>()
const { t } = useI18n()

const faceSource = computed(() => {
  const value = props.message.faceElem?.data?.trim()
  return value || t('messageDescription.faceMessage')
})

const isImageFace = computed(() =>
  /^(https?:\/\/|data:image\/|blob:)/.test(faceSource.value),
)
</script>

<style lang="scss" scoped>
.face_message {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
}

.face_message__text {
  font-size: 30px;
  line-height: 1;
}

.face_message__image {
  max-width: 120px;
  max-height: 120px;
  object-fit: contain;
}
</style>
