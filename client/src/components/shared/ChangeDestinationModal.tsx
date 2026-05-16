import { useState, useEffect } from 'react'
import { fetchAuthSession } from 'aws-amplify/auth'

interface Stop {
    id: string
    name: string
    active: boolean
}

interface ChangeDestinationModalProps {
    readonly isOpen: boolean
    readonly currentDestinationId: string | null
    readonly onConfirm: ( newDestinationId: string ) => void
    readonly onClose: () => void
}

export default function ChangeDestinationModal( {
    isOpen,
    currentDestinationId,
    onConfirm,
    onClose,
}: ChangeDestinationModalProps ) {
    const [stops, setStops] = useState<Stop[]>( [] )
    const [selected, setSelected] = useState( '' )

    useEffect( () => {
        if ( !isOpen ) return

        const fetchStops = async () => {
            try {
                const session = await fetchAuthSession()
                const token = session.tokens?.idToken?.toString() ?? ''
                const res = await fetch(
                    `${import.meta.env.VITE_API_BASE_URL}/stops`,
                    { headers: { Authorization: `Bearer ${token}` } }
                )
                if ( !res.ok ) return
                const data = await res.json()
                setStops( data.stops ?? [] )
            } catch {
                // silent fail
            }
        }

        fetchStops()
    }, [isOpen] )

    // Reset selection when modal opens — done via key prop instead of effect
    const availableStops = stops.filter(
        s => s.active && s.id !== currentDestinationId
    )

    if ( !isOpen ) return null

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
            <button
                type="button"
                aria-label="Close modal"
                className="absolute inset-0 bg-black/60 backdrop-blur-sm w-full cursor-default"
                onClick={onClose}
                onKeyDown={( e ) => { if ( e.key === 'Escape' ) onClose() }}
            />

            <div className="relative bg-zinc-900 border-t border-zinc-800 rounded-t-3xl w-full p-6 pb-10">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-white font-semibold text-lg">Change Destination</h2>
                        <p className="text-zinc-500 text-xs mt-0.5">
                            Select a new drop-off stop
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="text-zinc-500 hover:text-white transition-colors text-xl"
                    >
                        ✕
                    </button>
                </div>

                {stops.length === 0 && (
                    <div className="flex justify-center py-6">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400" />
                    </div>
                )}

                {availableStops.length > 0 && (
                    <div className="mb-6">
                        <div className="grid grid-cols-2 gap-2">
                            {availableStops.map( ( stop ) => (
                                <button
                                    key={stop.id}
                                    type="button"
                                    onClick={() => setSelected( stop.id )}
                                    className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${selected === stop.id
                                        ? 'bg-yellow-400 text-zinc-950'
                                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                                        }`}
                                >
                                    {stop.name}
                                </button>
                            ) )}
                        </div>
                    </div>
                )}

                <button
                    type="button"
                    onClick={() => { if ( selected ) onConfirm( selected ) }}
                    disabled={!selected}
                    className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-semibold text-sm rounded-xl py-3 transition-colors"
                >
                    Confirm New Destination
                </button>
            </div>
        </div>
    )
}