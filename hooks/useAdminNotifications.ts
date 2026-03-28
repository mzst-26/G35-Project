export function useAdminNotifications() {
  // TODO(communications-service): Replace placeholders with real admin notification
  // endpoints once Communications Service is available.
  const getNotifications = () => {
    return [] as Array<{ id: string; message: string; read: boolean }>;
  };

  const markRead = () => {
    // TODO(communications-service): implement mark-as-read endpoint integration.
  };

  return { getNotifications, markRead };
}

export default useAdminNotifications;
