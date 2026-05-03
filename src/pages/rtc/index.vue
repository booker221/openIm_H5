<template>
  <RtcLayout
    :inviteData="inviteData"
    :connect="connect"
    :isConnected="isConnected"
    @connectRtc="connectRtc"
    :room="room!"
    :sendCustomSignal="sendCustomSignal"
  />
</template>

<script setup lang="ts">
import { nextTick } from "vue";
import { useRoom } from "@/utils/open-im-rtc";
import { IMSDK } from "@/utils/imCommon";
import { InviteData } from "./data";
import useUserStore from "@/store/modules/user";
import RtcLayout from "./RtcLayout/index.vue";
import emitter from "@/utils/events";
import { feedbackToast } from "@/utils/common";
import { CustomType } from "@/constants/enum";
import { getRtcConnectData } from "@/api/im";
import { MediaDeviceFailure } from "livekit-client";
import { getMediaCaptureSupportIssue } from "@/utils/mediaCapture";

type RtcProps = {
  inviteData: InviteData;
};
const props = defineProps<RtcProps>();

const { t } = useI18n();
const userStore = useUserStore();

const connect = ref(false);
const isConnected = ref(false);
const config = reactive({
  serverUrl: "",
  token: "",
  connect: false,
  audio: true,
  video: props.inviteData.invitation?.mediaType === "video",
});
const isRecv = computed(
  () => userStore.selfInfo.userID !== props.inviteData.invitation?.inviterUserID
);

const resumeRoomPlayback = async () => {
  if (!room.value) return;

  await Promise.allSettled([
    room.value.startAudio(),
    room.value.startVideo(),
  ]);
};

const room = useRoom({
  refConfig: config,
  onConnected: () => {
    isConnected.value = true;
    clearTimer();
    nextTick(() => {
      resumeRoomPlayback();
    });
  },
  onDisconnected: () => {
    clearTimer();
    connect.value = false;
    isConnected.value = false;
    config.connect = false;
  },
  onError: (error) => {
    feedbackToast({ message: t("rtc.joinFailed"), error });
  },
  onMediaDeviceFailure: (failure) => {
    feedbackToast({
      message:
        failure === MediaDeviceFailure.PermissionDenied
          ? t("rtc.mediaPermissionDenied")
          : failure === MediaDeviceFailure.DeviceInUse
          ? t("rtc.mediaDeviceInUse")
          : failure === MediaDeviceFailure.NotFound
          ? t("rtc.mediaDeviceError")
          : t("rtc.mediaUnsupported"),
      error: true,
    });
  },
});

const connectRtc = (data?: any) => {
  clearTimer();
  resumeRoomPlayback();
  if (data) {
    config.serverUrl = data.liveURL;
    config.token = data.token;
    config.connect = true;
  }
  connect.value = true;
};

const timer = ref<NodeJS.Timeout>();
const clearTimer = () => {
  if (!timer.value) return;
  clearTimeout(timer.value);
  timer.value = undefined;
};
const checkTimeout = () => {
  if (timer.value) clearTimer();
  timer.value = setTimeout(() => {
    clearTimer();

    if (!props.inviteData.invitation) return;

    sendCustomSignal(
      props.inviteData.invitation?.inviteeUserIDList[0],
      CustomType.CallingCancel
    );
  }, (props.inviteData.invitation?.timeout ?? 30) * 1000);
};

const tryInvite = async () => {
  if (!isRecv.value) {
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
        emitter.emit("CLOSE_RTC_MODAL");
        return;
      }

      const { data } = await getRtcConnectData(
        props.inviteData.invitation!.roomID,
        userStore.selfInfo.userID
      );
      config.serverUrl = data.serverUrl;
      config.token = data.token;
      config.connect = true;
      await sendCustomSignal(
        props.inviteData.invitation!.inviteeUserIDList[0],
        CustomType.CallingInvite
      );
      checkTimeout();
    } catch (error) {
      feedbackToast({ message: t("rtc.invitationFailed"), error });
      emitter.emit("CLOSE_RTC_MODAL");
    }
  }
};

const sendCustomSignal = async (recvID: string, customType: CustomType) => {
  const data = {
    customType,
    data: {
      ...props.inviteData.invitation,
    },
  };
  const { data: message } = await IMSDK.createCustomMessage({
    data: JSON.stringify(data),
    extension: "",
    description: "",
  });
  await IMSDK.sendMessage({
    recvID,
    message,
    groupID: "",
    isOnlineOnly: true,
  });
};

onMounted(() => {
  resumeRoomPlayback();
  tryInvite();
});

onUnmounted(() => {
  clearTimer();
});
</script>

<style lang="scss" scoped></style>
