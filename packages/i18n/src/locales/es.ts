import type { Dict } from "./en";
import type { DeepPartial } from "../types";

const es: DeepPartial<Dict> = {
  common: {
    save: "Guardar", cancel: "Cancelar", delete: "Eliminar", edit: "Editar", add: "Añadir", create: "Crear", close: "Cerrar", back: "Atrás", next: "Siguiente", done: "Listo",
    search: "Buscar", filter: "Filtrar", export: "Exportar", import: "Importar", download: "Descargar", upload: "Subir", share: "Compartir", copy: "Copiar", copied: "Copiado",
    loading: "Cargando…", saving: "Guardando…", saved: "Guardado", retry: "Reintentar", yes: "Sí", no: "No", all: "Todo", none: "Ninguno", more: "Más", seeAll: "Ver todo",
    today: "Hoy", yesterday: "Ayer", tomorrow: "Mañana", thisWeek: "Esta semana", thisMonth: "Este mes", date: "Fecha", time: "Hora", status: "Estado",
    name: "Nombre", email: "Correo", phone: "Teléfono", address: "Dirección", notes: "Notas", total: "Total", amount: "Importe", actions: "Acciones",
    approve: "Aprobar", reject: "Rechazar", submit: "Enviar", send: "Enviar", open: "Abrir", view: "Ver", details: "Detalles", settings: "Ajustes",
    required: "Obligatorio", optional: "Opcional", noResults: "Aún no hay nada aquí", language: "Idioma", signOut: "Cerrar sesión", help: "Ayuda",
    verified: "Verificado", sponsored: "Patrocinado", free: "Gratis", new: "Nuevo", poweredBy: "Con la tecnología de OENOD",
  },
  nav: {
    home: "Inicio", features: "Funciones", pricing: "Precios", jobs: "Empleos", academy: "Academia", directory: "Negocios", developers: "Desarrolladores",
    status: "Estado", download: "Descargar", signIn: "Iniciar sesión", startFree: "Prueba gratis", dashboard: "Panel", admin: "Super admin", myAccount: "Mi cuenta",
    notifications: "Notificaciones", security: "Seguridad",
  },
  modules: {
    overview: "Resumen", ai: "Gerente de negocio con IA", live: "Mapa en vivo", people: "Personal y RR. HH.", recruiting: "Reclutamiento y empleos", time: "Asistencia y horas",
    scheduling: "Turnos", leave: "Permisos y beneficios", payroll: "Nómina", crm: "CRM", sales: "Presupuestos y facturas", support: "Mesa de ayuda", bookings: "Reservas",
    accounting: "Contabilidad", expenses: "Gastos", pos: "Punto de venta", inventory: "Inventario", purchasing: "Compras", projects: "Proyectos",
    fieldservice: "Servicio en campo", fleet: "GPS de flota", assets: "Activos y mantenimiento", safety: "Calidad y seguridad", compliance: "Documentos y cumplimiento",
    marketing: "Marketing", reviews: "Reseñas y reputación", loyalty: "Fidelidad y recompensas", academy: "Academia", chat: "Chat del equipo", reports: "Informes",
    monitors: "Monitoreo y alertas", integrations: "Integraciones", developers: "Desarrolladores y API", settings: "Ajustes", me: "Mi trabajo",
  },
  auth: {
    signInTitle: "Bienvenido de nuevo", signInSub: "Inicia sesión en tu cuenta de OENOD", signUpTitle: "Empieza tu prueba gratis", signUpSub: "14 días gratis. Sin tarjeta.",
    email: "Correo de trabajo", password: "Contraseña", newPassword: "Nueva contraseña", fullName: "Nombre completo", company: "Nombre de la empresa",
    forgot: "¿Olvidaste tu contraseña?", noAccount: "¿Nuevo en OENOD?", haveAccount: "¿Ya tienes cuenta?", createAccount: "Crear cuenta",
    resetTitle: "Restablece tu contraseña", resetSent: "Si ese correo tiene una cuenta, te enviamos un enlace para restablecerla.",
    twoFactorTitle: "Inicio de sesión en dos pasos", twoFactorSub: "Introduce el código de 6 dígitos de tu app de autenticación.", useRecovery: "Usar un código de recuperación",
    passwordHint: "Al menos 10 caracteres. Una frase corta funciona bien.", consentMarketing: "Envíenme consejos y novedades de OENOD. Puedo darme de baja cuando quiera.",
    terms: "Al continuar aceptas los Términos y la Política de privacidad.", locked: "Por tu seguridad, el inicio de sesión está pausado unos minutos.",
  },
  security: {
    title: "Seguridad", twoFactor: "Inicio de sesión en dos pasos", twoFactorOn: "Activado", twoFactorOff: "Desactivado", turnOn: "Activar", turnOff: "Desactivar",
    scanQr: "Escanea este código QR con Google Authenticator, Microsoft Authenticator o 1Password y escribe el código de 6 dígitos.",
    recoveryCodes: "Códigos de recuperación", recoveryHelp: "Guárdalos en un lugar seguro. Cada uno funciona una vez si pierdes el teléfono.",
    devices: "Dispositivos conectados", thisDevice: "Este dispositivo", signOutDevice: "Cerrar sesión", signOutOthers: "Cerrar sesión en los demás dispositivos",
    changePassword: "Cambiar contraseña", activity: "Actividad reciente", score: "Puntuación de seguridad", recommendations: "Recomendaciones",
    require2fa: "Exigir dos pasos a todos", ipAllowlist: "Redes permitidas", sessionLength: "Mantener sesión iniciada (días)",
  },
  me: { shifts: "Turnos", clock: "Fichar", assistant: "Asistente", upcoming: "Próximos", swap: "Cambiar o ceder", keepShift: "Mantener este turno", swapAsked: "Cambio solicitado", hoursWorked: "Horas trabajadas", scheduled: "Programado", onTheClock: "Trabajando",
    greetingMorning: "Buenos días", greetingAfternoon: "Buenas tardes", greetingEvening: "Buenas noches",
    clockIn: "Fichar entrada", clockOut: "Fichar salida", startBreak: "Iniciar descanso", endBreak: "Terminar descanso", onBreak: "En descanso", clockedIn: "Trabajando", clockedOut: "Sin fichar",
    outsideZone: "Estás fuera del área de trabajo. Acércate para fichar.", nextShift: "Próximo turno", noShift: "No hay turnos próximos",
    mySchedule: "Mis turnos", myPay: "Mi pago", payslips: "Recibos de nómina", hours: "Horas", timesheet: "Hoja de horas", leave: "Permisos", requestLeave: "Pedir permiso",
    training: "Formación", certificates: "Certificados", myTasks: "Mis tareas", openShifts: "Turnos libres", pickUp: "Tomar", announcements: "Anuncios",
    documents: "Mis documentos", profile: "Mi perfil", jobs: "Empleos", inventory: "Inventario", marketing: "Marketing",
  },
  welcome: {
    title: "Así va tu día", tip: "Consejo", quickActions: "Acciones rápidas", aiSuggests: "La IA sugiere", weather: "Clima", nearYou: "Cerca de ti",
    setupTitle: "Configuremos tu negocio", setupSub: "Unos pasos y OENOD estará listo para tu equipo.",
  },
  status: {
    active: "Activo", inactive: "Inactivo", draft: "Borrador", pending: "Pendiente", approved: "Aprobado", rejected: "Rechazado", paid: "Pagado", overdue: "Vencido",
    open: "Abierto", closed: "Cerrado", inProgress: "En curso", done: "Hecho", cancelled: "Cancelado", scheduled: "Programado", live: "Activo", paused: "En pausa",
    onTrack: "En plazo", atRisk: "En riesgo", offTrack: "Retrasado",
  },
  maintenance: {
    title: "Volvemos enseguida", message: "OENOD se está actualizando. Todo volverá en breve.", backAround: "Regreso previsto hacia las {time}",
    readOnly: "OENOD está en modo solo lectura por una breve actualización. Puedes mirar, pero los cambios están pausados.",
    updateTitle: "Actualización necesaria", updateMessage: "Hay una nueva versión de OENOD. Actualiza para continuar.", updateNow: "Actualizar ahora",
    moduleMaintenance: "Esta sección está en mantenimiento. Vuelve pronto.",
  },
  errors: {
    generic: "Algo salió mal. Inténtalo de nuevo.", network: "Sin conexión. Reintentaremos cuando vuelvas a estar en línea.", notFound: "No encontramos esa página.",
    forbidden: "No tienes acceso a esta sección. Pídele acceso a tu responsable.", signInAgain: "Vuelve a iniciar sesión.", tooMany: "Demasiados intentos. Espera un momento.",
  },
  jobs: {
    title: "Encuentra tu próximo empleo", search: "Puesto, habilidad o empresa", location: "Ciudad o código postal", remote: "Remoto", apply: "Postularme", applied: "Solicitud enviada",
    noAccount: "No necesitas cuenta para postularte", saveJob: "Guardar", alert: "Avísame de empleos similares", posted: "Publicado {when}", salary: "Salario",
  },
  academy: {
    title: "Academia OENOD", sub: "Cursos prácticos para dueños de negocio y equipos", enroll: "Empezar curso", continue: "Continuar", buy: "Comprar curso", pass: "Pase Academia",
    passSub: "Todos los cursos de pago, un solo precio", lessons: "{count} lecciones", hours: "{count} horas", certificate: "Incluye certificado", preview: "Vista previa gratis",
    completed: "Completado", verifyCertificate: "Verificar un certificado", certificateId: "ID del certificado",
  },
  directory: {
    title: "Descubre negocios locales", follow: "Seguir", following: "Siguiendo", contact: "Contactar", website: "Sitio web", directions: "Cómo llegar",
    hours: "Horario", services: "Servicios", reviews: "Reseñas", about: "Acerca de", verifiedBusiness: "Negocio verificado",
  },
  ads: { sponsored: "Patrocinado", whyThisAd: "¿Por qué veo este anuncio?", hide: "Ocultar anuncio", manager: "Administrador de anuncios", newCampaign: "Nuevo anuncio", budget: "Presupuesto", wallet: "Saldo publicitario" },
  email: { footer: "Recibes este mensaje porque tienes una cuenta o aceptaste recibir noticias de {brand}.", unsubscribe: "Darse de baja", sentWith: "Enviado con OENOD" },
  ai: { hello: "¿En qué puedo ayudarte, {name}?", sub: "Pregunta por tus turnos, horas, pago o tiempo libre.", approvalNote: "Los cambios de pago, personal o dinero siempre esperan a un responsable.", placeholder: "Pregunta lo que quieras sobre tu negocio…", thinking: "Pensando…", waitingApproval: "Esperando tu aprobación", done: "Hecho", blocked: "No permitido por tus reglas", emergencyStop: "Parada de emergencia", simulation: "Modo simulación" },
};
export default es;
