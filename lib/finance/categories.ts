export const incomeCategories = [
  ['client_retainer', 'Client retainer'],
  ['project_payment', 'Project payment'],
  ['consulting_fee', 'Consulting fee'],
  ['performance_fee', 'Performance fee'],
  ['other_income', 'Other income'],
  ['owner_capital_injection', 'Owner capital injection'],
  ['loan_received', 'Loan received'],
  ['refund_received', 'Refund received'],
  ['interest_income', 'Interest income']
] as const

export const expenseCategories = [
  ['payroll', 'Payroll'],
  ['staff_salary', 'Staff salary'],
  ['freelancer_payment', 'Freelancer payment'],
  ['software_subscription', 'Software subscription'],
  ['office_rent', 'Office rent'],
  ['office_cost', 'Office cost'],
  ['ad_spend', 'Ad spend'],
  ['production_cost', 'Production cost'],
  ['marketing_expense', 'Marketing expense'],
  ['equipment_purchase', 'Equipment purchase'],
  ['tax_payment', 'Tax payment'],
  ['loan_repayment', 'Loan repayment'],
  ['owner_draw', 'Owner draw'],
  ['bank_fee', 'Bank fee'],
  ['other_expense', 'Other expense']
] as const

export const forecastCategories = [
  ...incomeCategories,
  ...expenseCategories,
  ['tax_reserve', 'Tax reserve'],
  ['minimum_cash_reserve', 'Minimum cash reserve'],
  ['debt_payment', 'Debt payment']
] as const
