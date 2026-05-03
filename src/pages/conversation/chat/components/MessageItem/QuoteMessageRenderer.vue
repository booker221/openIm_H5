<template>
  <div class="quote_message need_bg">
    <div class="quote_preview">
      <div class="quote_sender">
        {{ quoteSender }}
      </div>
      <div class="quote_excerpt">
        {{ quotePreview }}
      </div>
    </div>
    <div class="quote_content" v-html="content"></div>
  </div>
</template>

<script setup lang="ts">
import { formatLink, parseBr } from '@/utils/imCommon'
import { MessageType } from '@openim/wasm-client-sdk'
import { ExedMessageItem } from './data'
import { getMessagePreviewText } from './messageUtils'

type QuoteMsgRendererProps = {
  message: ExedMessageItem
}

const { t } = useI18n()
const props = defineProps<QuoteMsgRendererProps>()

const quoteMessage = computed(() => props.message.quoteElem?.quoteMessage)
const content = computed(() =>
  parseBr(formatLink(props.message.quoteElem?.text || t('messageDescription.quoteMessage'))),
)
const quoteSender = computed(
  () => quoteMessage.value?.senderNickname || t('messageDescription.quoteMessage'),
)
const quotePreview = computed(() => {
  if (!quoteMessage.value) {
    return t('messageDescription.quoteRevokeMessage')
  }

  if (quoteMessage.value.contentType === MessageType.RevokeMessage) {
    return t('messageDescription.quoteRevokeMessage')
  }

  return getMessagePreviewText(quoteMessage.value)
})
</script>

<style lang="scss" scoped>
.quote_message {
  min-width: 180px;
  max-width: 280px;
}

.quote_preview {
  margin-bottom: 8px;
  border-left: 3px solid #0089ff;
  background: rgba(255, 255, 255, 0.7);
  padding: 8px 10px;
  border-radius: 8px;
}

.quote_sender {
  font-size: 12px;
  color: #0089ff;
  margin-bottom: 4px;
}

.quote_excerpt {
  color: #666;
  font-size: 12px;
  line-height: 16px;
  word-break: break-all;
}

.quote_content {
  word-break: break-all;
  word-wrap: break-word;
}
</style>
