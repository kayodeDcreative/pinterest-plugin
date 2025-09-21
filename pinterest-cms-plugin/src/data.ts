import {
    type FieldDataInput,
    framer,
    type ManagedCollection,
    type ManagedCollectionFieldInput,
    type ManagedCollectionItemInput,
    type ProtectedMethod,
} from "framer-plugin"

export const PLUGIN_KEYS = {
    ACCESS_TOKEN: "accessToken",
    BOARD_ID: "boardId",
    SLUG_FIELD_ID: "slugFieldId",
} as const

export interface DataSource {
    id: string
    fields: readonly ManagedCollectionFieldInput[]
    items: FieldDataInput[]
}

export const dataSourceOptions = [{ id: "pinterest", name: "Pinterest" }] as const

/**
 * Retrieve data and process it into a structured format.
 *
 * @example
 * {
 *   id: "articles",
 *   fields: [
 *     { id: "title", name: "Title", type: "string" },
 *     { id: "content", name: "Content", type: "formattedText" }
 *   ],
 *   items: [
 *     { title: "My First Article", content: "Hello world" },
 *     { title: "Another Article", content: "More content here" }
 *   ]
 * }
 */
export async function getDataSource(
    boardId: string,
    accessToken: string,
    abortSignal?: AbortSignal
): Promise<DataSource> {
    // Fetch from your data source
    const dataSourceResponse = await fetch(`https://api.pinterest.com/v5/boards/${boardId}/pins`, {
        signal: abortSignal,
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    })
    const dataSource = await dataSourceResponse.json()

    // Map your source fields to supported field types in Framer
    const fields: ManagedCollectionFieldInput[] = [
        { id: "id", name: "ID", type: "string" },
        { id: "created_at", name: "Created At", type: "date" },
        { id: "link", name: "Link", type: "link" },
        { id: "title", name: "Title", type: "string" },
        { id: "description", name: "Description", type: "string" },
        { id: "media", name: "Media", type: "image" },
    ]

    const items: FieldDataInput[] = dataSource.items.map((item: any) => ({
        id: { value: item.id },
        created_at: { value: item.created_at },
        link: { value: item.link },
        title: { value: item.title },
        description: { value: item.description },
        media: {
            type: "image",
            value: item.media.image_cover_url,
        },
    }))

    return {
        id: boardId,
        fields,
        items,
    }
}

export function mergeFieldsWithExistingFields(
    sourceFields: readonly ManagedCollectionFieldInput[],
    existingFields: readonly ManagedCollectionFieldInput[]
): ManagedCollectionFieldInput[] {
    return sourceFields.map(sourceField => {
        const existingField = existingFields.find(existingField => existingField.id === sourceField.id)
        if (existingField) {
            return { ...sourceField, name: existingField.name }
        }
        return sourceField
    })
}

export async function syncCollection(
    collection: ManagedCollection,
    dataSource: DataSource,
    fields: readonly ManagedCollectionFieldInput[],
    slugField: ManagedCollectionFieldInput,
    accessToken: string
) {
    const items: ManagedCollectionItemInput[] = []
    const unsyncedItems = new Set(await collection.getItemIds())

    for (let i = 0; i < dataSource.items.length; i++) {
        const item = dataSource.items[i]
        if (!item) throw new Error("Logic error")

        const slugValue = item[slugField.id]
        if (!slugValue || typeof slugValue.value !== "string") {
            console.warn(`Skipping item at index ${i} because it doesn't have a valid slug`)
            continue
        }

        unsyncedItems.delete(slugValue.value)

        const fieldData: FieldDataInput = {}
        for (const [fieldName, value] of Object.entries(item)) {
            const field = fields.find(field => field.id === fieldName)

            // Field is in the data but skipped based on selected fields.
            if (!field) continue

            // For details on expected field value, see:
            // https://www.framer.com/developers/plugins/cms#collections
            fieldData[field.id] = value
        }

        items.push({
            id: slugValue.value,
            slug: slugValue.value,
            draft: false,
            fieldData,
        })
    }

    await collection.removeItems(Array.from(unsyncedItems))
    await collection.addItems(items)

    await collection.setPluginData(PLUGIN_KEYS.ACCESS_TOKEN, accessToken)
    await collection.setPluginData(PLUGIN_KEYS.BOARD_ID, dataSource.id)
    await collection.setPluginData(PLUGIN_KEYS.SLUG_FIELD_ID, slugField.id)
}

export const syncMethods = [
    "ManagedCollection.removeItems",
    "ManagedCollection.addItems",
    "ManagedCollection.setPluginData",
] as const satisfies ProtectedMethod[]

export async function syncExistingCollection(
    collection: ManagedCollection,
    previousBoardId: string | null,
    previousSlugFieldId: string | null,
    previousAccessToken: string | null
): Promise<{ didSync: boolean }> {
    if (!previousBoardId || !previousAccessToken) {
        return { didSync: false }
    }

    if (framer.mode !== "syncManagedCollection" || !previousSlugFieldId) {
        return { didSync: false }
    }

    if (!framer.isAllowedTo(...syncMethods)) {
        return { didSync: false }
    }

    try {
        const dataSource = await getDataSource(previousBoardId, previousAccessToken)
        const existingFields = await collection.getFields()

        const slugField = dataSource.fields.find(field => field.id === previousSlugFieldId)
        if (!slugField) {
            framer.notify(`No field matches the slug field id “${previousSlugFieldId}”. Sync will not be performed.`, {
                variant: "error",
            })
            return { didSync: false }
        }

        await syncCollection(collection, dataSource, existingFields, slugField, previousAccessToken)
        return { didSync: true }
    } catch (error) {
        console.error(error)
        framer.notify(`Failed to sync collection “${previousBoardId}”. Check browser console for more details.`, {
            variant: "error",
        })
        return { didSync: false }
    }
}
