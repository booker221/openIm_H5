<template>
  <div
    v-if="callMessage"
    class="custom_call_message need_bg"
    :class="{ custom_call_message_self: isSelfMsg }"
  >
    <img class="custom_call_icon" :src="call" alt="call" />
    <span class="custom_call_text">{{ callMessage.content }}</span>
  </div>
  <div
    v-else-if="replyMessage"
    class="reply_message need_bg"
    :class="{ reply_message_self: isSelfMsg }"
  >
    <div class="reply_preview">
      <div class="reply_sender">
        {{ replyMessage.quoteSenderNickname || $t('messageDescription.quoteMessage') }}
      </div>
      <div class="reply_excerpt">
        {{ replyMessage.quotePreview || $t('messageDescription.quoteMessage') }}
      </div>
    </div>
    <div class="reply_content">
      {{ replyMessage.content }}
    </div>
  </div>
  <div v-else class="need_bg">{{ $t('messageDescription.notSupMessage') }}</div>
</template>

<script setup lang="ts">
import call from '@/assets/images/userCard/call.png'
import {
  parseCallCustomMessage,
  parseReplyCustomMessage,
} from '@/utils/customMessage'
import { ExedMessageItem } from './data'

type CustomMessageRendererProps = {
  message: ExedMessageItem
  isSelfMsg?: boolean
}

const props = defineProps<CustomMessageRendererProps>()

const callMessage = computed(() => parseCallCustomMessage(props.message))
const replyMessage = computed(() => parseReplyCustomMessage(props.message))
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

.reply_message {
  min-width: 180px;
  max-width: 280px;
}

.reply_message_self {
  background-color: #cce7fe;
}

.reply_preview {
  margin-bottom: 8px;
  border-left: 3px solid #0089ff;
  background: rgba(255, 255, 255, 0.7);
  padding: 8px 10px;
  border-radius: 8px;
}

.reply_sender {
  font-size: 12px;
  color: #0089ff;
  margin-bottom: 4px;
}

.reply_excerpt {
  color: #666;
  font-size: 12px;
  line-height: 16px;
  word-break: break-all;
}

.reply_content {
  word-break: break-all;
  word-wrap: break-word;
}
</style>
