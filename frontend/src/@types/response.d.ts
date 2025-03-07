interface StorageHostLookupResponse {
    url: string
}

interface BackendErrorResponse {
    error?: {
        message?: string
        errors?: Record<string, string | string[]>;
    }
}
