import 'ink-testing-library';

import {ReactNode} from 'react';

declare module 'ink-testing-library' {
	export function render(tree: ReactNode): RenderResponse;
}
