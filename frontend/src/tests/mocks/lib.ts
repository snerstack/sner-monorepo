const getFilterQueryParam = (request: Request) => {
    return (new URL(request.url)).searchParams.get('filter')
}

export { getFilterQueryParam }
