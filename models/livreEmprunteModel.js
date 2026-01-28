import mongoose from "mongoose"

const Schema = mongoose.Schema

const livreEmprunteSchema = new Schema (
    {
       utilisateur : {
          type : Schema.Types.ObjectId,
          ref : "utilisateur"
       },
       livre : {
        type : Schema.Types.ObjectId,
        ref : "livre"
       },
       date_emprunt :{
         type : Date,
         required : true
       },
       date_echeance : {
            type : Date,
            required : true
       },
       date_retour : {
        type : Date,
       }
    }
)

const emprunteHistorySchema = new Schema({
     utilisateur : {
        type : Schema.Types.ObjectId,
        ref : 'utilisateur',
        require : true
     },
     livre: {
      type: Schema.Types.ObjectId,
      ref: 'Livre',
      required: true
    },
    date_emprunt: {
      type: Date,
      required: true
    },
    date_retour: {
      type: Date
    },
    date_echeance: {
      type: Date,
      required: true
    },
    renouvele: {
      type: Boolean,
      default: false
    },
    penalite: {
      type: Number,
      default: 0
    }, 
  });


export const LivreEmprunte = mongoose.model("livreEmprunte",livreEmprunteSchema)
export const EmprunteHistory = mongoose.model("emprunteHistory",emprunteHistorySchema)