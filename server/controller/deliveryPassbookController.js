const { sql, poolPromise } = require("../utils/db");

// =====================================================
// GET ALL DELIVERY BOY CASH ACCOUNTS
// GET /api/delivery-passbook
// =====================================================
exports.getDeliveryCashAccounts = async (req, res) => {
  try {
    const { search, isActive } = req.query;

    const pool = await poolPromise;
    const request = pool.request();

    let query = `
      SELECT
        dm.DeliveryManID,
        dm.Name,
        dm.Area,
        dm.MobileNo,
        dm.IsActive,

        ISNULL(dcb.CurrentBalance, 0) AS CurrentBalance,

        ISNULL((
          SELECT SUM(op.Amount)
          FROM OrderPayments op
          INNER JOIN AssignedOrders ao
            ON ao.AssignID = op.AssignID
          WHERE
            ao.DeliveryManID = dm.DeliveryManID
            AND op.PaymentModeID = 1
        ), 0) AS TotalCashReceived,

        ISNULL((
          SELECT SUM(cd.TotalHandoverAmount)
          FROM CashDepartment cd
          WHERE cd.DeliveryManId = dm.DeliveryManID
        ), 0) AS TotalCashHandovered,

        (
          SELECT MAX(cd.CreatedAt)
          FROM CashDepartment cd
          WHERE cd.DeliveryManId = dm.DeliveryManID
        ) AS LastHandoverDate

      FROM DeliveryMen dm

      LEFT JOIN DeliveryMenCashBalance dcb
        ON dcb.DeliveryManID = dm.DeliveryManID

      WHERE 1 = 1
    `;

    // Search
    if (search) {
      query += `
        AND (
          dm.Name LIKE @search
          OR dm.MobileNo LIKE @search
          OR dm.Area LIKE @search
        )
      `;

      request.input("search", sql.NVarChar, `%${search}%`);
    }

    // Active filter
    if (isActive === "1" || isActive === "0") {
      query += ` AND dm.IsActive = @isActive`;

      request.input("isActive", sql.Bit, Number(isActive));
    }

    query += `
      ORDER BY
        CASE
          WHEN ISNULL(dcb.CurrentBalance, 0) > 0 THEN 0
          ELSE 1
        END,
        dm.Name
    `;

    const result = await request.query(query);

    res.status(200).json({
      success: true,
      count: result.recordset.length,
      data: result.recordset,
    });
  } catch (error) {
    console.error("getDeliveryCashAccounts:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch delivery cash accounts",
      error: error.message,
    });
  }
};

