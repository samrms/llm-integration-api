import { z } from 'zod'

// ---------------------------------------------------------------------------
// Signup
// ---------------------------------------------------------------------------
export const signupRequest = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().max(255).optional(),
})

export const signupResponse = z.object({
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),
  organization: z.object({
    id: z.string().uuid(),
    name: z.string(),
    ownerId: z.string().uuid(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),
  membership: z.object({
    id: z.string().uuid(),
    organizationId: z.string().uuid(),
    userId: z.string().uuid(),
    role: z.enum(['OWNER', 'ADMIN', 'MEMBER']),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),
})

// ---------------------------------------------------------------------------
// Signin
// ---------------------------------------------------------------------------
export const signinRequest = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const signinResponse = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),
})

// ---------------------------------------------------------------------------
// Refresh
// ---------------------------------------------------------------------------
export const refreshRequest = z.object({
  refreshToken: z.string().min(1),
})

export const refreshResponse = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
})

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------
export const logoutRequest = z.object({
  refreshToken: z.string().optional(),
})

export type SignupRequest = z.infer<typeof signupRequest>
export type SignupResponse = z.infer<typeof signupResponse>
export type SigninRequest = z.infer<typeof signinRequest>
export type SigninResponse = z.infer<typeof signinResponse>
export type RefreshRequest = z.infer<typeof refreshRequest>
export type RefreshResponse = z.infer<typeof refreshResponse>
export type LogoutRequest = z.infer<typeof logoutRequest>
