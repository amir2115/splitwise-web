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
  passwordTooShort: string
  showPasswordLabel: string
  hidePasswordLabel: string
  currentPasswordLabel: string
  currentPasswordRequired: string
  currentPasswordInvalid: string
  newPasswordLabel: string
  phoneVerificationTitle: string
  phoneVerificationSubtitle: string
  phoneVerificationPhoneLabel: string
  phoneVerificationPhonePlaceholder: string
  phoneVerificationRequestAction: string
  phoneVerificationRequestLoading: string
  phoneVerificationCodeLabel: string
  phoneVerificationCodeSubtitle: string
  phoneVerificationVerifiedSubtitle: string
  phoneVerificationVerifyAction: string
  phoneVerificationVerifyLoading: string
  phoneVerificationChangePhoneAction: string
  phoneVerificationResendAction: string
  phoneVerificationResendLoading: string
  phoneVerificationResendCountdown: string
  phoneVerificationCodeSent: string
  phoneVerificationInvalidPhone: string
  phoneVerificationPhoneTaken: string
  phoneVerificationRateLimited: string
  phoneVerificationCodeInvalid: string
  phoneVerificationCodeExpired: string
  phoneVerificationCodeNotFound: string
  phoneVerificationAttemptsExceeded: string
  phoneVerificationNotConfigured: string
  phoneVerificationSmsFailed: string
  changePasswordTitle: string
  changePasswordSubtitle: string
  changePasswordAction: string
  changePasswordLoading: string
  changePasswordFailed: string
  pendingInviteAcceptanceRequired: string
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
  forgotPasswordAction: string
  forgotPasswordTitle: string
  forgotPasswordSubtitle: string
  forgotPasswordIdentifierLabel: string
  forgotPasswordIdentifierPlaceholder: string
  forgotPasswordRequestAction: string
  forgotPasswordRequestLoading: string
  forgotPasswordCodeTitle: string
  forgotPasswordCodeSubtitle: string
  forgotPasswordVerifyAction: string
  forgotPasswordVerifyLoading: string
  forgotPasswordResetTitle: string
  forgotPasswordResetSubtitle: string
  forgotPasswordConfirmAction: string
  forgotPasswordConfirmLoading: string
  forgotPasswordConfirmPasswordLabel: string
  forgotPasswordPasswordMismatch: string
  forgotPasswordIdentifierRequired: string
  forgotPasswordCodeInvalid: string
  forgotPasswordCodeExpired: string
  forgotPasswordCodeNotFound: string
  forgotPasswordAttemptsExceeded: string
  forgotPasswordAccountNotFound: string
  forgotPasswordPhoneMissing: string
  forgotPasswordTokenInvalid: string
  forgotPasswordRequestFailed: string
  invitedAccountTitle: string
  invitedAccountSubtitle: string
  invitedAccountCodeTitle: string
  invitedAccountCodeSubtitle: string
  invitedAccountResetTitle: string
  invitedAccountResetSubtitle: string
  invitedAccountPreparingLoading: string
  invitedAccountRequestFailed: string
  invitedAccountTokenInvalid: string
  invitedAccountPhoneMissing: string
  invitedAccountPhoneUnverified: string
  continueOfflineAction: string
  goToRegister: string
  goToLogin: string
  signOut: string
  signInLabel: string
  logoutLabel: string
  addGroup: string
  newGroupTitle: string
  editGroupTitle: string
  groupActionsTitle: string
  groupActionsSubtitle: string
  leaveGroup: string
  deleteGroupForEveryone: string
  groupDeleteConfirmMessage: string
  groupLeaveMessage: string
  groupPlaceholder: string
  createGroup: string
  save: string
  select: string
  cancel: string
  noGroupsTitle: string
  noGroupsSubtitle: string
  searchGroupsLabel: string
  noSearchResultsTitle: string
  noSearchResultsSubtitle: string
  homeHeroTitle: string
  homeHeroSubtitle: string
  groupFallbackTitle: string
  groupOverviewTitle: string
  groupOverviewSubtitle: string
  totalExpenseLabel: string
  membersLabel: string
  settlementsLabel: string
  openBalancesLabel: string
  needSecondMemberMessage: string
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
  groupCardsTitle: string
  groupCardsSubtitle: string
  addGroupCard: string
  editGroupCard: string
  noGroupCardsTitle: string
  noGroupCardsSubtitle: string
  cardOwnerLabel: string
  cardNumberLabel: string
  copyCardNumber: string
  cardCopied: string
  saveGroupCard: string
  saveGroupCardChanges: string
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
  memberSuggestionHint: string
  memberSuggestionLoading: string
  memberSuggestionEmpty: string
  memberSuggestionError: string
  memberCreatePromptTitle: string
  memberCreatePromptSubtitle: string
  memberCreateNameLabel: string
  memberCreateUsernameLabel: string
  memberCreatePasswordLabel: string
  memberCreateDefaultPassword: string
  memberCreateAction: string
  memberCreateFailed: string
  memberCreateSuccess: string
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
  accountPhoneLabel: string
  accountPhoneVerifiedLabel: string
  accountPhoneUnverifiedLabel: string
  syncTitle: string
  syncSubtitle: string
  syncOnline: string
  syncOffline: string
  syncNow: string
  syncInProgress: string
  syncLoginRequired: string
  syncConnectionIssue: string
  syncServerIssue: string
  notSyncedYet: string
  lastSyncLabel: string
  installAppTitle: string
  installAppBody: string
  installAppAction: string
  installAppDismiss: string
  iosInstallTitle: string
  iosInstallBody: string
  downloadApplicationTitle: string
  downloadApplicationSubtitle: string
  downloadPageTitle: string
  downloadPageErrorTitle: string
  downloadPageErrorBody: string
  downloadPageEmptyTitle: string
  downloadPageEmptySubtitle: string
  downloadVersionNotesTitle: string
  downloadVersionMetaTitle: string
  downloadStoresTitle: string
  downloadFromBazaar: string
  downloadFromMyket: string
  downloadDirect: string
  downloadVersionNameLabel: string
  downloadVersionCodeLabel: string
  downloadReleaseDateLabel: string
  downloadFileSizeLabel: string
  languageTitle: string
  languageSubtitle: string
  themeTitle: string
  themeSubtitle: string
  persianLabel: string
  englishLabel: string
  lightLabel: string
  darkLabel: string
  loading: string
  retry: string
  updateAvailableTitle: string
  updateRequiredTitle: string
  updateDefaultMessage: string
  updateNow: string
  updateLater: string
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
  passwordTooShort: 'رمز عبور باید حداقل ۸ کاراکتر باشد.',
  showPasswordLabel: 'نمایش رمز عبور',
  hidePasswordLabel: 'پنهان کردن رمز عبور',
  currentPasswordLabel: 'رمز عبور فعلی',
  currentPasswordRequired: 'رمز عبور فعلی را وارد کن.',
  currentPasswordInvalid: 'رمز عبور فعلی درست نیست.',
  newPasswordLabel: 'رمز عبور جدید',
  phoneVerificationTitle: 'تاییدیه شماره تلفن',
  phoneVerificationSubtitle: 'برای عملکرد سایت باید شماره تلفنت را وارد کنی.',
  phoneVerificationPhoneLabel: 'شماره موبایل',
  phoneVerificationPhonePlaceholder: '09120000000',
  phoneVerificationRequestAction: 'ارسال کد تایید',
  phoneVerificationRequestLoading: 'در حال ارسال کد...',
  phoneVerificationCodeLabel: 'کد تایید ارسال شده را وارد کن',
  phoneVerificationCodeSubtitle: 'برای استفاده از امکانات جدید سایت باید شماره تلفنت رو وارد کنی.',
  phoneVerificationVerifiedSubtitle: 'لطفا کد تایید ارسال‌شده را وارد کن.',
  phoneVerificationVerifyAction: 'تایید شماره تلفن',
  phoneVerificationVerifyLoading: 'در حال تایید...',
  phoneVerificationChangePhoneAction: 'تعویض شماره تلفن',
  phoneVerificationResendAction: 'ارسال مجدد کد',
  phoneVerificationResendLoading: 'در حال ارسال مجدد...',
  phoneVerificationResendCountdown: 'ارسال مجدد تا {seconds} ثانیه دیگر',
  phoneVerificationCodeSent: 'کد تایید برای شماره واردشده ارسال شد.',
  phoneVerificationInvalidPhone: 'شماره موبایل معتبر نیست.',
  phoneVerificationPhoneTaken: 'این شماره موبایل قبلا ثبت شده است.',
  phoneVerificationRateLimited: 'کمی صبر کن و دوباره برای دریافت کد تلاش کن.',
  phoneVerificationCodeInvalid: 'کد تایید واردشده درست نیست.',
  phoneVerificationCodeExpired: 'زمان این کد تمام شده است.',
  phoneVerificationCodeNotFound: 'کد تاییدی برای این شماره پیدا نشد.',
  phoneVerificationAttemptsExceeded: 'تعداد تلاش‌های وارد کردن کد بیش از حد مجاز شد.',
  phoneVerificationNotConfigured: 'امکان تایید شماره تلفن فعلا فعال نیست.',
  phoneVerificationSmsFailed: 'ارسال پیامک انجام نشد. دوباره تلاش کن.',
  changePasswordTitle: 'تغییر رمز عبور',
  changePasswordSubtitle: 'برای ادامه باید رمز عبور اولیه را عوض کنی.',
  changePasswordAction: 'ثبت رمز جدید',
  changePasswordLoading: 'در حال تغییر رمز...',
  changePasswordFailed: 'تغییر رمز عبور انجام نشد.',
  pendingInviteAcceptanceRequired: 'عضوهای {usernames} باید اول دعوت گروه را بپذیرند تا بتوانی این عملیات را انجام بدهی.',
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
  forgotPasswordAction: 'فراموشی رمز عبور',
  forgotPasswordTitle: 'بازیابی رمز عبور',
  forgotPasswordSubtitle: 'نام کاربری یا شماره موبایل را وارد کن تا کد تایید برای حساب تو ارسال شود.',
  forgotPasswordIdentifierLabel: 'نام کاربری یا شماره موبایل',
  forgotPasswordIdentifierPlaceholder: 'مثلا ali_user یا 09120000000',
  forgotPasswordRequestAction: 'ارسال کد بازیابی',
  forgotPasswordRequestLoading: 'در حال ارسال کد...',
  forgotPasswordCodeTitle: 'تایید کد پیامک',
  forgotPasswordCodeSubtitle: 'کد ۵ رقمی ارسال‌شده را وارد کن.',
  forgotPasswordVerifyAction: 'تایید کد',
  forgotPasswordVerifyLoading: 'در حال بررسی کد...',
  forgotPasswordResetTitle: 'رمز جدید را وارد کن',
  forgotPasswordResetSubtitle: 'بعد از ثبت رمز جدید مستقیم وارد حساب می‌شوی.',
  forgotPasswordConfirmAction: 'ثبت رمز جدید',
  forgotPasswordConfirmLoading: 'در حال تغییر رمز...',
  forgotPasswordConfirmPasswordLabel: 'تکرار رمز جدید',
  forgotPasswordPasswordMismatch: 'رمز جدید و تکرار آن یکسان نیستند.',
  forgotPasswordIdentifierRequired: 'نام کاربری یا شماره موبایل را وارد کن.',
  forgotPasswordCodeInvalid: 'کد بازیابی درست نیست.',
  forgotPasswordCodeExpired: 'زمان کد بازیابی تمام شده است.',
  forgotPasswordCodeNotFound: 'کد بازیابی پیدا نشد. دوباره درخواست بده.',
  forgotPasswordAttemptsExceeded: 'تعداد تلاش برای کد بازیابی بیش از حد مجاز شد.',
  forgotPasswordAccountNotFound: 'حسابی با این نام کاربری یا شماره موبایل پیدا نشد.',
  forgotPasswordPhoneMissing: 'برای این حساب شماره تلفنی ثبت نشده است. لطفا با پشتیبانی در ارتباط باش.',
  forgotPasswordTokenInvalid: 'نشست بازیابی رمز معتبر نیست. دوباره از ابتدا شروع کن.',
  forgotPasswordRequestFailed: 'بازیابی رمز عبور انجام نشد.',
  invitedAccountTitle: 'تکمیل ثبت‌نام',
  invitedAccountSubtitle: 'برای فعال شدن حساب دعوتی، شماره تلفن را تایید کن و رمز عبورت را بساز.',
  invitedAccountCodeTitle: 'تایید شماره تلفن',
  invitedAccountCodeSubtitle: 'کد تایید ارسال‌شده به شماره ثبت‌شده را وارد کن.',
  invitedAccountResetTitle: 'تعیین رمز عبور',
  invitedAccountResetSubtitle: 'بعد از ثبت رمز جدید مستقیم وارد حساب می‌شوی.',
  invitedAccountPreparingLoading: 'در حال آماده‌سازی...',
  invitedAccountRequestFailed: 'ورود به مسیر تکمیل ثبت‌نام انجام نشد.',
  invitedAccountTokenInvalid: 'لینک تکمیل ثبت‌نام معتبر نیست یا منقضی شده است.',
  invitedAccountPhoneMissing: 'برای این حساب شماره تلفنی ثبت نشده است.',
  invitedAccountPhoneUnverified: 'اول شماره تلفن این حساب را تایید کن.',
  continueOfflineAction: 'فعلاً آفلاین ادامه می‌دهم',
  goToRegister: 'حساب نداری؟ ثبت‌نام کن',
  goToLogin: 'حساب داری؟ وارد شو',
  signOut: 'خروج',
  signInLabel: 'ورود',
  logoutLabel: 'خروج از حساب',
  addGroup: 'افزودن گروه',
  newGroupTitle: 'گروه جدید',
  editGroupTitle: 'ویرایش گروه',
  groupActionsTitle: 'کارهای گروه',
  groupActionsSubtitle: 'یکی از این دو کار را انتخاب کن.',
  leaveGroup: 'ترک گروه',
  deleteGroupForEveryone: 'حذف برای همه',
  groupDeleteConfirmMessage: 'گروه برای همه پاک می‌شود.',
  groupLeaveMessage: 'فقط تو از گروه خارج می‌شوی.',
  groupPlaceholder: 'مثلا سفر شمال',
  createGroup: 'ساخت گروه',
  save: 'ذخیره',
  select: 'انتخاب',
  cancel: 'انصراف',
  noGroupsTitle: 'هنوز گروهی نداری',
  noGroupsSubtitle: 'از دکمه بالا یک گروه جدید بساز.',
  searchGroupsLabel: 'جست‌وجوی گروه‌ها',
  noSearchResultsTitle: 'گروهی پیدا نشد',
  noSearchResultsSubtitle: 'عبارت جست‌وجو را عوض کن یا گروه جدید بساز.',
  homeHeroTitle: 'خرج‌ها را آفلاین جمع کن',
  homeHeroSubtitle: 'برای هر سفر یا جمع، گروه بساز، اعضا را اضافه کن و بدهی‌ها را با حالت simplify ببین.',
  groupFallbackTitle: 'گروه',
  groupOverviewTitle: 'وضعیت کلی گروه',
  groupOverviewSubtitle: 'خرج‌ها، اعضا، تسویه‌ها و مانده‌های باز را از همین‌جا کنترل کن.',
  totalExpenseLabel: 'کل خرج',
  membersLabel: 'اعضا',
  settlementsLabel: 'تسویه‌ها',
  openBalancesLabel: 'مانده باز',
  needSecondMemberMessage: 'برای ثبت خرج یا تسویه حداقل دو عضو لازم است.',
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
  groupCardsTitle: 'شماره کارت‌ها',
  groupCardsSubtitle: 'شماره کارت اعضای این گروه را اینجا نگه دار و سریع کپی کن.',
  addGroupCard: 'افزودن شماره کارت',
  editGroupCard: 'ویرایش شماره کارت',
  noGroupCardsTitle: 'شماره کارتی ثبت نشده',
  noGroupCardsSubtitle: 'اولین شماره کارت گروه را اضافه کن.',
  cardOwnerLabel: 'به نام عضو',
  cardNumberLabel: 'شماره کارت',
  copyCardNumber: 'کپی شماره کارت',
  cardCopied: 'شماره کارت کپی شد.',
  saveGroupCard: 'ثبت شماره کارت',
  saveGroupCardChanges: 'ذخیره تغییرات',
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
  memberSuggestionHint: 'حداقل ۳ کاراکتر وارد کن تا پیشنهادها نمایش داده شوند.',
  memberSuggestionLoading: 'در حال جست‌وجوی کاربرها...',
  memberSuggestionEmpty: 'کاربر منطبقی پیدا نشد. می‌توانی نام کاربری را دستی کامل کنی.',
  memberSuggestionError: 'جست‌وجوی پیشنهادها انجام نشد. دوباره تلاش کن.',
  memberCreatePromptTitle: 'کاربر پیدا نشد',
  memberCreatePromptSubtitle: 'اگر کاربر هنوز حساب نساخته، همین حالا نام کاربری‌اش را بنویس؛ بعد از ثبت عضو می‌توانی حسابش را همان‌جا بسازی.',
  memberCreateNameLabel: 'نام کاربر جدید',
  memberCreateUsernameLabel: 'نام کاربری',
  memberCreatePasswordLabel: 'رمز عبور اولیه',
  memberCreateDefaultPassword: 'گذاشتن رمز پیش‌فرض 12345678',
  memberCreateAction: 'ساخت کاربر و افزودن',
  memberCreateFailed: 'ساخت کاربر جدید انجام نشد.',
  memberCreateSuccess: 'کاربر ساخته شد و به گروه اضافه شد.',
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
  accountPhoneLabel: 'شماره تلفن',
  accountPhoneVerifiedLabel: 'تایید شده',
  accountPhoneUnverifiedLabel: 'تایید نشده',
  syncTitle: 'همگام‌سازی',
  syncSubtitle: 'وضعیت اتصال و به‌روزرسانی اپ را از اینجا بررسی کن.',
  syncOnline: 'آنلاین',
  syncOffline: 'آفلاین',
  syncNow: 'بررسی دوباره',
  syncInProgress: 'در حال بررسی...',
  syncLoginRequired: 'برای همگام‌سازی اول وارد حساب شو.',
  syncConnectionIssue: 'اتصال اینترنت یا دسترسی به سرور برقرار نیست.',
  syncServerIssue: 'سرور پاسخ سالم نداد. کمی بعد دوباره تلاش کن.',
  notSyncedYet: 'هنوز بررسی‌ای ثبت نشده',
  lastSyncLabel: 'آخرین بررسی: {date}',
  installAppTitle: 'نصب اپ',
  installAppBody: 'برای دسترسی سریع‌تر و تجربه شبیه اپ، این وب‌اپ را به صفحه اصلی اضافه کن.',
  installAppAction: 'نصب اپ',
  installAppDismiss: 'بعداً',
  iosInstallTitle: 'افزودن به صفحه اصلی',
  iosInstallBody: 'در Safari روی Share بزن و بعد Add to Home Screen را انتخاب کن.',
  downloadApplicationTitle: 'دانلود اپلیکیشن',
  downloadApplicationSubtitle: 'لینک بازار، مایکت و دانلود مستقیم را در یک صفحه ببین.',
  downloadPageTitle: 'دانلود اپلیکیشن',
  downloadPageErrorTitle: 'بارگذاری اطلاعات دانلود انجام نشد',
  downloadPageErrorBody: 'اتصال به سرور برقرار نشد یا پاسخ معتبری دریافت نشد. چند لحظه بعد دوباره تلاش کن.',
  downloadPageEmptyTitle: 'لینک دانلودی ثبت نشده',
  downloadPageEmptySubtitle: 'بعداً دوباره سر بزن یا با پشتیبانی تماس بگیر.',
  downloadVersionNotesTitle: 'تغییرات نسخه جدید',
  downloadVersionMetaTitle: 'جزئیات نسخه',
  downloadStoresTitle: 'مسیرهای دانلود',
  downloadFromBazaar: 'دانلود از کافه بازار',
  downloadFromMyket: 'دانلود از مایکت',
  downloadDirect: 'دانلود مستقیم',
  downloadVersionNameLabel: 'نسخه',
  downloadVersionCodeLabel: 'کد نسخه',
  downloadReleaseDateLabel: 'تاریخ انتشار',
  downloadFileSizeLabel: 'حجم فایل',
  languageTitle: 'زبان',
  languageSubtitle: 'زبان نمایش رابط را انتخاب کن.',
  themeTitle: 'تم',
  themeSubtitle: 'بین ظاهر روشن و تیره جابه‌جا شو.',
  persianLabel: 'فارسی',
  englishLabel: 'English',
  lightLabel: 'روشن',
  darkLabel: 'تیره',
  loading: 'در حال بارگذاری...',
  retry: 'تلاش دوباره',
  updateAvailableTitle: 'نسخه جدید آماده است',
  updateRequiredTitle: 'برای ادامه باید به‌روزرسانی کنی',
  updateDefaultMessage: 'نسخه تازه اپ منتشر شده است. برای تجربه بهتر به صفحه دانلود برو.',
  updateNow: 'به‌روزرسانی',
  updateLater: 'بعداً',
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
  passwordTooShort: 'Password must be at least 8 characters.',
  showPasswordLabel: 'Show password',
  hidePasswordLabel: 'Hide password',
  currentPasswordLabel: 'Current password',
  currentPasswordRequired: 'Enter your current password.',
  currentPasswordInvalid: 'Current password is incorrect.',
  newPasswordLabel: 'New password',
  phoneVerificationTitle: 'Phone verification',
  phoneVerificationSubtitle: 'You must enter your phone number to keep using the website.',
  phoneVerificationPhoneLabel: 'Mobile number',
  phoneVerificationPhonePlaceholder: '09120000000',
  phoneVerificationRequestAction: 'Send verification code',
  phoneVerificationRequestLoading: 'Sending code...',
  phoneVerificationCodeLabel: 'Enter the sent verification code',
  phoneVerificationCodeSubtitle: 'Enter your phone number to use the latest features of the website.',
  phoneVerificationVerifiedSubtitle: 'Please enter the verification code that was sent to you.',
  phoneVerificationVerifyAction: 'Verify phone number',
  phoneVerificationVerifyLoading: 'Verifying...',
  phoneVerificationChangePhoneAction: 'Change phone number',
  phoneVerificationResendAction: 'Resend code',
  phoneVerificationResendLoading: 'Resending...',
  phoneVerificationResendCountdown: 'Resend available in {seconds}s',
  phoneVerificationCodeSent: 'The verification code has been sent.',
  phoneVerificationInvalidPhone: 'Enter a valid mobile number.',
  phoneVerificationPhoneTaken: 'This phone number is already registered.',
  phoneVerificationRateLimited: 'Please wait before requesting another code.',
  phoneVerificationCodeInvalid: 'The verification code is invalid.',
  phoneVerificationCodeExpired: 'This verification code has expired.',
  phoneVerificationCodeNotFound: 'No verification code was found for this number.',
  phoneVerificationAttemptsExceeded: 'Too many verification attempts were used.',
  phoneVerificationNotConfigured: 'Phone verification is not available right now.',
  phoneVerificationSmsFailed: 'The SMS could not be sent. Please try again.',
  changePasswordTitle: 'Change password',
  changePasswordSubtitle: 'You need to replace the temporary password before using the app.',
  changePasswordAction: 'Save new password',
  changePasswordLoading: 'Changing password...',
  changePasswordFailed: 'Could not change the password.',
  pendingInviteAcceptanceRequired: 'Members {usernames} must accept the group invite before you can complete this action.',
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
  forgotPasswordAction: 'Forgot password?',
  forgotPasswordTitle: 'Reset password',
  forgotPasswordSubtitle: 'Enter your username or mobile number to receive a verification code.',
  forgotPasswordIdentifierLabel: 'Username or mobile number',
  forgotPasswordIdentifierPlaceholder: 'For example ali_user or 09120000000',
  forgotPasswordRequestAction: 'Send reset code',
  forgotPasswordRequestLoading: 'Sending reset code...',
  forgotPasswordCodeTitle: 'Verify the SMS code',
  forgotPasswordCodeSubtitle: 'Enter the 5-digit code that was sent to you.',
  forgotPasswordVerifyAction: 'Verify code',
  forgotPasswordVerifyLoading: 'Checking code...',
  forgotPasswordResetTitle: 'Set a new password',
  forgotPasswordResetSubtitle: 'After saving the new password you will be signed in automatically.',
  forgotPasswordConfirmAction: 'Save new password',
  forgotPasswordConfirmLoading: 'Updating password...',
  forgotPasswordConfirmPasswordLabel: 'Confirm new password',
  forgotPasswordPasswordMismatch: 'The new password confirmation does not match.',
  forgotPasswordIdentifierRequired: 'Enter your username or mobile number.',
  forgotPasswordCodeInvalid: 'The reset code is invalid.',
  forgotPasswordCodeExpired: 'The reset code has expired.',
  forgotPasswordCodeNotFound: 'No reset code was found. Request a new one.',
  forgotPasswordAttemptsExceeded: 'Too many reset code attempts were used.',
  forgotPasswordAccountNotFound: 'No account was found for this username or mobile number.',
  forgotPasswordPhoneMissing: 'This account has no phone number on file. Please contact support.',
  forgotPasswordTokenInvalid: 'The reset session is no longer valid. Start again.',
  forgotPasswordRequestFailed: 'The password reset flow failed.',
  invitedAccountTitle: 'Complete your account',
  invitedAccountSubtitle: 'Verify the phone number and choose a password to activate this invited account.',
  invitedAccountCodeTitle: 'Verify phone number',
  invitedAccountCodeSubtitle: 'Enter the verification code sent to the saved phone number.',
  invitedAccountResetTitle: 'Choose a password',
  invitedAccountResetSubtitle: 'After saving the new password you will be signed in automatically.',
  invitedAccountPreparingLoading: 'Preparing...',
  invitedAccountRequestFailed: 'Opening the account completion flow failed.',
  invitedAccountTokenInvalid: 'This account completion link is invalid or expired.',
  invitedAccountPhoneMissing: 'No phone number is saved for this invited account.',
  invitedAccountPhoneUnverified: 'Verify the phone number before completing the account.',
  continueOfflineAction: 'Continue offline for now',
  goToRegister: 'No account? Register',
  goToLogin: 'Already have an account? Login',
  signOut: 'Sign out',
  signInLabel: 'Sign in',
  logoutLabel: 'Log out',
  addGroup: 'Add group',
  newGroupTitle: 'New group',
  editGroupTitle: 'Edit group',
  groupActionsTitle: 'Group actions',
  groupActionsSubtitle: 'Choose one action.',
  leaveGroup: 'Leave group',
  deleteGroupForEveryone: 'Delete for everyone',
  groupDeleteConfirmMessage: 'The group will be removed for everyone.',
  groupLeaveMessage: 'Only you will leave the group.',
  groupPlaceholder: 'For example, Summer trip',
  createGroup: 'Create group',
  save: 'Save',
  select: 'Select',
  cancel: 'Cancel',
  noGroupsTitle: 'You have no groups yet',
  noGroupsSubtitle: 'Create a new group from the top action.',
  searchGroupsLabel: 'Search groups',
  noSearchResultsTitle: 'No matching groups',
  noSearchResultsSubtitle: 'Try a different search or create a new group.',
  homeHeroTitle: 'Track shared costs cleanly',
  homeHeroSubtitle: 'Create a group for each trip or event, add members, and check simplified debts.',
  groupFallbackTitle: 'Group',
  groupOverviewTitle: 'Group overview',
  groupOverviewSubtitle: 'Control expenses, members, settlements, and open balances from here.',
  totalExpenseLabel: 'Total expenses',
  membersLabel: 'Members',
  settlementsLabel: 'Settlements',
  openBalancesLabel: 'Open balances',
  needSecondMemberMessage: 'You need at least two members before adding expenses or settlements.',
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
  groupCardsTitle: 'Card numbers',
  groupCardsSubtitle: 'Keep each member card handy and copy it instantly.',
  addGroupCard: 'Add card number',
  editGroupCard: 'Edit card number',
  noGroupCardsTitle: 'No card numbers yet',
  noGroupCardsSubtitle: 'Add the first card number for this group.',
  cardOwnerLabel: 'Member',
  cardNumberLabel: 'Card number',
  copyCardNumber: 'Copy card number',
  cardCopied: 'Card number copied.',
  saveGroupCard: 'Save card number',
  saveGroupCardChanges: 'Save changes',
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
  memberSuggestionHint: 'Type at least 3 characters to see suggestions.',
  memberSuggestionLoading: 'Searching users...',
  memberSuggestionEmpty: 'No matching users found. You can still finish the username manually.',
  memberSuggestionError: 'Could not load suggestions. Try again.',
  memberCreatePromptTitle: 'User not found',
  memberCreatePromptSubtitle: 'If the user has not created an account yet, type the username now. After tapping add member, you can create the account right here.',
  memberCreateNameLabel: 'New user name',
  memberCreateUsernameLabel: 'Username',
  memberCreatePasswordLabel: 'Initial password',
  memberCreateDefaultPassword: 'Use default password 12345678',
  memberCreateAction: 'Create user and add',
  memberCreateFailed: 'Could not create the new user.',
  memberCreateSuccess: 'User created and added to the group.',
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
  accountPhoneLabel: 'Phone number',
  accountPhoneVerifiedLabel: 'Verified',
  accountPhoneUnverifiedLabel: 'Unverified',
  syncTitle: 'Sync',
  syncSubtitle: 'Review connection and update status here.',
  syncOnline: 'Online',
  syncOffline: 'Offline',
  syncNow: 'Check again',
  syncInProgress: 'Checking...',
  syncLoginRequired: 'Sign in first to sync your account.',
  syncConnectionIssue: 'Internet or API connectivity is unavailable right now.',
  syncServerIssue: 'The server did not return a healthy response.',
  notSyncedYet: 'No check has been recorded yet',
  lastSyncLabel: 'Last check: {date}',
  installAppTitle: 'Install app',
  installAppBody: 'Add this web app to your home screen for faster access and an app-like experience.',
  installAppAction: 'Install',
  installAppDismiss: 'Later',
  iosInstallTitle: 'Add to Home Screen',
  iosInstallBody: 'In Safari, tap Share and then choose Add to Home Screen.',
  downloadApplicationTitle: 'Download app',
  downloadApplicationSubtitle: 'Open one page for Bazaar, Myket, and direct APK download.',
  downloadPageTitle: 'Download app',
  downloadPageErrorTitle: 'Could not load download details',
  downloadPageErrorBody: 'The page could not reach the server or received an invalid response. Please try again.',
  downloadPageEmptyTitle: 'No download link is available yet',
  downloadPageEmptySubtitle: 'Please check back later or contact support.',
  downloadVersionNotesTitle: 'What is new',
  downloadVersionMetaTitle: 'Version details',
  downloadStoresTitle: 'Download options',
  downloadFromBazaar: 'Get on Cafe Bazaar',
  downloadFromMyket: 'Get on Myket',
  downloadDirect: 'Direct download',
  downloadVersionNameLabel: 'Version',
  downloadVersionCodeLabel: 'Build',
  downloadReleaseDateLabel: 'Release date',
  downloadFileSizeLabel: 'File size',
  languageTitle: 'Language',
  languageSubtitle: 'Choose the interface language.',
  themeTitle: 'Theme',
  themeSubtitle: 'Switch between light and dark appearance.',
  persianLabel: 'فارسی',
  englishLabel: 'English',
  lightLabel: 'Light',
  darkLabel: 'Dark',
  loading: 'Loading...',
  retry: 'Retry',
  updateAvailableTitle: 'An update is available',
  updateRequiredTitle: 'Update required',
  updateDefaultMessage: 'A newer version of the app is available. Open the download page to update.',
  updateNow: 'Update now',
  updateLater: 'Later',
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
