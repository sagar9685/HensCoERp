-- Run against hensCoErp using SSMS with an administrator account.
-- These are read-only REPORTING VIEWS. The AI login must not have access to base tables.
-- Review business definitions before enabling production reporting.
CREATE OR ALTER VIEW dbo.AI_Orders AS
SELECT o.OrderID,o.CustomerName,o.Area,o.OrderDate,o.DeliveryCharge,
       ISNULL(a.DeliveryStatus,'') AS DeliveryStatus,o.InvoiceNo
FROM dbo.OrdersTemp o
LEFT JOIN dbo.AssignedOrders a ON a.OrderID=o.OrderID;
GO
CREATE OR ALTER VIEW dbo.AI_OrderItems AS
SELECT OrderID,ProductType,Weight,Quantity,Rate,Total FROM dbo.OrderItems;
GO
CREATE OR ALTER VIEW dbo.AI_Payments AS
SELECT op.OrderID,op.PaymentModeID,pm.ModeName,pm.IsRevenue,
       op.Amount,op.PaymentVerifyStatus,op.ShortAmount,op.PaymentReceivedDate
FROM dbo.OrderPayments op JOIN dbo.PaymentModes pm ON pm.PaymentModeID=op.PaymentModeID;
GO
CREATE OR ALTER VIEW dbo.AI_Customers AS
SELECT CustomerId,CustomerName,Area,Credit_Limit FROM dbo.Customers;
GO
CREATE OR ALTER VIEW dbo.AI_DeliveryCash AS
SELECT d.DeliveryManID,d.Name,b.CurrentBalance
FROM dbo.DeliveryMen d JOIN dbo.DeliveryMenCashBalance b
ON d.DeliveryManID=b.DeliveryManID;
GO
-- AI_Stock represents stock INWARD entries, not necessarily live closing stock.
CREATE OR ALTER VIEW dbo.AI_Stock AS
SELECT item_name,weight,quantity FROM dbo.Stock;
GO
CREATE OR ALTER VIEW dbo.AI_CreditNotes AS
SELECT order_id,note_type,amount,freight,note_date,status
FROM dbo.credit_debit_notes;
GO
-- CREATE THE LOGIN SEPARATELY IN SSMS WITH A STRONG, UNIQUE PASSWORD.
-- Example (substitute an actually created login):
-- CREATE USER hensco_ai_reader FOR LOGIN hensco_ai_reader;
-- GRANT SELECT ON dbo.AI_Orders TO hensco_ai_reader;
-- GRANT SELECT ON dbo.AI_OrderItems TO hensco_ai_reader;
-- GRANT SELECT ON dbo.AI_Payments TO hensco_ai_reader;
-- GRANT SELECT ON dbo.AI_Customers TO hensco_ai_reader;
-- GRANT SELECT ON dbo.AI_DeliveryCash TO hensco_ai_reader;
-- GRANT SELECT ON dbo.AI_Stock TO hensco_ai_reader;
-- GRANT SELECT ON dbo.AI_CreditNotes TO hensco_ai_reader;
-- Do NOT add to db_datareader/db_owner; do NOT grant access to raw tables.
