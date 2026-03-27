import connectDB from '@lib/db/client'
import User from '@lib/db/models/User'
import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { NextRequest, NextResponse } from 'next/server'

import { UserFilter, UserRole } from '~/api/user'
import { getServerTFromNextRequest } from '~/lib/i18n/server'
import { Logger } from '~/utils/logger'
import { time } from '~/utils/time'

const logger = new Logger('ArticleListRoute')

const handler = (request: NextRequest, authResult: AuthSuccessResult) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = getServerTFromNextRequest(request)

    if (![UserRole.ADMIN, UserRole.EDITOR].includes(authResult.payload.role)) {
      return NextResponse.json({ message: t('errors.insufficientPermissions') }, { status: 403 })
    }

    await connectDB()

    const filter: UserFilter = { ...Object.fromEntries(request.nextUrl.searchParams.entries()) }

    logger.info('filter', filter)

    const data = await User.findListPaginated(filter)

    return response.json({
      ...data,
      list: data.list.map((user) => ({
        ...user.toObject(),
        id: user._id.toString(),
        createdAt: user.createdAt ? time(user.createdAt).toISOString() : null,
        updatedAt: user.updatedAt ? time(user.updatedAt).toISOString() : null,
      })),
    })
  })

export const GET = withGlobalRateLimit(withAuthMiddleware(handler))
