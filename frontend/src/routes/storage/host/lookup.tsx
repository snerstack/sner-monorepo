import axios from "axios"
import { useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { toast } from "react-toastify"

import httpClient from "@/lib/httpClient"
import { toQueryString, urlFor } from "@/lib/urlHelper"

interface LookupResponse {
    url: string;
}

interface ErrorResponse {
    error?: {
        message?: string;
    };
}

/* vite devserver has issues with routing of '/uri/a.1', therefore get query args are used */
const HostLookupPage = () => {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await httpClient.get<LookupResponse>(urlFor(`/backend/storage/host/lookup${toQueryString(searchParams)}`))
                navigate(response.data.url)
            /* c8 ignore next 5 */
            } catch (err) {
                console.error(err)
                const message = axios.isAxiosError(err) ? (err.response?.data as ErrorResponse).error?.message : "Unknown error"
                toast.error(`Lookup error, ${message}`)
            }
        }

        if (searchParams.size) {
            void fetchData()
        }
    }, [searchParams, navigate])

    return (<div>Lookup, route is used for linking from external sites, use GET with ?address= or ?hostname=</div>)
}

export default HostLookupPage