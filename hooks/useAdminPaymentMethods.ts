export function useAdminPaymentMethods() {
  // Placeholder implementations for admin payment methods
  const getMethods = () => {
    return [] as Array<{ id: string; provider: string; active: boolean }>;
  };

  const addMethod = (method: { provider: string }) => {
    // TODO: implement add payment method
  };

  return { getMethods, addMethod };
}

export default useAdminPaymentMethods;
