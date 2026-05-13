import Script from "next/script";

// Microsoft Clarity — heatmaps + session recordings, gratuit, RGPD-friendly.
// Set NEXT_PUBLIC_CLARITY_ID in env to enable. Get id at https://clarity.microsoft.com
export function Clarity() {
  const id = process.env.NEXT_PUBLIC_CLARITY_ID;
  if (!id) return null;
  return (
    <Script id="clarity-init" strategy="afterInteractive">
      {`(function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window,document,"clarity","script","${id}");`}
    </Script>
  );
}
