# Implementation Plan - Logic and Counting Fixes

Fix logic errors related to account balances, monthly summaries, and cumulative totals. The goal is to ensure that the "Neto del mes" reflects the cumulative balance (carrying over from previous months), that account balances are calculated up to the selected month, and that monthly stats (Income, Expense, Saving) and percentages never show negative values in the UI.

## User Review Required

> [!IMPORTANT]
> **Debt Account Association**: To accurately reflect lending/payments in "Efectivo" and "Cuentas" balances, I will add an optional `accountId` to the Debt and Debt Payment forms. This allows the app to know which account the money came from or went to. If no account is selected, it will only affect the total "Neto" but not specific account totals.

## Proposed Changes

### Core Logic & Store

#### [finance.ts](file:///E:/Projects/My Finance Mate/FINANCE PAL (ACTUAL LAST)/finance-pal/src/lib/finance.ts)
- Update `Debt` and `DebtPayment` interfaces to include `accountId?: string`.
- Update `computeBalances` to:
    - Accept an optional `endDate: Date`.
    - Accept `debts: Debt[]` to include debt-related movements in account balances.
    - Filter transactions and debts by the provided `endDate`.

#### [finance-store.ts](file:///E:/Projects/My Finance Mate/FINANCE PAL (ACTUAL LAST)/finance-pal/src/store/finance-store.ts)
- Update `addDebt`, `updateDebt`, and `addDebtPayment` to accept and persist `accountId`.
- Update sanitization logic for debts to handle the new field.

---

### Dashboard & Summaries

#### [Dashboard.tsx](file:///E:/Projects/My Finance Mate/FINANCE PAL (ACTUAL LAST)/finance-pal/src/pages/Dashboard.tsx)
- Update `monthStats` calculation:
    - Calculate `income`, `expense`, and `saving` for the current month only (authoritative transactions + expected fixed items).
    - Add a `cumulativeNet` calculation that sums ALL activity (income - expense - saving) from all time up to the end of the selected month.
    - The "Big Number" (Neto del mes) will now show this `cumulativeNet`.
    - UI Display: Wrap `income`, `expense`, `saving`, and `savingRate` in `Math.max(0, ...)` to avoid negative numbers in the summary pills.
- Update `balances` to use `computeBalances` with the end date of the currently selected month.

#### [Anual.tsx](file:///E:/Projects/My Finance Mate/FINANCE PAL (ACTUAL LAST)/finance-pal/src/pages/Anual.tsx)
- Update monthly row calculations to ensure `Tasa` (saving rate) is non-negative.
- (Optional) Ensure `Neto` in the annual table remains "Monthly Surplus" for reporting, as cumulative values in a table often confuse users, but I will clarify the label if needed.

---

### UI Components

#### [Deudas.tsx](file:///E:/Projects/My Finance Mate/FINANCE PAL (ACTUAL LAST)/finance-pal/src/pages/Deudas.tsx)
- Update `DebtForm` and `PaymentForm` to include a `Select` for choosing which account is affected by the lending or payment.

---

### Verification Plan

#### Automated Tests
- I will verify the logic by manually checking the calculations in the Dashboard after recording various transactions (past and future).
- I will check that selecting a previous month correctly updates the "Neto" and "Account" totals to reflect the state at that time.

#### Manual Verification
1. **Cumulative Net**:
   - Add $1000 income in May.
   - Go to June. Verify "Neto del mes" shows $1000 even with $0 activity in June.
2. **Negative Savings**:
   - In June, withdraw $500 from a Goal.
   - Verify "Ahorro" pill shows $0 (not -$500).
   - Verify "Neto del mes" increases to $1500.
3. **Account Balances**:
   - Verify "Efectivo" and "Cuentas" balances change when navigating through months.
4. **Debts**:
   - Create a debt of $100 from "Cuenta 1".
   - Verify "Cuenta 1" balance decreases by $100.
   - Add a payment of $50 to "Cuenta 1".
   - Verify "Cuenta 1" balance increases by $50.
