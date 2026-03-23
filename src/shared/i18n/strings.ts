import type { AppLanguage } from '@/shared/api/types'
import type { ExpenseValidationMessageKey } from '@/shared/utils/expense'

type SettlementMessageKey =
  | 'SETTLEMENT_SELECT_TWO_MEMBERS'
  | 'SETTLEMENT_MEMBERS_MUST_DIFFER'
  | 'SETTLEMENT_AMOUNT_POSITIVE'
  | 'SETTLEMENT_SAVED'
  | 'EXPENSE_SAVED'

export interface AppStrings {
  appTitle: string
  homeTab: string
  settingsTab: string
  registerTitle: string
  loginTitle: string
  registerSubtitle: string
  loginSubtitle: string
  authErrorTitle: string
  formErrorTitle: string
  loginFailed: string
  registerFailed: string
  nameRequired: string
  usernameRequired: string
  passwordRequired: string
  amountTooLarge: string
  invalidCredentials: string
  usernameTaken: string
  networkError: string
  loginLoading: string
  registerLoading: string
  nameLabel: string
  usernameLabel: string
  passwordLabel: string
  loginAction: string
  registerAction: string
  goToRegister: string
  goToLogin: string
  signOut: string
  addGroup: string
  newGroupTitle: string
  editGroupTitle: string
  groupPlaceholder: string
  createGroup: string
  save: string
  select: string
  cancel: string
  noGroupsTitle: string
  noGroupsSubtitle: string
  homeHeroTitle: string
  homeHeroSubtitle: string
  groupFallbackTitle: string
  groupOverviewTitle: string
  groupOverviewSubtitle: string
  totalExpenseLabel: string
  membersLabel: string
  settlementsLabel: string
  openBalancesLabel: string
  membersAction: string
  newExpenseAction: string
  addSettlementAction: string
  balancesAction: string
  recentExpensesTitle: string
  recentSettlementsTitle: string
  noExpensesTitle: string
  noExpensesSubtitle: string
  noSettlementsTitle: string
  noSettlementsSubtitle: string
  membersOfGroupPrefix: string
  invitesTitle: string
  noInvitesTitle: string
  noInvitesSubtitle: string
  acceptInvite: string
  rejectInvite: string
  pendingInviteLabel: string
  addMember: string
  editMember: string
  memberPlaceholder: string
  saveMember: string
  noMembersTitle: string
  noMembersSubtitle: string
  addExpenseTitle: string
  editExpenseTitle: string
  expenseHeroTitle: string
  expenseHeroSubtitle: string
  expenseTitleLabel: string
  expenseNoteLabel: string
  totalAmountLabel: string
  equalSplitLabel: string
  exactSplitLabel: string
  membersAndPayersTitle: string
  saveExpense: string
  saveExpenseChanges: string
  payFullAmountAction: string
  clearAmountAction: string
  addSettlementTitle: string
  editSettlementTitle: string
  settlementHeroTitle: string
  settlementHeroSubtitle: string
  payerLabel: string
  receiverLabel: string
  settlementAmountLabel: string
  noteLabel: string
  saveSettlement: string
  saveSettlementChanges: string
  balancesPrefix: string
  optimizePaymentsTitle: string
  optimizePaymentsSubtitle: string
  memberBalanceTitle: string
  suggestedPaymentsTitle: string
  suggestedAmountCardTitle: string
  fillSuggestedAmountAction: string
  allSettledTitle: string
  allSettledSubtitle: string
  expenseDetailsFallback: string
  expenseNotFound: string
  noDescription: string
  totalAmountStat: string
  splitMethodStat: string
  dateStat: string
  peopleCountStat: string
  payersTitle: string
  sharesTitle: string
  paidHowMuchLabel: string
  shareAmountLabel: string
  equalShareLabel: string
  creditorLabel: string
  debtorLabel: string
  settledLabel: string
  paidStat: string
  owedStat: string
  netStat: string
  edit: string
  delete: string
  back: string
  settingsHeroTitle: string
  settingsHeroSubtitle: string
  accountTitle: string
  accountGuestSubtitle: string
  accountSignedInAs: string
  installAppTitle: string
  installAppBody: string
  installAppAction: string
  installAppDismiss: string
  iosInstallTitle: string
  iosInstallBody: string
  languageTitle: string
  themeTitle: string
  persianLabel: string
  englishLabel: string
  lightLabel: string
  darkLabel: string
  loading: string
  retry: string
  confirmDelete: string
  genericError: string
}

