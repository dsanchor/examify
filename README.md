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

- Node.js 20+ and npm
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

PORT=3000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

Optional authentication variables:

```
AUTH_USER=admin              # Login username (default: admin)
AUTH_PASSWORD=examify        # Login password (default: examify)
SESSION_SECRET=change-me     # Session signing secret (change in production)
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
LOCATION="spaincentral"

az group create --name $RESOURCE_GROUP --location $LOCATION
```

#### 2. Create Azure CosmosDB Account

```bash
COSMOS_ACCOUNT="examify-cosmos-$(openssl rand -hex 4)"

# Create CosmosDB account
az cosmosdb create \
  --name "$COSMOS_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --kind GlobalDocumentDB \
  --capacity-mode Serverless \
  --default-consistency-level Session \
  --locations regionName="$LOCATION" failoverPriority=0 isZoneRedundant=false \
  -o none

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
  --partition-key-path "/id" 

az cosmosdb sql container create \
  --account-name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --database-name examify \
  --name exams \
  --partition-key-path "/id" 

az cosmosdb sql container create \
  --account-name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --database-name examify \
  --name tests \
  --partition-key-path "/id" 
```

#### 3. Container Image (GitHub Packages)

The Docker image is automatically built and pushed to GitHub Container Registry (ghcr.io) by the CI/CD workflow on every push to `main` or when a version tag is created. No manual build/push step is needed.

Pull the latest image:

```bash
docker pull ghcr.io/dsanchor/examify:latest
```

Set the image variable for the deployment commands below:

```bash
IMAGE="ghcr.io/dsanchor/examify:latest"
```

#### 4. Create Azure Container Apps Environment

```bash
ACA_ENV="examify-env"

az containerapp env create \
  --name $ACA_ENV \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION
```

#### 5. Deploy Container App

Since the image is hosted on ghcr.io, make sure the package is set to **public** in [GitHub Packages settings](https://github.com/dsanchor/examify/pkgs/container/examify/settings), or provide a GitHub PAT with `read:packages` scope as the registry password.

```bash
APP_NAME="examify-app"

az containerapp create \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --environment $ACA_ENV \
  --image $IMAGE \
  --target-port 3000 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 1 \
  --cpu 0.5 \
  --memory 1Gi \
  --env-vars \
    "NODE_ENV=production" \
    "PORT=3000" \
    "COSMOS_ENDPOINT=$COSMOS_ENDPOINT" \
    "COSMOS_KEY=$COSMOS_KEY" \
    "COSMOS_DATABASE_NAME=examify" \
    "COSMOS_SOURCES_CONTAINER=sources" \
    "COSMOS_EXAMS_CONTAINER=exams" \
    "COSMOS_TESTS_CONTAINER=tests" \
    "AZURE_AI_ENDPOINT=$AZURE_AI_ENDPOINT" \
    "AZURE_AI_KEY=$AZURE_AI_KEY" \
    "AZURE_AI_DEPLOYMENT=$AZURE_AI_DEPLOYMENT"

# Get the app URL
az containerapp show \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query properties.configuration.ingress.fqdn -o tsv
```

> **Private registry?** If the ghcr.io package is private, add registry credentials:
> ```bash
> az containerapp create ... \
>   --registry-server ghcr.io \
>   --registry-username <github-username> \
>   --registry-password <github-pat-with-read-packages>
> ```

#### 6. Update Application (after changes)

Push to `main` or create a tag — the CI/CD workflow builds and pushes a new image automatically. Then update the Container App:

```bash
az containerapp update \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --image $IMAGE
```

## CI/CD

A GitHub Actions workflow (`.github/workflows/build-push.yml`) automatically builds and pushes the Docker image to **GitHub Container Registry** (`ghcr.io`).

| Trigger | Image Tags |
|---|---|
| Push to `main` | `latest`, short git SHA |
| Tag `v*` (e.g. `v1.2.0`) | `1.2.0`, `1.2`, short git SHA |
| Manual (`workflow_dispatch`) | short git SHA |

Published images are available under the repository's **Packages** tab:
[github.com/dsanchor/examify/pkgs/container/examify](https://github.com/dsanchor/examify/pkgs/container/examify)

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
