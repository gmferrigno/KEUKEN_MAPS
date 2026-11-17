import { useCallback } from "react";
import moment from "moment";
import {
  applyCoordinateOffset,
  calculateDistance,
  formatDistance,
  useCreatePath,
} from "@repo/map-core";
import type { IFDeliveryClient, IFVisit } from "@repo/api-contracts/firebase";
import { timeStampIcon } from "../../helpers/orderIconPicker";
import { useAppSelector } from "../../../store/hooks";
import {
  matchesVisitClient,
  resolveVisitForClient,
} from "../../../store/slices/driverObserver/visitsSlice";
import { useMapDriverObserverContext, useModalRef, useNotifyRef } from "./useContextRef";
import InvoiceModal from "../../../pages/home/components/invoiceModal";

export interface IDeliveryClientActionData {
  client: IFDeliveryClient;
  deliveryId?: number;
}

export interface IUseDeliveryClientActions {
  onClick: (data: IDeliveryClientActionData) => void;
  onLeftClick: (data: IDeliveryClientActionData) => void;
}

const resolveVisitCoordinates = (visit: IFVisit): [number, number] | null => {
  const nested = (visit as any)?.location;
  const lat = Number(visit.latitude ?? nested?.latitude ?? nested?.lat);
  const lng = Number(visit.longitude ?? nested?.longitude ?? nested?.lng);
  if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return null;
  return [lat, lng];
};

/**
 * Acciones de click sobre PDVs en DriverObserver.
 * - Click: abre InvoiceModal
 * - Click derecho / menú: dibuja línea + marker a las coords de la visita
 */
export const useDeliveryClientActions = (): IUseDeliveryClientActions => {
  const { OpenModal } = useModalRef();
  const notify = useNotifyRef();
  const { clientElements, mapRef } = useMapDriverObserverContext();
  const { createPolyLine, handleMarkers, handleTooltips } = useCreatePath({ mapRef });
  const visitByKey = useAppSelector((state) => state.visits.visitByDeliveryClientKey);
  const visitsByDeliveryId = useAppSelector((state) => state.visits.visitsByDeliveryId);

  const resolveVisits = useCallback(
    (data: IDeliveryClientActionData): IFVisit[] => {
      const { client, deliveryId } = data;
      if (deliveryId == null) return [];

      const fromList = (visitsByDeliveryId[deliveryId] || []).filter((v) =>
        matchesVisitClient(v.clientId, { id: client.id, clientId: client.clientId })
      );
      if (fromList.length > 0) return fromList;

      const single = resolveVisitForClient(visitByKey, deliveryId, {
        id: client.id,
        clientId: client.clientId,
      });
      return single ? [single] : [];
    },
    [visitByKey, visitsByDeliveryId]
  );

  const clickActionDefault = useCallback(
    (data: IDeliveryClientActionData): void => {
      const { client, deliveryId } = data;
      OpenModal({
        Component: InvoiceModal,
        props: { client, deliveryId },
      });
    },
    [OpenModal]
  );

  const leftClickActionDefault = useCallback(
    (data: IDeliveryClientActionData): void => {
      const OFFSET_METERS = 0.0003;
      const { client } = data;
      const visits = resolveVisits(data);

      if (!client?.location) {
        notify("El cliente no cuenta con coordenadas válidas", "WARN");
        return;
      }

      if (visits.length === 0) {
        notify("El cliente no tiene visita registrada", "WARN");
        return;
      }

      const clientLat = Number(client.location.latitude);
      const clientLng = Number(client.location.longitude);
      if (
        isNaN(clientLat) ||
        isNaN(clientLng) ||
        (clientLat === 0 && clientLng === 0)
      ) {
        notify("El cliente no cuenta con coordenadas válidas", "WARN");
        return;
      }

      const origin: [number, number] = [clientLat, clientLng];
      let closerItems = 0;
      let drawn = 0;
      const focusPoints: [number, number][] = [origin];

      visits.forEach((visit, idx) => {
        const coords = resolveVisitCoordinates(visit);
        if (!coords) return;

        const [visitLat, visitLng] = coords;
        const visitPoint: [number, number] = [visitLat, visitLng];
        const distMeters = calculateDistance(origin, visitPoint);
        const itsCloser = distMeters < 50;

        let route: [number, number][] = [origin, visitPoint];
        let markerPoint = visitPoint;

        if (itsCloser) {
          const offsetPoint = applyCoordinateOffset(origin, OFFSET_METERS, closerItems);
          route = [origin, offsetPoint];
          markerPoint = offsetPoint;
          closerItems >= 3 ? (closerItems = 0) : closerItems++;
        }

        const subId =
          visit.id != null
            ? String(visit.id)
            : `${visit.clientId}_${visit.visitTime || idx}`;

        const visitTimeLabel = visit.visitTime
          ? moment(visit.visitTime).format("HH:mm:ss")
          : "--:--:--";
        const radiusLabel = visit.isInRadius ? "En radio" : "Fuera de radio";

        createPolyLine({
          id: "deliveryClients",
          subId,
          polylineMapRef: "clientToVisitPolylines",
          points: route,
          options: itsCloser
            ? { color: "#10a745", weight: 2, dashArray: "0, 0" }
            : { color: "#de7d45", weight: 4, dashArray: "3, 6" },
          operation: "toggle",
          target: clientElements,
          hoverAction: (isHover, e) => {
            handleTooltips({
              id: client.id,
              subId,
              latlng: e.latlng,
              operation: isHover ? "move" : "remove",
              tooltipMapRef: "visitDistanceTooltips",
              target: clientElements,
              content: `${formatDistance(distMeters)} · ${visitTimeLabel} · ${radiusLabel}`,
            });
          },
        });

        handleMarkers({
          id: "deliveryClients",
          pointData: { id: subId, coordinates: markerPoint },
          Icon: { size: 16, iconUrl: timeStampIcon, zIndexOffset: 15000 },
          clickAction: () => {
            notify(
              `Visita ${visitTimeLabel} (${radiusLabel}) · ${visitLat.toFixed(5)}, ${visitLng.toFixed(5)}`,
              "INFO"
            );
          },
          operation: "toggle",
          markerMapRef: "visitPointMarkers",
          target: clientElements,
        });

        focusPoints.push(markerPoint);
        drawn += 1;
      });

      if (drawn === 0) {
        notify("La visita no tiene coordenadas válidas para mostrar", "WARN");
        return;
      }

      const map = mapRef?.current;
      if (map && focusPoints.length > 1) {
        try {
          const latLngs = focusPoints.map(([lat, lng]) => [lat, lng] as [number, number]);
          map.fitBounds(latLngs as any, { padding: [48, 48], maxZoom: 17 });
        } catch {
          map.panTo(focusPoints[focusPoints.length - 1]);
        }
      }
    },
    [
      resolveVisits,
      notify,
      createPolyLine,
      handleMarkers,
      handleTooltips,
      clientElements,
      mapRef,
    ]
  );

  return {
    onClick: clickActionDefault,
    onLeftClick: leftClickActionDefault,
  };
};

export default useDeliveryClientActions;
