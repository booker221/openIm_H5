import {
  getApiUrl,
  getChatUrl,
  getSelectedHost,
  getWsUrl,
  setApiUrl,
  setChatUrl,
  setSelectedHost,
  setWsUrl,
} from './storage'

const PRIVATE_HOST_REGEX =
  /^(localhost|127\.0\.0\.1|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/

const normalizeHost = (host: string) =>
  host
    .trim()
    .replace(/^(https?|wss?):\/\//, '')
    .replace(/\/.*$/, '')

const parseHosts = (rawHosts: unknown) => {
  if (Array.isArray(rawHosts)) {
    return rawHosts.map((host) => normalizeHost(String(host))).filter(Boolean)
  }

  if (typeof rawHosts === 'string') {
    return rawHosts
      .split(',')
      .map((host) => normalizeHost(host))
      .filter(Boolean)
  }

  return []
}

const resolveSecureProtocol = (host: string) => !PRIVATE_HOST_REGEX.test(host)

const parseCurrentHostFromUrl = (value: string) => {
  try {
    const url = new URL(value)
    return normalizeHost(`${url.hostname}${url.port ? `:${url.port}` : ''}`)
  } catch (error) {
    return ''
  }
}

export const getAvailableHosts = () => {
  const envHosts = parseHosts(process.env.AVAILABLE_HOSTS)
  const currentHost =
    getSelectedHost() ||
    parseCurrentHostFromUrl(getChatUrl()) ||
    parseCurrentHostFromUrl(getApiUrl()) ||
    parseCurrentHostFromUrl(getWsUrl())

  return Array.from(new Set([...envHosts, currentHost].filter(Boolean)))
}

export const buildLineUrls = (host: string) => {
  const normalizedHost = normalizeHost(host)
  const secure = resolveSecureProtocol(normalizedHost)
  const protocol = secure ? 'https' : 'http'
  const wsProtocol = secure ? 'wss' : 'ws'

  return {
    host: normalizedHost,
    chatUrl: `${protocol}://${normalizedHost}/api/user`,
    apiUrl: `${protocol}://${normalizedHost}/api/im`,
    wsUrl: `${wsProtocol}://${normalizedHost}/msg_gateway`,
    probeUrl: `${protocol}://${normalizedHost}/?line_probe=${Date.now()}`,
  }
}

export const getCurrentLineHost = () => {
  const selectedHost = getSelectedHost()
  if (selectedHost) return normalizeHost(selectedHost)

  return (
    parseCurrentHostFromUrl(getChatUrl()) ||
    parseCurrentHostFromUrl(getApiUrl()) ||
    parseCurrentHostFromUrl(getWsUrl())
  )
}

export const applyLineHost = (host: string) => {
  const { host: normalizedHost, chatUrl, apiUrl, wsUrl } = buildLineUrls(host)
  setSelectedHost(normalizedHost)
  setChatUrl(chatUrl)
  setApiUrl(apiUrl)
  setWsUrl(wsUrl)
}

export const testHostLatency = async (host: string, timeout = 5000) => {
  const { probeUrl } = buildLineUrls(host)
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeout)
  const start = performance.now()

  try {
    await fetch(probeUrl, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal,
    })
    return Math.round(performance.now() - start)
  } catch (error) {
    return 999999
  } finally {
    window.clearTimeout(timer)
  }
}
