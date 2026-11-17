export interface IClientLocationUpdate {
  latitude: number;
  longitude: number;
}

/** Resultado de forward geocoding (contrato backend GET /geocode/search). */
export interface IGeocodeResult {
  displayName: string;
  latitude: number;
  longitude: number;
}

export interface IGeocodeSearchParams {
  q: string;
  enterprise_id: number;
  limit?: number;
  country_codes?: string;
  language?: string;
}

export type TGeoreferenceSource = 'sellerObserver' | 'driverObserver';

export interface IGeoreferenceTarget {
  /** Identificador del PDV usado en el marker (seller: code, driver: client.id) */
  clientId: number | string;
  /** Nombre para mostrar en la toolbar */
  clientName: string;
  /** Coords originales al entrar en modo edición */
  originalCoordinates: [number, number];
  /** Seller id (sellerObserver) o delivery id (driverObserver) — contexto de grupo del marker */
  groupId?: number | string;
  source: TGeoreferenceSource;
  /** Marker map ref key en el árbol de elementos */
  markerMapRef: string;
  /** Parent id en el árbol de elementos (sellerId | 'deliveryClients') */
  elementsParentId: number | string;
}
