import { httpRequest } from "."
import type { IGeocodeResult, IGeocodeSearchParams } from "../utils/types/georeference.types"

export type { IGeocodeResult }


export const geocodeAddress = async (
  params: IGeocodeSearchParams
): Promise<IGeocodeResult[]> => {
  const q = params.q.trim()
  if (!q) return []

  return await httpRequest({
    url: '/geocode/search',
    method: 'GET',
    params: {
      q,
      enterprise_id: params.enterprise_id,
      limit: params.limit ?? 5,
      country_codes: params.country_codes ?? 'ar',
      language: params.language ?? 'es',
    },
    isAuth: true,
  })
}
