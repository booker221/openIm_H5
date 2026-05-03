declare module 'uqrcodejs' {
  const UQRCode: any
  export default UQRCode
}

declare module 'vue3-qr-reader' {
  import type { DefineComponent, Plugin } from 'vue'

  export const QrStream: DefineComponent<Record<string, unknown>, {}, any>
  export const QrCapture: DefineComponent<Record<string, unknown>, {}, any>
  export const QrDropzone: DefineComponent<Record<string, unknown>, {}, any>

  const plugin: Plugin
  export default plugin
}
