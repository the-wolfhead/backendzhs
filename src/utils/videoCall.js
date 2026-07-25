// src/utils/videoCall.js
//
// Builds the Jitsi Meet room URL for an appointment. This intentionally
// matches the room-naming scheme the mobile app already derives client-side
// in app/video-call.jsx (`ZHSTelemed-${slugify('zhs-appt-' + appointmentId)}`)
// so both sides land in the exact same room without needing to look
// anything up — but we also persist it on the Appointment record so any
// other client (doctor-facing app, admin dashboard, etc.) can read it
// directly instead of re-deriving it.
export function buildVideoCallUrl(appointmentId) {
  const room = `ZHSTelemed-zhs-appt-${appointmentId}`;
  return `https://meet.jit.si/${room}`;
}
