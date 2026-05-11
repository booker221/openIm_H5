<template>
  <div
    v-if="callMessage"
    class="custom_call_message need_bg"
    :class="{ custom_call_message_self: isSelfMsg }"
  >
    <img class="custom_call_icon" :src="call" alt="call" />
    <span class="custom_call_text">{{ callMessage.content }}</span>
  </div>
  <div v-else class="need_bg">{{ $t('messageDescription.notSupMessage') }}</div>
</template>

<script setup lang="ts">
import call from '@/assets/images/userCard/call.png'
import { parseCallCustomMessage } from '@/utils/customMessage'
import { ExedMessageItem } from './data'

type CustomMessageRendererProps = {
  message: ExedMessageItem
  isSelfMsg?: boolean
}

const props = defineProps<CustomMessageRendererProps>()

const callMessage = computed(() => parseCallCustomMessage(props.message))
</script>

<style lang="scss" scoped>
.custom_call_message {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
}

.custom_call_message_self {
  background-color: #cce7fe;
}

.custom_call_icon {
  width: 18px;
  height: 18px;
  object-fit: contain;
}

.custom_call_text {
  word-break: break-all;
}
</style>
