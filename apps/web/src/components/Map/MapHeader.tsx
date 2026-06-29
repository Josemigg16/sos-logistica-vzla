import { Link } from "@tanstack/react-router";
import { ArrowLeft, Info, Plus } from "lucide-react";
import isotipo from "@/assets/branding/white-isotipo-blue-background.webp";
import { SupportPhoneHeaderButton } from "./SupportPhoneHeaderButton";

interface MapHeaderProps {
  userLocation: [number, number] | null;
  clickedCoordinates: [number, number] | null;
  setShowWelcomeModal: (show: boolean) => void;
  setIsRegistering: (reg: boolean) => void;
  setSelectedId: (id: string | null) => void;
  setSelectedIncidentId: (id: string | null) => void;
  setMapCenter: (coords: [number, number]) => void;
  setMapZoom: (zoom: number) => void;
  setUseCurrentLocation: (use: boolean) => void;
}

export function MapHeader({
  userLocation,
  clickedCoordinates,
  setShowWelcomeModal,
  setIsRegistering,
  setSelectedId,
  setSelectedIncidentId,
  setMapCenter,
  setMapZoom,
  setUseCurrentLocation,
}: MapHeaderProps) {
  return (
    <header className="absolute top-3 left-3 right-3 z-40 md:top-4 md:left-6 md:right-auto md:w-max md:max-w-[calc(100vw-48px)] flex items-center justify-between gap-2 md:gap-6 p-2 md:p-3 rounded-2xl bg-card/90 border border-border shadow-2xl backdrop-blur-md transition-shadow transition-colors duration-300">
      <div className="flex items-center gap-1.5 md:gap-2.5 min-w-0 flex-1">
        <Link
          to="/"
          className="flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-lg bg-secondary/80 border border-border text-foreground hover:bg-secondary active:scale-[0.96] transition-[transform,background-color] duration-200 cursor-pointer shrink-0"
          title="Volver a necesidades"
          aria-label="Volver a necesidades"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <img
          src={isotipo}
          alt="Portuguesa Unida"
          className="w-8 h-8 md:w-10 md:h-10 rounded-lg object-cover shrink-0"
        />
        <div className="hidden sm:block min-w-0">
          <h1
            className="text-sm font-black text-foreground m-0 leading-none tracking-wide truncate"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: "italic" }}
          >
            PORTUGUESA UNIDA
          </h1>
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-none font-medium">Centros de Acopio</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 md:gap-2.5 shrink-0">
        <SupportPhoneHeaderButton />
        <button
          onClick={() => setShowWelcomeModal(true)}
          className="flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-lg bg-secondary/80 border border-border text-foreground hover:bg-secondary transition-transform transition-colors duration-200 active:scale-[0.96] cursor-pointer shrink-0"
          title="¿Cómo usar el mapa?"
          aria-label="¿Cómo usar el mapa?"
        >
          <Info className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            const willUseCurrent = clickedCoordinates ? false : userLocation !== null;
            setUseCurrentLocation(willUseCurrent);
            setIsRegistering(true);
            setSelectedId(null);
            setSelectedIncidentId(null);
            const target = willUseCurrent ? userLocation : clickedCoordinates;
            if (target) {
              setMapCenter(target);
              setMapZoom(15);
            }
          }}
          className="register-cta relative flex items-center justify-center gap-1 md:gap-1.5 h-8 md:h-9 px-2.5 md:px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-black text-[11px] md:text-[13px] uppercase tracking-wide active:scale-[0.96] transition-[transform,background-color] duration-200 cursor-pointer shadow-lg shadow-blue-600/40 shrink-0"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: "italic" }}
          title="Registrar nuevo centro de acopio"
        >
          <Plus className="w-3.5 h-3.5 md:w-4 md:h-4 stroke-[3]" />
          <span>Registrar</span>
        </button>
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-semibold border border-blue-500/20 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping"></span>
          Público
        </div>
      </div>
    </header>
  );
}
