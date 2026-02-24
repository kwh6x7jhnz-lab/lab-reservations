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

// Generate every 15-minute increment from 6:00 AM to 8:00 PM
function generateTimeSlots() {
  const slots = []
  for (let h = 6; h <= 20; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === 20 && m > 0) break // stop at 8:00 PM
      const hh = String(h).padStart(2, '0')
      const mm = String(m).padStart(2, '0')
      const value = `${hh}:${mm}`
      const period = h < 12 ? 'AM' : 'PM'
      const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h
      const label = `${displayH}:${mm} ${period}`
      slots.push({ value, label })
    }
  }
  return slots
}

export const TIME_SLOTS_AMPM = generateTimeSlots()

export const TIME_SLOTS = TIME_SLOTS_AMPM.map(t => t.value)

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
