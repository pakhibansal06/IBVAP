export const CAMERA_PROFILES = [
  { code: 'CAM-072', name: 'Camera 1 - Nominal', location: 'Normal / Nominal', status: 'ONLINE', detection: null },
  { code: 'CAM-081', name: 'Camera 2 - Person Detected', location: 'Person Detection Zone', status: 'ALERT', detection: { type: 'person', label: 'Person detected', trackingId: 'P102', riskLevel: 'HIGH', riskScore: 72 } },
  { code: 'CAM-083', name: 'Camera 3 - Vehicle Detected', location: 'Vehicle Detection Zone', status: 'ALERT', detection: { type: 'vehicle', label: 'Vehicle detected', trackingId: 'V203', riskLevel: 'MEDIUM', riskScore: 58 } },
  { code: 'CAM-084', name: 'Camera 4 - Cycle Detected', location: 'Cycle Detection Zone', status: 'ALERT', detection: { type: 'cycle', label: 'Cycle detected', trackingId: 'C104', riskLevel: 'MEDIUM', riskScore: 54 } },
  { code: 'CAM-085', name: 'Camera 5 - Person Detected', location: 'Person Detection Zone', status: 'ALERT', detection: { type: 'person', label: 'Person detected', trackingId: 'P105', riskLevel: 'HIGH', riskScore: 68 } },
  { code: 'CAM-086', name: 'Camera 6 - Nominal', location: 'Normal / Nominal', status: 'ONLINE', detection: null }
];

export function cameraProfile(code) {
  return CAMERA_PROFILES.find((profile) => profile.code === code) || null;
}
