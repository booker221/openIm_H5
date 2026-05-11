<template>
  <Connected v-if="showConnected" :room="room" @disconnect="disconnect" />

  <div v-if="showAccept" class="mb-[64px] flex flex-row justify-around px-2">
    <div class="flex flex-col items-center" @click.stop="disconnect">
      <img class="h-[62px] w-[62px]" :src="hungup" alt="hungup" />
      <span class="mt-2 text-sm text-white">{{ $t("rtc.hungup") }}</span>
    </div>
    <div class="flex flex-col items-center" @click.stop="acceptInvitation">
      <img class="h-[62px] w-[62px]" :src="accept" alt="accept" />
      <span class="mt-2 text-sm text-white">{{ $t("rtc.accept") }}</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import hungup from "@/assets/images/rtc/hungup.png";
import accept from "@/assets/images/rtc/accept.png";
import type { RtcInvite, WSEvent } from "@openim/wasm-client-sdk/lib/types/entity";
import { AuthData, InviteData } from "../data";
import { IMSDK } from "@/utils/imCommon";
import useUserStore from "@/store/modules/user";
import useConversationStore from "@/store/modules/conversation";
import useMessageStore, { ExMessageItem } from "@/store/modules/message";
import { CbEvents, MessageStatus, MessageType, SessionType } from "@openim/wasm-client-sdk";
import { CustomType } from "@/constants/enum";
import emitter from "@/utils/events";
import { RemoteParticipant, Room, RoomEvent } from "livekit-client";
import Connected from "./Connected.vue";
import { getRtcConnectData } from "@api/im";
import { feedbackToast } from "@/utils/common";
import { getMediaCaptureSupportIssue } from "@/utils/mediaCapture";
import {
  buildCallCustomMessageData,
  CallMessageState,
} from "@/utils/customMessage";

type IRtcControlEmits = {
  (event: "connectRtc", data?: AuthData): void;
  (event: "closeOverlay"): void;
};
type IRtcControlProps = {
  room: Room;
  isWaiting: boolean;
  isConnected: boolean;
  duration: string;
  durationSeconds: number;
  invitation: RtcInvite;
  inviteData: InviteData;
  sendCustomSignal: (recvID: string, customType: CustomType) => Promise<void>;
};
const emit = defineEmits<IRtcControlEmits>();
const props = defineProps<IRtcControlProps>();

const userStore = useUserStore();
const conversationStore = useConversationStore();
const messageStore = useMessageStore();
const { t } = useI18n();

const isRecv = computed(
  () => userStore.selfInfo.userID !== props.invitation?.inviterUserID
);
const recvID = isRecv.value
  ? props.invitation.inviterUserID
  : props.invitation.inviteeUserIDList[0];
const showAccept = computed(() => {
  if (!isRecv.value) {
    return false;
  }
  return !props.isConnected;
});
const showConnected = computed(() => props.isConnected || !isRecv.value);
const remoteDisconnectTimer = ref<number | undefined>();
const disconnectedParticipantIdentity = ref("");
const hasInsertedCallMessage = ref(false);
const isSettling = ref(false);
const hasEverConnected = ref(props.isConnected);

const isTargetParticipant = (identity: string) =>
  identity === props.invitation.inviterUserID ||
  identity === props.invitation.inviteeUserIDList[0];

const clearRemoteDisconnectTimer = () => {
  if (!remoteDisconnectTimer.value) return;
  window.clearTimeout(remoteDisconnectTimer.value);
  remoteDisconnectTimer.value = undefined;
  disconnectedParticipantIdentity.value = "";
};

const getCallPartnerUserID = () =>
  isRecv.value
    ? props.invitation.inviterUserID
    : props.invitation.inviteeUserIDList[0];

const patchInsertedCallMessage = (message: ExMessageItem) => {
  const isSelfMessage = message.sendID === userStore.selfInfo.userID;
  return {
    ...message,
    senderNickname: isSelfMessage
      ? userStore.selfInfo.nickname
      : props.inviteData.participant?.userInfo.nickname ?? message.senderNickname,
    senderFaceUrl: isSelfMessage
      ? userStore.selfInfo.faceURL
      : props.inviteData.participant?.userInfo.faceURL ?? message.senderFaceUrl,
  } as ExMessageItem;
};

