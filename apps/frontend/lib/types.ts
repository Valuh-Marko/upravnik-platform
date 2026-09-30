// ─── Enums ────────────────────────────────────────────────────────────────────

export type Role = 'SUPER_ADMIN' | 'UPRAVNIK' | 'BOARD_MEMBER' | 'RESIDENT'
export type AccountType = 'SYSTEM_USER' | 'UNIT_ACCOUNT'
export type ThreadCategory = 'GENERAL' | 'MAINTENANCE' | 'COMPLAINT' | 'QUESTION'
export type ThreadStatus = 'OPEN' | 'CLOSED'
export type TicketCategory = 'GENERAL' | 'MAINTENANCE' | 'COMPLAINT' | 'PAYMENT' | 'REQUEST'
export type TicketStatus = 'OPEN' | 'CLOSED'
export type DocumentCategory = 'CONTRACT' | 'REPORT' | 'DECISION' | 'OTHER'
export type UnitType = 'APARTMENT' | 'OFFICE' | 'COMMERCIAL'

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string
  username: string
  accountType: AccountType
  role?: Role
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
}

export interface MeBuildingMember {
  role: Role
  joinedAt: string
  building: { id: string; name: string; address: string; city: string }
  unit: null
}

export interface MeResponse {
  id: string
  username: string
  email?: string | null
  firstName?: string | null
  lastName?: string | null
  phone?: string | null
  accountType: AccountType
  systemRole?: 'SUPER_ADMIN' | null
  createdAt: string
  buildingMembers: MeBuildingMember[]
  threads: unknown[]
}

export interface LoginResponse {
  accessToken: string
}

// ─── Shared ───────────────────────────────────────────────────────────────────

export interface Author {
  id?: string
  firstName?: string | null
  lastName?: string | null
  username: string
  unitNumber?: string | null
}

export interface SimpleAuthor {
  id: string
  firstName: string | null
  lastName: string | null
  unitNumber?: string | null
  building?: { id: string; name: string } | null
}

// ─── Structure ────────────────────────────────────────────────────────────────

export interface Complex {
  id: string
  name: string
  address: string
  city: string
  createdAt: string
  updatedAt: string
}

export interface Building {
  id: string
  name: string
  address: string
  city: string
  complexId?: string | null
  createdAt: string
  updatedAt: string
}

export interface UnitResident {
  id: string
  username: string
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
  accountType: AccountType
}

export interface Unit {
  id: string
  buildingId: string
  unitNumber: string
  floor?: number | null
  type: UnitType
  areaSqm?: string | null
  residentCount: number
  userId?: string | null
  user?: UnitResident | null
  createdAt: string
  updatedAt: string
}

// ─── Content ──────────────────────────────────────────────────────────────────

export interface Announcement {
  id: string
  buildingId: string
  authorId: string
  title: string
  body: string
  isPinned: boolean
  createdAt: string
  updatedAt: string
  author?: Author
  building?: { id: string; name: string }
}

export interface Document {
  id: string
  buildingId: string
  uploadedBy: string
  title: string
  fileUrl: string
  fileType?: string | null
  category: DocumentCategory
  createdAt: string
  uploader?: Author
}

export interface Thread {
  id: string
  buildingId: string
  authorId: string
  title: string
  body: string
  category: ThreadCategory
  status: ThreadStatus
  createdAt: string
  updatedAt: string
  author?: Author
  building?: { id: string; name: string }
  replies?: ThreadReply[]
  _count?: { replies: number }
}

export interface ThreadReply {
  id: string
  threadId: string
  authorId: string
  body: string
  createdAt: string
  author?: Author
}

export interface ComplexThreadReply {
  id: string
  threadId: string
  authorId: string
  body: string
  createdAt: string
  author?: SimpleAuthor
}

export interface ComplexThread {
  id: string
  complexId: string
  authorId: string
  title: string
  body: string
  category: ThreadCategory
  status: ThreadStatus
  createdAt: string
  updatedAt: string
  author?: SimpleAuthor
  replies?: ComplexThreadReply[]
  _count?: { replies: number }
}

export interface TicketAuthor {
  id: string
  firstName: string | null
  lastName: string | null
  unit?: { id: string; unitNumber: string; floor?: number | null } | null
}

export interface Ticket {
  id: string
  buildingId: string
  authorId: string
  title: string
  body: string
  category: TicketCategory
  status: TicketStatus
  createdAt: string
  updatedAt: string
  author?: TicketAuthor
  building?: { id: string; name: string }
  replies?: TicketReply[]
  _count?: { replies: number }
  isUnread?: boolean
}

export interface TicketReply {
  id: string
  ticketId: string
  authorId: string
  body: string
  createdAt: string
  author?: TicketAuthor
}

export interface Notification {
  id: string
  userId: string
  title: string
  body: string
  isRead: boolean
  link?: string | null
  createdAt: string
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface LoginDto {
  username: string
  password: string
}

export interface CreateAnnouncementDto {
  title: string
  body: string
  isPinned?: boolean
}

export interface CreateThreadDto {
  title: string
  body: string
  category: ThreadCategory
}

export interface CreateReplyDto {
  body: string
}

export interface CreateTicketDto {
  title: string
  body: string
  category: TicketCategory
}

export interface CreateDocumentDto {
  title: string
  fileUrl: string
  fileType?: string
  category: DocumentCategory
}

export interface CreateUnitDto {
  unitNumber: string
  floor?: number
  type: UnitType
  areaSqm?: number
}

export interface CreateUnitAccountDto {
  unitId: string
  unitNumber: string
  email?: string
  firstName?: string
  lastName?: string
  phone?: string
}

export interface CreateSystemUserDto {
  email: string
  password: string
  firstName?: string
  lastName?: string
  role: Role
}

export interface ResetPasswordDto {
  newPassword: string
}

export interface CreateComplexDto {
  name: string
  address: string
  city: string
}

export interface CreateBuildingDto {
  name: string
  address: string
  city: string
  complexId?: string
}

// ─── Bulk Create ──────────────────────────────────────────────────────────────

export interface BulkCreateUnitDto {
  unitNumber: string
  floor?: number
  type: UnitType
  areaSqm?: number
}

export interface BulkCreateBuildingDto {
  name: string
  address: string
  city: string
  units: BulkCreateUnitDto[]
}

export interface BulkCreateDto {
  complex?: { name: string; address: string; city: string }
  buildings: BulkCreateBuildingDto[]
}

export interface BulkCreateResponse {
  complex?: { id: string; name: string }
  buildings: { id: string; name: string; unitCount: number }[]
  totalUnits: number
}
