export function createNotificationController(notification) {
    let notificationTimer;

    function showNotification(message, type = 'error') {
        clearTimeout(notificationTimer);
        notification.innerText = message;
        notification.className = `notification ${type}`;

        notificationTimer = setTimeout(() => {
            hideNotification();
        }, 5200);
    }

    function hideNotification() {
        clearTimeout(notificationTimer);
        notification.className = 'notification hidden';
        notification.innerText = '';
    }

    return {
        showNotification,
        hideNotification
    };
}
