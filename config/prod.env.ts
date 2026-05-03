// Align the H5 demo with the same host routing used by the Flutter app.
const BASE_DOMAIN = 'pc.imall.cloud'
const AVAILABLE_HOSTS = [BASE_DOMAIN]
const CHAT_URL = `https://${BASE_DOMAIN}/api/user`
const API_URL = `https://${BASE_DOMAIN}/api/im`
const WS_URL = `wss://${BASE_DOMAIN}/msg_gateway`

export default {
  NODE_ENV: 'production',
  CHAT_URL,
  API_URL,
  WS_URL,
  AVAILABLE_HOSTS,
  LOG_LEVEL: 5,
  VERSION: 'H5-Demo',
}
