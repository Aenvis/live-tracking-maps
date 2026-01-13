import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { typeDefs } from './schema.js';
import { resolvers } from './resolvers.js';
import { startGeoSimulator } from './geo-simulator.js';

const PORT = 4000;

async function main() {
  const app = express();
  const httpServer = createServer(app);

  const schema = makeExecutableSchema({ typeDefs, resolvers });

  // WebSocket server for subscriptions
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  const serverCleanup = useServer({ schema }, wsServer);

  const server = new ApolloServer({
    schema,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
  });

  await server.start();

  app.use(
    '/graphql',
    cors<cors.CorsRequest>({
      origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
    }),
    express.json(),
    expressMiddleware(server)
  );

  httpServer.listen(PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
    console.log(`🔌 WebSocket subscriptions ready at ws://localhost:${PORT}/graphql`);
    
    // Start the geo data simulator
    startGeoSimulator();
  });
}

main().catch(console.error);

