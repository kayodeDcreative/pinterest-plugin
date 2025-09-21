import "./App.css"

import { framer, type ManagedCollection } from "framer-plugin"
import { useEffect, useLayoutEffect, useState } from "react"
import { type DataSource, getDataSource } from "./data"
import { FieldMapping } from "./FieldMapping"
import { SelectDataSource } from "./SelectDataSource"

interface AppProps {
    collection: ManagedCollection
    previousDataSourceId: string | null
    previousSlugFieldId: string | null
}

export function App({ collection, previousDataSourceId, previousSlugFieldId }: AppProps) {
    const [dataSource, setDataSource] = useState<DataSource | null>(null)
    const [isLoadingDataSource, setIsLoadingDataSource] = useState(Boolean(previousDataSourceId))
    const [accessToken, setAccessToken] = useState<string | null>(null)

    useLayoutEffect(() => {
        const hasDataSourceSelected = Boolean(dataSource)

        framer.showUI({
            width: hasDataSourceSelected ? 360 : 260,
            height: hasDataSourceSelected ? 425 : 340,
            minWidth: hasDataSourceSelected ? 360 : undefined,
            minHeight: hasDataSourceSelected ? 425 : undefined,
            resizable: hasDataSourceSelected,
        })
    }, [dataSource])

    useEffect(() => {
        if (!previousDataSourceId) {
            return
        }

        const abortController = new AbortController()

        // We don't have the access token here, so we can't load the data.
        // The user will have to re-authenticate.
        // A better solution would be to store the access token in the plugin's data store.
        // But for now, we will just show the select data source screen.
        if (!accessToken) {
            setIsLoadingDataSource(false)
            return
        }

        setIsLoadingDataSource(true)
        getDataSource(previousDataSourceId, accessToken, abortController.signal)
            .then(setDataSource)
            .catch(error => {
                if (abortController.signal.aborted) return

                console.error(error)
                framer.notify(
                    `Error loading previously configured data source “${previousDataSourceId}”. Check the logs for more details.`,
                    {
                        variant: "error",
                    }
                )
            })
            .finally(() => {
                if (abortController.signal.aborted) return

                setIsLoadingDataSource(false)
            })

        return () => abortController.abort()
    }, [previousDataSourceId, accessToken])

    if (isLoadingDataSource) {
        return (
            <main className="loading">
                <div className="framer-spinner" />
            </main>
        )
    }

    if (!dataSource) {
        return (
            <SelectDataSource
                onSelectDataSource={(dataSource, accessToken) => {
                    setDataSource(dataSource)
                    setAccessToken(accessToken)
                }}
            />
        )
    }

    return (
        <FieldMapping
            collection={collection}
            dataSource={dataSource}
            initialSlugFieldId={previousSlugFieldId}
            accessToken={accessToken}
        />
    )
}
