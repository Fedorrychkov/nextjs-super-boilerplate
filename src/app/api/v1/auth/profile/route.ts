import connectDB from '@lib/db/client'
import User from '@lib/db/models/User'
import { apiErrorHandlerContainer, withGlobalRateLimit } from '@lib/middleware'
import { authMiddleware } from '@lib/security/auth'
import { NextRequest } from 'next/server'

const handler = async (request: NextRequest) => {
  return apiErrorHandlerContainer(request)(async (res) => {
    const authResult = await authMiddleware(request)

    if (!authResult.success) {
      return authResult.response
    }

    const user = authResult.payload

    await connectDB()
    const userDoc = await User.findById(user.sub).select('-password')

    if (!userDoc) {
      return res.json({ message: 'User not found' }, { status: 404 })
    }

    return res.json(
      {
        id: userDoc._id.toString(),
        email: userDoc.email,
        role: userDoc.role,
        status: userDoc.status,
      },
      { status: 200 },
    )
  })
}

export const GET = withGlobalRateLimit(handler)
