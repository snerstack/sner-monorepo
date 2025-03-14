/*
This module uses composition instead of inheritance, which is more common in React apps.

## useNavigate 

The unusual usage of useNavigate() in function declaration is used here to make components
simpler for usage "behind the DataTables dom gap". DT library manages the DOM by itself,
but for rendering cells we'd like to use react components as well, those components (inside DTs)
does not have access to React context, which is required for some functionality (ex. navigate()).
Therefore buttons used in DTs must explicitly receive navigate from parent context, buttons used
in rest of the app gets context from react-hook.

## eslint silencer for useNavigate
React hooks must be used unconditionaly, but since this cannot be achieved anyway (some
usages passes navigate, others dont) we keep optional default value in function definition
instead of moving the hook usage to the function body.
*/

import { NavigateFunction, useNavigate } from 'react-router-dom';

type BaseButtonProps = {
    url: string;
    children?: React.ReactNode;
    title?: string;
    testId?: string;
    className?: string;
    navigate?: NavigateFunction;
}

const BaseButton = ({
    url,
    children,
    title,
    testId,
    className = 'btn btn-outline-secondary',
    // eslint-disable-next-line react-hooks/rules-of-hooks
    navigate = useNavigate(),
}: BaseButtonProps) => {
    return (
        <a
            href={url}
            title={title}
            data-testid={testId}
            className={className}
            onClick={(e) => {
                e.preventDefault()
                navigate(url)
            }}
        >
            {children}
        </a>
    )
}

const LensButton = (props: BaseButtonProps) => (
    <BaseButton {...props} testId="lens-btn">
        <i className="fas fa-street-view"></i>
    </BaseButton>
)

const ViewButton = (props: BaseButtonProps) => (
    <BaseButton {...props} testId="view-btn">
        <i className="fas fa-eye"></i>
    </BaseButton>
)

const EditButton = (props: BaseButtonProps) => (
    <BaseButton {...props} testId="edit-btn">
        <i className="fas fa-edit"></i>
    </BaseButton>
)

const MultiCopyButton = (props: BaseButtonProps) => (
    <BaseButton {...props} testId="multicopy-btn">
        <i className="far fa-copy"></i>
    </BaseButton>
)

const Button = (props: BaseButtonProps) => (
    <BaseButton {...props} testId="btn">
        {props.children}
    </BaseButton>
)

export { LensButton, ViewButton, EditButton, MultiCopyButton, Button }
