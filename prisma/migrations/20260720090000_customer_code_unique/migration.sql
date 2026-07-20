-- Customer codes are unique within a branch when supplied.
CREATE UNIQUE INDEX "Customer_branchId_customerCode_key" ON "Customer"("branchId", "customerCode");
