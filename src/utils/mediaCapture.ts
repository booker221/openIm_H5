type LegacyGetUserMedia = (
  constraints: MediaStreamConstraints,
  onSuccess: (stream: MediaStream) => void,
  onError: (error: unknown) => void,
) => void

type NavigatorWithLegacyMedia = Navigator & {
  getUserMedia?: LegacyGetUserMedia
  webkitGetUserMedia?: LegacyGetUserMedia
  mozGetUserMedia?: LegacyGetUserMedia
  msGetUserMedia?: LegacyGetUserMedia
  mediaDevices?: MediaDevices & {
    getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>
  }
}

export type MediaCaptureSupportIssue = 'insecure_context' | 'unsupported'

const getLegacyGetUserMedia = (nav: NavigatorWithLegacyMedia) =>
  (nav as any).mediaDevices?.getUserMedia
    ? undefined
    : nav.getUserMedia ||
      nav.webkitGetUserMedia ||
      nav.mozGetUserMedia ||
      nav.msGetUserMedia

export const ensureGetUserMediaSupport = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false
  }

  const nav = navigator as NavigatorWithLegacyMedia

  if ((nav as any).mediaDevices?.getUserMedia) {
    return true
  }

  const legacyGetUserMedia = getLegacyGetUserMedia(nav)

  if (!legacyGetUserMedia) {
    return false
  }

  const mediaDevices = nav.mediaDevices ?? ({} as NavigatorWithLegacyMedia['mediaDevices'])
  mediaDevices!.getUserMedia = (constraints: MediaStreamConstraints) =>
    new Promise<MediaStream>((resolve, reject) => {
      legacyGetUserMedia.call(nav, constraints, resolve, reject)
    })

  if (!nav.mediaDevices) {
    try {
      Object.defineProperty(nav, 'mediaDevices', {
        configurable: true,
        value: mediaDevices,
      })
    } catch (error) {
      nav.mediaDevices = mediaDevices
    }
  }

  return !!(nav as any).mediaDevices?.getUserMedia
}

export const getMediaCaptureSupportIssue = (): MediaCaptureSupportIssue | undefined => {
  if (ensureGetUserMediaSupport()) {
    return undefined
  }

  return window.isSecureContext ? 'unsupported' : 'insecure_context'
}
