import FinancialRecord from "../../src/models/FinancialRecord.js";

export const createTestRecord = async ({
  createdBy,
  amount = 100,
  type = "expense",
  category = "General",
  note = "Test record",
  date = new Date(),
} = {}) => {
  if (!createdBy) {
    throw new Error("createdBy is required to create a test financial record");
  }

  return FinancialRecord.create({
    amount,
    type,
    category,
    note,
    date,
    createdBy,
  });
};
