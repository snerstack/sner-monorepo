import { getDTConfigValue } from '@/lib/sner/storage'
import { MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'


const ToggleDTConfig = ({ storageKey, caption }: { storageKey: string; caption: string; }) => {
    const navigate = useNavigate()

    const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault()
        sessionStorage.setItem(storageKey, sessionStorage.getItem(storageKey) === 'true' ? 'false' : 'true')
        Object.keys(sessionStorage)
            .filter((k) => k.startsWith('DataTables_'))
            .forEach((k) => sessionStorage.removeItem(k))
        navigate(0)
    }

    return (
        <div>
            {caption}:
            <a 
                className="btn btn-outline-secondary btn-sm m-1"
                onClick={handleClick}
                data-testid="toggle-dtconfig-button"
            >{`${getDTConfigValue(storageKey)}`}</a>
        </div>
    )
}

export default ToggleDTConfig
