-- Enforce one proof-of-delivery record per delivery stop.
CREATE UNIQUE INDEX "DeliveryProof_runOrderId_key" ON "DeliveryProof"("runOrderId");
