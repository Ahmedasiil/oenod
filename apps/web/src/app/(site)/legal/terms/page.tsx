import { LegalPage } from "../legal-bits";

export const metadata = { title: "Terms of Service" };

export default function Terms() {
  return (
    <LegalPage title="Terms of Service" updated="[date]">
      <p>These terms are an agreement between you and [Company legal name] ("OENOD", "we") for the OENOD website, apps and services. If you use OENOD for a business, you accept them for that business and confirm you are allowed to.</p>
      <h2>Accounts</h2>
      <ul>
        <li>Give accurate information and keep your password and two-step codes private. You are responsible for activity in your account.</li>
        <li>Owners and admins control who can use their workspace and what each person can see.</li>
        <li>Tell us right away at [security email] if you think your account has been misused.</li>
      </ul>
      <h2>Subscriptions and trials</h2>
      <ul>
        <li>Paid plans renew automatically each month or year until cancelled. You can cancel any time in Settings; access continues to the end of the paid period.</li>
        <li>Free trials last 14 days. We'll ask for payment details before a paid plan starts.</li>
        <li>Prices may change with at least [30] days' notice. Taxes are added where required.</li>
        <li>Refunds: [describe your refund policy].</li>
      </ul>
      <h2>Your data</h2>
      <p>You own the content you put into OENOD. You give us permission to host and process it only to provide the service to you. You can export it at any time, and we delete it after your account closes as described in the Privacy Policy.</p>
      <h2>Acceptable use</h2>
      <p>Don't use OENOD to break the law, send spam or messages to people who haven't agreed to them, post misleading jobs or ads, upload malware, try to get into other accounts, or overload or copy the service. We may suspend accounts that put others at risk.</p>
      <h2>Jobs, ads and company profiles</h2>
      <p>Employers are responsible for their job posts and hiring decisions, and must follow employment and anti-discrimination laws. Advertisers are responsible for their ads, which we may review, reject or remove. Ad spend is prepaid from your ad wallet and is non-refundable once used. The verified badge means we checked a company's identity, not that we endorse it.</p>
      <h2>Academy</h2>
      <p>Courses are for your own learning. Don't copy, resell or share paid content. Certificates show that you finished a course on OENOD; they are not a government licence or accredited qualification unless the course says so.</p>
      <h2>AI features</h2>
      <p>AI suggestions can be wrong. Review them before relying on them, especially for pay, tax, legal or safety decisions. Your company chooses which AI actions run on their own and which wait for approval. Payroll, payments, campaigns, access changes, hiring and contracts always wait for a person.</p>
      <h2>Payroll and tax</h2>
      <p>OENOD calculates pay and deductions from the information and rates you provide. You remain responsible for checking results and filing and remitting with the authorities on time.</p>
      <h2>Plugins and integrations</h2>
      <p>Third-party plugins and connected apps are provided by their developers under their own terms. Only install those you trust; you can remove them at any time.</p>
      <h2>Availability</h2>
      <p>We work to keep OENOD running and post planned maintenance and incidents on our status page. [Describe any uptime commitment, or state that none is offered.]</p>
      <h2>Liability</h2>
      <p>To the extent the law allows, OENOD is provided "as is", and our total liability for any claim is limited to the amount you paid us in the 12 months before it. We are not liable for indirect or consequential losses. Nothing here limits rights you have under consumer protection law.</p>
      <h2>Ending the agreement</h2>
      <p>You can stop using OENOD and close your account at any time. We may end or suspend access for a serious breach of these terms, with notice where reasonable.</p>
      <h2>Law and disputes</h2>
      <p>These terms are governed by the laws of [province/state and country], and disputes go to the courts of [city], unless your local law says otherwise.</p>
      <h2>Contact</h2>
      <p>[Company legal name], [mailing address], [support email].</p>
    </LegalPage>
  );
}
