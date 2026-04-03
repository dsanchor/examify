# Examify

AI-powered exam generation from PDF study materials using Azure AI Foundry and CosmosDB.

## Features

- 📄 **PDF Ingestion**: Upload PDFs and extract questions automatically using Azure AI Foundry (gpt-5.4-mini)
- ✏️ **Validation UI**: Review and edit extracted questions, answers, and chapters
- 🎯 **Custom Exam Generation**: Create targeted exams by selecting chapters, question count, and answer options
- 📝 **Two Test Modes**:
  - **All-at-once**: Answer all questions, then submit for results
  - **One-by-one**: See correct answer after each question
- ⏱️ **Optional Timer**: Set time limits for exams
- 📊 **Test History**: Track progress and review past results
- 📱 **Responsive Design**: Works on mobile and desktop browsers

## Architecture

### Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: Azure CosmosDB (NoSQL)
- **AI**: Azure AI Foundry (gpt-5.4-mini)
- **Deployment**: Azure Container Apps

### Data Models

- **Source**: Extracted PDF content with questions/answers/chapters
- **Exam**: Generated exam with filtered questions from multiple sources
- **TestSession**: Active or completed test with answers and scoring

## Prerequisites

- Node.js 18+ and npm
- Docker (for local containerized development)
- Azure subscription
- Azure AI Foundry model deployment (gpt-5.4-mini)

## Local Development

### 1. Clone and Install

```bash
git clone <repository-url>
cd examify
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your Azure credentials:

```bash
cp .env.example .env
```

Required environment variables:

```
COSMOS_ENDPOINT=https://your-account.documents.azure.com:443/
COSMOS_KEY=your-cosmos-key
COSMOS_DATABASE_NAME=examify
COSMOS_SOURCES_CONTAINER=sources
COSMOS_EXAMS_CONTAINER=exams
COSMOS_TESTS_CONTAINER=tests

AZURE_AI_ENDPOINT=https://your-foundry-endpoint.openai.azure.com/
AZURE_AI_KEY=your-ai-key
AZURE_AI_DEPLOYMENT=gpt-5.4-mini
AZURE_AI_API_VERSION=2024-02-15-preview

PORT=3000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

### 3. Start Development Servers

```bash
# Start both client and server concurrently
npm run dev

# Or start individually:
npm run dev -w server  # Server on :3000
npm run dev -w client  # Client on :5173
```

### 4. Build for Production

```bash
npm run build
```

## Docker Deployment

### Local Docker

```bash
# Build and run with docker-compose
docker-compose up --build

# Or build manually
docker build -t examify:latest .
docker run -p 3000:3000 --env-file .env examify:latest
```

## Azure Deployment

### Prerequisites

1. Azure CLI installed and logged in
2. Azure AI Foundry model deployed
3. Resource group created

### Deployment Steps

#### 1. Create Resource Group

```bash
RESOURCE_GROUP="examify-rg"
LOCATION="eastus"

az group create --name $RESOURCE_GROUP --location $LOCATION
```

#### 2. Create Azure CosmosDB Account

```bash
COSMOS_ACCOUNT="examify-cosmos-$(openssl rand -hex 4)"

# Create CosmosDB account
az cosmosdb create \
  --name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --default-consistency-level Session \
  --locations regionName=$LOCATION failoverPriority=0 isZoneRedundant=False

# Get CosmosDB connection details
COSMOS_ENDPOINT=$(az cosmosdb show \
  --name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --query documentEndpoint -o tsv)

COSMOS_KEY=$(az cosmosdb keys list \
  --name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --query primaryMasterKey -o tsv)

# Create database
az cosmosdb sql database create \
  --account-name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --name examify

# Create containers
az cosmosdb sql container create \
  --account-name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --database-name examify \
  --name sources \
  --partition-key-path "/id" \
  --throughput 400

az cosmosdb sql container create \
  --account-name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --database-name examify \
  --name exams \
  --partition-key-path "/id" \
  --throughput 400

az cosmosdb sql container create \
  --account-name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --database-name examify \
  --name tests \
  --partition-key-path "/id" \
  --throughput 400
```