const fa: AppStrings = {
  appTitle: 'دنگینو',
  homeTab: 'خانه',
  settingsTab: 'تنظیمات',
  registerTitle: 'ثبت‌نام',
  loginTitle: 'ورود',
  registerSubtitle: 'برای همگام‌سازی خرج‌ها یک حساب بساز.',
  loginSubtitle: 'با حساب خود وارد شو تا گروه‌ها و مانده‌ها را ببینی.',
  authErrorTitle: 'مشکل در احراز هویت',
  formErrorTitle: 'اشکال در فرم',
  loginFailed: 'ورود انجام نشد.',
  registerFailed: 'ثبت‌نام انجام نشد.',
  nameRequired: 'نام را وارد کن.',
  usernameRequired: 'نام کاربری را وارد کن.',
  passwordRequired: 'رمز عبور را وارد کن.',
  amountTooLarge: 'عدد واردشده بیش از حد بزرگ است.',
  invalidCredentials: 'نام کاربری یا رمز عبور درست نیست.',
  usernameTaken: 'این نام کاربری قبلاً استفاده شده است.',
  networkError: 'اتصال به سرور برقرار نشد. اینترنت را بررسی کن و دوباره تلاش کن.',
  loginLoading: 'در حال ورود...',
  registerLoading: 'در حال ساخت حساب...',
  nameLabel: 'نام',
  usernameLabel: 'نام کاربری',
  passwordLabel: 'رمز عبور',
  loginAction: 'ورود',
  registerAction: 'ساخت حساب',
  goToRegister: 'حساب نداری؟ ثبت‌نام کن',
  goToLogin: 'حساب داری؟ وارد شو',
  signOut: 'خروج',
  addGroup: 'افزودن گروه',
  newGroupTitle: 'گروه جدید',
  editGroupTitle: 'ویرایش گروه',
  groupPlaceholder: 'مثلا سفر شمال',
  createGroup: 'ساخت گروه',
  save: 'ذخیره',
  select: 'انتخاب',
  cancel: 'انصراف',
  noGroupsTitle: 'هنوز گروهی نداری',
  noGroupsSubtitle: 'از دکمه بالا یک گروه جدید بساز.',
  homeHeroTitle: 'خرج‌ها را آفلاین جمع کن',
  homeHeroSubtitle: 'برای هر سفر یا جمع، گروه بساز، اعضا را اضافه کن و بدهی‌ها را با حالت simplify ببین.',
  groupFallbackTitle: 'گروه',
  groupOverviewTitle: 'وضعیت کلی گروه',
  groupOverviewSubtitle: 'خرج‌ها، اعضا، تسویه‌ها و مانده‌های باز را از همین‌جا کنترل کن.',
  totalExpenseLabel: 'کل خرج',
  membersLabel: 'اعضا',
  settlementsLabel: 'تسویه‌ها',
  openBalancesLabel: 'مانده باز',
  membersAction: 'اعضا',
  newExpenseAction: 'خرج جدید',
  addSettlementAction: 'ثبت تسویه',
  balancesAction: 'مانده‌ها',
  recentExpensesTitle: 'آخرین خرج‌ها',
  recentSettlementsTitle: 'تسویه‌های اخیر',
  noExpensesTitle: 'خرجی ثبت نشده',
  noExpensesSubtitle: 'اولین خرج گروه را ثبت کن تا مانده‌ها محاسبه شوند.',
  noSettlementsTitle: 'تسویه‌ای ثبت نشده',
  noSettlementsSubtitle: 'وقتی کسی بدهی‌اش را داد، از اینجا ثبتش کن.',
  membersOfGroupPrefix: 'اعضای',
  invitesTitle: 'دعوت‌نامه‌ها',
  noInvitesTitle: 'دعوت‌نامه‌ای نداری',
  noInvitesSubtitle: 'وقتی کسی تو را به گروهی دعوت کند اینجا دیده می‌شود.',
  acceptInvite: 'قبول',
  rejectInvite: 'رد',
  pendingInviteLabel: 'در انتظار تایید',
  addMember: 'افزودن عضو',
  editMember: 'ویرایش عضو',
  memberPlaceholder: 'نام کاربری عضو',
  saveMember: 'ثبت عضو',
  noMembersTitle: 'هیچ عضوی ثبت نشده',
  noMembersSubtitle: 'برای ثبت خرج حداقل یک عضو نیاز داری.',
  addExpenseTitle: 'خرج جدید',
  editExpenseTitle: 'ویرایش خرج',
  expenseHeroTitle: 'خرج را دقیق ثبت کن',
  expenseHeroSubtitle: 'می‌توانی مشخص کنی چه کسی پرداخت کرده و سهم هر نفر چقدر بوده.',
  expenseTitleLabel: 'عنوان خرج',
  expenseNoteLabel: 'توضیح',
  totalAmountLabel: 'مبلغ کل (تومان)',
  equalSplitLabel: 'تقسیم مساوی',
  exactSplitLabel: 'مبلغ دقیق',
  membersAndPayersTitle: 'اعضا و پرداخت‌کننده‌ها',
  saveExpense: 'ثبت خرج',
  saveExpenseChanges: 'ذخیره تغییرات',
  payFullAmountAction: 'همه مبلغ را این نفر پرداخت کرده',
  clearAmountAction: 'پاک کردن مبلغ',
  addSettlementTitle: 'ثبت تسویه',
  editSettlementTitle: 'ویرایش تسویه',
  settlementHeroTitle: 'تسویه واقعی را ثبت کن',
  settlementHeroSubtitle: 'وقتی یکی بدهی‌اش را به دیگری پرداخت کرد، اینجا ثبتش کن تا مانده‌ها اصلاح شوند.',
  payerLabel: 'پرداخت‌کننده',
  receiverLabel: 'دریافت‌کننده',
  settlementAmountLabel: 'مبلغ تسویه',
  noteLabel: 'یادداشت',
  saveSettlement: 'ثبت تسویه',
  saveSettlementChanges: 'ذخیره تغییرات',
  balancesPrefix: 'مانده‌های',
  optimizePaymentsTitle: 'حالت پرداخت بهینه',
  optimizePaymentsSubtitle: 'کمترین تعداد پرداخت پیشنهادی را نشان می‌دهد.',
  memberBalanceTitle: 'مانده هر نفر',
  suggestedPaymentsTitle: 'پرداخت‌های پیشنهادی',
  suggestedAmountCardTitle: 'مبلغ پیشنهادی',
  fillSuggestedAmountAction: 'قرار دادن مبلغ پیشنهادی',
  allSettledTitle: 'همه‌چیز تسویه است',
  allSettledSubtitle: 'در این گروه پرداخت باز باقی نمانده.',
  expenseDetailsFallback: 'جزئیات خرج',
  expenseNotFound: 'خرج پیدا نشد.',
  noDescription: 'بدون توضیح',
  totalAmountStat: 'مبلغ کل',
  splitMethodStat: 'روش تقسیم',
  dateStat: 'تاریخ',
  peopleCountStat: 'تعداد افراد',
  payersTitle: 'پرداخت‌کننده‌ها',
  sharesTitle: 'سهم افراد',
  paidHowMuchLabel: 'چقدر پرداخت کرده؟',
  shareAmountLabel: 'سهم این نفر',
  equalShareLabel: 'سهم مساوی',
  creditorLabel: 'طلبکار',
  debtorLabel: 'بدهکار',
  settledLabel: 'تسویه',
  paidStat: 'پرداخت',
  owedStat: 'سهم',
  netStat: 'خالص',
  edit: 'ویرایش',
  delete: 'حذف',
  back: 'بازگشت',
  settingsHeroTitle: 'ظاهر و زبان اپ را تنظیم کن',
  settingsHeroSubtitle: 'از اینجا بین فارسی و انگلیسی و بین تم روشن و تیره جابه‌جا شو.',
  accountTitle: 'حساب',
  accountGuestSubtitle: 'برای همگام‌سازی وارد حساب خودت شو.',
  accountSignedInAs: 'وارد شده با',
  installAppTitle: 'نصب اپ',
  installAppBody: 'برای دسترسی سریع‌تر و تجربه شبیه اپ، این وب‌اپ را به صفحه اصلی اضافه کن.',
  installAppAction: 'نصب اپ',
  installAppDismiss: 'بعداً',
  iosInstallTitle: 'افزودن به صفحه اصلی',
  iosInstallBody: 'در Safari روی Share بزن و بعد Add to Home Screen را انتخاب کن.',
  languageTitle: 'زبان',
  themeTitle: 'تم',
  persianLabel: 'فارسی',
  englishLabel: 'English',
  lightLabel: 'روشن',
  darkLabel: 'تیره',
  loading: 'در حال بارگذاری...',
  retry: 'تلاش دوباره',
  confirmDelete: 'از حذف مطمئنی؟',
  genericError: 'عملیات انجام نشد.',
}

