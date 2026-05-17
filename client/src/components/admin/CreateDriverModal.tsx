import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { fetchAuthSession } from 'aws-amplify/auth'

const driverSchema = z.object( {
    firstName: z.string().min( 1, 'First name is required' ),
    lastName: z.string().min( 1, 'Last name is required' ),
    email: z.string().min( 1, 'Email is required' ).pipe( z.email( 'Invalid email' ) ),
    password: z.string().min( 8, 'Password must be at least 8 characters' ),
} )

type DriverForm = z.infer<typeof driverSchema>

interface CreateDriverModalProps {
    readonly isOpen: boolean
    readonly onClose: () => void
    readonly onSuccess: () => void
}

export default function CreateDriverModal( { isOpen, onClose, onSuccess }: CreateDriverModalProps ) {
    const [isLoading, setIsLoading] = useState( false )
    const [error, setError] = useState( '' )
    const [success, setSuccess] = useState( '' )

    const { register, handleSubmit, reset, formState: { errors } } = useForm<DriverForm>( {
        resolver: zodResolver( driverSchema ),
    } )

    const onSubmit = async ( data: DriverForm ) => {
        setIsLoading( true )
        setError( '' )
        setSuccess( '' )
        try {
            const session = await fetchAuthSession()
            const token = session.tokens?.idToken?.toString() ?? ''
            const res = await fetch( `${import.meta.env.VITE_API_BASE_URL}/admin/drivers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify( data ),
            } )
            const result = await res.json()
            if ( !res.ok ) {
                setError( result.message ?? 'Failed to create driver' )
                return
            }
            setSuccess( `Driver account created for ${data.email}` )
            reset()
            setTimeout( () => {
                onSuccess()
                onClose()
                setSuccess( '' )
            }, 1500 )
        } catch {
            setError( 'Failed to create driver account' )
        } finally {
            setIsLoading( false )
        }
    }

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
                        <h2 className="text-white font-semibold text-lg">Create Driver Account</h2>
                        <p className="text-zinc-500 text-xs mt-0.5">Driver will receive these credentials</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close" className="text-zinc-500 hover:text-white text-xl">✕</button>
                </div>

                <form onSubmit={handleSubmit( onSubmit )} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="firstName" className="text-zinc-400 text-sm mb-1 block">First name</label>
                            <input
                                id="firstName"
                                {...register( 'firstName' )}
                                type="text"
                                placeholder="Juan"
                                className="w-full bg-zinc-800 text-white text-sm rounded-xl px-4 py-3 outline-none border border-zinc-700 focus:border-yellow-400 transition-colors placeholder:text-zinc-600"
                            />
                            {errors.firstName && <p className="text-red-400 text-xs mt-1">{errors.firstName.message}</p>}
                        </div>
                        <div>
                            <label htmlFor="lastName" className="text-zinc-400 text-sm mb-1 block">Last name</label>
                            <input
                                id="lastName"
                                {...register( 'lastName' )}
                                type="text"
                                placeholder="Dela Cruz"
                                className="w-full bg-zinc-800 text-white text-sm rounded-xl px-4 py-3 outline-none border border-zinc-700 focus:border-yellow-400 transition-colors placeholder:text-zinc-600"
                            />
                            {errors.lastName && <p className="text-red-400 text-xs mt-1">{errors.lastName.message}</p>}
                        </div>
                    </div>

                    <div>
                        <label htmlFor="driverEmail" className="text-zinc-400 text-sm mb-1 block">Email</label>
                        <input
                            id="driverEmail"
                            {...register( 'email' )}
                            type="email"
                            placeholder="driver@campusride.com"
                            className="w-full bg-zinc-800 text-white text-sm rounded-xl px-4 py-3 outline-none border border-zinc-700 focus:border-yellow-400 transition-colors placeholder:text-zinc-600"
                        />
                        {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
                    </div>

                    <div>
                        <label htmlFor="driverPassword" className="text-zinc-400 text-sm mb-1 block">Password</label>
                        <input
                            id="driverPassword"
                            {...register( 'password' )}
                            type="text"
                            placeholder="Min. 8 characters"
                            className="w-full bg-zinc-800 text-white text-sm rounded-xl px-4 py-3 outline-none border border-zinc-700 focus:border-yellow-400 transition-colors placeholder:text-zinc-600"
                        />
                        {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
                    </div>

                    {error && (
                        <p className="text-red-400 text-xs text-center bg-red-400/10 rounded-xl py-2 px-3">{error}</p>
                    )}
                    {success && (
                        <p className="text-green-400 text-xs text-center bg-green-400/10 rounded-xl py-2 px-3">✅ {success}</p>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-semibold text-sm rounded-xl py-3 transition-colors"
                    >
                        {isLoading ? 'Creating...' : 'Create Driver Account'}
                    </button>
                </form>
            </div>
        </div>
    )
}