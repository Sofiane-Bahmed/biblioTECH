import mongoose from "mongoose";

const Schema = mongoose.Schema

const livreSchema = new Schema(
    {
     
       categorie : {
             type : Schema.Types.ObjectId,
             ref : "categorie" 
       },               

        titre : {
            type : String,
            required :true
        },
        auteur :{
            type : String,
            required :true
        },
        copies_disponibles:{
            type: Number,
            required : true
        },
        emprunts: [{
            type : Schema.Types.ObjectId,
            ref : 'livreEmpruntre'
        }],

        commentaire : [{
            type : Schema.Types.ObjectId,
            ref : 'commentaire'
        }]
        
    }
)

const commentSchema = new Schema({

    utilisateur  : {
        type : String,
        ref : 'user',
        required : true
    },

    livre : {
        type: String,
        ref : 'livre',
        required : true
    },
    commentaire : {
        type : String,
        required : true
    },
    parentCommentaire : {
        type : Schema.Types.ObjectId,
        ref : 'commentaire'
    },
    date : {
        type : Date,
        default : Date.now 
    },
    replies : [{
       type : String,
       ref : 'commentaire'
    }],
})

export const Livre = mongoose.model("livre",livreSchema)
export const Comment = mongoose.model("commentaire",commentSchema)



