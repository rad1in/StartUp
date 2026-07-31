export function getCurrentPosition(options = { enableHighAccuracy: true, timeout: 10000 }) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('مرورگر شما از موقعیت‌یابی جغرافیایی پشتیبانی نمی‌کند.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      (error) => reject(error),
      options
    );
  });
}
