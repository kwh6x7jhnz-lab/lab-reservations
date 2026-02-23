export const ALLOWED_EMAIL_DOMAINS = ['lilly.com', 'network.lilly.com']

export const ROLES = {
  ADMIN: 'admin',
  APPROVER: 'approver',
  VIEWER: 'viewer',
}

export const BOOKING_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
}

export const BOOKING_TYPES = {
  TIME_SLOT: 'time_slot',
  HALF_DAY: 'half_day',
  FULL_DAY: 'full_day',
  MULTI_DAY: 'multi_day',
}

export const TIME_SLOTS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00',
]

export const TIME_SLOTS_AMPM = [
  { value: '06:00', label: '6:00 AM' },
  { value: '07:00', label: '7:00 AM' },
  { value: '08:00', label: '8:00 AM' },
  { value: '09:00', label: '9:00 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '11:00', label: '11:00 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '13:00', label: '1:00 PM' },
  { value: '14:00', label: '2:00 PM' },
  { value: '15:00', label: '3:00 PM' },
  { value: '16:00', label: '4:00 PM' },
  { value: '17:00', label: '5:00 PM' },
  { value: '18:00', label: '6:00 PM' },
  { value: '19:00', label: '7:00 PM' },
  { value: '20:00', label: '8:00 PM' },
]

export const CSV_COLUMNS = {
  asset_tag: ['asset_tag', 'asset tag', 'id', 'equipment_id', 'asset id'],
  name: ['name', 'equipment_name', 'equipment name', 'title'],
  location: ['location', 'room', 'room_number', 'room number'],
  floor_building: ['floor_building', 'floor building', 'floor', 'building'],
  category: ['category', 'type', 'equipment_type'],
  training_required: ['training_required', 'training required', 'training', 'requires_training'],
  approval_required: ['approval_required', 'approval required', 'approval', 'requires_approval'],
  owner: ['owner', 'responsible_person', 'responsible person', 'owner_name'],
  notes: ['notes', 'description', 'details', 'comments'],
}
