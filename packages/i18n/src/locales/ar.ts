import type { Dict } from "./en";
import type { DeepPartial } from "../types";

// Arabic (right-to-left). Modern Standard Arabic.
const ar: DeepPartial<Dict> = {
  common: {
    save: "حفظ", cancel: "إلغاء", delete: "حذف", edit: "تعديل", add: "إضافة", create: "إنشاء", close: "إغلاق", back: "رجوع", next: "التالي", done: "تم",
    search: "بحث", filter: "تصفية", export: "تصدير", import: "استيراد", download: "تنزيل", upload: "رفع", share: "مشاركة", copy: "نسخ", copied: "تم النسخ",
    loading: "جارٍ التحميل…", saving: "جارٍ الحفظ…", saved: "تم الحفظ", retry: "حاول مرة أخرى", yes: "نعم", no: "لا", all: "الكل", none: "لا شيء", more: "المزيد", seeAll: "عرض الكل",
    today: "اليوم", yesterday: "أمس", tomorrow: "غدًا", thisWeek: "هذا الأسبوع", thisMonth: "هذا الشهر", date: "التاريخ", time: "الوقت", status: "الحالة",
    name: "الاسم", email: "البريد الإلكتروني", phone: "الهاتف", address: "العنوان", notes: "ملاحظات", total: "الإجمالي", amount: "المبلغ", actions: "إجراءات",
    approve: "موافقة", reject: "رفض", submit: "إرسال", send: "إرسال", open: "فتح", view: "عرض", details: "التفاصيل", settings: "الإعدادات",
    required: "مطلوب", optional: "اختياري", noResults: "لا يوجد شيء هنا بعد", language: "اللغة", signOut: "تسجيل الخروج", help: "مساعدة",
    verified: "موثّق", sponsored: "إعلان ممول", free: "مجاني", new: "جديد", poweredBy: "بدعم من OENOD",
  },
  nav: {
    home: "الرئيسية", features: "المزايا", pricing: "الأسعار", jobs: "الوظائف", academy: "الأكاديمية", directory: "الأنشطة التجارية", developers: "المطوّرون",
    status: "حالة الخدمة", download: "تنزيل", signIn: "تسجيل الدخول", startFree: "ابدأ مجانًا", dashboard: "لوحة التحكم", admin: "المشرف العام", myAccount: "حسابي",
    notifications: "الإشعارات", security: "الأمان",
  },
  modules: {
    overview: "نظرة عامة", ai: "مدير الأعمال بالذكاء الاصطناعي", live: "الخريطة المباشرة", people: "الموظفون والموارد البشرية", recruiting: "التوظيف والوظائف", time: "الوقت والحضور",
    scheduling: "الجداول", leave: "الإجازات والمزايا", payroll: "الرواتب", crm: "إدارة العملاء", sales: "عروض الأسعار والفواتير", support: "مكتب الدعم", bookings: "الحجوزات",
    accounting: "المحاسبة", expenses: "المصروفات", pos: "نقاط البيع", inventory: "المخزون", purchasing: "المشتريات", projects: "المشاريع",
    fieldservice: "الخدمة الميدانية", fleet: "تتبع الأسطول", assets: "الأصول والصيانة", safety: "الجودة والسلامة", compliance: "المستندات والامتثال",
    marketing: "التسويق", reviews: "التقييمات والسمعة", loyalty: "الولاء والمكافآت", academy: "الأكاديمية", chat: "دردشة الفريق", reports: "التقارير",
    monitors: "المراقبة والتنبيهات", integrations: "التكاملات", developers: "المطوّرون وواجهة API", settings: "الإعدادات", me: "عملي",
  },
  auth: {
    signInTitle: "مرحبًا بعودتك", signInSub: "سجّل الدخول إلى حسابك في OENOD", signUpTitle: "ابدأ تجربتك المجانية", signUpSub: "14 يومًا مجانًا. لا حاجة لبطاقة.",
    email: "بريد العمل", password: "كلمة المرور", newPassword: "كلمة مرور جديدة", fullName: "الاسم الكامل", company: "اسم الشركة",
    forgot: "نسيت كلمة المرور؟", noAccount: "جديد على OENOD؟", haveAccount: "لديك حساب بالفعل؟", createAccount: "إنشاء حساب",
    resetTitle: "إعادة تعيين كلمة المرور", resetSent: "إذا كان لهذا البريد حساب، فرابط إعادة التعيين في طريقه إليك.",
    twoFactorTitle: "تسجيل الدخول بخطوتين", twoFactorSub: "أدخل الرمز المكوّن من 6 أرقام من تطبيق المصادقة.", useRecovery: "استخدم رمز استرداد بدلًا من ذلك",
    passwordHint: "10 أحرف على الأقل. جملة قصيرة خيار جيد.", consentMarketing: "أرسلوا لي نصائح وأخبار OENOD. يمكنني إلغاء الاشتراك في أي وقت.",
    terms: "بالمتابعة فإنك توافق على الشروط وسياسة الخصوصية.", locked: "حفاظًا على أمانك، تم إيقاف تسجيل الدخول لبضع دقائق.",
  },
  security: {
    title: "الأمان", twoFactor: "تسجيل الدخول بخطوتين", twoFactorOn: "مفعّل", twoFactorOff: "غير مفعّل", turnOn: "تفعيل", turnOff: "إيقاف",
    scanQr: "امسح رمز QR هذا باستخدام Google Authenticator أو Microsoft Authenticator أو 1Password، ثم أدخل الرمز المكوّن من 6 أرقام.",
    recoveryCodes: "رموز الاسترداد", recoveryHelp: "احتفظ بها في مكان آمن. كل رمز يعمل مرة واحدة إذا فقدت هاتفك.",
    devices: "الأجهزة المسجّلة", thisDevice: "هذا الجهاز", signOutDevice: "تسجيل الخروج", signOutOthers: "تسجيل الخروج من كل الأجهزة الأخرى",
    changePassword: "تغيير كلمة المرور", activity: "النشاط الأخير", score: "درجة الأمان", recommendations: "التوصيات",
    require2fa: "إلزام الجميع بتسجيل الدخول بخطوتين", ipAllowlist: "الشبكات المسموح بها", sessionLength: "البقاء مسجّلًا لمدة (أيام)",
  },
  me: { shifts: "المناوبات", clock: "الدوام", assistant: "المساعد", upcoming: "القادمة", swap: "تبديل أو تنازل", keepShift: "الاحتفاظ بهذه المناوبة", swapAsked: "تم طلب التبديل", hoursWorked: "ساعات العمل", scheduled: "مجدول", onTheClock: "في الدوام",
    greetingMorning: "صباح الخير", greetingAfternoon: "مساء الخير", greetingEvening: "مساء الخير",
    clockIn: "تسجيل الحضور", clockOut: "تسجيل الانصراف", startBreak: "بدء الاستراحة", endBreak: "إنهاء الاستراحة", onBreak: "في استراحة", clockedIn: "في العمل", clockedOut: "لم يتم تسجيل الحضور",
    outsideZone: "أنت خارج منطقة العمل. اقترب لتسجيل الحضور.", nextShift: "المناوبة التالية", noShift: "لا توجد مناوبات قادمة",
    mySchedule: "جدولي", myPay: "راتبي", payslips: "قسائم الراتب", hours: "الساعات", timesheet: "سجل الساعات", leave: "الإجازات", requestLeave: "طلب إجازة",
    training: "التدريب", certificates: "الشهادات", myTasks: "مهامي", openShifts: "مناوبات متاحة", pickUp: "استلام", announcements: "الإعلانات",
    documents: "مستنداتي", profile: "ملفي الشخصي", jobs: "الوظائف", inventory: "المخزون", marketing: "التسويق",
  },
  welcome: {
    title: "هذا يومك", tip: "نصيحة", quickActions: "إجراءات سريعة", aiSuggests: "يقترح الذكاء الاصطناعي", weather: "الطقس", nearYou: "بالقرب منك",
    setupTitle: "لنُعدّ نشاطك التجاري", setupSub: "خطوات قليلة ويصبح OENOD جاهزًا لفريقك.",
  },
  status: {
    active: "نشط", inactive: "غير نشط", draft: "مسودة", pending: "قيد الانتظار", approved: "موافق عليه", rejected: "مرفوض", paid: "مدفوع", overdue: "متأخر",
    open: "مفتوح", closed: "مغلق", inProgress: "قيد التنفيذ", done: "منجز", cancelled: "ملغى", scheduled: "مجدول", live: "مباشر", paused: "متوقف مؤقتًا",
    onTrack: "في المسار", atRisk: "معرّض للخطر", offTrack: "متأخر عن الخطة",
  },
  maintenance: {
    title: "سنعود قريبًا", message: "يتم تحديث OENOD الآن. سيعود كل شيء خلال وقت قصير.", backAround: "العودة المتوقعة نحو {time}",
    readOnly: "OENOD في وضع القراءة فقط لفترة تحديث قصيرة. يمكنك التصفح، لكن التعديلات متوقفة مؤقتًا.",
    updateTitle: "التحديث مطلوب", updateMessage: "إصدار جديد من OENOD جاهز. يرجى التحديث للمتابعة.", updateNow: "حدّث الآن",
    moduleMaintenance: "هذا القسم قيد الصيانة. يرجى العودة لاحقًا.",
  },
  errors: {
    generic: "حدث خطأ ما. يرجى المحاولة مرة أخرى.", network: "أنت غير متصل. سنعيد المحاولة عند عودة الاتصال.", notFound: "لم نتمكن من العثور على هذه الصفحة.",
    forbidden: "ليست لديك صلاحية لهذا القسم. اطلبها من مديرك.", signInAgain: "يرجى تسجيل الدخول مرة أخرى.", tooMany: "محاولات كثيرة. يرجى الانتظار قليلًا.",
  },
  jobs: {
    title: "اعثر على وظيفتك القادمة", search: "المسمّى الوظيفي أو المهارة أو الشركة", location: "المدينة أو الرمز البريدي", remote: "عن بُعد", apply: "قدّم الآن", applied: "تم إرسال الطلب",
    noAccount: "لا حاجة لحساب للتقديم", saveJob: "حفظ الوظيفة", alert: "راسلني بوظائف مشابهة", posted: "نُشرت {when}", salary: "الأجر",
  },
  academy: {
    title: "أكاديمية OENOD", sub: "دورات عملية لأصحاب الأعمال وفرقهم", enroll: "ابدأ الدورة", continue: "متابعة", buy: "شراء الدورة", pass: "اشتراك الأكاديمية",
    passSub: "كل الدورات المدفوعة بسعر واحد", lessons: "{count} دروس", hours: "{count} ساعات", certificate: "تشمل شهادة", preview: "معاينة مجانية",
    completed: "مكتملة", verifyCertificate: "التحقق من شهادة", certificateId: "رقم الشهادة",
  },
  directory: {
    title: "اكتشف الأنشطة التجارية المحلية", follow: "متابعة", following: "تتابعه", contact: "تواصل", website: "الموقع الإلكتروني", directions: "الاتجاهات",
    hours: "ساعات العمل", services: "الخدمات", reviews: "التقييمات", about: "نبذة", verifiedBusiness: "نشاط تجاري موثّق",
  },
  ads: { sponsored: "إعلان ممول", whyThisAd: "لماذا أرى هذا الإعلان؟", hide: "إخفاء الإعلان", manager: "مدير الإعلانات", newCampaign: "إعلان جديد", budget: "الميزانية", wallet: "رصيد الإعلانات" },
  email: { footer: "تصلك هذه الرسالة لأن لديك حسابًا أو وافقت على تلقي أخبار {brand}.", unsubscribe: "إلغاء الاشتراك", sentWith: "أُرسلت عبر OENOD" },
  ai: { hello: "كيف أساعدك يا {name}؟", sub: "اسأل عن مناوباتك أو ساعاتك أو راتبك أو إجازاتك.", approvalNote: "أي تغيير في الرواتب أو الموظفين أو الأموال ينتظر موافقة المدير دائمًا.", placeholder: "اسأل أي شيء عن نشاطك التجاري…", thinking: "جارٍ التفكير…", waitingApproval: "بانتظار موافقتك", done: "تم", blocked: "غير مسموح وفق قواعدك", emergencyStop: "إيقاف طارئ", simulation: "وضع المحاكاة" },
};
export default ar;
