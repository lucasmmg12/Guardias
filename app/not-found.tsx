import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function NotFound() {
    return (
        <div className="min-h-screen bg-black text-white relative flex items-center justify-center overflow-hidden px-6">
            {/* Fondo con auroras de servidor GrowLabs */}
            <div className="fixed inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#00FF88]/10 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#00FF88]/10 rounded-full blur-[120px] animate-pulse delay-700"></div>
            </div>

            <div className="max-w-2xl w-full relative z-10 text-center space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00FF88]/10 border border-[#00FF88]/20 text-[#00FF88] text-xs font-bold tracking-widest uppercase mx-auto">
                        <ArrowLeft className="h-3 w-3" />
                        Lost in Transit
                    </div>
                    <h1 className="text-[12rem] font-black tracking-tighter leading-none text-white opacity-20 select-none">
                        404
                    </h1>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full">
                        <h2 className="text-6xl font-black tracking-tighter italic uppercase text-white drop-shadow-2xl">
                            ¿TE PERDISTE SIENDO <br />
                            <span className="text-[#00FF88]">UN EXPERTO?</span>
                        </h2>
                    </div>
                </div>

                <p className="text-gray-400 text-lg max-w-md mx-auto font-medium leading-relaxed">
                    La ruta solicitada no se encuentra en nuestro sistema. Es posible que el recurso haya sido reubicado o eliminado por un administrador.
                </p>

                <div className="flex justify-center">
                    <Link href="/" passHref>
                        <button className="flex items-center gap-3 px-12 py-5 rounded-full bg-[#00FF88] text-black font-black text-sm tracking-tighter hover:scale-105 transition-all shadow-[0_0_30px_rgba(0,255,136,0.3)]">
                            <ArrowLeft className="h-5 w-5" />
                            VOLVER A LA BASE
                        </button>
                    </Link>
                </div>
            </div>
        </div>
    )
}
