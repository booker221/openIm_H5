<template>
  <div
    class="card_message"
    :class="{ card_message_self: isSelfMsg }"
    @click="openUserCard"
  >
    <div class="card_message_main">
      <Avatar
        :size="42"
        :src="message.cardElem?.faceURL"
        :desc="message.cardElem?.nickname"
      />
      <div class="min-w-0 flex-1">
        <div class="card_message_name">{{ message.cardElem?.nickname }}</div>
        <div class="card_message_id">{{ message.cardElem?.userID }}</div>
      </div>
    </div>
    <div class="card_message_footer">{{ $t('contactCard') }}</div>
  </div>
</template>

<script setup lang="ts">
import Avatar from '@/components/Avatar/index.vue'
import useContactStore from '@/store/modules/contact'
import { ExedMessageItem } from './data'

type CardMessageRendererProps = {
  message: ExedMessageItem
  isSelfMsg?: boolean
  disabled?: boolean
}

const props = defineProps<CardMessageRendererProps>()
const contactStore = useContactStore()

const openUserCard = () => {
  if (props.disabled || !props.message.cardElem?.userID) {
    return
  }

  contactStore.getUserCardData(props.message.cardElem.userID)
}
</script>

<style lang="scss" scoped>
.card_message {
  min-width: 220px;
  max-width: min(72vw, 320px);
  overflow: hidden;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
}

.card_message_self {
  background: #d9edff;
}

.card_message_main {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 14px 12px;
}

.card_message_name {
  color: #0c1c33;
  font-size: 15px;
  line-height: 22px;
  word-break: break-all;
}

.card_message_id {
  margin-top: 4px;
  color: #8e9ab0;
  font-size: 12px;
  line-height: 18px;
  word-break: break-all;
}

.card_message_footer {
  border-top: 1px solid rgba(142, 154, 176, 0.18);
  padding: 8px 14px 10px;
  color: #8e9ab0;
  font-size: 12px;
  line-height: 16px;
}
</style>
