import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
            <div className="max-w-md w-full space-y-8 p-10 rounded-3xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl animate-in fade-in zoom-in duration-500">
                <div className="relative aspect-video rounded-2xl overflow-hidden border-2 border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                    <video
                        src="/404.mp4"
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                </div>

                <div className="space-y-4">
                    <h1 className="text-7xl font-black bg-gradient-to-b from-green-400 to-emerald-600 bg-clip-text text-transparent">
                        404
                    </h1>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-white tracking-tight">¡Ups! Te perdiste</h2>
                        <p className="text-gray-400 leading-relaxed">
                            La página que buscas no existe. <br />
                            Tal vez se movió a otra dimensión.
                        </p>
                    </div>
                </div>

                <Link href="/" passHref>
                    <Button className="w-full bg-green-600 hover:bg-green-500 text-white gap-2 h-14 text-lg font-bold rounded-2xl shadow-lg shadow-green-900/20 group transition-all duration-300 hover:scale-[1.02]">
                        <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                        Volver a la base
                    </Button>
                </Link>
            </div>
        </div>
    )
}
