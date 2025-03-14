/* 
This component is used in DT cells, mainly because is rendered outside context and
in that case it is required to pass navigate. See BasicButtons.
*/

import { NavigateFunction } from 'react-router-dom';

const DataTableLink = ({
    url,
    children,
    navigate,
}:{
    url: string
    children: React.ReactNode
    navigate: NavigateFunction
}) => {
    return (
        <a
            href={url}
            onClick={(e) => {
                e.preventDefault()
                navigate(url)
            }}
        >
            {children}
        </a>
    )
}

export default DataTableLink