import * as React from 'react';

/**
 * Communicates to descendants (notably `<Header>`) whether some ancestor has
 * already consumed the top safe-area inset (e.g. via `<SafeAreaView
 * edges={['top']} />` inside `<Screen>`).
 *
 *  - `true`  → ancestor already pushed content down past the status bar;
 *              descendants must NOT add the inset again (avoid double pad).
 *  - `false` → no ancestor consumed the top inset; the topmost chrome
 *              (Header) is responsible for reserving the status bar space.
 *
 * Default is `false` so an unwrapped `<Header>` still renders below the
 * status bar by reading `useSafeAreaInsets().top` itself.
 */
export const TopInsetConsumedContext = React.createContext<boolean>(false);
