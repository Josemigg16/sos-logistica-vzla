import { Sun, Moon, Search, X, SlidersHorizontal, ClipboardList } from "lucide-react";
import { Map, MapControls, MapMarker, MapPickedLocationMarker, MapRoute, MapUserLocationMarker, MapIncidentMarker } from "@/components/ui/map";
import { UseMapViewer } from "@/hooks/UseMapViewer";
import { MapHeader } from "@/components/Map/MapHeader";
import { WelcomeModal } from "@/components/Map/WelcomeModal";
import { PublicHubModal } from "@/components/Map/PublicHubModal";
import { GeneratedPasswordModal } from "@/components/Map/GeneratedPasswordModal";
import { FiltersPopover } from "@/components/Map/FiltersPopover";
import { CenterDetailsPanel } from "@/components/Map/CenterDetailsPanel";
import { EmergencyDetailsPanel } from "@/components/Map/EmergencyDetailsPanel";
import { UrgentNeedsPanel } from "@/components/Map/UrgentNeedsPanel";
import { VerificationLightbox } from "@/components/Map/VerificationLightbox";
import { CENTRO_TYPE_UI, INCIDENT_PRIORITY_LABELS, CENTRO_TYPES } from "@/lib/map/mapViewerConstants";

export default function App() {
  const mapState = UseMapViewer();

  const {
    theme,
    visibleIncidents,
    selectedId,
    setSelectedId,
    selectedIncidentId,
    setSelectedIncidentId,
    searchTerm,
    setSearchTerm,
    activeTipos,
    setActiveTipos,
    showSupplyRoute,
    activeImageUrl,
    setActiveImageUrl,
    isRegistering,
    setIsRegistering,
    clickedCoordinates,
    setClickedCoordinates,
    useCurrentLocation,
    setUseCurrentLocation,
    isSaving,
    hubFieldErrors,
    hubFormError,
    generatedCredentials,
    setGeneratedCredentials,
    activeConvoys,
    showNeedsPanel,
    setShowNeedsPanel,
    showFiltersPopover,
    setShowFiltersPopover,
    needs,
    isLoadingNeeds,
    showDrawerNeeds,
    setShowDrawerNeeds,
    groupNeedsBy,
    setGroupNeedsBy,
    showWelcomeModal,
    setShowWelcomeModal,
    handleMapClick,
    routeCoordinates,
    selectedCentro,
    selectedIncident,
    centroNeeds,
    mapCenter,
    setMapCenter,
    mapZoom,
    setMapZoom,
    userLocation,
    sortedNeeds,
    groupedNeedsByCentro,
    filteredCentros,
    toggleTipo,
    handleSelectCentro,
    handleRegisterHubSubmit,
    navigate,
    setHubFieldErrors,
    setHubFormError,
    centros,
  } = mapState;

  return (
    <div className="mapa-layout relative flex flex-col select-none bg-background text-foreground transition-colors duration-300 antialiased">
      {/* HEADER */}
      <MapHeader
        userLocation={userLocation}
        clickedCoordinates={clickedCoordinates}
        setShowWelcomeModal={setShowWelcomeModal}
        setIsRegistering={setIsRegistering}
        setSelectedId={setSelectedId}
        setSelectedIncidentId={setSelectedIncidentId}
        setMapCenter={setMapCenter}
        setMapZoom={setMapZoom}
        setUseCurrentLocation={setUseCurrentLocation}
      />

      {/* MAPA PRINCIPAL */}
      <main className="w-full h-full z-10 relative">
        <Map
          center={mapCenter}
          zoom={mapZoom}
          theme={theme}
          className="w-full h-full"
          centerPadding={
            isRegistering && typeof window !== "undefined"
              ? window.innerWidth < 768
                ? { bottom: Math.round(window.innerHeight * 0.6) }
                : { right: 460 }
              : undefined
          }
          onClick={handleMapClick}
          onMoveEnd={(center, zoom) => {
            setMapCenter(center);
            setMapZoom(zoom);
            localStorage.setItem("map_center", JSON.stringify(center));
            localStorage.setItem("map_zoom", JSON.stringify(zoom));
          }}
        >
          <MapControls />
          {showSupplyRoute && (
            <MapRoute coordinates={routeCoordinates} color="#10b981" />
          )}
          {userLocation && (
            <MapUserLocationMarker coordinates={userLocation} />
          )}
          {clickedCoordinates && !(isRegistering && useCurrentLocation) && (
            <MapPickedLocationMarker
              coordinates={clickedCoordinates}
              draggable
              onDragEnd={(lngLat) => setClickedCoordinates(lngLat)}
            />
          )}
          {filteredCentros.map(c => {
            return (
              <MapMarker
                key={c.id}
                coordinates={c.coordenadas}
                onClick={() => handleSelectCentro(c)}
                color={CENTRO_TYPE_UI[c.tipo].marker}
                active={selectedId === c.id}
                hasNeeds={(c.needs?.length ?? 0) > 0}
              />
            );
          })}
          {visibleIncidents.map((incident) => (
            <MapIncidentMarker
              key={incident.id}
              coordinates={[incident.longitude, incident.latitude]}
              title={incident.title}
              priorityLabel={INCIDENT_PRIORITY_LABELS[incident.priority]}
              emphasis={incident.status === "CONTAINED" ? "contained" : "active"}
              onClick={() => {
                setSelectedIncidentId(incident.id);
                setSelectedId(null);
                setIsRegistering(false);
                setClickedCoordinates(null);
                setShowNeedsPanel(false);
                setMapCenter([incident.longitude, incident.latitude]);
                setMapZoom((z) => Math.max(z, 12));
              }}
            />
          ))}
        </Map>

        {/* BOTONES FLOTANTES: NECESIDADES Y FILTROS */}
        <div className={`absolute left-4 right-4 z-30 flex gap-3 transition-all duration-300 md:left-auto md:right-6 md:bottom-6 ${
          selectedId || selectedIncidentId ? "bottom-28 pointer-events-none opacity-0" : "bottom-4"
        }`}>
          {/* Botón Necesidades */}
          <button
            onClick={() => {
              setShowNeedsPanel(true);
              setShowFiltersPopover(false);
            }}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-card/95 border border-border shadow-lg backdrop-blur-md text-foreground font-bold text-xs hover:bg-secondary active:scale-[0.97] transition-all duration-150 cursor-pointer relative"
          >
            <ClipboardList className="w-4 h-4 text-emerald-500" />
            <span>Necesidades</span>
            {needs.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4.5 w-4.5 items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[9px] font-black text-white items-center justify-center shadow-md shadow-red-500/50">
                  {needs.length}
                </span>
              </span>
            )}
          </button>

          {/* Botón Filtros */}
          <button
            onClick={() => setShowFiltersPopover(!showFiltersPopover)}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-card/95 border border-border shadow-lg backdrop-blur-md text-foreground font-bold text-xs hover:bg-secondary active:scale-[0.97] transition-all duration-150 cursor-pointer relative"
          >
            <SlidersHorizontal className="w-4 h-4 text-blue-500" />
            <span>Filtros</span>
            {activeTipos.size < CENTRO_TYPES.length && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[9px] font-bold text-white">
                {activeTipos.size}
              </span>
            )}
          </button>
        </div>

        {/* MENU FLOTANTE DE FILTROS */}
        {showFiltersPopover && !selectedId && (
          <FiltersPopover
            activeTipos={activeTipos}
            toggleTipo={toggleTipo}
            activeConvoysLength={activeConvoys.length}
            showSupplyRoute={showSupplyRoute}
            userLocation={userLocation}
            setActiveTipos={setActiveTipos}
          />
        )}
      </main>

      {/* CONTROLES FLOTANTES / FILTROS (MOBILE FIRST) */}
      <div className="absolute top-[68px] left-3 right-3 z-30 md:top-24 md:left-6 md:right-auto md:w-96 flex flex-col gap-2">
        {/* Barra de búsqueda */}
        <div className="relative flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por ciudad, centro o dirección..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-card/90 border border-border text-base md:text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-emerald-500/50 shadow-lg backdrop-blur-md transition-all duration-300"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 flex items-center justify-center w-6 h-6 rounded-full bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors active:scale-95"
              title="Limpiar búsqueda"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Dropdown de resultados */}
          {searchTerm.trim() && (
            <div className="absolute top-full left-0 right-0 mt-2 max-h-72 overflow-y-auto no-scrollbar rounded-xl bg-card/95 border border-border shadow-2xl backdrop-blur-md z-50 animate-in fade-in slide-in-from-top-1 duration-200">
              {filteredCentros.length > 0 ? (
                filteredCentros.map((c) => {
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        handleSelectCentro(c);
                        setSearchTerm("");
                      }}
                      className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-secondary/60 active:bg-secondary transition-colors border-b border-border/40 last:border-b-0"
                    >
                      <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${CENTRO_TYPE_UI[c.tipo].dot}`} />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground leading-tight truncate">{c.nombre}</p>
                        <p className="text-[10px] text-muted-foreground leading-tight truncate mt-0.5">{c.direccion}</p>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="px-3 py-4 text-center">
                  <p className="text-[11px] text-muted-foreground">
                    Sin resultados para «{searchTerm.trim()}»
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* PANEL DE DETALLES DEL CENTRO SELECCIONADO */}
      <CenterDetailsPanel
        selectedCentro={selectedCentro}
        setSelectedId={setSelectedId}
        centroNeeds={centroNeeds}
        showDrawerNeeds={showDrawerNeeds}
        setShowDrawerNeeds={setShowDrawerNeeds}
        setActiveImageUrl={setActiveImageUrl}
      />

      {/* PANEL DE DETALLES DE EMERGENCIA SELECCIONADA */}
      <EmergencyDetailsPanel
        selectedIncident={selectedIncident}
        setSelectedIncidentId={setSelectedIncidentId}
      />

      {/* PANEL DE NECESIDADES URGENTES */}
      <UrgentNeedsPanel
        showNeedsPanel={showNeedsPanel}
        setShowNeedsPanel={setShowNeedsPanel}
        isLoadingNeeds={isLoadingNeeds}
        groupNeedsBy={groupNeedsBy}
        setGroupNeedsBy={setGroupNeedsBy}
        needs={needs}
        sortedNeeds={sortedNeeds}
        groupedNeedsByCentro={groupedNeedsByCentro}
        centros={centros}
        userLocation={userLocation}
        setSelectedId={setSelectedId}
        setSelectedIncidentId={setSelectedIncidentId}
        setMapCenter={setMapCenter}
        setMapZoom={setMapZoom}
        handleSelectCentro={handleSelectCentro}
      />

      {/* LIGHTBOX DE VERIFICACIÓN */}
      {activeImageUrl && (
        <VerificationLightbox
          imageUrl={activeImageUrl}
          onClose={() => setActiveImageUrl(null)}
        />
      )}

      {/* MODAL DE BIENVENIDA */}
      {showWelcomeModal && (
        <WelcomeModal
          onClose={() => {
            localStorage.setItem("map_welcome_seen", "1");
            setShowWelcomeModal(false);
          }}
        />
      )}

      {/* MODAL DE REGISTRO */}
      {isRegistering && (
        <PublicHubModal
          onClose={() => {
            setIsRegistering(false);
            setHubFieldErrors({});
            setHubFormError(null);
          }}
          initialCoordinates={
            useCurrentLocation && userLocation ? userLocation : clickedCoordinates
          }
          coordinatesSource={
            useCurrentLocation && userLocation
              ? "current-location"
              : clickedCoordinates
                ? "map-click"
                : null
          }
          userLocation={userLocation}
          hasPickedCoordinates={clickedCoordinates !== null}
          onUseCurrentLocation={() => {
            if (!userLocation) return;
            setUseCurrentLocation(true);
            setMapCenter(userLocation);
            setMapZoom(15);
          }}
          onUsePickedLocation={() => {
            if (!clickedCoordinates) return;
            setUseCurrentLocation(false);
            setMapCenter(clickedCoordinates);
            setMapZoom(15);
          }}
          isSubmitting={isSaving}
          fieldErrors={hubFieldErrors}
          formError={hubFormError}
          onSubmit={handleRegisterHubSubmit}
        />
      )}

      {/* CREDENCIALES GENERADAS */}
      {generatedCredentials && (
        <GeneratedPasswordModal
          telefono={generatedCredentials.telefono}
          password={generatedCredentials.password}
          onClose={() => {
            setGeneratedCredentials(null);
            navigate({ to: "/admin/hubs" });
          }}
        />
      )}
    </div>
  );
}
