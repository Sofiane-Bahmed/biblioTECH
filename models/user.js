import mongoose from "mongoose"

const Schema = mongoose.Schema;

const userSchema = new Schema(
   {
      fullName: {
         type: String,
         required: true
      },
      email: {
         type: String,
         required: true,
         unique: true,
         lowercase: true,
         trim: true,
         match: /^[a-z0-9._-]+@[a-z0-9.-]+\.[a-z]{2,4}$/i,
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
         type: String
      },
      subscribed: {
         type: Boolean,
         default: false
      },
      suspension_date: {
         type: Date,
      },
      borrows: [
         {
            type: Schema.Types.ObjectId,
            ref: "borrowBook"
         }
      ]
   }
)

export const User = mongoose.model("user", userSchema);

