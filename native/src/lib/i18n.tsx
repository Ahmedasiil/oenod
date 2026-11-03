// Languages: English, French, Arabic (right-to-left) and Spanish.
// English text is the key; a missing translation falls back to English.
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { I18nManager, Platform } from 'react-native';
import { getLocales } from 'expo-localization';
import { secure } from './secure';
import { useAuth } from './auth';
import { post } from './api';

export type Lang = 'en' | 'fr' | 'ar' | 'es';
export const LANGS: { code: Lang; name: string }[] = [
  { code: 'en', name: 'English' }, { code: 'fr', name: 'Français' }, { code: 'ar', name: 'العربية' }, { code: 'es', name: 'Español' },
];

type Dict = Record<string, string>;
const fr: Dict = {
  'Home': 'Accueil', 'Schedule': 'Horaire', 'Time off': 'Congés', 'Team': 'Équipe', 'Me': 'Moi',
  'Good morning': 'Bonjour', 'Good afternoon': 'Bon après-midi', 'Good evening': 'Bonsoir',
  'Sign in': 'Se connecter', 'Email': 'Courriel', 'Password': 'Mot de passe', 'Forgot your password?': 'Mot de passe oublié ?',
  'New to OENOD?': 'Nouveau sur OENOD ?', 'Start your free trial': 'Commencer l’essai gratuit', 'Run your whole business from your phone.': 'Gérez toute votre entreprise depuis votre téléphone.',
  'Two-step check': 'Vérification en deux étapes', 'Enter the 6-digit code from your authenticator app.': 'Entrez le code à 6 chiffres de votre application d’authentification.',
  'Code': 'Code', 'Verify': 'Vérifier', 'Enter your email and password.': 'Entrez votre courriel et votre mot de passe.', 'Could not sign in.': 'Connexion impossible.',
  'Time clock': 'Pointage', 'Clocked in': 'Au travail', 'Clocked out': 'Hors service', 'On break': 'En pause', 'Clock in': 'Pointer l’arrivée', 'Clock out': 'Pointer le départ',
  'Break': 'Pause', 'End break': 'Fin de pause', 'Since {t}': 'Depuis {t}', ' · break since {t}': ' · pause depuis {t}', 'Worked today': 'Travaillé aujourd’hui', 'Not clocked in yet today': 'Pas encore pointé aujourd’hui',
  'Next shift: {d}': 'Prochain quart : {d}', 'Not done': 'Non effectué', 'My hours and timesheet': 'Mes heures et feuille de temps',
  'Today': 'Aujourd’hui', 'Sales today': 'Ventes du jour', '{n} orders': '{n} commandes', 'Labor': 'Main-d’œuvre', 'This week': 'Cette semaine', 'vs last week': 'vs semaine dernière', '{p}% vs last week': '{p} % vs semaine dernière',
  '{n} working now': '{n} au travail', '{n} time-off requests to review': '{n} demandes de congé à examiner', '1 time-off request to review': '1 demande de congé à examiner',
  'Working now': 'Au travail maintenant', 'Nobody is clocked in right now.': 'Personne n’est au travail en ce moment.', 'Shifts today': 'Quarts du jour', 'No shifts scheduled today.': 'Aucun quart prévu aujourd’hui.',
  'Low stock': 'Stock bas', '{n} left · reorder at {r}': '{n} restants · commander à {r}', 'since {t}': 'depuis {t}', 'on break': 'en pause',
  'Your OENOD account': 'Votre compte OENOD', 'Your digital business card and badge are under Me. When an employer adds you to their team, your shifts and time clock show up here.': 'Votre carte professionnelle et votre badge sont sous Moi. Quand un employeur vous ajoute à son équipe, vos quarts et votre pointage apparaissent ici.',
  'Notifications': 'Notifications', 'Your upcoming shifts': 'Vos prochains quarts', 'Everyone, this week': 'Tout le monde, cette semaine', 'My shifts': 'Mes quarts', 'Everyone': 'Tout le monde',
  'Previous week': 'Semaine précédente', 'Next week': 'Semaine suivante', 'No shifts yet': 'Aucun quart pour l’instant',
  'When your manager publishes the schedule, your shifts show up here.': 'Quand votre gestionnaire publie l’horaire, vos quarts apparaissent ici.', 'No shifts in this week.': 'Aucun quart cette semaine.',
  '{n} shifts': '{n} quarts', '1 shift': '1 quart', 'Shift': 'Quart', 'Draft, not published': 'Brouillon, non publié',
  'Vacation, sick days and personal time': 'Vacances, maladie et congés personnels', 'Request time off': 'Demander un congé', 'To review': 'À examiner', 'Nothing waiting for your approval.': 'Rien n’attend votre approbation.',
  'My requests': 'Mes demandes', 'No requests yet': 'Aucune demande', 'Ask for vacation, a sick day or personal time. Your manager gets notified right away.': 'Demandez des vacances, un congé maladie ou personnel. Votre gestionnaire est averti aussitôt.',
  'Recently decided': 'Décisions récentes', 'Changes show on the website instantly.': 'Les changements apparaissent sur le site instantanément.',
  'Vacation': 'Vacances', 'Sick day': 'Congé maladie', 'Personal': 'Personnel', 'Unpaid': 'Sans solde', 'Pending': 'En attente', 'Approved': 'Approuvé', 'Denied': 'Refusé',
  'Deny': 'Refuser', 'Approve': 'Approuver', '{n} days': '{n} jours', '1 day': '1 jour', 'Type': 'Type', 'First day (YYYY-MM-DD)': 'Premier jour (AAAA-MM-JJ)', 'Last day (YYYY-MM-DD)': 'Dernier jour (AAAA-MM-JJ)',
  'Note for your manager (optional)': 'Note pour votre gestionnaire (facultatif)', 'Send request': 'Envoyer la demande', 'Use dates like 2026-12-24.': 'Utilisez des dates comme 2026-12-24.',
  'The last day must be on or after the first day.': 'Le dernier jour doit être le même ou après le premier.', 'Your manager is notified and can approve it from the app or the website.': 'Votre gestionnaire est averti et peut l’approuver dans l’application ou sur le site.',
  'Your people': 'Votre équipe', '{n} people · {w} working now': '{n} personnes · {w} au travail', 'Search by name, role or location': 'Rechercher par nom, poste ou lieu', 'Search team': 'Rechercher dans l’équipe',
  'Team member': 'Membre de l’équipe', 'On leave': 'En congé', 'No one found': 'Personne trouvé', 'Try another search.': 'Essayez une autre recherche.', 'Add team members on the website.': 'Ajoutez des membres sur le site web.',
  'Add or edit people on oenod.com. Changes show here right away.': 'Ajoutez ou modifiez des personnes sur oenod.com. Les changements apparaissent ici aussitôt.', 'In · {t}': 'Arrivé · {t}',
  'Call': 'Appeler', 'Text': 'Texto', 'Phone': 'Téléphone', 'Hired': 'Embauché', 'Emergency contact': 'Contact d’urgence', 'No app account yet': 'Pas encore de compte', 'Active': 'Actif',
  'Upcoming shifts': 'Prochains quarts', 'No upcoming shifts.': 'Aucun quart à venir.', 'Recent time': 'Heures récentes', 'No time recorded yet.': 'Aucune heure enregistrée.', 'now': 'maintenant', 'Not found.': 'Introuvable.',
  'You\'re all caught up': 'Vous êtes à jour', 'New shifts, approvals and messages show up here.': 'Les nouveaux quarts, approbations et messages apparaissent ici.',
  'My hours': 'Mes heures', 'Last 7 days': '7 derniers jours', 'Last 31 days': '31 derniers jours', 'No hours yet': 'Aucune heure', 'Clock in from the Home tab and your hours appear here.': 'Pointez depuis l’onglet Accueil et vos heures apparaissent ici.', '{n} min break': 'pause de {n} min', 'Open': 'Ouvert',
  'Work badge': 'Badge', 'Business card': 'Carte professionnelle', 'Show this at the kiosk to clock in, or to prove you work here.': 'Présentez-le au kiosque pour pointer ou prouver que vous travaillez ici.',
  'Let people scan this to save your contact details.': 'Faites-le scanner pour partager vos coordonnées.', 'Share my card': 'Partager ma carte', 'More': 'Plus',
  'Open the full OENOD website': 'Ouvrir le site OENOD complet', 'Payroll, POS, invoices, reports and everything else': 'Paie, caisse, factures, rapports et tout le reste', 'Edit my card and resume': 'Modifier ma carte et mon CV',
  'Help and support': 'Aide et soutien', 'Privacy policy': 'Politique de confidentialité', 'Sign out': 'Se déconnecter', 'Sign out?': 'Se déconnecter ?', 'Sign out of OENOD on this device?': 'Se déconnecter d’OENOD sur cet appareil ?',
  'You will need your email and password to sign in again.': 'Il faudra votre courriel et votre mot de passe pour revenir.', 'Cancel': 'Annuler', 'OENOD member': 'Membre OENOD', 'Language': 'Langue',
  'Owner': 'Propriétaire', 'Admin': 'Administrateur', 'Manager': 'Gestionnaire', 'Employee': 'Employé', 'Try again': 'Réessayer', 'Could not load.': 'Chargement impossible.',
  'Restart the app to finish switching the layout direction.': 'Redémarrez l’application pour terminer le changement de sens d’affichage.',
};
const es: Dict = {
  'Home': 'Inicio', 'Schedule': 'Horario', 'Time off': 'Ausencias', 'Team': 'Equipo', 'Me': 'Yo',
  'Good morning': 'Buenos días', 'Good afternoon': 'Buenas tardes', 'Good evening': 'Buenas noches',
  'Sign in': 'Iniciar sesión', 'Email': 'Correo', 'Password': 'Contraseña', 'Forgot your password?': '¿Olvidaste tu contraseña?',
  'New to OENOD?': '¿Nuevo en OENOD?', 'Start your free trial': 'Empieza tu prueba gratis', 'Run your whole business from your phone.': 'Dirige todo tu negocio desde tu teléfono.',
  'Two-step check': 'Verificación en dos pasos', 'Enter the 6-digit code from your authenticator app.': 'Escribe el código de 6 dígitos de tu app de autenticación.',
  'Code': 'Código', 'Verify': 'Verificar', 'Enter your email and password.': 'Escribe tu correo y contraseña.', 'Could not sign in.': 'No se pudo iniciar sesión.',
  'Time clock': 'Reloj de asistencia', 'Clocked in': 'Trabajando', 'Clocked out': 'Fuera de turno', 'On break': 'En descanso', 'Clock in': 'Marcar entrada', 'Clock out': 'Marcar salida',
  'Break': 'Descanso', 'End break': 'Terminar descanso', 'Since {t}': 'Desde {t}', ' · break since {t}': ' · descanso desde {t}', 'Worked today': 'Trabajado hoy', 'Not clocked in yet today': 'Aún no marcaste entrada hoy',
  'Next shift: {d}': 'Próximo turno: {d}', 'Not done': 'No se hizo', 'My hours and timesheet': 'Mis horas y hoja de tiempo',
  'Today': 'Hoy', 'Sales today': 'Ventas de hoy', '{n} orders': '{n} pedidos', 'Labor': 'Mano de obra', 'This week': 'Esta semana', 'vs last week': 'vs semana pasada', '{p}% vs last week': '{p} % vs semana pasada',
  '{n} working now': '{n} trabajando', '{n} time-off requests to review': '{n} solicitudes de ausencia por revisar', '1 time-off request to review': '1 solicitud de ausencia por revisar',
  'Working now': 'Trabajando ahora', 'Nobody is clocked in right now.': 'Nadie está trabajando ahora.', 'Shifts today': 'Turnos de hoy', 'No shifts scheduled today.': 'No hay turnos hoy.',
  'Low stock': 'Poco inventario', '{n} left · reorder at {r}': 'quedan {n} · pedir en {r}', 'since {t}': 'desde {t}', 'on break': 'en descanso',
  'Your OENOD account': 'Tu cuenta OENOD', 'Your digital business card and badge are under Me. When an employer adds you to their team, your shifts and time clock show up here.': 'Tu tarjeta digital y tu credencial están en Yo. Cuando un empleador te agregue a su equipo, tus turnos y tu reloj aparecerán aquí.',
  'Notifications': 'Notificaciones', 'Your upcoming shifts': 'Tus próximos turnos', 'Everyone, this week': 'Todos, esta semana', 'My shifts': 'Mis turnos', 'Everyone': 'Todos',
  'Previous week': 'Semana anterior', 'Next week': 'Semana siguiente', 'No shifts yet': 'Aún no hay turnos',
  'When your manager publishes the schedule, your shifts show up here.': 'Cuando tu gerente publique el horario, tus turnos aparecerán aquí.', 'No shifts in this week.': 'No hay turnos esta semana.',
  '{n} shifts': '{n} turnos', '1 shift': '1 turno', 'Shift': 'Turno', 'Draft, not published': 'Borrador, no publicado',
  'Vacation, sick days and personal time': 'Vacaciones, enfermedad y días personales', 'Request time off': 'Pedir ausencia', 'To review': 'Por revisar', 'Nothing waiting for your approval.': 'Nada espera tu aprobación.',
  'My requests': 'Mis solicitudes', 'No requests yet': 'Aún no hay solicitudes', 'Ask for vacation, a sick day or personal time. Your manager gets notified right away.': 'Pide vacaciones, un día por enfermedad o personal. Tu gerente recibe un aviso al instante.',
  'Recently decided': 'Decididas recientemente', 'Changes show on the website instantly.': 'Los cambios aparecen en el sitio al instante.',
  'Vacation': 'Vacaciones', 'Sick day': 'Enfermedad', 'Personal': 'Personal', 'Unpaid': 'Sin goce de sueldo', 'Pending': 'Pendiente', 'Approved': 'Aprobada', 'Denied': 'Rechazada',
  'Deny': 'Rechazar', 'Approve': 'Aprobar', '{n} days': '{n} días', '1 day': '1 día', 'Type': 'Tipo', 'First day (YYYY-MM-DD)': 'Primer día (AAAA-MM-DD)', 'Last day (YYYY-MM-DD)': 'Último día (AAAA-MM-DD)',
  'Note for your manager (optional)': 'Nota para tu gerente (opcional)', 'Send request': 'Enviar solicitud', 'Use dates like 2026-12-24.': 'Usa fechas como 2026-12-24.',
  'The last day must be on or after the first day.': 'El último día debe ser igual o posterior al primero.', 'Your manager is notified and can approve it from the app or the website.': 'Tu gerente recibe un aviso y puede aprobarla desde la app o el sitio.',
  'Your people': 'Tu gente', '{n} people · {w} working now': '{n} personas · {w} trabajando', 'Search by name, role or location': 'Buscar por nombre, puesto o lugar', 'Search team': 'Buscar en el equipo',
  'Team member': 'Miembro del equipo', 'On leave': 'De permiso', 'No one found': 'No se encontró a nadie', 'Try another search.': 'Prueba otra búsqueda.', 'Add team members on the website.': 'Agrega miembros en el sitio web.',
  'Add or edit people on oenod.com. Changes show here right away.': 'Agrega o edita personas en oenod.com. Los cambios aparecen aquí al instante.', 'In · {t}': 'Entró · {t}',
  'Call': 'Llamar', 'Text': 'Mensaje', 'Phone': 'Teléfono', 'Hired': 'Contratado', 'Emergency contact': 'Contacto de emergencia', 'No app account yet': 'Aún sin cuenta', 'Active': 'Activo',
  'Upcoming shifts': 'Próximos turnos', 'No upcoming shifts.': 'No hay próximos turnos.', 'Recent time': 'Horas recientes', 'No time recorded yet.': 'Aún no hay horas registradas.', 'now': 'ahora', 'Not found.': 'No encontrado.',
  'You\'re all caught up': 'Estás al día', 'New shifts, approvals and messages show up here.': 'Los nuevos turnos, aprobaciones y mensajes aparecen aquí.',
  'My hours': 'Mis horas', 'Last 7 days': 'Últimos 7 días', 'Last 31 days': 'Últimos 31 días', 'No hours yet': 'Aún no hay horas', 'Clock in from the Home tab and your hours appear here.': 'Marca entrada desde Inicio y tus horas aparecerán aquí.', '{n} min break': 'descanso de {n} min', 'Open': 'Abierto',
  'Work badge': 'Credencial', 'Business card': 'Tarjeta de presentación', 'Show this at the kiosk to clock in, or to prove you work here.': 'Muéstrala en el quiosco para marcar o para probar que trabajas aquí.',
  'Let people scan this to save your contact details.': 'Deja que la escaneen para guardar tus datos.', 'Share my card': 'Compartir mi tarjeta', 'More': 'Más',
  'Open the full OENOD website': 'Abrir el sitio completo de OENOD', 'Payroll, POS, invoices, reports and everything else': 'Nómina, caja, facturas, informes y todo lo demás', 'Edit my card and resume': 'Editar mi tarjeta y currículum',
  'Help and support': 'Ayuda y soporte', 'Privacy policy': 'Política de privacidad', 'Sign out': 'Cerrar sesión', 'Sign out?': '¿Cerrar sesión?', 'Sign out of OENOD on this device?': '¿Cerrar sesión de OENOD en este dispositivo?',
  'You will need your email and password to sign in again.': 'Necesitarás tu correo y contraseña para volver a entrar.', 'Cancel': 'Cancelar', 'OENOD member': 'Miembro de OENOD', 'Language': 'Idioma',
  'Owner': 'Propietario', 'Admin': 'Administrador', 'Manager': 'Gerente', 'Employee': 'Empleado', 'Try again': 'Reintentar', 'Could not load.': 'No se pudo cargar.',
  'Restart the app to finish switching the layout direction.': 'Reinicia la app para terminar de cambiar la dirección del diseño.',
};
const ar: Dict = {
  'Home': 'الرئيسية', 'Schedule': 'الجدول', 'Time off': 'الإجازات', 'Team': 'الفريق', 'Me': 'حسابي',
  'Good morning': 'صباح الخير', 'Good afternoon': 'مساء الخير', 'Good evening': 'مساء الخير',
  'Sign in': 'تسجيل الدخول', 'Email': 'البريد الإلكتروني', 'Password': 'كلمة المرور', 'Forgot your password?': 'نسيت كلمة المرور؟',
  'New to OENOD?': 'جديد على OENOD؟', 'Start your free trial': 'ابدأ تجربتك المجانية', 'Run your whole business from your phone.': 'أدر عملك بالكامل من هاتفك.',
  'Two-step check': 'التحقق بخطوتين', 'Enter the 6-digit code from your authenticator app.': 'أدخل الرمز المكوّن من 6 أرقام من تطبيق المصادقة.',
  'Code': 'الرمز', 'Verify': 'تحقق', 'Enter your email and password.': 'أدخل بريدك الإلكتروني وكلمة المرور.', 'Could not sign in.': 'تعذّر تسجيل الدخول.',
  'Time clock': 'ساعة الدوام', 'Clocked in': 'في الدوام', 'Clocked out': 'خارج الدوام', 'On break': 'في استراحة', 'Clock in': 'تسجيل الحضور', 'Clock out': 'تسجيل الانصراف',
  'Break': 'استراحة', 'End break': 'إنهاء الاستراحة', 'Since {t}': 'منذ {t}', ' · break since {t}': ' · استراحة منذ {t}', 'Worked today': 'ساعات العمل اليوم', 'Not clocked in yet today': 'لم تسجّل حضورك اليوم بعد',
  'Next shift: {d}': 'المناوبة التالية: {d}', 'Not done': 'لم يتم', 'My hours and timesheet': 'ساعاتي وسجل الدوام',
  'Today': 'اليوم', 'Sales today': 'مبيعات اليوم', '{n} orders': '{n} طلب', 'Labor': 'تكلفة العمالة', 'This week': 'هذا الأسبوع', 'vs last week': 'مقارنة بالأسبوع الماضي', '{p}% vs last week': '{p}٪ مقارنة بالأسبوع الماضي',
  '{n} working now': '{n} في الدوام الآن', '{n} time-off requests to review': '{n} طلبات إجازة بانتظار المراجعة', '1 time-off request to review': 'طلب إجازة واحد بانتظار المراجعة',
  'Working now': 'في الدوام الآن', 'Nobody is clocked in right now.': 'لا أحد في الدوام الآن.', 'Shifts today': 'مناوبات اليوم', 'No shifts scheduled today.': 'لا توجد مناوبات اليوم.',
  'Low stock': 'مخزون منخفض', '{n} left · reorder at {r}': 'المتبقي {n} · أعد الطلب عند {r}', 'since {t}': 'منذ {t}', 'on break': 'في استراحة',
  'Your OENOD account': 'حسابك في OENOD', 'Your digital business card and badge are under Me. When an employer adds you to their team, your shifts and time clock show up here.': 'بطاقة عملك الرقمية وشارتك في قسم حسابي. عندما يضيفك صاحب عمل إلى فريقه تظهر مناوباتك وساعة الدوام هنا.',
  'Notifications': 'الإشعارات', 'Your upcoming shifts': 'مناوباتك القادمة', 'Everyone, this week': 'الجميع، هذا الأسبوع', 'My shifts': 'مناوباتي', 'Everyone': 'الجميع',
  'Previous week': 'الأسبوع السابق', 'Next week': 'الأسبوع التالي', 'No shifts yet': 'لا توجد مناوبات بعد',
  'When your manager publishes the schedule, your shifts show up here.': 'عندما ينشر مديرك الجدول تظهر مناوباتك هنا.', 'No shifts in this week.': 'لا توجد مناوبات هذا الأسبوع.',
  '{n} shifts': '{n} مناوبات', '1 shift': 'مناوبة واحدة', 'Shift': 'مناوبة', 'Draft, not published': 'مسودة، غير منشورة',
  'Vacation, sick days and personal time': 'إجازات سنوية ومرضية وشخصية', 'Request time off': 'طلب إجازة', 'To review': 'بانتظار المراجعة', 'Nothing waiting for your approval.': 'لا شيء بانتظار موافقتك.',
  'My requests': 'طلباتي', 'No requests yet': 'لا توجد طلبات بعد', 'Ask for vacation, a sick day or personal time. Your manager gets notified right away.': 'اطلب إجازة سنوية أو مرضية أو شخصية. يصل إشعار إلى مديرك فورًا.',
  'Recently decided': 'تم البت فيها مؤخرًا', 'Changes show on the website instantly.': 'تظهر التغييرات على الموقع فورًا.',
  'Vacation': 'إجازة سنوية', 'Sick day': 'إجازة مرضية', 'Personal': 'شخصية', 'Unpaid': 'بدون أجر', 'Pending': 'قيد الانتظار', 'Approved': 'موافق عليها', 'Denied': 'مرفوضة',
  'Deny': 'رفض', 'Approve': 'موافقة', '{n} days': '{n} أيام', '1 day': 'يوم واحد', 'Type': 'النوع', 'First day (YYYY-MM-DD)': 'اليوم الأول (YYYY-MM-DD)', 'Last day (YYYY-MM-DD)': 'اليوم الأخير (YYYY-MM-DD)',
  'Note for your manager (optional)': 'ملاحظة لمديرك (اختياري)', 'Send request': 'إرسال الطلب', 'Use dates like 2026-12-24.': 'استخدم تواريخ مثل 2026-12-24.',
  'The last day must be on or after the first day.': 'يجب أن يكون اليوم الأخير في نفس اليوم الأول أو بعده.', 'Your manager is notified and can approve it from the app or the website.': 'يصل إشعار إلى مديرك ويمكنه الموافقة من التطبيق أو الموقع.',
  'Your people': 'فريقك', '{n} people · {w} working now': '{n} أشخاص · {w} في الدوام', 'Search by name, role or location': 'ابحث بالاسم أو الوظيفة أو الموقع', 'Search team': 'البحث في الفريق',
  'Team member': 'عضو في الفريق', 'On leave': 'في إجازة', 'No one found': 'لم يتم العثور على أحد', 'Try another search.': 'جرّب بحثًا آخر.', 'Add team members on the website.': 'أضف أعضاء الفريق من الموقع.',
  'Add or edit people on oenod.com. Changes show here right away.': 'أضف الأشخاص أو عدّلهم على oenod.com. تظهر التغييرات هنا فورًا.', 'In · {t}': 'حاضر · {t}',
  'Call': 'اتصال', 'Text': 'رسالة', 'Phone': 'الهاتف', 'Hired': 'تاريخ التوظيف', 'Emergency contact': 'جهة اتصال للطوارئ', 'No app account yet': 'لا يوجد حساب بعد', 'Active': 'نشط',
  'Upcoming shifts': 'المناوبات القادمة', 'No upcoming shifts.': 'لا توجد مناوبات قادمة.', 'Recent time': 'الساعات الأخيرة', 'No time recorded yet.': 'لا توجد ساعات مسجلة بعد.', 'now': 'الآن', 'Not found.': 'غير موجود.',
  'You\'re all caught up': 'لا جديد', 'New shifts, approvals and messages show up here.': 'تظهر هنا المناوبات الجديدة والموافقات والرسائل.',
  'My hours': 'ساعاتي', 'Last 7 days': 'آخر 7 أيام', 'Last 31 days': 'آخر 31 يومًا', 'No hours yet': 'لا توجد ساعات بعد', 'Clock in from the Home tab and your hours appear here.': 'سجّل حضورك من الرئيسية وستظهر ساعاتك هنا.', '{n} min break': 'استراحة {n} دقيقة', 'Open': 'مفتوح',
  'Work badge': 'شارة العمل', 'Business card': 'بطاقة العمل', 'Show this at the kiosk to clock in, or to prove you work here.': 'اعرضها عند جهاز الحضور لتسجيل الدوام أو لإثبات أنك تعمل هنا.',
  'Let people scan this to save your contact details.': 'دع الآخرين يمسحونها لحفظ بيانات التواصل معك.', 'Share my card': 'مشاركة بطاقتي', 'More': 'المزيد',
  'Open the full OENOD website': 'فتح موقع OENOD الكامل', 'Payroll, POS, invoices, reports and everything else': 'الرواتب ونقاط البيع والفواتير والتقارير وكل شيء آخر', 'Edit my card and resume': 'تعديل بطاقتي وسيرتي الذاتية',
  'Help and support': 'المساعدة والدعم', 'Privacy policy': 'سياسة الخصوصية', 'Sign out': 'تسجيل الخروج', 'Sign out?': 'تسجيل الخروج؟', 'Sign out of OENOD on this device?': 'تسجيل الخروج من OENOD على هذا الجهاز؟',
  'You will need your email and password to sign in again.': 'ستحتاج إلى بريدك وكلمة المرور لتسجيل الدخول مجددًا.', 'Cancel': 'إلغاء', 'OENOD member': 'عضو في OENOD', 'Language': 'اللغة',
  'Owner': 'المالك', 'Admin': 'مسؤول', 'Manager': 'مدير', 'Employee': 'موظف', 'Try again': 'حاول مجددًا', 'Could not load.': 'تعذّر التحميل.',
  'Restart the app to finish switching the layout direction.': 'أعد تشغيل التطبيق لإكمال تغيير اتجاه العرض.',
};
const DICTS: Record<Lang, Dict> = { en: {}, fr, ar, es };

