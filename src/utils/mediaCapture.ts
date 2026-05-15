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
export type MediaCaptureErrorType =
  | 'permission_denied'
  | 'device_in_use'
  | 'device_not_found'
  | 'unsupported'
  | 'unknown'

const ANDROID_WEBVIEW_PATTERN = /\bwv\b|; wv\)/i
const IOS_WEBVIEW_PATTERN = /iPhone|iPad|iPod/i
const APPLE_WEBKIT_PATTERN = /AppleWebKit/i
const SAFARI_PATTERN = /Safari/i

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

export const isInAppWebView = () => {
  if (typeof navigator === 'undefined') {
    return false
  }

  const ua = navigator.userAgent ?? ''
  const isAndroidWebView = /Android/i.test(ua) && ANDROID_WEBVIEW_PATTERN.test(ua)
  const isIOSWebView =
    IOS_WEBVIEW_PATTERN.test(ua) &&
    APPLE_WEBKIT_PATTERN.test(ua) &&
    !SAFARI_PATTERN.test(ua)

  return isAndroidWebView || isIOSWebView
}

export const getMediaCaptureErrorType = (error: unknown): MediaCaptureErrorType => {
  const errorName =
    typeof error === 'object' && error && 'name' in error
      ? String((error as { name?: unknown }).name ?? '')
      : ''

  switch (errorName) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return 'permission_denied'
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return 'device_in_use'
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
      return 'device_not_found'
    case 'TypeError':
      return 'unsupported'
    default:
      return 'unknown'
  }
}
