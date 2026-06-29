interface VerificationLightboxProps {
  imageUrl: string;
  onClose: () => void;
}

export function VerificationLightbox({ imageUrl, onClose }: VerificationLightboxProps) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md cursor-zoom-out animate-in fade-in duration-200"
    >
      <div className="relative max-w-[90vw] max-h-[85vh] md:max-w-4xl flex flex-col items-center animate-in zoom-in-95 duration-300">
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 text-white hover:text-gray-300 font-semibold text-xs bg-white/10 hover:bg-white/20 px-3.5 py-1.5 rounded-lg border border-white/10 active:scale-95 transition-[transform,background-color] duration-200 cursor-pointer"
        >
          Cerrar (Esc)
        </button>
        <img
          src={imageUrl}
          alt="Verificación ampliada"
          className="w-full h-full object-contain rounded-2xl shadow-2xl border border-white/10 cursor-default"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}
