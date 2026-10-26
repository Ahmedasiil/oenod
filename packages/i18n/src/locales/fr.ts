import type { Dict } from "./en";
import type { DeepPartial } from "../types";

const fr: DeepPartial<Dict> = {
  common: {
    save: "Enregistrer", cancel: "Annuler", delete: "Supprimer", edit: "Modifier", add: "Ajouter", create: "Créer", close: "Fermer", back: "Retour", next: "Suivant", done: "Terminé",
    search: "Rechercher", filter: "Filtrer", export: "Exporter", import: "Importer", download: "Télécharger", upload: "Téléverser", share: "Partager", copy: "Copier", copied: "Copié",
    loading: "Chargement…", saving: "Enregistrement…", saved: "Enregistré", retry: "Réessayer", yes: "Oui", no: "Non", all: "Tout", none: "Aucun", more: "Plus", seeAll: "Tout voir",
    today: "Aujourd'hui", yesterday: "Hier", tomorrow: "Demain", thisWeek: "Cette semaine", thisMonth: "Ce mois-ci", date: "Date", time: "Heure", status: "Statut",
    name: "Nom", email: "Courriel", phone: "Téléphone", address: "Adresse", notes: "Notes", total: "Total", amount: "Montant", actions: "Actions",
    approve: "Approuver", reject: "Refuser", submit: "Soumettre", send: "Envoyer", open: "Ouvrir", view: "Voir", details: "Détails", settings: "Paramètres",
    required: "Obligatoire", optional: "Facultatif", noResults: "Rien pour l'instant", language: "Langue", signOut: "Se déconnecter", help: "Aide",
    verified: "Vérifié", sponsored: "Commandité", free: "Gratuit", new: "Nouveau", poweredBy: "Propulsé par OENOD",
  },
  nav: {
    home: "Accueil", features: "Fonctionnalités", pricing: "Tarifs", jobs: "Emplois", academy: "Académie", directory: "Entreprises", developers: "Développeurs",
    status: "État du service", download: "Télécharger", signIn: "Se connecter", startFree: "Essai gratuit", dashboard: "Tableau de bord", admin: "Super admin", myAccount: "Mon compte",
    notifications: "Notifications", security: "Sécurité",
  },
  modules: {
    overview: "Vue d'ensemble", ai: "Gestionnaire d'affaires IA", live: "Carte en direct", people: "Personnel et RH", recruiting: "Recrutement et emplois", time: "Temps et présences",
    scheduling: "Horaires", leave: "Congés et avantages", payroll: "Paie", crm: "CRM", sales: "Soumissions et factures", support: "Service d'assistance", bookings: "Réservations",
    accounting: "Comptabilité", expenses: "Dépenses", pos: "Point de vente", inventory: "Inventaire", purchasing: "Achats", projects: "Projets",
    fieldservice: "Service sur le terrain", fleet: "GPS de flotte", assets: "Actifs et entretien", safety: "Qualité et sécurité", compliance: "Documents et conformité",
    marketing: "Marketing", reviews: "Avis et réputation", loyalty: "Fidélité et récompenses", academy: "Académie", chat: "Clavardage d'équipe", reports: "Rapports",
    monitors: "Surveillance et alertes", integrations: "Intégrations", developers: "Développeurs et API", settings: "Paramètres", me: "Mon travail",
  },
  auth: {
    signInTitle: "Bon retour", signInSub: "Connectez-vous à votre compte OENOD", signUpTitle: "Commencez votre essai gratuit", signUpSub: "14 jours gratuits. Aucune carte requise.",
    email: "Courriel professionnel", password: "Mot de passe", newPassword: "Nouveau mot de passe", fullName: "Nom complet", company: "Nom de l'entreprise",
    forgot: "Mot de passe oublié?", noAccount: "Nouveau sur OENOD?", haveAccount: "Vous avez déjà un compte?", createAccount: "Créer un compte",
    resetTitle: "Réinitialiser votre mot de passe", resetSent: "Si ce courriel a un compte, un lien de réinitialisation est en route.",
    twoFactorTitle: "Connexion en deux étapes", twoFactorSub: "Entrez le code à 6 chiffres de votre application d'authentification.", useRecovery: "Utiliser plutôt un code de récupération",
    passwordHint: "Au moins 10 caractères. Une courte phrase fonctionne bien.", consentMarketing: "Envoyez-moi des conseils et des nouvelles d'OENOD. Je peux me désabonner en tout temps.",
    terms: "En continuant, vous acceptez les Conditions et la Politique de confidentialité.", locked: "Pour votre sécurité, la connexion est suspendue quelques minutes.",
  },
  security: {
    title: "Sécurité", twoFactor: "Connexion en deux étapes", twoFactorOn: "Activée", twoFactorOff: "Désactivée", turnOn: "Activer", turnOff: "Désactiver",
    scanQr: "Balayez ce code QR avec Google Authenticator, Microsoft Authenticator ou 1Password, puis entrez le code à 6 chiffres.",
    recoveryCodes: "Codes de récupération", recoveryHelp: "Gardez-les en lieu sûr. Chacun fonctionne une seule fois si vous perdez votre téléphone.",
    devices: "Appareils connectés", thisDevice: "Cet appareil", signOutDevice: "Déconnecter", signOutOthers: "Déconnecter tous les autres appareils",
    changePassword: "Changer le mot de passe", activity: "Activité récente", score: "Cote de sécurité", recommendations: "Recommandations",
    require2fa: "Exiger la connexion en deux étapes pour tous", ipAllowlist: "Réseaux autorisés", sessionLength: "Rester connecté pendant (jours)",
  },
  me: { shifts: "Quarts", clock: "Pointage", assistant: "Assistant", upcoming: "À venir", swap: "Échanger ou céder", keepShift: "Garder ce quart", swapAsked: "Échange demandé", hoursWorked: "Heures travaillées", scheduled: "Planifié", onTheClock: "En service",
    greetingMorning: "Bonjour", greetingAfternoon: "Bon après-midi", greetingEvening: "Bonsoir",
    clockIn: "Pointer l'arrivée", clockOut: "Pointer le départ", startBreak: "Commencer la pause", endBreak: "Terminer la pause", onBreak: "En pause", clockedIn: "Au travail", clockedOut: "Pas pointé",
    outsideZone: "Vous êtes hors de la zone de travail. Rapprochez-vous pour pointer.", nextShift: "Prochain quart", noShift: "Aucun quart à venir",
    mySchedule: "Mon horaire", myPay: "Ma paie", payslips: "Talons de paie", hours: "Heures", timesheet: "Feuille de temps", leave: "Congés", requestLeave: "Demander un congé",
    training: "Formation", certificates: "Certificats", myTasks: "Mes tâches", openShifts: "Quarts disponibles", pickUp: "Prendre", announcements: "Annonces",
    documents: "Mes documents", profile: "Mon profil", jobs: "Emplois", inventory: "Inventaire", marketing: "Marketing",
  },
  welcome: {
    title: "Voici votre journée", tip: "Conseil", quickActions: "Actions rapides", aiSuggests: "L'IA suggère", weather: "Météo", nearYou: "Près de vous",
    setupTitle: "Configurons votre entreprise", setupSub: "Quelques étapes et OENOD est prêt pour votre équipe.",
  },
  status: {
    active: "Actif", inactive: "Inactif", draft: "Brouillon", pending: "En attente", approved: "Approuvé", rejected: "Refusé", paid: "Payé", overdue: "En retard",
    open: "Ouvert", closed: "Fermé", inProgress: "En cours", done: "Terminé", cancelled: "Annulé", scheduled: "Planifié", live: "En ligne", paused: "En pause",
    onTrack: "Dans les temps", atRisk: "À risque", offTrack: "En retard",
  },
  maintenance: {
    title: "Nous revenons bientôt", message: "OENOD fait peau neuve. Tout sera de retour sous peu.", backAround: "Retour prévu vers {time}",
    readOnly: "OENOD est en lecture seule pendant une courte mise à niveau. Vous pouvez consulter, mais les modifications sont suspendues.",
    updateTitle: "Mise à jour requise", updateMessage: "Une nouvelle version d'OENOD est prête. Veuillez mettre à jour pour continuer.", updateNow: "Mettre à jour",
    moduleMaintenance: "Cette section est en maintenance. Revenez bientôt.",
  },
  errors: {
    generic: "Un problème est survenu. Veuillez réessayer.", network: "Vous êtes hors ligne. Nous réessaierons dès votre retour en ligne.", notFound: "Page introuvable.",
    forbidden: "Vous n'avez pas accès à cette section. Demandez l'accès à votre gestionnaire.", signInAgain: "Veuillez vous reconnecter.", tooMany: "Trop de tentatives. Patientez un instant.",
  },
  jobs: {
    title: "Trouvez votre prochain emploi", search: "Poste, compétence ou entreprise", location: "Ville ou code postal", remote: "Télétravail", apply: "Postuler", applied: "Candidature envoyée",
    noAccount: "Aucun compte requis pour postuler", saveJob: "Sauvegarder", alert: "M'envoyer des offres semblables", posted: "Publié {when}", salary: "Salaire",
  },
  academy: {
    title: "Académie OENOD", sub: "Des cours pratiques pour les propriétaires et leurs équipes", enroll: "Commencer le cours", continue: "Continuer", buy: "Acheter le cours", pass: "Passe Académie",
    passSub: "Tous les cours payants, un seul prix", lessons: "{count} leçons", hours: "{count} heures", certificate: "Certificat inclus", preview: "Aperçu gratuit",
    completed: "Terminé", verifyCertificate: "Vérifier un certificat", certificateId: "Numéro du certificat",
  },
  directory: {
    title: "Découvrez les entreprises locales", follow: "Suivre", following: "Abonné", contact: "Contacter", website: "Site Web", directions: "Itinéraire",
    hours: "Heures d'ouverture", services: "Services", reviews: "Avis", about: "À propos", verifiedBusiness: "Entreprise vérifiée",
  },
  ads: { sponsored: "Commandité", whyThisAd: "Pourquoi cette annonce?", hide: "Masquer l'annonce", manager: "Gestionnaire d'annonces", newCampaign: "Nouvelle annonce", budget: "Budget", wallet: "Portefeuille publicitaire" },
  email: { footer: "Vous recevez ce message parce que vous avez un compte ou avez accepté d'avoir des nouvelles de {brand}.", unsubscribe: "Se désabonner", sentWith: "Envoyé avec OENOD" },
  ai: { hello: "Comment puis-je vous aider, {name} ?", sub: "Posez vos questions sur vos quarts, heures, paie ou congés.", approvalNote: "Les changements de paie, d'équipe ou d'argent attendent toujours un gestionnaire.", placeholder: "Posez une question sur votre entreprise…", thinking: "Réflexion…", waitingApproval: "En attente de votre approbation", done: "Terminé", blocked: "Non permis par vos règles", emergencyStop: "Arrêt d'urgence", simulation: "Mode simulation" },
};
export default fr;
