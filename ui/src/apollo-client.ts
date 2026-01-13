import { ApolloClient, InMemoryCache, HttpLink, split } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';

const httpLink = new HttpLink({
  uri: 'http://localhost:4000/graphql',
});

const wsClient = createClient({
  url: 'ws://localhost:4000/graphql',
  connectionParams: {},
  on: {
    connected: () => console.log('✅ WebSocket connected'),
    closed: () => console.log('❌ WebSocket closed'),
    error: (err) => console.error('❌ WebSocket error:', err),
  },
  retryAttempts: 5,
  shouldRetry: () => true,
});

const wsLink = new GraphQLWsLink(wsClient);

// Split link: use WebSocket for subscriptions, HTTP for queries/mutations
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  httpLink
);

export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});
