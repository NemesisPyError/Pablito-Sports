import { useMutation } from '@tanstack/react-query';

import { banksApi } from '../api/banksApi.js';
import { useBankInvalidation } from './useBanks.js';

/** Alta y edición comparten mutación, mismo criterio que `useSaveBanner`. */
export function useSaveBank() {
  const invalidar = useBankInvalidation();

  return useMutation({
    mutationFn: ({ bankId, formData }) =>
      bankId ? banksApi.update(bankId, formData) : banksApi.create(formData),
    onSuccess: (_data, { bankId }) => invalidar(bankId),
  });
}