const en: AppStrings = {
  appTitle: 'Splitwise',
  homeTab: 'Home',
  settingsTab: 'Settings',
  registerTitle: 'Register',
  loginTitle: 'Login',
  registerSubtitle: 'Create an account to sync your shared expenses.',
  loginSubtitle: 'Sign in to view your groups, balances, and settlements.',
  authErrorTitle: 'Authentication issue',
  formErrorTitle: 'Form issue',
  loginFailed: 'Login failed.',
  registerFailed: 'Registration failed.',
  nameRequired: 'Enter your name.',
  usernameRequired: 'Enter a username.',
  passwordRequired: 'Enter a password.',
  amountTooLarge: 'The entered amount is too large.',
  invalidCredentials: 'Username or password is incorrect.',
  usernameTaken: 'This username is already taken.',
  networkError: 'Could not reach the server. Check your connection and try again.',
  loginLoading: 'Signing in...',
  registerLoading: 'Creating account...',
  nameLabel: 'Name',
  usernameLabel: 'Username',
  passwordLabel: 'Password',
  loginAction: 'Login',
  registerAction: 'Create account',
  goToRegister: 'No account? Register',
  goToLogin: 'Already have an account? Login',
  signOut: 'Sign out',
  addGroup: 'Add group',
  newGroupTitle: 'New group',
  editGroupTitle: 'Edit group',
  groupPlaceholder: 'For example, Summer trip',
  createGroup: 'Create group',
  save: 'Save',
  select: 'Select',
  cancel: 'Cancel',
  noGroupsTitle: 'You have no groups yet',
  noGroupsSubtitle: 'Create a new group from the top action.',
  homeHeroTitle: 'Track shared costs cleanly',
  homeHeroSubtitle: 'Create a group for each trip or event, add members, and check simplified debts.',
  groupFallbackTitle: 'Group',
  groupOverviewTitle: 'Group overview',
  groupOverviewSubtitle: 'Control expenses, members, settlements, and open balances from here.',
  totalExpenseLabel: 'Total expenses',
  membersLabel: 'Members',
  settlementsLabel: 'Settlements',
  openBalancesLabel: 'Open balances',
  membersAction: 'Members',
  newExpenseAction: 'New expense',
  addSettlementAction: 'Add settlement',
  balancesAction: 'Balances',
  recentExpensesTitle: 'Recent expenses',
  recentSettlementsTitle: 'Recent settlements',
  noExpensesTitle: 'No expenses yet',
  noExpensesSubtitle: 'Add the first expense to start calculating balances.',
  noSettlementsTitle: 'No settlements yet',
  noSettlementsSubtitle: 'Record real repayments here when they happen.',
  membersOfGroupPrefix: 'Members of',
  invitesTitle: 'Invites',
  noInvitesTitle: 'No pending invites',
  noInvitesSubtitle: 'Incoming group invites will show up here.',
  acceptInvite: 'Accept',
  rejectInvite: 'Reject',
  pendingInviteLabel: 'Pending',
  addMember: 'Add member',
  editMember: 'Edit member',
  memberPlaceholder: 'Member username',
  saveMember: 'Save member',
  noMembersTitle: 'No members yet',
  noMembersSubtitle: 'You need at least one member before adding expenses.',
  addExpenseTitle: 'New expense',
  editExpenseTitle: 'Edit expense',
  expenseHeroTitle: 'Capture an expense precisely',
  expenseHeroSubtitle: 'Choose who paid and define each participant share.',
  expenseTitleLabel: 'Expense title',
  expenseNoteLabel: 'Note',
  totalAmountLabel: 'Total amount',
  equalSplitLabel: 'Equal split',
  exactSplitLabel: 'Exact amounts',
  membersAndPayersTitle: 'Members and payers',
  saveExpense: 'Save expense',
  saveExpenseChanges: 'Save changes',
  payFullAmountAction: 'Mark as full payer',
  clearAmountAction: 'Clear amount',
  addSettlementTitle: 'Add settlement',
  editSettlementTitle: 'Edit settlement',
  settlementHeroTitle: 'Record a real settlement',
  settlementHeroSubtitle: 'When one member pays another back, save it here to update balances.',
  payerLabel: 'Payer',
  receiverLabel: 'Receiver',
  settlementAmountLabel: 'Settlement amount',
  noteLabel: 'Note',
  saveSettlement: 'Save settlement',
  saveSettlementChanges: 'Save changes',
  balancesPrefix: 'Balances of',
  optimizePaymentsTitle: 'Simplify payments',
  optimizePaymentsSubtitle: 'Shows the minimum useful set of suggested transfers.',
  memberBalanceTitle: 'Member balances',
  suggestedPaymentsTitle: 'Suggested payments',
  suggestedAmountCardTitle: 'Suggested amount',
  fillSuggestedAmountAction: 'Fill suggested amount',
  allSettledTitle: 'Everything is settled',
  allSettledSubtitle: 'There are no open payments left in this group.',
  expenseDetailsFallback: 'Expense details',
  expenseNotFound: 'Expense not found.',
  noDescription: 'No description',
  totalAmountStat: 'Total amount',
  splitMethodStat: 'Split method',
  dateStat: 'Date',
  peopleCountStat: 'People',
  payersTitle: 'Payers',
  sharesTitle: 'Shares',
  paidHowMuchLabel: 'How much did they pay?',
  shareAmountLabel: 'This member share',
  equalShareLabel: 'Equal share',
  creditorLabel: 'Creditor',
  debtorLabel: 'Debtor',
  settledLabel: 'Settled',
  paidStat: 'Paid',
  owedStat: 'Owed',
  netStat: 'Net',
  edit: 'Edit',
  delete: 'Delete',
  back: 'Back',
  settingsHeroTitle: 'Adjust language and theme',
  settingsHeroSubtitle: 'Switch between Persian and English and choose light or dark mode.',
  accountTitle: 'Account',
  accountGuestSubtitle: 'Sign in to keep your data in sync.',
  accountSignedInAs: 'Signed in as',
  installAppTitle: 'Install app',
  installAppBody: 'Add this web app to your home screen for faster access and an app-like experience.',
  installAppAction: 'Install',
  installAppDismiss: 'Later',
  iosInstallTitle: 'Add to Home Screen',
  iosInstallBody: 'In Safari, tap Share and then choose Add to Home Screen.',
  languageTitle: 'Language',
  themeTitle: 'Theme',
  persianLabel: 'فارسی',
  englishLabel: 'English',
  lightLabel: 'Light',
  darkLabel: 'Dark',
  loading: 'Loading...',
  retry: 'Retry',
  confirmDelete: 'Are you sure you want to delete this item?',
  genericError: 'The operation failed.',
}

