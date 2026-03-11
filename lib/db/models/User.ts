import { ValidationError } from '@lib/error/custom-errors'
import bcrypt from 'bcryptjs'
import mongoose, { Document, Model, Schema } from 'mongoose'

import { UserModel, UserRole, UserStatus } from '~/api/user'
import { time } from '~/utils/time'

export interface IUser extends Document, Omit<UserModel, 'id'> {
  role: UserRole
  password?: string | null
  email: string
  status: UserStatus
  createdAt?: string | null
  updatedAt?: string | null
  comparePassword(candidatePassword: string): Promise<boolean>
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

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema)

export default User