const appendCallMessageToCurrentConversation = (message: ExMessageItem) => {
  const isSingleConversation =
    conversationStore.storeCurrentConversation.conversationType ===
      SessionType.Single &&
    conversationStore.storeCurrentConversation.userID === getCallPartnerUserID();
  const isGroupConversation =
    !!props.invitation.groupID &&
    conversationStore.storeCurrentConversation.groupID === props.invitation.groupID;

  if (!isSingleConversation && !isGroupConversation) {
    return;
  }

  messageStore.pushNewMessage(message);
  emitter.emit("CHAT_MAIN_SCROLL_TO_BOTTOM", false);
};

const insertCallMessage = async (state: CallMessageState) => {
  if (hasInsertedCallMessage.value) {
    return;
  }

  hasInsertedCallMessage.value = true;

  try {
    const { data: message } = await IMSDK.createCustomMessage({
      data: buildCallCustomMessageData({
        duration: props.durationSeconds,
        state,
        type: props.invitation.mediaType,
      }),
      extension: "",
      description: "",
    });

    const localMessage = {
      ...message,
      status: MessageStatus.Succeed,
      isRead: true,
    };

    const insertedMessage = props.invitation.groupID
      ? (
          await IMSDK.insertGroupMessageToLocalStorage({
            groupID: props.invitation.groupID,
            sendID: props.invitation.inviterUserID,
            message: localMessage,
          })
        ).data
      : (
          await IMSDK.insertSingleMessageToLocalStorage({
            recvID: props.invitation.inviteeUserIDList[0],
            sendID: props.invitation.inviterUserID,
            message: localMessage,
          })
        ).data;

    appendCallMessageToCurrentConversation(
      patchInsertedCallMessage(insertedMessage as ExMessageItem),
    );
  } catch (error) {
    hasInsertedCallMessage.value = false;
    console.error("insert call message failed", error);
  }
};

const settleRtc = async ({
  state,
  shouldDisconnectRoom = true,
}: {
  state?: CallMessageState;
  shouldDisconnectRoom?: boolean;
}) => {
  if (isSettling.value) {
    return;
  }

  isSettling.value = true;
  clearRemoteDisconnectTimer();

  if (state) {
    await insertCallMessage(state);
  }

  if (shouldDisconnectRoom) {
    props.room.disconnect();
  }

  emitter.emit("CLOSE_RTC_MODAL");
};

const closeRtcModal = async (state?: CallMessageState) =>
  settleRtc({
    state,
    shouldDisconnectRoom: false,
  });

const finishCall = async (state?: CallMessageState) =>
  settleRtc({
    state,
    shouldDisconnectRoom: true,
  });

const acceptInvitation = async () => {
  try {
    const captureSupportIssue = getMediaCaptureSupportIssue();
    if (captureSupportIssue) {
      feedbackToast({
        message: t(
          captureSupportIssue === "insecure_context"
            ? "rtc.mediaSecureContext"
            : "rtc.mediaUnsupported"
        ),
        error: true,
      });
      return;
    }

    await Promise.allSettled([props.room.startAudio(), props.room.startVideo()]);
    await props.sendCustomSignal(recvID, CustomType.CallingAccept);
    const { data } = await getRtcConnectData(
      props.invitation.roomID,
      userStore.selfInfo.userID
    );
    emit("connectRtc", {
      liveURL: data.serverUrl,
      token: data.token,
    });
  } catch (error) {
    console.log(error);
    emitter.emit("CLOSE_RTC_MODAL");
  }
};

const disconnect = async () => {
  if (props.isWaiting) {
    const customType = isRecv.value
      ? CustomType.CallingReject
      : CustomType.CallingCancel;
    const callState = isRecv.value ? "reject" : "cancel";
    await Promise.allSettled([props.sendCustomSignal(recvID, customType)]);
    await closeRtcModal(callState);
    return;
  }
  await Promise.allSettled([
    props.sendCustomSignal(recvID, CustomType.CallingHungup),
  ]);
  await finishCall("hangup");
};

