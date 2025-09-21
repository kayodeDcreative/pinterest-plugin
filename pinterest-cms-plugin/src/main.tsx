import "framer-plugin/framer.css"

import { framer } from "framer-plugin"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App } from "./App.tsx"
import { PLUGIN_KEYS, syncExistingCollection } from "./data"

const activeCollection = await framer.getActiveManagedCollection()

const previousBoardId = await activeCollection.getPluginData(PLUGIN_KEYS.BOARD_ID)
const previousSlugFieldId = await activeCollection.getPluginData(PLUGIN_KEYS.SLUG_FIELD_ID)
const previousAccessToken = await activeCollection.getPluginData(PLUGIN_KEYS.ACCESS_TOKEN)

const { didSync } = await syncExistingCollection(
    activeCollection,
    previousBoardId,
    previousSlugFieldId,
    previousAccessToken
)

if (didSync) {
    framer.closePlugin("Synchronization successful", {
        variant: "success",
    })
} else {
    const root = document.getElementById("root")
    if (!root) throw new Error("Root element not found")

    createRoot(root).render(
        <StrictMode>
            <App
                collection={activeCollection}
                previousDataSourceId={previousBoardId}
                previousSlugFieldId={previousSlugFieldId}
            />
        </StrictMode>
    )
}
