import { CosmosClient, Container, Database, SqlQuerySpec } from '@azure/cosmos';
import { config } from '../config';

class CosmosService {
  private client: CosmosClient;
  private database!: Database;
  private containers: Map<string, Container> = new Map();

  constructor() {
    this.client = new CosmosClient({
      endpoint: config.cosmos.endpoint,
      key: config.cosmos.key,
    });
  }

  async initialize(): Promise<void> {
    const { database } = await this.client.databases.createIfNotExists({
      id: config.cosmos.databaseName,
    });
    this.database = database;

    const containerConfigs = [
      { id: config.cosmos.containers.sources, partitionKey: '/id' },
      { id: config.cosmos.containers.exams, partitionKey: '/id' },
      { id: config.cosmos.containers.tests, partitionKey: '/id' },
    ];

    for (const containerConfig of containerConfigs) {
      const { container } = await this.database.containers.createIfNotExists({
        id: containerConfig.id,
        partitionKey: { paths: [containerConfig.partitionKey] },
      });
      this.containers.set(containerConfig.id, container);
    }

    console.log('CosmosDB initialized successfully');
  }

  private getContainer(name: string): Container {
    const container = this.containers.get(name);
    if (!container) {
      throw new Error(`Container "${name}" not found. Ensure CosmosDB is initialized.`);
    }
    return container;
  }

  async create<T extends { id: string }>(containerName: string, item: T): Promise<T> {
    const container = this.getContainer(containerName);
    const { resource } = await container.items.create(item);
    if (!resource) {
      throw new Error('Failed to create item');
    }
    return resource as T;
  }

  async read<T>(containerName: string, id: string): Promise<T | null> {
    const container = this.getContainer(containerName);
    try {
      const { resource } = await container.item(id, id).read();
      return (resource as T) ?? null;
      return resource ?? null;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && (error as { code: number }).code === 404) {
        return null;
      }
      throw error;
    }
  }

  async update<T extends { id: string }>(containerName: string, id: string, item: Partial<T>): Promise<T> {
    const container = this.getContainer(containerName);
    const existing = await this.read<T>(containerName, id);
    if (!existing) {
      throw new Error(`Item with id "${id}" not found in "${containerName}"`);
    }
    const updated = { ...existing, ...item, id } as T;
    const { resource } = await container.item(id, id).replace(updated);
    if (!resource) {
      throw new Error('Failed to update item');
    }
    return resource as T;
  }

  async delete(containerName: string, id: string): Promise<void> {
    const container = this.getContainer(containerName);
    await container.item(id, id).delete();
  }

  async query<T>(containerName: string, querySpec: SqlQuerySpec): Promise<T[]> {
    const container = this.getContainer(containerName);
    const { resources } = await container.items.query<T>(querySpec).fetchAll();
    return resources;
  }

  async list<T>(
    containerName: string,
    page: number = 1,
    pageSize: number = 20,
    orderBy: string = 'createdAt',
    orderDirection: 'ASC' | 'DESC' = 'DESC'
  ): Promise<{ items: T[]; total: number }> {
    const container = this.getContainer(containerName);
    const offset = (page - 1) * pageSize;

    const countQuery: SqlQuerySpec = {
      query: `SELECT VALUE COUNT(1) FROM c`,
    };
    const { resources: countResult } = await container.items.query<number>(countQuery).fetchAll();
    const total = countResult[0] || 0;

    const itemsQuery: SqlQuerySpec = {
      query: `SELECT * FROM c ORDER BY c.${orderBy} ${orderDirection} OFFSET @offset LIMIT @limit`,
      parameters: [
        { name: '@offset', value: offset },
        { name: '@limit', value: pageSize },
      ],
    };
    const { resources: items } = await container.items.query<T>(itemsQuery).fetchAll();

    return { items, total };
  }
}

export const cosmosService = new CosmosService();
