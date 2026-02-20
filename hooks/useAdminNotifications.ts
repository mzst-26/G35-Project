export function useAdminNotifications() {
  // Placeholder implementations for admin notifications
  const getNotifications = () => {
    return [] as Array<{ id: string; message: string; read: boolean }>;
  };

  const markRead = (id: string) => {
    // TODO: implement mark-as-read
  };

  return { getNotifications, markRead };
}

export default useAdminNotifications;
