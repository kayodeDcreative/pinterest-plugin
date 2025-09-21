import { framer } from "framer-plugin"
import { useState } from "react"
import { type DataSource, getDataSource } from "./data"

interface SelectDataSourceProps {
    onSelectDataSource: (dataSource: DataSource, accessToken: string) => void
}

export function SelectDataSource({ onSelectDataSource }: SelectDataSourceProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [accessToken, setAccessToken] = useState("")
    const [boardId, setBoardId] = useState("")

    const handleConnect = async () => {
        try {
            setIsLoading(true)
            const dataSource = await getDataSource(boardId, accessToken)
            onSelectDataSource(dataSource, accessToken)
        } catch (error) {
            console.error(error)
            framer.notify(`Failed to connect to Pinterest. Check the logs for more details.`, {
                variant: "error",
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <main className="framer-hide-scrollbar setup">
            <div className="intro">
                <div className="logo">
                    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="none">
                        <title>Pinterest Logo</title>
                        <path
                            fill="currentColor"
                            d="M15 0C6.716 0 0 6.716 0 15c0 6.947 4.787 12.825 11.25 14.505.03-.39.045-.98.135-1.485.105-.585.675-2.85.675-2.85s-.18-.36-.18-.885c0-.825.48-1.44.96-1.44.45 0 .66.33.66.735 0 .45-.285 1.125-.435 1.755-.12.51.255.93.765.93.915 0 1.62-.975 1.62-2.385 0-1.245-.885-2.145-2.025-2.145-1.395 0-2.295 1.05-2.295 2.445 0 .3.09.645.21.855.045.09.06.18.045.27-.03.105-.105.42-.135.525-.03.12-.195.18-.315.12-.66-.315-1.08-1.26-1.08-2.025 0-1.575 1.17-2.925 3.255-2.925 1.725 0 3.045 1.29 3.045 3.165 0 1.89-1.005 3.345-2.385 3.345-.48 0-.93-.255-.105-.555.045-.165.15-.315.315-.615.18-.345.21-.435.315-.765.12-.39.06-.735-.165-1.035-.51-.69-1.035-1.635-1.035-2.655 0-1.125.81-2.055 2.4-2.055 1.29 0 2.145.765 2.145 2.295 0 1.35-.48 2.445-1.185 2.445-.225 0-.435-.105-.495-.225 0 0-.21 1.05-.255 1.245-.09.345-.285.675-.42.825.39.12.795.18 1.215.18 2.895 0 5.235-2.31 5.235-5.865C24.75 5.865 20.415 0 15 0Z"
                        />
                    </svg>
                </div>
                <div className="content">
                    <h2>Pinterest</h2>
                    <p>Enter your access token and board ID to sync your pins.</p>
                </div>
            </div>

            <div className="form">
                <label>
                    Access Token
                    <input type="password" value={accessToken} onChange={e => setAccessToken(e.target.value)} />
                </label>
                <label>
                    Board ID
                    <input type="text" value={boardId} onChange={e => setBoardId(e.target.value)} />
                </label>
                <button onClick={handleConnect} disabled={isLoading || !accessToken || !boardId}>
                    {isLoading ? <div className="framer-spinner" /> : "Connect"}
                </button>
            </div>
        </main>
    )
}
