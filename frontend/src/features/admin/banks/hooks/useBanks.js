import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';

import { banksApi } from '../api/banksApi.js';

export const ADMIN_BANKS_KEY = ['admin-banks'];
export const ADMIN_BANK_KEY = (bankId) => ['admin-bank', bankId];

export const BANKS_PER_PAGE = 20;

/** Listado paginado del servidor, mismo criterio que `useBanners`. */
export function useBanks(page = 1) {
  return useQuery({
    queryKey: [...ADMIN_BANKS_KEY, { page }],
    queryFn: () => banksApi.list({ page, perPage: BANKS_PER_PAGE }),
    placeholderData: keepPreviousData,
  });
}

/** Invalida lo que una escritura de banco deja obsoleto. */
export function useBankInvalidation() {
  const queryClient = useQueryClient();

  return (bankId) => {
    queryClient.invalidateQueries({ queryKey: ADMIN_BANKS_KEY });
    if (bankId) {
      queryClient.invalidateQueries({ queryKey: ADMIN_BANK_KEY(bankId) });
    }
  };
}
