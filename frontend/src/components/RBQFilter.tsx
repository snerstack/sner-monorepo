import { useState } from "react"
import QueryBuilder, { Field, formatQuery, RuleGroupType } from "react-querybuilder"
import { useSearchParams } from "react-router-dom"

import "react-querybuilder/dist/query-builder-layout.css"

/**
 * list of available operators MUST match those available in
 * https://github.com/snerstack/sqlalchemy-filters/blob/snerstack/sqlalchemy_filters/filters.py
 * 
 * also we rather silence linters here to keep original 3rd-party function prototype, than to discard
 * arguments
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getOperators = (_fieldName: string, { fieldData: _fieldData }: { fieldData: Field }) => {
    const ops = [
        '==',
        '!=',
        '>',
        '<',
        '>=',
        '<=',

        'like',
        'ilike',

        'is_null',
        'is_not_null',

        //'not_ilike', // only for note filter, perhaps not really necessary
        //'astext_ilike', // used to naive search in JSON columns (vulnsearch.data)
        //'astext_not_ilike', // used to naive search in JSON columns (vulnsearch.data)

        //'in', not implemented yet, will require custom field
        //'not_in', not implemented yet, will require custom field

        'any',  // array having value, filtering tags
        'not_any', // array not having value, filtering tags

        'inet_in',  // address in CIDR
        'inet_not_in', // address not in CIDR
    ]
    return ops.map((item) => { return { name: item, value: item, label: item } })
}

const emptyFilter: RuleGroupType = { combinator: "and", rules: [] }

const RBQFilter = ({ fields }: { fields: Field[] }) => {
    const [searchParams, setSearchParams] = useSearchParams()

    const parseQueryFromSearchParams = (): RuleGroupType => {
        const jsonFilter = searchParams.get("jsonfilter")
        if (jsonFilter === null)
            return emptyFilter

        try {
            return JSON.parse(jsonFilter) as RuleGroupType
        } catch {
            return emptyFilter
        }
    }

    const [query, setQuery] = useState<RuleGroupType>(parseQueryFromSearchParams)

    const applyFilter = () => {
        setSearchParams((params) => {
            params.set('jsonfilter', formatQuery(query, 'json_without_ids'))
            return params
        })
    }

    const clearFilter = () => {
        setSearchParams((params) => {
            params.delete('jsonfilter')
            return params
        })
    }

    return (
        <div className="rbq-filter-container pb-3">
            <QueryBuilder
                fields={fields}
                defaultQuery={query}
                onQueryChange={setQuery}
                getOperators={getOperators}
                showNotToggle={true}
                resetOnFieldChange={false}
                showShiftActions={true}
                controlClassnames={{
                    header: "form-inline",
                    ruleGroup: "form-group border border-info rounded p-2 w-auto",
                    combinators: "form-control",
                    addRule: "form-control",
                    addGroup: "form-control",
                    fields: "form-control w-auto",
                    operators: "form-control w-auto ",
                    value: "form-control w-25",
                    removeRule: "btn btn-danger",
                    removeGroup: "btn btn-danger",
                    notToggle:  "form-control",
                }}
                translations={{
                    shiftActionUp: { label: <i className="fa fa-chevron-up" /> },
                    shiftActionDown: { label: <i className="fa fa-chevron-down" /> },
                }}
            />

            <a className="btn btn-outline-primary" onClick={applyFilter}>Filter</a>
            {' '}
            <a className="btn btn-outline-secondary" onClick={clearFilter}>Clear</a>
        </div>
    )
}

export default RBQFilter