let current: Lang = 'en';
export const lang = () => current;
export const locale = () => ({ en: 'en-CA', fr: 'fr-CA', ar: 'ar', es: 'es' }[current]);

/** Translate. English is the key; {name} placeholders are filled from vars. */
export function t(s: string, vars?: Record<string, string | number>): string {
  let out = DICTS[current][s] ?? s;
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
  return out;
}

const KEY = 'oenod.lang';
const detect = (): Lang => {
  try {
    const code = getLocales()[0]?.languageCode || 'en';
    return (['en', 'fr', 'ar', 'es'] as Lang[]).includes(code as Lang) ? (code as Lang) : 'en';
  } catch { return 'en'; }
};

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => Promise<boolean> }>({ lang: 'en', setLang: async () => false });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [l, setL] = useState<Lang>(() => { current = detect(); return current; });
  useEffect(() => {
    secure.get(KEY).then((v) => { if (v && v in DICTS && v !== current) { current = v as Lang; setL(current); applyDirection(current); } }).catch(() => {});
    applyDirection(current);
  }, []);
  // The account's saved language (set on the website or another phone) wins.
  const { session } = useAuth();
  const serverLang = session?.user?.lang as Lang | null | undefined;
  useEffect(() => {
    if (serverLang && serverLang in DICTS && serverLang !== current) { current = serverLang; setL(serverLang); secure.set(KEY, serverLang).catch(() => {}); applyDirection(serverLang); }
  }, [serverLang]);
  const setLang = useCallback(async (next: Lang) => {
    current = next;
    setL(next);
    await secure.set(KEY, next);
    if (session?.user) post('/api/account/prefs', { lang: next }).catch(() => {});
    return applyDirection(next);
  }, [session?.user]);
  // key={l} re-renders every screen in the new language.
  return <Ctx.Provider value={{ lang: l, setLang }}><React.Fragment key={l}>{children}</React.Fragment></Ctx.Provider>;
}
export const useLang = () => useContext(Ctx);

/** Arabic reads right to left. Returns true when the app must restart to flip the layout. */
function applyDirection(l: Lang): boolean {
  const rtl = l === 'ar';
  if (Platform.OS === 'web') {
    try { document.documentElement.dir = rtl ? 'rtl' : 'ltr'; document.documentElement.lang = l; } catch { /* ignore */ }
    return false;
  }
  if (I18nManager.isRTL === rtl) return false;
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
  return true;
}
