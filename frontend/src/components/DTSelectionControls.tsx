import { getTableApi } from '@/lib/DataTables'

const DTSelectionControls = ({ tableId }: { tableId: string }) => {
    const handleSelectAll = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault()
        getTableApi(tableId).rows({ page: "current" }).select()
    }

    const handleDeselectAll = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault()
        getTableApi(tableId).rows({ page: "current" }).deselect()
    }

    return (
        <div className="btn-group">
            <a
                className="btn btn-outline-secondary"
                data-testid={tableId.replace("_table", "_select_all")}
                href="#"
                title="Select all"
                onClick={handleSelectAll}
            >
                <i className="far fa-check-square"></i>
            </a>
            <a
                className="btn btn-outline-secondary"
                data-testid={tableId.replace("_table", "_unselect_all")}
                href="#"
                title="Clear selection"
                onClick={handleDeselectAll}
            >
                <i className="far fa-square"></i>
            </a>
        </div>
    )
}

export default DTSelectionControls