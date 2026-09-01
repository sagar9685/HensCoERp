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

    // =====================================================
    // VALIDATION
    // =====================================================

    if (!deliveryManId || Number.isNaN(deliveryManId)) {
      return res.status(400).json({
        success: false,
        message: "Valid DeliveryManID is required",
      });
    }

    const pageNumber = Math.max(Number(page) || 1, 1);

    const pageLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

    const offset = (pageNumber - 1) * pageLimit;

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    if (fromDate && !dateRegex.test(fromDate)) {
      return res.status(400).json({
        success: false,
        message: "fromDate must be YYYY-MM-DD",
      });
    }

    if (toDate && !dateRegex.test(toDate)) {
      return res.status(400).json({
        success: false,
        message: "toDate must be YYYY-MM-DD",
      });
    }

    if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) {
      return res.status(400).json({
        success: false,
        message: "fromDate cannot be greater than toDate",
      });
    }

    const pool = await poolPromise;

    // =====================================================
    // DELIVERY MAN DETAILS
    // =====================================================

    const deliveryResult = await pool
      .request()
      .input("deliveryManId", sql.Int, deliveryManId).query(`
        SELECT
          dm.DeliveryManID,
          dm.Name,
          dm.Area,
          dm.MobileNo,
          dm.IsActive,

          ISNULL(
            dcb.CurrentBalance,
            0
          ) AS CurrentBalance

        FROM DeliveryMen dm

        LEFT JOIN DeliveryMenCashBalance dcb
          ON dcb.DeliveryManID = dm.DeliveryManID

        WHERE dm.DeliveryManID = @deliveryManId
      `);

    if (deliveryResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Delivery boy not found",
      });
    }

    const deliveryMan = deliveryResult.recordset[0];

    // =====================================================
    // PASSBOOK QUERY
    // =====================================================

    const request = pool
      .request()
      .input("deliveryManId", sql.Int, deliveryManId)
      .input("fromDate", sql.Date, fromDate || null)
      .input("toDate", sql.Date, toDate || null)
      .input("offset", sql.Int, offset)
      .input("limit", sql.Int, pageLimit);

    const result = await request.query(`

      SET NOCOUNT ON;

      -- ===================================================
      -- CREATE TEMP LEDGER
      -- ===================================================

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


      -- ===================================================
      -- CR ENTRY
      -- CASH RECEIVED AGAINST ORDER
      -- ===================================================

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
        'CR' AS TransactionType,

        'ORDER_CASH' AS TransactionSource,

        op.PaymentID AS SourceId,

        COALESCE(
          op.PaymentReceivedDate,
          op.CreatedAt
        ) AS TransactionDate,

        op.OrderID,
        op.AssignID,

        ot.InvoiceNo,
        ot.CustomerName,
        ot.Area,

        0 AS Debit,

        ISNULL(op.Amount, 0) AS Credit,

        op.PaymentVerifyStatus,
        op.VerificationRemarks,

        op.IsHandovered,

        NULL AS DenominationJSON,

        1 AS SortPriority

      FROM OrderPayments op

      INNER JOIN AssignedOrders ao
        ON ao.AssignID = op.AssignID

      LEFT JOIN OrdersTemp ot
        ON ot.OrderID = op.OrderID

      WHERE
        ao.DeliveryManID = @deliveryManId

        -- CASH
        AND op.PaymentModeID = 1

        AND ISNULL(op.Amount, 0) <> 0;


      -- ===================================================
      -- DR ENTRY
      -- CASH HANDED OVER TO COMPANY
      -- ===================================================

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
        'DR' AS TransactionType,

        'CASH_HANDOVER' AS TransactionSource,

        cd.Id AS SourceId,

        cd.CreatedAt AS TransactionDate,

        NULL AS OrderID,
        NULL AS AssignID,

        NULL AS InvoiceNo,
        NULL AS CustomerName,
        NULL AS Area,

        ISNULL(
          cd.TotalHandoverAmount,
          0
        ) AS Debit,

        0 AS Credit,

        NULL AS PaymentVerifyStatus,
        NULL AS VerificationRemarks,

        NULL AS IsHandovered,

        cd.DenominationJSON,

        2 AS SortPriority

      FROM CashDepartment cd

      WHERE
        cd.DeliveryManId = @deliveryManId

        AND ISNULL(
          cd.TotalHandoverAmount,
          0
        ) <> 0;


      -- ===================================================
      -- CURRENT BALANCE
      -- ===================================================

      DECLARE @CurrentBalance DECIMAL(18,2);

      SELECT
        @CurrentBalance =
          ISNULL(CurrentBalance, 0)

      FROM DeliveryMenCashBalance

      WHERE DeliveryManID = @deliveryManId;

      SET @CurrentBalance =
        ISNULL(@CurrentBalance, 0);


      -- ===================================================
      -- RAW LEDGER BALANCE
      -- ===================================================

      DECLARE @RawLedgerBalance DECIMAL(18,2);

      SELECT
        @RawLedgerBalance =
          ISNULL(
            SUM(Credit - Debit),
            0
          )

      FROM #Ledger;


      -- ===================================================
      -- RECONCILIATION / LEGACY OPENING BALANCE
      --
      -- This makes recorded ledger reconcile with
      -- DeliveryMenCashBalance.CurrentBalance
      -- ===================================================

      DECLARE @ReconciliationAdjustment DECIMAL(18,2);

      SET @ReconciliationAdjustment =
        @CurrentBalance - @RawLedgerBalance;


      -- ===================================================
      -- OPENING BALANCE FOR SELECTED DATE RANGE
      -- ===================================================

      DECLARE @OpeningBalance DECIMAL(18,2);

      SELECT
        @OpeningBalance =
          @ReconciliationAdjustment
          +
          ISNULL(
            SUM(Credit - Debit),
            0
          )

      FROM #Ledger

      WHERE
        @fromDate IS NOT NULL
        AND TransactionDate < CAST(@fromDate AS DATETIME2);


      IF @fromDate IS NULL
      BEGIN
        SET @OpeningBalance =
          @ReconciliationAdjustment;
      END;


      -- ===================================================
      -- PERIOD TOTALS
      -- ===================================================

      DECLARE @TotalCredit DECIMAL(18,2);
      DECLARE @TotalDebit DECIMAL(18,2);
      DECLARE @TransactionCount INT;


      SELECT
        @TotalCredit =
          ISNULL(
            SUM(Credit),
            0
          ),

        @TotalDebit =
          ISNULL(
            SUM(Debit),
            0
          ),

        @TransactionCount =
          COUNT(*)

      FROM #Ledger

      WHERE

        (
          @fromDate IS NULL

          OR TransactionDate >=
             CAST(@fromDate AS DATETIME2)
        )

        AND

        (
          @toDate IS NULL

          OR TransactionDate <
             DATEADD(
               DAY,
               1,
               CAST(@toDate AS DATETIME2)
             )
        );


      -- ===================================================
      -- CLOSING BALANCE
      -- ===================================================

      DECLARE @ClosingBalance DECIMAL(18,2);

      SET @ClosingBalance =
        @OpeningBalance
        +
        @TotalCredit
        -
        @TotalDebit;


      -- ===================================================
      -- SUMMARY RESULTSET
      -- ===================================================

      SELECT

        @OpeningBalance AS OpeningBalance,

        @TotalCredit AS TotalCredit,

        @TotalDebit AS TotalDebit,

        @ClosingBalance AS ClosingBalance,

        @CurrentBalance AS CurrentBalance,

        @TransactionCount AS TransactionCount,

        @RawLedgerBalance AS RawLedgerBalance,

        @ReconciliationAdjustment
          AS ReconciliationAdjustment;


      -- ===================================================
      -- TRANSACTIONS + RUNNING BALANCE
      -- ===================================================

      ;WITH PeriodLedger AS
      (
        SELECT *

        FROM #Ledger

        WHERE

          (
            @fromDate IS NULL

            OR TransactionDate >=
               CAST(@fromDate AS DATETIME2)
          )

          AND

          (
            @toDate IS NULL

            OR TransactionDate <
               DATEADD(
                 DAY,
                 1,
                 CAST(@toDate AS DATETIME2)
               )
          )
      ),

      RunningLedger AS
      (
        SELECT

          *,

          @OpeningBalance
          +
          SUM(
            Credit - Debit
          )
          OVER
          (
            ORDER BY
              TransactionDate,
              SortPriority,
              SourceId

            ROWS BETWEEN
              UNBOUNDED PRECEDING
              AND CURRENT ROW
          ) AS RunningBalance

        FROM PeriodLedger
      ),

      NumberedLedger AS
      (
        SELECT

          *,

          ROW_NUMBER()
          OVER
          (
            ORDER BY
              TransactionDate,
              SortPriority,
              SourceId
          ) AS RowNumber

        FROM RunningLedger
      )

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
          THEN
            CONCAT(
              'Cash received against Order #',
              OrderID,
              CASE
                WHEN InvoiceNo IS NOT NULL
                THEN CONCAT(' / Invoice ', InvoiceNo)
                ELSE ''
              END
            )

          WHEN TransactionSource = 'CASH_HANDOVER'
          THEN
            CONCAT(
              'Cash handed over to company - Handover #',
              SourceId
            )

          ELSE 'Cash Transaction'

        END AS Particulars

      FROM NumberedLedger

      WHERE
        RowNumber > @offset

        AND RowNumber <=
          (@offset + @limit)

      ORDER BY RowNumber;


      DROP TABLE #Ledger;
    `);

    const summary = result.recordsets[0]?.[0] || {};

    const transactions = result.recordsets[1] || [];

    const totalTransactions = Number(summary.TransactionCount || 0);

    // =====================================================
    // RESPONSE
    // =====================================================

    res.status(200).json({
      success: true,

      deliveryMan: {
        deliveryManId: deliveryMan.DeliveryManID,

        name: deliveryMan.Name,

        area: deliveryMan.Area,

        mobileNo: deliveryMan.MobileNo,

        isActive: deliveryMan.IsActive,

        currentBalance: Number(deliveryMan.CurrentBalance || 0),
      },

      filter: {
        fromDate,
        toDate,
      },

      summary: {
        openingBalance: Number(summary.OpeningBalance || 0),

        totalCredit: Number(summary.TotalCredit || 0),

        totalDebit: Number(summary.TotalDebit || 0),

        closingBalance: Number(summary.ClosingBalance || 0),

        currentBalance: Number(summary.CurrentBalance || 0),

        transactionCount: totalTransactions,

        rawLedgerBalance: Number(summary.RawLedgerBalance || 0),

        reconciliationAdjustment: Number(summary.ReconciliationAdjustment || 0),
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

    res.status(500).json({
      success: false,
      message: "Failed to fetch delivery boy passbook",
      error: error.message,
    });
  }
};
