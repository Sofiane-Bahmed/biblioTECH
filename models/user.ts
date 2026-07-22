import mongoose, {
   Schema,
   Model,
   Types
} from "mongoose";
import bcrypt from "bcrypt";
import crypto from "crypto";

import { UserRole } from "../types/auth.js";

import { TIME_CONSTANTS } from "../constants/library-rules.js";

const { ONE_HOUR_IN_MS } = TIME_CONSTANTS;

export interface IUser {
   fullName: string;
   email: string;
   password?: string;
   role: UserRole;
   refreshToken?: string;
   passwordResetToken?: string;
   passwordResetExpires?: Date;
   subscribed: boolean;
   suspension_date?: Date;
   isBlocked?: boolean;
   outstanding_fines: number;
   borrows: Types.ObjectId[];
   comments: Types.ObjectId[];
}

interface IUserMethods {
   comparePassword(candidatePassword: string): Promise<boolean>;
   generatePasswordResetToken(): string;
}

interface UserModel extends Model<IUser, {}, IUserMethods> {
   findByResetToken(plainToken: string): Promise<mongoose.HydratedDocument<IUser, IUserMethods> | null>;
}

type UserDocument = mongoose.HydratedDocument<IUser, IUserMethods>;

const userSchema = new Schema<IUser, UserModel, IUserMethods>(
   {
      fullName: {
         type: String,
         required: true,
         trim: true
      },
      email: {
         type: String,
         required: true,
         unique: true,
         lowercase: true,
         trim: true,
      },
      password: {
         type: String,
         required: true,
         select: false
      },
      role: {
         type: String,
         enum: ["user", "admin"],
         required: true
      },
      refreshToken: {
         type: String,
         select: false
      },
      passwordResetToken: {
         type: String,
         select: false,
      },
      passwordResetExpires: {
         type: Date,
         select: false,
      },
      subscribed: {
         type: Boolean,
         default: false,
         required: true
      },
      suspension_date: {
         type: Date,
      },
      isBlocked: {
         type: Boolean,
         default: false,
      },
      outstanding_fines: {
         type: Number,
         default: 0.00,
         min: 0
      },
      borrows: [
         {
            type: Schema.Types.ObjectId,
            ref: "Borrow"
         }
      ],
      comments: [
         {
            type: Schema.Types.ObjectId,
            ref: "comment"
         }
      ],
   },
   { timestamps: true }
);

// Pre-save password hashing middleware hooks
userSchema.pre<UserDocument>("save", async function (next) {
   if (!this.isModified("password")) {
      return next();
   }
   try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password!, salt);
      return next();
   } catch (error: any) {
      return next(error);
   }
});

// Strips out credential vulnerabilities when serialized to client JSON blocks
userSchema.set("toJSON", {
   transform: (_doc, ret) => {
      delete ret.password;
      delete ret.refreshToken;
      delete ret.passwordResetToken;
      delete ret.passwordResetExpires;
      delete ret.__v;
      return ret;
   }
});

// Custom Instance Methods implementation
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
   if (!this.password) return false;
   return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generatePasswordResetToken = function (): string {
   const resetToken = crypto.randomBytes(32).toString("hex");

   this.passwordResetToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

   this.passwordResetExpires = new Date(Date.now() + ONE_HOUR_IN_MS);

   return resetToken;
};

// Custom Statics Methods implementation
userSchema.statics.findByResetToken = async function (plainToken: string): Promise<UserDocument | null> {
   if (!plainToken) return null;

   const hashedToken = crypto
      .createHash("sha256")
      .update(plainToken)
      .digest("hex");

   return await this.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() }
   });
};

export const User = mongoose.model<IUser, UserModel>("user", userSchema);