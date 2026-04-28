import { z } from 'zod'

const optionalEmail = z
  .string()
  .trim()
  .transform((value) => (value === '' ? undefined : value))
  .pipe(z.string().email().optional())

export const createClientSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().trim().min(1),
  category: z.string().trim().optional(),
  contactName: z.string().trim().optional(),
  contactEmail: optionalEmail,
  monthlyRetainer: z.coerce.number().nonnegative().default(0),
  status: z.enum(['active', 'paused', 'archived']).default('active'),
  accountManagerId: z.string().uuid().optional()
})

export type CreateClientInput = z.infer<typeof createClientSchema>
