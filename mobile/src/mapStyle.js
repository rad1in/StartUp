// A muted charcoal/gold Google Maps style so the map matches the app's dark
// luxe theme instead of the default light Google Maps look. Android only —
// iOS uses Apple Maps' own dark mode automatically (userInterfaceStyle: dark).
export const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#17150F' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0D0C0A' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8C897E' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#26241F' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#26241F' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8C897E' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#1F1C15' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3A3527' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0D0C0A' }] },
];
