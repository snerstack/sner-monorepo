import { getDTConfigValue } from '@/lib/storage'
import { MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'


const ToggleDTConfig = ({ storageKey, caption = '', title }: { storageKey: string; caption?: string; title?: string; }) => {
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
        <a
            className="btn btn-outline-secondary"
            onClick={handleClick}
            data-testid="toggle-dtconfig-button"
            title={title}
        >{`${caption}${getDTConfigValue(storageKey) ? 'shown' : 'hidden'}`}</a>
    )
}

export default ToggleDTConfig
