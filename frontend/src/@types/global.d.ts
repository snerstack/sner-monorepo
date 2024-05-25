declare global {
  // required by webauthn login helpers to make tsx happy
  interface Window {
    pkcro_raw: string
    base64ToArrayBuffer: (base64: string) => ArrayBuffer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cborDecode: (messagePack: Buffer | Uint8Array) => any
    loginWebauthn: (assertion: AssertionCredential) => Promise<void>
  }
}

export {}