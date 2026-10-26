import { LegalPage } from "../legal-bits";

export const metadata = { title: "Privacy Policy" };

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy" updated="[date]">
      <p>This policy explains how [Company legal name] ("OENOD", "we") collects, uses and protects personal information when you use the OENOD website, apps and services. Contact us at [privacy email] or [mailing address] with any question.</p>
      <h2>Two roles</h2>
      <p>For your own account, and for visitors, job applicants and learners using our public pages, we decide how information is used. For information a business stores in its OENOD workspace (its customers, employees, invoices and so on), that business is in charge and we process it on their instructions. If you are a customer or employee of a business that uses OENOD, contact that business first.</p>
      <h2>What we collect</h2>
      <ul>
        <li>Account details: name, email, password (stored only as a hash), phone, company and preferences.</li>
        <li>Content you add: records, files, messages, job applications, résumés and course progress.</li>
        <li>Location, only when an employer turns on time clock or fleet tracking and you agree on your device.</li>
        <li>Usage and device information: pages used, IP address, browser, device and approximate location, to keep the service secure and working.</li>
        <li>Payment details are handled by our payment provider (Stripe). We don't store full card numbers.</li>
      </ul>
      <h2>How we use it</h2>
      <ul>
        <li>To provide, secure and improve the service, and to support you.</li>
        <li>To run the AI features you choose to use. Business data sent to AI providers is not used to train their public models under our agreements with them [confirm with each provider].</li>
        <li>To send service messages such as receipts, security alerts and important changes.</li>
        <li>To send marketing only when you have agreed. Every marketing message has an unsubscribe link, and we honour requests within 10 business days, as Canada's Anti-Spam Legislation (CASL) requires.</li>
        <li>To show ads on public pages. Ads are clearly labelled "Sponsored" and are targeted by page, city and industry, not by tracking you across other websites.</li>
      </ul>
      <h2>Sharing</h2>
      <p>We don't sell personal information. We share it only with service providers that help us run OENOD (hosting, email, payments, AI, maps) under contracts that protect it, with integrations a business chooses to connect, when the law requires it, or as part of a business transfer with notice to you. When you apply to a job, your application goes to that employer.</p>
      <h2>Where it is stored</h2>
      <p>Data is stored in [country/region]. Some providers may process it in other countries, including the United States, with protections required by law.</p>
      <h2>How long we keep it</h2>
      <p>We keep information while your account is active and as long as needed for the purposes above, or as the law requires (for example, payroll and tax records). A business can delete its workspace data at any time; backups are cleared within [30] days.</p>
      <h2>Your rights</h2>
      <p>Depending on where you live (for example under PIPEDA in Canada, GDPR in Europe or state laws in the United States), you can ask to access, correct, download or delete your information, withdraw consent, or object to some uses. Write to [privacy email]. You can also complain to your local privacy regulator, such as the Office of the Privacy Commissioner of Canada.</p>
      <h2>Security</h2>
      <p>We use encryption in transit and for sensitive data at rest, two-step sign-in, role-based access, audit logs and regular reviews. No system is perfectly secure. If a breach puts you at real risk of significant harm, we will tell you and the regulator as the law requires.</p>
      <h2>Children</h2>
      <p>OENOD is not meant for children under [16]. Academy courses for younger learners must be taken through a parent, guardian or school account.</p>
      <h2>Cookies</h2>
      <p>We use essential cookies to keep you signed in and secure, and to remember your language. [List any analytics cookies and how to turn them off.]</p>
      <h2>Changes</h2>
      <p>We'll post any changes here and tell account holders by email before important changes take effect.</p>
    </LegalPage>
  );
}
