import { createContext, useCallback, useState, type ReactNode } from "react";
import type L from "leaflet";
import moment from "moment";
import { clientsService } from "@repo/firebase-services";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { updateClientLocation } from "../../services/clients.service";
import { updateClientLocationLocal } from "../../store/slices/sellerObserver/clientsSlice";
import { updateDeliveryClientLocationLocal } from "../../store/slices/driverObserver/clientsSlice";
import type { IGeoreferenceTarget } from "../types/georeference.types";
import { canDo as canGeoreference } from "../permissions/georeference.permissions";
import { notify } from "../helpers/messageHelper";

export interface IGeoreferenceEditHandler {
  isEditing: boolean;
  target: IGeoreferenceTarget | null;
  currentCoordinates: [number, number] | null;
  isSaving: boolean;
  handleStartEditing: (payload: IGeoreferenceTarget) => void;
  handleDragEnd: (latlng: L.LatLng) => void;
  handleSetCoordinates: (coords: [number, number]) => void;
  handleConfirmEdition: () => Promise<void>;
  handleCancelEdition: () => void;
  cleanStates: () => void;
}

export const GeoreferenceEditContext = createContext<IGeoreferenceEditHandler | null>(null);

const isSelectedDateToday = (date: string | Date | undefined | null): boolean => {
  const selected = moment(date);
  if (!selected.isValid()) return false;
  return selected.format("YYYY-MM-DD") === moment().format("YYYY-MM-DD");
};

export const GeoreferenceEditProvider = ({ children }: { children: ReactNode }) => {
  const dispatch = useAppDispatch();
  const { enterprise_id } = useAppSelector((state) => state.user.enterprise);
  const { permissions } = useAppSelector((state) => state.user.profile);
  const selectedDate = useAppSelector((state) => state.sidebar.date);
  const deliveryById = useAppSelector((state) => state.deliveries?.deliveryById ?? {});

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [target, setTarget] = useState<IGeoreferenceTarget | null>(null);
  const [currentCoordinates, setCurrentCoordinates] = useState<[number, number] | null>(null);

  const cleanStates = useCallback(() => {
    setIsEditing(false);
    setIsSaving(false);
    setTarget(null);
    setCurrentCoordinates(null);
  }, []);

  const handleStartEditing = useCallback(
    (payload: IGeoreferenceTarget) => {
      if (!canGeoreference(permissions, "EDIT")) {
        notify("No tiene permiso para georeferenciar PDVs.", "WARN");
        return;
      }
      if (payload.source === "driverObserver" && !isSelectedDateToday(selectedDate)) {
        notify("Solo se puede georeferenciar PDVs del día actual en repartos.", "WARN");
        return;
      }
      if (isEditing) {
        notify("Para georeferenciar otro PDV, finalice la edición actual.", "WARN");
        return;
      }
      setTarget(payload);
      setCurrentCoordinates(payload.originalCoordinates);
      setIsEditing(true);
      notify("Modo georeferencia: arrastre el pin del PDV y confirme.", "INFO");
    },
    [isEditing, permissions, selectedDate]
  );

  const handleDragEnd = useCallback((latlng: L.LatLng) => {
    setCurrentCoordinates([latlng.lat, latlng.lng]);
  }, []);

  const handleSetCoordinates = useCallback((coords: [number, number]) => {
    setCurrentCoordinates(coords);
  }, []);

  const handleCancelEdition = useCallback(() => {
    cleanStates();
  }, [cleanStates]);

  const handleConfirmEdition = useCallback(async () => {
    if (!target || !currentCoordinates) return;

    const [latitude, longitude] = currentCoordinates;
    const [origLat, origLng] = target.originalCoordinates;

    if (latitude === origLat && longitude === origLng) {
      notify("No hubo cambios en la ubicación del PDV.", "WARN");
      cleanStates();
      return;
    }

    if (target.source === "driverObserver" && !isSelectedDateToday(selectedDate)) {
      notify("Solo se puede georeferenciar PDVs del día actual en repartos.", "WARN");
      return;
    }

    setIsSaving(true);
    try {
      const response = await updateClientLocation(target.clientId, enterprise_id, {
        latitude,
        longitude,
      });

      if (target.source === "sellerObserver") {
        dispatch(
          updateClientLocationLocal({
            clientCode: String(target.clientId),
            latitude,
            longitude,
          })
        );
      }

      if (target.source === "driverObserver") {
        if (target.groupId == null) {
          throw new Error("No se encontró el reparto asociado al PDV.");
        }

        const deliveryId = Number(target.groupId);
        const delivery = deliveryById[deliveryId];
        const companyId =
          delivery?.enterprise ||
          (enterprise_id && enterprise_id !== -1 ? String(enterprise_id) : "");

        if (!companyId) {
          throw new Error("No se encontró companyId para actualizar el reparto en Firestore.");
        }

        await clientsService.updateLocation({
          companyId,
          deliveryId,
          clientId: target.clientId,
          location: { latitude, longitude },
        });

        dispatch(
          updateDeliveryClientLocationLocal({
            clientId: Number(target.clientId),
            latitude,
            longitude,
          })
        );
      }

      notify(response?.message ?? "PDV georeferenciado con éxito.", "INFO");
      cleanStates();
    } catch (error: any) {
      notify(
        error?.detail ?? error?.message ?? "No se pudo guardar la nueva ubicación del PDV.",
        "ERROR"
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    target,
    currentCoordinates,
    enterprise_id,
    selectedDate,
    deliveryById,
    dispatch,
    cleanStates,
  ]);

  return (
    <GeoreferenceEditContext.Provider
      value={{
        isEditing,
        target,
        currentCoordinates,
        isSaving,
        handleStartEditing,
        handleDragEnd,
        handleSetCoordinates,
        handleConfirmEdition,
        handleCancelEdition,
        cleanStates,
      }}
    >
      {children}
    </GeoreferenceEditContext.Provider>
  );
};
