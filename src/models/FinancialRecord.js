import mongoose from "mongoose";

const financialRecordSchema = new mongoose.Schema(
  {
    amount: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
    },
    type: {
      type: String,
      enum: ["income", "expense"],
    },
    category: {
      type: String,
    },
    date: {
      type: Date,
    },
    note: {
      type: String,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

financialRecordSchema.index({ createdBy: 1 });
financialRecordSchema.index({ type: 1 });
financialRecordSchema.index({ date: 1 });
financialRecordSchema.index({ createdBy: 1, date: -1 });

const FinancialRecord = mongoose.model("FinancialRecord", financialRecordSchema);

export default FinancialRecord;
