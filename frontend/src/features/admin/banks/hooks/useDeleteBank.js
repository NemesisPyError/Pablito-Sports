import { useMutation } from '@tanstack/react-query';

import { banksApi } from '../api/banksApi.js';
import { useBankInvalidation } from './useBanks.js';

/** Borrado lógico. El archivo de imagen se retira solo si nadie más lo usa. */
export function useDeleteBank() {
  const invalidar = useBankInvalidation();

  return useMutation({
    mutationFn: (bankId) => banksApi.remove(bankId),
    onSuccess: (_data, bankId) => invalidar(bankId),
  });
}
