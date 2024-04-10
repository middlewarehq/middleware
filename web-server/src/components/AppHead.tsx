import Head from 'next/head';
import { useRouter } from 'next/router';
import Script from 'next/script';
import { useEffect } from 'react';

import { track } from '@/constants/events';
import { colors } from '@/theme/schemes/theme';

export const AppHead = () => {
  const router = useRouter();

  useEffect(() => {
    const isDev = process.env.NEXT_PUBLIC_APP_ENVIRONMENT === 'development';

    if (!isDev) {
      const onFocus = () => track('WINDOW_FOCUS');
      const onBlur = () => track('WINDOW_BLUR');
      const onUnload = () => track('WINDOW_UNLOAD');

      window.addEventListener('focus', onFocus);
      window.addEventListener('blur', onBlur);
      window.addEventListener('beforeunload', onUnload);
      return () => {
        window.removeEventListener('focus', onFocus);
        window.removeEventListener('blur', onBlur);
        window.removeEventListener('beforeunload', onUnload);
      };
    }
  }, [router.asPath, router.events, router.isReady, router.pathname]);

  return (
    <>
      {/* <!-- Global site tag (gtag.js) - Google Analytics --> */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());

        gtag('config', '${process.env.NEXT_PUBLIC_GA}');`}
      </Script>
      <Script
        src={`https://ind-widget.freshworks.com/widgets/88000000019.js`}
        strategy="afterInteractive"
      />
      <Script id="support-channel" strategy="afterInteractive">
        {`window.fwSettings={'widget_id':88000000019};
        !function(){if("function"!=typeof window.FreshworksWidget){var n=function(){n.q.push(arguments)};n.q=[],window.FreshworksWidget=n}}()`}
      </Script>
      <Script>
        {`document.addEventListener("wheel", function(event){
            if(document.activeElement.type === "number"){
                document.activeElement.blur();
            }
        });`}
      </Script>
      <Head>
        <title>MiddlewareHQ</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <meta name="sentry-trace" content="{{ span.toSentryTrace() }}" />
        <meta
          name="baggage"
          content="{{ serializeBaggage(span.getBaggage()) }}"
        />
        <style type="text/css">{`
      .vis-tooltip {
        position: absolute;
      }
      #freshworks-container #launcher-frame {
        color-scheme: normal;
      }
      #freshworks-container {
        z-index: 2147483646 !important
      }
      [class^=chartsjs-reset-zoom-btn-] {
        display: none1;
      }
      .ProseMirror:focus { outline: none; }
      .ProseMirror * { margin-top: 0; margin-bottom: 0.4em; }
      .ProseMirror *:last-child { margin-bottom: 0; }
      .ProseMirror ul, .ProseMirror ol { padding-left: 20px; }
      .ProseMirror *.is-editor-empty:first-child::before {
        content: attr(data-placeholder);
        float: left;
        color: #fff6;
        pointer-events: none;
        height: 0;
      }
      .MuiDateRangeCalendar-root > div:not([class*=Mui]) {
        display: none;
      }
      .FullScreen {
        background-color: ${colors.layout.general.bodyBg};
        padding: 18px;
        overflow: auto;
      }
    `}</style>
      </Head>
    </>
  );
};
