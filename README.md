# GridUnity Take Home Assessment Solution

## 🚀 Features Implemented

- Access directories using `snapshot`, `list`, `restore`, `prune` operations
- Enhance `list` operation to include additional disk-usage metrics
- Implement a `check` operation that scans the database for any corrupted file
  content
- Use chunking to de-duplicate storage at a more fine-grained level
- GraphQL APIs to test out via tools like `Postman`

## 📦 Architecture

```sh
.
├── src/
│   ├── config/                 # Database configuration files
│   ├── entities/               # Database entity definitions
│   ├── graphql/
│   │   └── resolvers/          # GraphQL resolvers
│   ├── helpers/                # CLI & server helpers
│   ├── utils/                  # Utility modules (hashing, chunking, etc.)
│   ├── app.ts                  # Entry point for the Koa + Apollo server
│   └── database.ts             # Database connection setup
├── tests/                      # Comprehensive integration & unit tests
├── database.sqlite             # SQLite database file (generated)
├── package.json                # Project dependencies & scripts
└── tsconfig.json               # TypeScript configuration
```

## ⚙️ Technologies

- Node.js / TypeScript
- GraphQL (Apollo)
- TypeORM (SQLite Database)
- Koa Framework
- Jest (Testing Framework)

## ✅ Prerequisites

- **Node.js** (20.x or later recommended)
- **npm** or **yarn** (preferred)

## 🛠 Installation

1. **Clone Repository**

   ```bash
   git clone https://github.com/azurespheredev/GridUnity-Assessment
   cd GridUnity-Assessment
   ```

2. **Install Dependencies**

   ```bash
   yarn install
   ```

3. **Environment Setup**

   Create a `.env` file (for development):

   ```bash
   NODE_ENV=development
   PORT=4000
   ```

4. **Register Environment Variable (Windows OS)**

   Make sure you have these dependencies installed globally

   ```sh
   npm i -g ts-node typescript
   ```

   And add `<your absolute folder path>/scripts/windows` to PATH in environment variable settings.

## ▶️ Usage

In the root directory of the project, run the following:

### Snapshot a Directory

```bash
backuptool snapshot --target-directory=./data
```

### List Snapshots

```bash
backuptool list
```

Example Output:

```sh
SNAPSHOT  TIMESTAMP                FILE                SIZE        DISTINCT_SIZE
1         2025-03-31 10:58:31.000  data_001.txt        2750        2750
1         2025-03-31 10:58:31.000  data_002.txt        2727        2727
1         2025-03-31 10:58:31.000  data_003.txt        1855        1855
total                                                  7332
```

### Restore a Snapshot

```bash
backuptool restore --snapshot-number=1 --output-directory=./out
```

### Prune a Snapshot

```bash
backuptool prune --snapshot=1
```

### Check Data Integrity

```bash
backuptool check
```

## 🧪 Running Tests

```bash
yarn test
```

```sh
🧪 GraphQL Resolver Tests:
   √ List snapshots returns correct snapshot details (564 ms)
   √ Get snapshot by ID returns correct snapshot (29 ms)
   √ Create snapshot from the specific directory (23 ms)
   √ Restore snapshot to new directory (20 ms)
   √ Snapshotting twice without changes should not duplicate chunk content (24 ms)
   √ Pruning snapshot does not affect others (40 ms)

Test Suites: 1 passed, 1 total
Tests:       6 passed, 6 total
Snapshots:   0 total
Time:        5.325 s
```

Tests cover snapshot creation, chunk-based deduplication, restores, pruning safety, and integrity verification.
