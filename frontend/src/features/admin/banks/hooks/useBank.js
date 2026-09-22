import { useQuery } from '@tanstack/react-query';

import { banksApi } from '../api/banksApi.js';
import { ADMIN_BANK_KEY } from './useBanks.js';

/** Detalle de un banco. `BankAdminDTO`. */
export function useBank(bankId) {
  return useQuery({
    queryKey: ADMIN_BANK_KEY(bankId),
    queryFn: () => banksApi.detail(bankId),
    enabled: Boolean(bankId),
  });
}
