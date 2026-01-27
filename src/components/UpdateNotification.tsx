import { useRegisterSW } from 'virtual:pwa-register/react';

function UpdateNotification() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      // Check for updates every 60 seconds
      if (r) {
        setInterval(() => {
          r.update();
        }, 60 * 1000);
      }
      console.log('SW registered: ' + swUrl);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const handleUpdate = () => {
    updateServiceWorker(true);
  };

  const handleClose = () => {
    setNeedRefresh(false);
  };

  if (!needRefresh) {
    return null;
  }

  return (
    <div className="update-notification">
      <div className="update-content">
        <span>New version available!</span>
        <div className="update-buttons">
          <button className="update-btn refresh" onClick={handleUpdate}>
            Refresh
          </button>
          <button className="update-btn close" onClick={handleClose}>
            Later
          </button>
        </div>
      </div>
    </div>
  );
}

export default UpdateNotification;
