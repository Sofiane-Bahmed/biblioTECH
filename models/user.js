
import mongoose from "mongoose"

const Schema = mongoose.Schema;

const userShema = new Schema(
    {
    
     fullName : {
        type : String,
        required : true
     },
     email : {
        type : String,
        required : true,
        unique : true,
        lowercase : true,
        trim : true,
        match: /^[a-z0-9._-]+@[a-z0-9.-]+\.[a-z]{2,4}$/i,
     },
     password : {
        type : String,
        required :true
     },
     role : {
        type : String,
        enum : ["utilisateur","employe"],
        required : true
     },
     subscribed: {
      type: Boolean,
     
    }
    }
)

export const User = mongoose.model("user",userShema);

