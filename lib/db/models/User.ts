import { ValidationError } from '@lib/error/custom-errors'
import bcrypt from 'bcryptjs'
import mongoose, { type Document, type HydratedDocument, type Model, type QueryFilter, Schema } from 'mongoose'

import { UserModel, UserRole, UserStatus } from '~/api/user'
import { SortBy, SortOrder, type UserFilter } from '~/api/user/types'
import type { PaginationMeta } from '~/types/pagination'
import { time } from '~/utils/time'

import { applyCreatedAtRange } from '../utils/applyCreatedAtRange'
import { buildPaginationMeta, clampLimit } from '../utils/buildPaginationMeta'

export interface IUser extends Document, Omit<UserModel, 'id'> {
  role: UserRole
  password?: string | null
  email: string
  status: UserStatus
  createdAt?: string | null
  updatedAt?: string | null
  comparePassword(candidatePassword: string): Promise<boolean>
}

export interface IUserModel extends Model<IUser> {
  findListPaginated(filter: UserFilter): Promise<PaginationMeta<HydratedDocument<IUser>>>
}

function applyUserFilterFields(q: QueryFilter<IUser>, rest: Partial<UserModel>) {
  if (rest.id != null && mongoose.Types.ObjectId.isValid(String(rest.id))) {
    q._id = new mongoose.Types.ObjectId(String(rest.id))
  }

  if (rest.email != null && String(rest.email).trim()) {
    q.email = String(rest.email).trim().toLowerCase()
  }

  if (rest.role !== undefined && rest.role !== null) {
    q.role = rest.role
  }

  if (rest.status !== undefined && rest.status !== null) {
    q.status = rest.status
  }
}

const UserSchema: Schema<IUser> = new Schema<IUser>(
  {
    _id: {
      type: Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId(),
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
      select: false, // Do not return password by default
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.USER,
    },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.ACTIVE,
    },
    createdAt: {
      type: String,
      default: () => time().toISOString(),
    },
    updatedAt: {
      type: String,
      default: () => time().toISOString(),
    },
  },
  {
    timestamps: true,
  },
)

// Hash password before save (Mongoose 9: async hook, no next)
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return

  if (!this.password) {
    throw new ValidationError('Password is required')
  }

  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
})

// Compare password with candidate
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password)
}
;(UserSchema.statics as Record<string, unknown>).findListPaginated = async function findListPaginated(
  this: Model<IUser>,
  filter: UserFilter,
): Promise<PaginationMeta<HydratedDocument<IUser>>> {
  const { limit: limitRaw, offset: offsetRaw, sortBy, sortOrder, startOfDateIso, endOfDateIso, ...rest } = filter

  const limit = clampLimit(typeof limitRaw === 'number' ? limitRaw : Number(limitRaw))
  const offset = typeof offsetRaw === 'number' ? Math.max(0, Math.floor(offsetRaw)) : Math.max(0, Number(offsetRaw) || 0)
  const order = sortOrder === SortOrder.ASC ? 1 : -1
  const sortField = sortBy ?? SortBy.CREATED_AT

  const base: QueryFilter<IUser> = {}
  applyUserFilterFields(base, rest)
  applyCreatedAtRange<IUser>(base, startOfDateIso, endOfDateIso)

  const count = await this.countDocuments(base)
  const list = await this.find(base)
    .sort({ [sortField]: order, _id: order })
    .skip(offset)
    .limit(limit)
    .exec()

  return buildPaginationMeta({
    list,
    count,
    limit: typeof limitRaw === 'number' ? limitRaw : Number(limitRaw),
    offset: typeof offsetRaw === 'number' ? offsetRaw : Number(offsetRaw),
  })
}

const User: IUserModel = (mongoose.models.User as IUserModel) || mongoose.model<IUser>('User', UserSchema)

export default User