const byLanguage = { fa, en }

export function stringsFor(language: AppLanguage) {
  return byLanguage[language]
}

export function translateMessageKey(language: AppLanguage, key?: ExpenseValidationMessageKey | SettlementMessageKey) {
  if (!key) return null

  const isFa = language === 'fa'
  const messages: Record<string, string> = {
    EXPENSE_TOTAL_POSITIVE: isFa ? 'مبلغ کل باید بیشتر از صفر باشد.' : 'Total amount must be greater than zero.',
    EXPENSE_AT_LEAST_ONE_PAYER: isFa ? 'حداقل یک پرداخت‌کننده لازم است.' : 'At least one payer is required.',
    EXPENSE_AT_LEAST_ONE_SHARE: isFa ? 'حداقل یک نفر باید در تقسیم حضور داشته باشد.' : 'Select at least one participant.',
    EXPENSE_NEGATIVE_VALUES: isFa ? 'مقادیر منفی مجاز نیستند.' : 'Negative amounts are not allowed.',
    EXPENSE_PAYER_TOTAL_MISMATCH: isFa ? 'جمع پرداخت‌کننده‌ها باید با مبلغ کل برابر باشد.' : 'Payer totals must match the full amount.',
    EXPENSE_SHARE_TOTAL_MISMATCH: isFa ? 'جمع سهم‌ها باید با مبلغ کل برابر باشد.' : 'Shares must match the full amount.',
    EXPENSE_TITLE_REQUIRED: isFa ? 'عنوان خرج را وارد کنید.' : 'Enter an expense title.',
    EXPENSE_SAVED: isFa ? 'خرج ذخیره شد.' : 'Expense saved.',
    SETTLEMENT_SELECT_TWO_MEMBERS: isFa ? 'دو نفر را انتخاب کنید.' : 'Select two members.',
    SETTLEMENT_MEMBERS_MUST_DIFFER: isFa ? 'پرداخت‌کننده و دریافت‌کننده باید متفاوت باشند.' : 'Payer and receiver must be different.',
    SETTLEMENT_AMOUNT_POSITIVE: isFa ? 'مبلغ تسویه باید بیشتر از صفر باشد.' : 'Settlement amount must be greater than zero.',
    SETTLEMENT_SAVED: isFa ? 'تسویه ذخیره شد.' : 'Settlement saved.',
  }

  return messages[key]
}
