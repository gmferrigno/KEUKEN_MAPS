import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useDragControls } from "motion/react";
import { LocationExclamationIcon, SearchIcon } from "@repo/icons";
import { useMapCore } from "@repo/map-core";
import { useGeoreferenceEditRef } from "../utils/hooks/map/useContextRef";
import { useAppSelector } from "../store/hooks";
import { geocodeAddress } from "../services/geocoding.service";
import type { IGeocodeResult } from "../utils/types/georeference.types";
import { notify } from "../utils/helpers/messageHelper";

const GeoreferenceToolbar = () => {
  const {
    isEditing,
    target,
    currentCoordinates,
    isSaving,
    handleConfirmEdition,
    handleCancelEdition,
    handleSetCoordinates,
  } = useGeoreferenceEditRef();
  const { flyTo } = useMapCore();
  const { enterprise_id } = useAppSelector((state) => state.user.enterprise);

  const constraintsRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();

  const [addressQuery, setAddressQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<IGeocodeResult[]>([]);

  useEffect(() => {
    if (!isEditing) {
      setAddressQuery("");
      setResults([]);
      setIsSearching(false);
    }
  }, [isEditing]);

  const coordsLabel = currentCoordinates
    ? `${currentCoordinates[0].toFixed(6)}, ${currentCoordinates[1].toFixed(6)}`
    : "—";

  const applyCoordinates = (latitude: number, longitude: number) => {
    const coords: [number, number] = [latitude, longitude];
    handleSetCoordinates(coords);
    flyTo(coords, undefined, { animate: true, duration: 0.6 });
  };

  const handleSearchAddress = async () => {
    if (!addressQuery.trim() || isSearching) return;
    if (!enterprise_id || enterprise_id === -1) {
      notify("No hay empresa seleccionada para buscar la dirección.", "WARN");
      return;
    }

    setIsSearching(true);
    setResults([]);
    try {
      const found = await geocodeAddress({
        q: addressQuery,
        enterprise_id,
        country_codes: "ar",
        limit: 5,
      });
      if (found.length === 0) {
        notify("No se encontraron resultados para esa dirección.", "WARN");
        return;
      }
      setResults(found);
      applyCoordinates(found[0].latitude, found[0].longitude);
      notify("Pin movido a la dirección encontrada.", "INFO");
    } catch (error: any) {
      notify(
        error?.detail ?? error?.message ?? "Error al buscar la dirección.",
        "ERROR"
      );
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <AnimatePresence>
      {isEditing && target && (
        <div
          ref={constraintsRef}
          className="absolute inset-0 z-[1100] pointer-events-none"
        >
          <motion.div
            drag
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={constraintsRef}
            dragElastic={0}
            dragMomentum={false}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="pointer-events-auto absolute top-3 left-1/2 -translate-x-1/2"
          >
            <div className="flex flex-col gap-2 min-w-[300px] max-w-[420px] px-3 py-2.5 rounded-dx bg-primary-950/95 backdrop-blur-xl border border-focus-300/30 shadow-2xl">
              {/* Drag handle */}
              <div
                onPointerDown={(e) => dragControls.start(e)}
                className="flex items-center gap-2 cursor-grab active:cursor-grabbing select-none"
                title="Arrastrar panel"
              >
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-focus-500 text-variant border border-focus-300/50 shrink-0">
                  Modo edición
                </span>
                <LocationExclamationIcon className="stroke-focus-300 size-4 shrink-0" />
                <p
                  className="text-xs font-semibold text-main truncate"
                  title={target.clientName}
                >
                  {target.clientName}
                  <span className="text-focus-300 font-mono ml-1">#{target.clientId}</span>
                </p>
                <span
                  className="ml-auto flex flex-col gap-[2px] shrink-0 opacity-40"
                  aria-hidden
                >
                  <span className="block w-3 h-px bg-main" />
                  <span className="block w-3 h-px bg-main" />
                  <span className="block w-3 h-px bg-main" />
                </span>
              </div>

              <p className="text-[10px] text-main/60 font-mono truncate" title={coordsLabel}>
                {coordsLabel}
              </p>

              <p className="text-[10px] text-main/50">
                Arrastre el pin o busque una dirección para moverlo.
              </p>

              {/* Address search */}
              <form
                className="flex gap-1.5 w-full"
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSearchAddress();
                }}
              >
                <input
                  type="text"
                  value={addressQuery}
                  onChange={(e) => setAddressQuery(e.target.value)}
                  placeholder="Calle, número, ciudad…"
                  disabled={isSaving || isSearching}
                  className="flex-1 min-w-0 bg-primary-500/25 border border-main/10 focus:border-focus-300/60 rounded-dx px-2.5 py-1.5 outline-none text-[11px] text-main placeholder:text-main/40 caret-focus-300 transition-colors disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isSaving || isSearching || !addressQuery.trim()}
                  className="shrink-0 cursor-pointer px-2.5 py-1.5 flex items-center justify-center bg-focus-500 hover:bg-focus-300 border border-focus-300/50 rounded-dx transition-colors text-variant disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Buscar dirección"
                >
                  <SearchIcon className="size-3.5 stroke-variant" />
                </button>
              </form>

              {results.length > 1 && (
                <ul className="max-h-[110px] overflow-y-auto flex flex-col gap-1 border border-main/10 rounded-dx p-1 bg-primary-900/50">
                  {results.map((result, index) => (
                    <li key={`${result.latitude}-${result.longitude}-${index}`}>
                      <button
                        type="button"
                        onClick={() => {
                          applyCoordinates(result.latitude, result.longitude);
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-dx text-[10px] text-main/80 hover:bg-focus-500/20 hover:text-main transition-colors cursor-pointer line-clamp-2"
                        title={result.displayName}
                      >
                        {result.displayName}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex gap-2 w-full pt-0.5">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleCancelEdition}
                  className="w-1/2 cursor-pointer px-2 py-1.5 flex justify-center items-center bg-primary-900 hover:bg-error/20 border border-main/15 hover:border-error/40 rounded-dx transition-colors duration-150 text-main/80 hover:text-error text-xs uppercase shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    void handleConfirmEdition();
                  }}
                  className="w-1/2 cursor-pointer px-2 py-1.5 flex justify-center items-center bg-focus-500 hover:bg-focus-300 border border-focus-300/50 rounded-dx transition-colors duration-150 text-variant text-xs font-bold uppercase shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? "Guardando…" : "Confirmar"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default GeoreferenceToolbar;
