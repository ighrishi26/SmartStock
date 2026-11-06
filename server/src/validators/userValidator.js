
const { z } = require('zod')

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().email('Enter a valid email address').max(254),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
})

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address').max(254),
  password: z.string().min(1, 'Password is required').max(72),
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required').max(72),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').max(72),
  confirmPassword: z.string().min(1, 'Please confirm your new password').max(72),
}).refine(
  (data) => data.newPassword === data.confirmPassword,
  {
    message: 'New passwords do not match',
    path: ['confirmPassword'],
  }
)

module.exports = {
  registerSchema,
  loginSchema,
  changePasswordSchema,
}
