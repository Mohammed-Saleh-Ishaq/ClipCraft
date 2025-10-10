// frontend/pages/_app.jsx
import "../styles/VideoEditor.css";
//import "../styles/globals.css"; // optional if you use Tailwind or other global css

export default function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
