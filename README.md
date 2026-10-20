# Group Expense Splitter 💰

A full-stack group expense splitting and debt minimization web application built with **Spring Boot 3**, **React 18**, and **MySQL**.

Group Expense Splitter simplifies group spending during trips, events, shared housing, or dining out. It tracks who paid, computes penny-accurate balances, optimizes debt settlements using a greedy algorithm, and allows members to upload verified bill receipts and payment screenshots.

---

## ✨ Features

- **Event Management**: Create, view, and organize shared expense events (trips, dinners, outings) with automatic cascade cleanup.
- **Participant Roster**: Add members to events with names and emails, protected by integrity guards against deleting members with existing transactions.
- **Shared Expense Tracking**: Record categorized expenses paid by any member, with equal splitting across all or custom-selected beneficiaries.
- **Penny-Accurate Remainder Distribution**: Indivisible cent remainders from equal divisions are distributed deterministically so `sum(shares) == expense.amount` always holds true to the exact penny.
- **Bill Receipt & Payment Proof**: Upload digital bill receipts or payment screenshots (stored securely as Base64 data URLs in MySQL) and inspect them via a full-screen lightbox modal.
- **Real-Time Net Balances**: Instant calculation of total paid, total share owed, and net balance for every member (where `sum(netBalances) == 0`).
- **Greedy Debt Minimization**: Automatically generates the minimal number of direct transfers needed to settle all debts by pairing the largest debtors with the largest creditors.
- **Settlement Completion & Staleness Protection**: Mark settlements as settled, with built-in snapshot staleness detection that prevents completing transactions if expenses have changed.
- **Financial Dashboard**: Interactive KPI metrics, quick settlements overview, and recent activity feed.

---

## 🛠️ Tech Stack

### Backend
- **Java 17**
- **Spring Boot 3.3.2** (Spring Web, Spring Data JPA, Jakarta Bean Validation)
- **Hibernate / MySQL** (with H2 in-memory database for unit & integration testing)
- **Maven** build tool

### Frontend
- **React 18.3**
- **Vite 5.4**
- **React Router DOM 7**
- **Axios** for API integration
- **Lucide React** icons
- **Vanilla CSS3** with custom design tokens and dark/light accents

---

## 🏗️ Project Architecture

```
fullstack-app/
├── backend/
│   ├── src/main/java/com/groupexpensesplitter/
│   │   ├── config/          # CORS and application beans
│   │   ├── controller/      # REST API endpoints (@RestController)
│   │   ├── dto/             # Request & Response data transfer objects
│   │   ├── entity/          # JPA entities (Event, Participant, Expense, ExpenseShare, Settlement)
│   │   ├── exception/       # Global exception handlers and custom exceptions
│   │   ├── repository/      # Spring Data JPA repositories
│   │   └── service/         # Business logic and settlement minimization algorithm
│   ├── src/main/resources/  # application.properties (MySQL connection, file upload limits)
│   └── pom.xml
│
├── frontend/
│   ├── src/
│   │   ├── components/      # Common UI components (Modal, Navbar, Alerts, ConfirmDialog)
│   │   ├── context/         # EventContext for global active event state
│   │   ├── pages/           # Dashboard, Events, Participants, Expenses, Balances, Settlements
│   │   ├── services/        # Axios API clients for backend communication
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
│
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- **Java 17+**
- **Maven 3.8+**
- **Node.js 18+** & npm
- **MySQL 8.0+** running locally

---

### 1. Database Setup
Create the MySQL database:
```sql
CREATE DATABASE group_expense_splitter;
```

Update your database credentials in `backend/src/main/resources/application.properties` (or set environment variables `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`):
```properties
spring.datasource.url=jdbc:mysql://localhost:3306/group_expense_splitter?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true&createDatabaseIfNotExist=true
spring.datasource.username=root
spring.datasource.password=root
```

---

### 2. Run the Backend (Spring Boot)
```bash
cd backend
mvn clean spring-boot:run
```
The REST API will be available at: `http://localhost:8080`

Run integration tests:
```bash
mvn test
```

---

### 3. Run the Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
The web application will open at: `http://localhost:3000` (or `http://localhost:3001`).

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/events` | Create a new event |
| `GET` | `/api/events` | List all events |
| `GET` | `/api/events/{id}` | Get event details |
| `DELETE` | `/api/events/{id}` | Delete event & cascade child records |
| `POST` | `/api/events/{id}/participants` | Add a participant |
| `GET` | `/api/events/{id}/participants` | List event participants |
| `DELETE` | `/api/events/{id}/participants/{pId}` | Remove participant (if no financial ties) |
| `POST` | `/api/events/{id}/expenses` | Record expense with split shares & receipt |
| `GET` | `/api/events/{id}/expenses` | List all expenses for an event |
| `PUT` | `/api/events/{id}/expenses/{expId}` | Update expense & recalculate shares |
| `DELETE` | `/api/events/{id}/expenses/{expId}` | Delete expense |
| `GET` | `/api/events/{id}/balances` | Get per-member net balances |
| `GET` | `/api/events/{id}/settlements` | Generate minimal debt settlement suggestions |
| `PATCH` | `/api/settlements/{id}/complete` | Mark settlement as completed |

---

## 💡 Algorithmic Highlights

### Greedy Settlement Simplification
Instead of every participant reimbursing every transaction individually, `SettlementService` computes net balances in integer cents and uses a greedy two-pointer algorithm:
1. Segregates members into **debtors** (negative balance) and **creditors** (positive balance).
2. Pairs the maximum debtor with the maximum creditor for `min(|debtor|, creditor)`.
3. Decrements balances until all accounts reach zero.
This reduces debt complexity from potentially $O(N^2)$ cross-transfers down to at most $N-1$ payments.

---

## 📄 License
This project is open source and available under the [MIT License](LICENSE).
