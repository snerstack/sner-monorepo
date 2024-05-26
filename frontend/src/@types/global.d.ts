declare global {
  // required by webauthn login helpers to make tsx happy
  interface Window {
    // required by tsx for webauthn
    base64ToArrayBuffer: (base64: string) => ArrayBuffer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cborDecode: (messagePack: Buffer | Uint8Array) => any

    // credential registration
    pkcco_raw: string
    setAttestation: (data: AttestationCredential?) => React.SetStateAction<AttestationCredential?>

    // webauthn login
    pkcro_raw: string
    loginWebauthn: (assertion: AssertionCredential) => Promise<void>
  }
}

export {}