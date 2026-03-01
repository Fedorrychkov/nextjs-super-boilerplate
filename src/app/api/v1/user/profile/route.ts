import connectDB from '@lib/db/client'
import User from '@lib/db/models/User'
import { apiErrorHandlerContainer } from '@lib/error/api-error-handler'
import { authMiddleware } from '@lib/middleware/auth.middleware'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  // Check authentication
  const authResult = await authMiddleware(request)

  if (!authResult.success) {
    return authResult.response
  }

  return apiErrorHandlerContainer(request)(async (res) => {
    const user = authResult.payload

    await connectDB()
    const userDoc = await User.findById(user.sub)

    if (!userDoc) {
      return res.json({ message: 'User not found' }, { status: 404 })
    }

    return res.json(
      {
        id: userDoc._id.toString(),
        email: userDoc.email,
        role: userDoc.role,
        status: userDoc.status,
        createdAt: userDoc.createdAt,
        updatedAt: userDoc.updatedAt,
      },
      { status: 200 },
    )
  })
}
