import mongoose,
{
    Schema,
    Document
} from "mongoose";

export interface IAuditLog extends Document {
    action: string;
    performedBy: mongoose.Types.ObjectId;
    targetUser?: mongoose.Types.ObjectId;
    targetResource: string;
    resourceId: mongoose.Types.ObjectId;
    details: Record<string, any>;
    reason: string;
    createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
    {
        action: {
            type: String,
            required: true
        },
        performedBy: {
            type: Schema.Types.ObjectId,
            ref: "user",
            required: true
        },
        targetUser: {
            type: Schema.Types.ObjectId,
            ref: "user"
        },
        targetResource: {
            type: String,
            required: true
        },
        resourceId: {
            type: Schema.Types.ObjectId,
            required: true
        },
        details: {
            type: Schema.Types.Mixed
        },
        reason: {
            type: String,
            required: true
        },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

export const AuditLog = mongoose.model<IAuditLog>("auditLog", AuditLogSchema);