import { Authenticate } from "./Authenticate"

interface SelectDataSourceProps {
    onAuthenticated: (accessToken: string) => void
}

export function SelectDataSource(props: SelectDataSourceProps) {
    return <Authenticate {...props} />
}
