import mongoose from "mongoose"
import bcrypt from "bcrypt"

const Schema = mongoose.Schema;

const userSchema = new Schema(
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
         default: false
      },
      suspension_date: {
         type: Date,
      },
      isBlocked: {
         type: Boolean,
         default: false
      },
      borrows: [
         {
            type: Schema.Types.ObjectId,
            ref: "borrowBook"
         }
      ],
      comments: [
         {
            type: Schema.Types.ObjectId,
            ref: "comment"
         }
      ],
   }
)

// Middleware to hash password before saving to the database 
userSchema.pre("save", async function (next) {
   if (!this.isModified("password")) {
      return next();
   }
   try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
      return next();

   } catch (error) {
      return next(error);
   }
});

// Methode to delete sensitive information when converting to JSON
userSchema.set("toJSON", {
   transform: (doc, ret) => {
      delete ret.password;
      delete ret.refreshToken;
      delete ret.passwordResetToken;
      delete ret.passwordResetExpires;
      delete ret.__v;
      return ret;
   }
});

export const User = mongoose.model("user", userSchema);

