import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Setup MSW server
export const server = setupServer(...handlers);

// Enable request interception
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// Reset handlers between tests
afterEach(() => server.resetHandlers());

// Clean up after tests
afterAll(() => server.close());