// =====================================================
// GET DELIVERY BOY PASSBOOK
//
// GET /api/delivery-passbook/:deliveryManId
//
// Optional:
// ?fromDate=2026-08-01
// &toDate=2026-09-01
// &page=1
// &limit=20
// =====================================================
exports.getDeliveryBoyPassbook = async (req, res) => {
  try {
    const deliveryManId = Number(req.params.deliveryManId);

    const { fromDate = null, toDate = null, page = 1, limit = 20 } = req.query;

    if (
      !Number.isInteger(deliveryManId) ||
      deliveryManId <= 0 ||
      deliveryManId > 2147483647
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid DeliveryManID is required",
      });
    }

    const pageNumber = Math.max(Math.floor(Number(page)) || 1, 1);
    const pageLimit = Math.min(
      Math.max(Math.floor(Number(limit)) || 20, 1),
      100,
    );

    const offset = (pageNumber - 1) * pageLimit;

    if (!Number.isSafeInteger(offset) || offset > 2147483647 - pageLimit) {
      return res.status(400).json({
        success: false,
        message: "Invalid page number",
      });
    }

    const isValidDate = (value) => {
      if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
      }

      const date = new Date(`${value}T00:00:00.000Z`);

      return (
        Number.isFinite(date.getTime()) &&
        date.toISOString().slice(0, 10) === value &&
        value >= "0001-01-01" &&
        value <= "9999-12-30"
      );
    };

    if (fromDate && !isValidDate(fromDate)) {
      return res.status(400).json({
        success: false,
        message: "fromDate must be a valid YYYY-MM-DD date",
      });
    }

    if (toDate && !isValidDate(toDate)) {
      return res.status(400).json({
        success: false,
        message: "toDate must be a valid YYYY-MM-DD date",
      });
    }

    if (fromDate && toDate && fromDate > toDate) {
      return res.status(400).json({
        success: false,
        message: "fromDate cannot be greater than toDate",
      });
    }

    const pool = await poolPromise;

    // Delivery man details
    const deliveryResult = await pool
      .request()
      .input("deliveryManId", sql.Int, deliveryManId).query(`
        SELECT
          DeliveryManID,
          Name,
          Area,
          MobileNo,
          IsActive
        FROM DeliveryMen
        WHERE DeliveryManID = @deliveryManId;
      `);

    if (deliveryResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Delivery boy not found",
      });
    }

    const deliveryMan = deliveryResult.recordset[0];

    const result = await pool
      .request()
      .input("deliveryManId", sql.Int, deliveryManId)
      .input("fromDate", sql.Date, fromDate || null)
      .input("toDate", sql.Date, toDate || null)
      .input("offset", sql.Int, offset)
      .input("limit", sql.Int, pageLimit).query(`
        SET NOCOUNT ON;

        CREATE TABLE #Ledger
        (
          TransactionType VARCHAR(10),
          TransactionSource VARCHAR(30),
          SourceId BIGINT,
          TransactionDate DATETIME2,

          OrderID INT NULL,
          AssignID INT NULL,
          InvoiceNo NVARCHAR(100) NULL,
          CustomerName NVARCHAR(250) NULL,
          Area NVARCHAR(250) NULL,

          Debit DECIMAL(18,2) NOT NULL DEFAULT 0,
          Credit DECIMAL(18,2) NOT NULL DEFAULT 0,

          PaymentVerifyStatus NVARCHAR(100) NULL,
          VerificationRemarks NVARCHAR(MAX) NULL,
          IsHandovered BIT NULL,
          DenominationJSON NVARCHAR(MAX) NULL,
          SortPriority INT
        );

        -- CR: Cash received against orders
        INSERT INTO #Ledger
        (
          TransactionType,
          TransactionSource,
          SourceId,
          TransactionDate,
          OrderID,
          AssignID,
          InvoiceNo,
          CustomerName,
          Area,
          Debit,
          Credit,
          PaymentVerifyStatus,
          VerificationRemarks,
          IsHandovered,
          DenominationJSON,
          SortPriority
        )
        SELECT
          'CR',
          'ORDER_CASH',
          op.PaymentID,
          COALESCE(op.PaymentReceivedDate, op.CreatedAt),
          op.OrderID,
          op.AssignID,
          ot.InvoiceNo,
          ot.CustomerName,
          ot.Area,
          0,
          ISNULL(op.Amount, 0),
          op.PaymentVerifyStatus,
          op.VerificationRemarks,
          op.IsHandovered,
          NULL,
          1
        FROM OrderPayments op
        INNER JOIN AssignedOrders ao
          ON ao.AssignID = op.AssignID
        LEFT JOIN OrdersTemp ot
          ON ot.OrderID = op.OrderID
        WHERE ao.DeliveryManID = @deliveryManId
          AND op.PaymentModeID = 1
          AND ISNULL(op.Amount, 0) <> 0;

        -- DR: Cash handed over on the selected handover date
        INSERT INTO #Ledger
        (
          TransactionType,
          TransactionSource,
          SourceId,
          TransactionDate,
          OrderID,
          AssignID,
          InvoiceNo,
          CustomerName,
          Area,
          Debit,
          Credit,
          PaymentVerifyStatus,
          VerificationRemarks,
          IsHandovered,
          DenominationJSON,
          SortPriority
        )
        SELECT
          'DR',
          'CASH_HANDOVER',
          cd.Id,
         cd.CreatedAt,
          NULL,
          NULL,
          NULL,
          NULL,
          NULL,
          ISNULL(cd.TotalHandoverAmount, 0),
          0,
          NULL,
          NULL,
          NULL,
          cd.DenominationJSON,
          2
        FROM CashDepartment cd
        WHERE cd.DeliveryManId = @deliveryManId
          AND ISNULL(cd.TotalHandoverAmount, 0) <> 0;

        -- Adjustments are included and visible in the passbook
        INSERT INTO #Ledger
        (
          TransactionType,
          TransactionSource,
          SourceId,
          TransactionDate,
          OrderID,
          AssignID,
          InvoiceNo,
          CustomerName,
          Area,
          Debit,
          Credit,
          PaymentVerifyStatus,
          VerificationRemarks,
          IsHandovered,
          DenominationJSON,
          SortPriority
        )
        SELECT
          dca.AdjustmentType,
          'CASH_ADJUSTMENT',
          dca.AdjustmentID,
          dca.CreatedAt,
          NULL,
          NULL,
          NULL,
          NULL,
          NULL,
          CASE
            WHEN dca.AdjustmentType = 'DR' THEN dca.Amount
            ELSE 0
          END,
          CASE
            WHEN dca.AdjustmentType = 'CR' THEN dca.Amount
            ELSE 0
          END,
          NULL,
          dca.Reason,
          NULL,
          NULL,
          3
        FROM DeliveryManCashAdjustments dca
        WHERE dca.DeliveryManID = @deliveryManId
          AND dca.AdjustmentType IN ('DR', 'CR')
          AND ISNULL(dca.Amount, 0) > 0;

        -- All-time stored balance
        DECLARE @CurrentBalance DECIMAL(18,2) = 0;

        SELECT
          @CurrentBalance = ISNULL(CurrentBalance, 0)
        FROM DeliveryMenCashBalance
        WHERE DeliveryManID = @deliveryManId;

        -- All-time ledger balance
        DECLARE @RawLedgerBalance DECIMAL(18,2);

        SELECT
          @RawLedgerBalance = ISNULL(SUM(Credit - Debit), 0)
        FROM #Ledger;

        DECLARE @ReconciliationAdjustment DECIMAL(18,2);

        SET @ReconciliationAdjustment =
          @CurrentBalance - @RawLedgerBalance;

        -- Balance before the selected start date
        DECLARE @OpeningBalance DECIMAL(18,2);

        SELECT
          @OpeningBalance = ISNULL(SUM(Credit - Debit), 0)
        FROM #Ledger
        WHERE @fromDate IS NOT NULL
          AND TransactionDate < CAST(@fromDate AS DATETIME2);

        -- Selected period totals, including adjustments
        DECLARE @TotalCredit DECIMAL(18,2);
        DECLARE @TotalDebit DECIMAL(18,2);
        DECLARE @TransactionCount INT;

        SELECT
          @TotalCredit = ISNULL(SUM(Credit), 0),
          @TotalDebit = ISNULL(SUM(Debit), 0),
          @TransactionCount = COUNT(*)
        FROM #Ledger
        WHERE
          (
            @fromDate IS NULL
            OR TransactionDate >= CAST(@fromDate AS DATETIME2)
          )
          AND
          (
            @toDate IS NULL
            OR TransactionDate <
              DATEADD(DAY, 1, CAST(@toDate AS DATETIME2))
          );

        DECLARE @ClosingBalance DECIMAL(18,2);

        SET @ClosingBalance =
          @OpeningBalance + @TotalCredit - @TotalDebit;

        -- Net movement after the selected end date
        DECLARE @AfterToDateNetAmount DECIMAL(18,2);

        SELECT
          @AfterToDateNetAmount =
            ISNULL(SUM(Credit - Debit), 0)
        FROM #Ledger
        WHERE @toDate IS NOT NULL
          AND TransactionDate >=
            DATEADD(DAY, 1, CAST(@toDate AS DATETIME2));

        -- Resultset 1: Summary
        SELECT
          @OpeningBalance AS OpeningBalance,
          @TotalCredit AS TotalCredit,
          @TotalDebit AS TotalDebit,
          @ClosingBalance AS ClosingBalance,
          @CurrentBalance AS CurrentBalance,
          @TransactionCount AS TransactionCount,
          @RawLedgerBalance AS RawLedgerBalance,
          @ReconciliationAdjustment AS ReconciliationAdjustment,
          @AfterToDateNetAmount AS AfterToDateNetAmount;

        -- Calculate running balance before applying pagination
        ;WITH PeriodLedger AS
        (
          SELECT *
          FROM #Ledger
          WHERE
            (
              @fromDate IS NULL
              OR TransactionDate >= CAST(@fromDate AS DATETIME2)
            )
            AND
            (
              @toDate IS NULL
              OR TransactionDate <
                DATEADD(DAY, 1, CAST(@toDate AS DATETIME2))
            )
        ),
        NumberedLedger AS
        (
          SELECT
            *,
            ROW_NUMBER() OVER
            (
              ORDER BY TransactionDate, SortPriority, SourceId
            ) AS RowNumber,

            @OpeningBalance +
            SUM(Credit - Debit) OVER
            (
              ORDER BY TransactionDate, SortPriority, SourceId
              ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
            ) AS RunningBalance
          FROM PeriodLedger
        )

        -- Resultset 2: Transactions, including adjustment rows
        SELECT
          RowNumber,
          TransactionType,
          TransactionSource,
          SourceId,
          TransactionDate,
          OrderID,
          AssignID,
          InvoiceNo,
          CustomerName,
          Area,
          Debit,
          Credit,
          RunningBalance,
          PaymentVerifyStatus,
          VerificationRemarks,
          IsHandovered,
          DenominationJSON,

          CASE
            WHEN TransactionSource = 'ORDER_CASH'
            THEN CONCAT(
              'Cash received against Order #',
              OrderID,
              CASE
                WHEN InvoiceNo IS NOT NULL
                THEN CONCAT(' / Invoice ', InvoiceNo)
                ELSE ''
              END
            )

            WHEN TransactionSource = 'CASH_HANDOVER'
            THEN CONCAT(
              'Cash handed over to company - Handover #',
              SourceId
            )

            WHEN TransactionSource = 'CASH_ADJUSTMENT'
            THEN CONCAT(
              'Cash adjustment #',
              SourceId,
              ' - ',
              COALESCE(VerificationRemarks, 'Balance adjustment')
            )

            ELSE 'Cash Transaction'
          END AS Particulars

        FROM NumberedLedger
        WHERE RowNumber > @offset
          AND RowNumber <= (@offset + @limit)
        ORDER BY RowNumber;

        DROP TABLE #Ledger;
      `);

    const summary = result.recordsets[0]?.[0] || {};
    const transactions = result.recordsets[1] || [];

    const totalTransactions = Number(summary.TransactionCount || 0);
    const currentBalance = Number(summary.CurrentBalance || 0);

    return res.status(200).json({
      success: true,

      deliveryMan: {
        deliveryManId: deliveryMan.DeliveryManID,
        name: deliveryMan.Name,
        area: deliveryMan.Area,
        mobileNo: deliveryMan.MobileNo,
        isActive: deliveryMan.IsActive,
        currentBalance,
      },

      filter: {
        fromDate: fromDate || null,
        toDate: toDate || null,
      },

      summary: {
        openingBalance: Number(summary.OpeningBalance || 0),
        totalCredit: Number(summary.TotalCredit || 0),
        totalDebit: Number(summary.TotalDebit || 0),
        closingBalance: Number(summary.ClosingBalance || 0),
        currentBalance,
        transactionCount: totalTransactions,
        rawLedgerBalance: Number(summary.RawLedgerBalance || 0),
        reconciliationAdjustment: Number(summary.ReconciliationAdjustment || 0),
        afterToDateNetAmount: Number(summary.AfterToDateNetAmount || 0),
      },

      openingEntry: {
        transactionType: "OPENING",
        particulars: "Opening Balance",
        debit: 0,
        credit: 0,
        balance: Number(summary.OpeningBalance || 0),
      },

      pagination: {
        page: pageNumber,
        limit: pageLimit,
        totalRecords: totalTransactions,
        totalPages: Math.ceil(totalTransactions / pageLimit),
      },

      transactions,
    });
  } catch (error) {
    console.error("getDeliveryBoyPassbook:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch delivery boy passbook",
      error: error.message,
    });
  }
};
