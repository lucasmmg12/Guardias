import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'Sistema de Liquidaciones de Guardias - Grow Labs',
    description: 'Sistema de procesamiento y gestión de liquidaciones de guardias médicas',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="es" className="dark">
            <body
                className={`${inter.className} min-h-screen relative`}
                style={{
                    backgroundImage: 'url(/fondogrow.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundAttachment: 'fixed',
                    backgroundRepeat: 'no-repeat'
                }}
            >
                {/* Overlay oscuro para mejor legibilidad */}
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm pointer-events-none z-0"
                />

                {/* Contenido */}
                <div className="relative z-10">
                    {children}
                </div>
            </body>
        </html>
    )
}