#### 3. Create Azure Container Registry

```bash
ACR_NAME="examifyacr$(openssl rand -hex 4)"

az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $ACR_NAME \
  --sku Basic \
  --admin-enabled true

# Login to ACR
az acr login --name $ACR_NAME

# Get ACR credentials
ACR_LOGIN_SERVER=$(az acr show --name $ACR_NAME --query loginServer -o tsv)
ACR_USERNAME=$(az acr credential show --name $ACR_NAME --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query passwords[0].value -o tsv)
```

#### 4. Build and Push Docker Image

```bash
# Build image
docker build -t examify:latest .

# Tag for ACR
docker tag examify:latest $ACR_LOGIN_SERVER/examify:latest

# Push to ACR
docker push $ACR_LOGIN_SERVER/examify:latest
```

#### 5. Create Azure Container Apps Environment

```bash
ACA_ENV="examify-env"

az containerapp env create \
  --name $ACA_ENV \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION
```

#### 6. Deploy Container App

```bash
APP_NAME="examify-app"

az containerapp create \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --environment $ACA_ENV \
  --image $ACR_LOGIN_SERVER/examify:latest \
  --registry-server $ACR_LOGIN_SERVER \
  --registry-username $ACR_USERNAME \
  --registry-password $ACR_PASSWORD \
  --target-port 3000 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 3 \
  --cpu 1.0 \
  --memory 2Gi \
  --env-vars \
    "NODE_ENV=production" \
    "PORT=3000" \
    "COSMOS_ENDPOINT=$COSMOS_ENDPOINT" \
    "COSMOS_KEY=$COSMOS_KEY" \
    "COSMOS_DATABASE_NAME=examify" \
    "COSMOS_SOURCES_CONTAINER=sources" \
    "COSMOS_EXAMS_CONTAINER=exams" \
    "COSMOS_TESTS_CONTAINER=tests" \
    "AZURE_AI_ENDPOINT=<your-ai-foundry-endpoint>" \
    "AZURE_AI_KEY=<your-ai-key>" \
    "AZURE_AI_DEPLOYMENT=gpt-5.4-mini" \
    "AZURE_AI_API_VERSION=2024-02-15-preview"

# Get the app URL
az containerapp show \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query properties.configuration.ingress.fqdn -o tsv
```

#### 7. Update Application (after changes)

```bash
# Rebuild and push new image
docker build -t examify:latest .
docker tag examify:latest $ACR_LOGIN_SERVER/examify:latest
docker push $ACR_LOGIN_SERVER/examify:latest

# Update container app
az containerapp update \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --image $ACR_LOGIN_SERVER/examify:latest
```

## Project Structure

```
examify/
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page-level components
│   │   ├── services/    # API client
│   │   ├── hooks/       # Custom React hooks
│   │   ├── types/       # TypeScript types
│   │   ├── App.tsx
│   │   ├── App.css
│   │   └── main.tsx
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── server/              # Node.js backend
│   ├── src/
│   │   ├── routes/      # API endpoints
│   │   ├── services/    # Business logic
│   │   ├── models/      # Data models
│   │   ├── middleware/  # Express middleware
│   │   ├── config/      # Configuration
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
├── Dockerfile           # Multi-stage Docker build
├── docker-compose.yml   # Local development
├── package.json         # Root workspace
├── .env.example         # Example environment variables
└── README.md
```

## API Endpoints

### Sources

- `POST /api/sources/upload` - Upload PDF and extract questions
- `GET /api/sources` - List all sources
- `GET /api/sources/:id` - Get source by ID
- `PUT /api/sources/:id` - Update source (validation edits)
- `DELETE /api/sources/:id` - Delete source

### Exams

- `POST /api/exams` - Generate exam from sources
- `GET /api/exams` - List all exams
- `GET /api/exams/:id` - Get exam by ID
- `DELETE /api/exams/:id` - Delete exam

### Tests

- `POST /api/tests` - Start test session
- `PUT /api/tests/:id` - Submit test answers
- `GET /api/tests` - List test history
- `GET /api/tests/:id` - Get test result details

## License

MIT

## Support

For issues or questions, please open an issue in the repository.
