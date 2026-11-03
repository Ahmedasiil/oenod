import { Redirect } from 'expo-router';

// Unknown links (and /m/index.html on the website preview) open the app's home screen.
export default function NotFound() {
  return <Redirect href="/" />;
}
