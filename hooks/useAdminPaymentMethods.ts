export function useAdminPaymentMethods() {
  // TODO(payments-penalties-service): Replace placeholders with real admin
  // payment method endpoints when Payments & Penalties Service is available.
  const getMethods = () => {
    return [] as Array<{ id: string; provider: string; active: boolean }>;
  };

  const addMethod = () => {
    // TODO(payments-penalties-service): implement add payment method integration.
  };

  return { getMethods, addMethod };
}

export default useAdminPaymentMethods;
