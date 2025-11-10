import {render} from 'solid-js/web';

import './fonts.css'
import './index.css';
import App from './App';
import {Router} from '@solidjs/router';

import {WebsocketProvider} from "./contexts/socketprovider";
import {UserProvider} from "./contexts/usercontextprovider";
import {RainProvider} from "./contexts/raincontext";
import {Meta, MetaProvider, Title} from "@solidjs/meta";
import * as Sentry from "@sentry/react";

const root = document.getElementById('root');

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
    throw new Error(
        'Root element not found!',
    );
}

Sentry.init({
    dsn: "https://94fea1865d3d901e7935ef298adbfa68@o4507419514699776.ingest.us.sentry.io/4507419518763008",
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: 1.0, 
    tracePropagationTargets: ["localhost", "rbxtide.com", /^https:\/\/rbxtide\.com\/api/],
    replaysSessionSampleRate: 0.1, 
    replaysOnErrorSampleRate: 1.0, 
});
  

render(() => <>
    <UserProvider>
        <WebsocketProvider>
            <RainProvider>
                <Router>
                    <MetaProvider>
                        <Title>RBXTide - The best in-game wagering site</Title>
                        <Meta name='title' content='RBXTide - The best in-game wagering site'></Meta>
                        <Meta name='description' content='RBXTide: Play our games like Coinflip and Jackpot. Wager your pets and buy them on the marketplace!'></Meta>

                        <App/>
                    </MetaProvider>
                </Router>
            </RainProvider>
        </WebsocketProvider>
    </UserProvider>
</>, root);
