// App Store rules (Apple review 3.9.1, guideline 3.1.1 / 3.1.3(c)): the iPhone and iPad app is sign-in only for
// businesses that already use OENOD. No business sign-up, plans, prices or payment links inside the iOS app.
// Android and desktop are unchanged.
import { Platform } from 'react-native';

export const IOS_STORE = Platform.OS === 'ios';

// Website pages that sell or change a plan. The iOS app never opens them.
export const SALES_ROUTE = /^#?\/(upgrade|billing|plans?|pricing|checkout|subscribe|signup|start|trial|addons?|buy)(\/|$|\?)/i;

// Runs inside every OENOD page the iOS app shows: hides plan, price and buy buttons, and sends any
// sales page back to the start page.
export const IOS_WEB_GUARD = `(function(){try{
var css='.banner,a[href*="#/upgrade"],a[href*="#/billing"],a[href*="#/plans"],a[href*="#/pricing"],a[href*="#/checkout"],a[href*="#/signup"],a[href*="/pricing"],[data-upgrade],[data-buy],.acl1-lock-tag,.upsell,.pr-upsell{display:none!important}';
var s=document.createElement('style');s.id='ios-store-guard';s.textContent=css;(document.head||document.documentElement).appendChild(s);
var R=/^#\\/(upgrade|billing|plans?|pricing|checkout|subscribe|signup|start|trial|addons?|buy)(\\/|$|\\?)/i;
function chk(){if(R.test(location.hash))location.replace(location.pathname+location.search+'#/');}
window.addEventListener('hashchange',chk);chk();
document.documentElement.classList.add('ios-store');
}catch(e){}})();true;`;