const acceptHandler = async ({ roomID }: RtcInvite) => {
  if (props.invitation.roomID !== roomID) return;
  emit("connectRtc", undefined);
};

const rejectHandler = async ({ roomID }: RtcInvite) => {
  if (props.invitation.roomID !== roomID) return;
  await closeRtcModal("beRejected");
};

const hangupHandler = async ({ roomID }: RtcInvite) => {
  if (props.invitation.roomID !== roomID) return;
  await finishCall("beHangup");
};

const cancelHandler = async ({ roomID }: RtcInvite) => {
  if (props.invitation.roomID !== roomID) return;
  if (!props.isWaiting) return;
  await closeRtcModal("beCanceled");
};

const participantDisconnectedHandler = (
  remoteParticipant: RemoteParticipant
) => {
  const identity = remoteParticipant.identity;
  if (!isTargetParticipant(identity)) return;

  clearRemoteDisconnectTimer();
  disconnectedParticipantIdentity.value = identity;
  remoteDisconnectTimer.value = window.setTimeout(() => {
    const participantStillMissing = !props.room.getParticipantByIdentity(identity);
    clearRemoteDisconnectTimer();

    if (participantStillMissing) {
      finishCall();
    }
  }, 5000) as number;
};

const participantConnectedHandler = (remoteParticipant: RemoteParticipant) => {
  if (remoteParticipant.identity !== disconnectedParticipantIdentity.value) return;
  clearRemoteDisconnectTimer();
};

const parseRtcSignal = (message: ExMessageItem) => {
  if (message.contentType !== MessageType.CustomMessage || !message.customElem?.data) {
    return undefined;
  }

  try {
    return JSON.parse(message.customElem.data) as {
      data: RtcInvite;
      customType: CustomType;
    };
  } catch (error) {
    console.warn("[RTC] parse signal failed", error);
    return undefined;
  }
};

const newMessageHandler = ({ data }: WSEvent<ExMessageItem | ExMessageItem[]>) => {
  const messages = Array.isArray(data) ? data : [data];

  messages.forEach((message) => {
    const customData = parseRtcSignal(message);
    if (!customData) {
      return;
    }

    if (customData.customType === CustomType.CallingAccept) {
      acceptHandler(customData.data);
    }
    if (customData.customType === CustomType.CallingReject) {
      rejectHandler(customData.data);
    }
    if (customData.customType === CustomType.CallingCancel) {
      cancelHandler(customData.data);
    }
    if (customData.customType === CustomType.CallingHungup) {
      hangupHandler(customData.data);
    }
  });
};

const timeoutHandler = async ({ roomID }: { roomID: string }) => {
  if (props.invitation.roomID !== roomID) {
    return;
  }

  await closeRtcModal("timeout");
};

watch(
  () => props.isConnected,
  (connected, previousConnected) => {
    if (connected) {
      hasEverConnected.value = true;
      return;
    }

    if (previousConnected && !isSettling.value) {
      const fallbackState =
        hasEverConnected.value && props.durationSeconds > 0 ? "networkError" : undefined;
      settleRtc({
        state: fallbackState,
        shouldDisconnectRoom: false,
      });
    }
  },
);

onMounted(() => {
  IMSDK.on(CbEvents.OnRecvNewMessage, newMessageHandler);
  IMSDK.on(CbEvents.OnRecvNewMessages, newMessageHandler);
  props.room.on(
    RoomEvent.ParticipantDisconnected,
    participantDisconnectedHandler
  );
  props.room.on(RoomEvent.ParticipantConnected, participantConnectedHandler);
  emitter.on("RTC_TIMEOUT", timeoutHandler);
});

onUnmounted(() => {
  clearRemoteDisconnectTimer();
  IMSDK.off(CbEvents.OnRecvNewMessage, newMessageHandler);
  IMSDK.off(CbEvents.OnRecvNewMessages, newMessageHandler);
  props.room.off(
    RoomEvent.ParticipantDisconnected,
    participantDisconnectedHandler
  );
  props.room.off(RoomEvent.ParticipantConnected, participantConnectedHandler);
  emitter.off("RTC_TIMEOUT", timeoutHandler);
});
</script>
