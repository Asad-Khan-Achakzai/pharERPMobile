import type { Doctor } from '@/domain/types';
import type { RecommendedDoctorMeta } from '@/hooks/useRecommendedDoctors';

/** Secondary line for doctor list rows (visits, weekly plan, search). */
export function formatDoctorSubtitle(
  doctor: Pick<
    Doctor,
    | 'specialization'
    | 'city'
    | 'doctorBrick'
    | 'zone'
    | 'doctorCode'
    | 'qualification'
    | 'designation'
  >,
  meta?: RecommendedDoctorMeta | null
): string {
  if (meta?.reason === 'assigned') return 'Assigned to you';
  if (meta?.brickName) return meta.brickName;

  const parts = [
    doctor.specialization,
    doctor.qualification,
    doctor.designation,
    doctor.city,
    doctor.doctorBrick || doctor.zone,
    doctor.doctorCode ? `Code ${doctor.doctorCode}` : null,
  ].filter(Boolean);

  return parts.join(' · ') || '—';
}

export function formatDoctorHeaderSubtitle(
  doctor: Pick<Doctor, 'specialization' | 'qualification' | 'designation' | 'doctorBrick' | 'city'>
): string | undefined {
  const line = [
    doctor.specialization,
    doctor.qualification,
    doctor.designation,
    doctor.doctorBrick,
    doctor.city,
  ]
    .filter(Boolean)
    .join(' · ');
  return line || undefined;
}
