import { httpRequest } from "."
import type { IClient } from "../utils/types/sellerObserver/clients.types"
import type { ICPDResponse } from "../utils/types/general.types"
import type { IClientLocationUpdate } from "../utils/types/georeference.types"

export const getAllClients = async (enterprise_id: number, date: string): Promise<IClient[]> => {
  return await httpRequest({
    url: '/seller_route/clients',
    method: 'GET',
    params: {
      routeDate: date,
      enterprise: enterprise_id
    },
    isAuth: true,
  })
}

export const updateClientLocation = async (
  clientId: number | string,
  enterprise_id: number,
  data: IClientLocationUpdate
): Promise<ICPDResponse> => {
  return await httpRequest({
    url: `/client/${clientId}/location`,
    method: 'PUT',
    params: { enterprise : enterprise_id },
    isAuth: true,
    data,
  })
}
