import { z } from 'zod'

// ---------------------------------------------------------------------------
// Create Organization
// ---------------------------------------------------------------------------
export const createOrganizationRequest = z.object({
  name: z.string().min(1).max(255),
})

export const createOrganizationResponse = z.object({
  id: z.string().uuid(),
  name: z.string(),
  ownerId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

// ---------------------------------------------------------------------------
// List Organizations
// ---------------------------------------------------------------------------
export const listOrganizationsResponse = z.array(
  z.object({
    id: z.string().uuid(),
    name: z.string(),
    ownerId: z.string().uuid(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),
)

// ---------------------------------------------------------------------------
// Add Member
// ---------------------------------------------------------------------------
export const addMemberRequest = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER'),
})

export const addMemberResponse = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

// ---------------------------------------------------------------------------
// Remove Member
// ---------------------------------------------------------------------------
export const removeMemberRequest = z.object({
  userId: z.string().uuid(),
})

export type CreateOrganizationRequest = z.infer<
  typeof createOrganizationRequest
>
export type CreateOrganizationResponse = z.infer<
  typeof createOrganizationResponse
>
export type AddMemberRequest = z.infer<typeof addMemberRequest>
export type AddMemberResponse = z.infer<typeof addMemberResponse>
export type RemoveMemberRequest = z.infer<typeof removeMemberRequest>
