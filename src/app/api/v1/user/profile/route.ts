import connectDB from '@lib/db/client'
import User from '@lib/db/models/User'
import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { NextRequest } from 'next/server'

const handler = async (request: NextRequest, authResult: AuthSuccessResult) => {
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

export const GET = withGlobalRateLimit(withAuthMiddleware(handler))
