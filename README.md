# 🏭 EquipFixAI

### AI-Powered Equipment Maintenance & Troubleshooting Platform

EquipFixAI is an **AI-powered industrial equipment maintenance management system** that combines **Retrieval-Augmented Generation (RAG)** with real-time maintenance operations.

The platform helps manufacturing organizations reduce equipment downtime by allowing workers and technicians to quickly access **source-referenced troubleshooting solutions** from equipment manuals, Standard Operating Procedures (SOPs), safety procedures, and historical maintenance records.

EquipFixAI is more than an AI chatbot. It provides a complete workflow for **reporting equipment failures, assigning technicians, managing work orders, recording repairs, tracking spare parts, maintaining equipment history, monitoring employee activity, and providing management analytics.**

---

## 🎯 Problem Statement

A manufacturing firm maintains equipment manuals, maintenance logs, and safety procedures, but floor technicians cannot get an immediate, source-referenced fix during machine failures, increasing downtime.

Technicians often have to manually search through large PDF manuals, old maintenance records, and safety documents while equipment is unavailable.

EquipFixAI addresses this problem by bringing all relevant maintenance knowledge into one platform and using RAG to retrieve the most relevant information before generating an AI response.

---

# 💡 Solution

EquipFixAI creates a connected maintenance workflow:

```text
Labor reports equipment problem
            ↓
Incident is created
            ↓
Supervisor receives notification
            ↓
Supervisor assigns technician
            ↓
Technician receives Work Order
            ↓
Technician investigates equipment
            ↓
Technician asks EquipFix AI
            ↓
RAG searches relevant documents
            ↓
AI provides troubleshooting guidance
            ↓
Sources + safety instructions displayed
            ↓
Technician performs repair
            ↓
Technician records work performed
            ↓
Parts used are recorded
            ↓
Supervisor reviews / approves
            ↓
Equipment history is updated
            ↓
Spare-part inventory is updated
            ↓
Manager dashboard is updated
            ↓
Approved maintenance record becomes
available for future RAG searches
```

---

# 👥 User Roles

EquipFixAI provides different functionality based on the user's role.

## 👷 Labor / Operator

Laborers and machine operators primarily report equipment problems.

### Capabilities

* Report equipment problems
* Select affected equipment
* Upload equipment images
* Describe the problem
* View reported incidents
* Track incident status
* Receive notifications
* Perform basic AI-guided checks
* View personal work/report history

---

## 🔧 Technician

Technicians are responsible for diagnosing and repairing equipment.

### Capabilities

* View assigned work orders
* Accept and start work orders
* Ask the RAG AI for troubleshooting assistance
* Search equipment manuals
* Search SOPs and safety procedures
* View previous maintenance history
* Find similar previous failures
* Record troubleshooting steps
* Record root cause
* Record repair actions
* Record parts used
* Upload images
* Update work progress
* Complete work orders
* Maintain personal work logs

---

## 👨💼 Supervisor

Supervisors manage technicians, incidents, and maintenance operations.

### Capabilities

* View active incidents
* Assign technicians
* Reassign work orders
* Set priority and severity
* Monitor technician workload
* Track maintenance progress
* Review technician work logs
* Review completed repairs
* Approve maintenance records
* Manage maintenance schedules
* Monitor equipment status
* Manage selected documents and SOPs
* Escalate critical incidents

---

## 👨💼 Manager

Managers have organization-wide visibility into maintenance operations.

### Capabilities

* View all equipment
* View all incidents
* View all maintenance records
* View employee work history
* Search who fixed a particular equipment problem
* See what part was replaced
* Monitor equipment downtime
* Monitor recurring failures
* Monitor maintenance costs
* View technician performance data
* View spare-parts usage
* View plant-level analytics
* Manage users and roles
* Manage documents and document versions
* View audit logs
* Generate maintenance reports

---

# 🤖 RAG-Powered AI Assistant

The core AI feature of EquipFixAI is a **Retrieval-Augmented Generation (RAG)** system.

Instead of asking the LLM to answer from its general knowledge, EquipFixAI first retrieves relevant information from the company's own knowledge base.

### RAG Workflow

```text
User Question
      ↓
Query Processing
      ↓
Embedding Generation
      ↓
Vector Database Search
      ↓
Relevant Document Chunks
      ↓
Context + User Question
      ↓
Large Language Model
      ↓
Grounded Response
      ↓
Sources / Citations
```

---

# 📚 RAG Knowledge Base

EquipFixAI can use multiple types of company information.

### Equipment Manuals

```text
CNC-04 Manual
PRESS-02 Manual
MOTOR-12 Manual
Hydraulic Press Manual
Electrical Panel Manual
```

### Safety Procedures

```text
Lockout / Tagout Procedure
Electrical Safety Procedure
Hydraulic Safety Procedure
Emergency Shutdown Procedure
Personal Protective Equipment Procedure
```

### SOPs

```text
Machine Startup SOP
Machine Shutdown SOP
Daily Inspection SOP
Cleaning SOP
Lubrication SOP
```

### Historical Maintenance Records

```text
Previous equipment failures
Previous repairs
Root causes
Parts replaced
Technicians involved
Downtime
Resolution steps
```

---

# 🔎 Example RAG Query

A technician asks:

> "CNC-04 is showing error E-204 and the spindle is not rotating. What should I check?"

EquipFixAI retrieves relevant information from:

```text
📄 CNC-04 Maintenance Manual
📄 CNC-04 Troubleshooting Guide
📄 Safety Procedure SP-12
📄 Previous Maintenance Log #MNT-238
```

The AI can then provide:

```text
Possible Cause:
Spindle overload or cooling problem.

Recommended Checks:

1. Stop the machine.
2. Turn off the required power source.
3. Check the spindle cooling system.
4. Inspect for mechanical obstruction.
5. Follow the approved restart procedure.

⚠️ Safety:
Do not open the machine while energized.

Sources:
- CNC-04 Manual — Page 42
- Safety Procedure SP-12 — Page 8
- Maintenance Log #MNT-238
```

The system should distinguish between **document-supported information** and uncertain possibilities rather than presenting unsupported guesses as facts.

---

# 🛠️ Maintenance Management

EquipFixAI maintains the complete lifecycle of an equipment problem.

## Incident

```text
Incident
    ↓
Assigned
    ↓
In Progress
    ↓
Waiting / Escalated
    ↓
Resolved
    ↓
Approved
    ↓
Closed
```

Each incident contains information such as:

* Incident ID
* Equipment
* Reported by
* Date and time
* Problem description
* Severity
* Priority
* Assigned technician
* Status
* Resolution
* Root cause
* Parts used
* Downtime
* Approval status

---

# 🔧 Work Order Management

A supervisor can create or assign a work order.

Example:

```text
Work Order: WO-1042

Equipment:
CNC-04

Problem:
Spindle making abnormal noise

Priority:
High

Assigned Technician:
Ravi Kumar

Status:
In Progress
```

The technician can update the work order while performing the repair.

---

# 📝 Technician Work Logs

Every maintenance activity can be recorded.

Example:

```text
10:42 AM
Ravi accepted WO-1042

10:48 AM
Machine isolated

11:02 AM
Bearing inspection started

11:18 AM
Bearing failure confirmed

11:25 AM
BRG-204 issued

12:05 PM
Bearing replaced

12:20 PM
Machine testing completed

12:24 PM
Work order completed
```

This allows supervisors and managers to understand **what happened and who performed each action**.

---

# 📦 Spare Parts Management

EquipFixAI can track spare parts used during maintenance.

Example:

```text
Part:
BRG-204

Description:
Spindle Bearing

Available:
24

Used:
1

Remaining:
23

Minimum Stock:
10
```

When a technician records a part as used:

```text
Inventory

24
 ↓
-1
 ↓
23
```

The system can generate a low-stock notification when inventory falls below the configured minimum.

---

# 🏭 Equipment History

Every piece of equipment has its own maintenance history.

Example:

```text
CNC-04

September 21
Problem: Spindle noise
Root Cause: Bearing failure
Technician: Ravi Kumar
Part: BRG-204
Downtime: 1h 42m
Status: Resolved

September 15
Problem: E-204
Root Cause: Cooling issue
Technician: Arun
Part: FAN-22
Downtime: 58 min
Status: Resolved
```

This history can also become an important source for the RAG system.

---

# 📅 Preventive Maintenance

EquipFixAI can support scheduled maintenance instead of only reacting to failures.

Example:

```text
CNC-04

Daily:
✓ Visual inspection

Weekly:
✓ Lubrication

Monthly:
○ Bearing inspection

Quarterly:
○ Calibration
```

When maintenance becomes due, the system can automatically create or notify users about the required maintenance task.

---

# 📚 Document Management

Authorized users can upload and manage company documents.

Supported document categories can include:

```text
Equipment Manuals
Safety Procedures
SOPs
Troubleshooting Guides
Maintenance Guides
Technical Documentation
```

---

# 🔄 Document Versioning

EquipFixAI can maintain different versions of documents.

Example:

```text
CNC-04 Manual

v4    CURRENT
v3    Archived
v2    Archived
v1    Archived
```

Only approved/current documentation should be used as the authoritative source for normal troubleshooting.

---

# 🔐 Approval Workflow

Important documents and maintenance knowledge should not automatically become official.

Example:

```text
Technician Suggestion
        ↓
Supervisor Review
        ↓
Manager Approval
        ↓
Published Record
        ↓
RAG Knowledge Base
```

This helps prevent unverified information from becoming official maintenance guidance.

---

# 🔔 Real-Time Notifications

EquipFixAI can provide real-time notifications for important events.

### Labor

```text
Your incident INC-1042 has been assigned to Ravi.
```

### Technician

```text
New work order assigned:
CNC-04 — High Priority
```

### Supervisor

```text
Ravi completed WO-1042.
Review required.
```

### Manager

```text
CNC-04 maintenance completed.
Downtime: 1h 42m.
```

Real-time updates can be implemented using WebSockets or another event-based mechanism.

---

# 📊 Manager Analytics

The manager dashboard provides an overview of plant maintenance.

Example metrics:

```text
Total Equipment       126
Active Equipment      118
Equipment Down          8
Open Incidents         12
Resolved Today         18
Average Downtime       31 min
```

### Analytics

* Equipment downtime
* Failure frequency
* Recurring problems
* Maintenance costs
* Parts consumption
* Technician workload
* Open vs resolved incidents
* Preventive maintenance completion
* Equipment reliability trends

---

# 🔍 Global Search

Managers and authorized users can search across the maintenance system.

Example:

> "Who fixed CNC-04 last time?"

EquipFixAI can return:

```text
Equipment:
CNC-04

Last Maintenance:
September 21, 2026

Technician:
Ravi Kumar

Problem:
Spindle bearing failure

Part Used:
BRG-204

Action:
Bearing replaced

Downtime:
1h 42m

Work Order:
WO-1042
```

This combines structured database search with AI-assisted retrieval where appropriate.

---

# 🧾 Audit Logs

EquipFixAI maintains an audit trail of important system actions.

Example:

```text
10:42 Ravi
Opened WO-1042

10:48 Ravi
Started maintenance

11:25 Ravi
Requested BRG-204

11:26 Inventory
BRG-204 changed from 24 → 23

12:24 Ravi
Completed WO-1042

12:27 Supervisor
Approved WO-1042

12:28 System
Maintenance record indexed for RAG
```

This provides accountability and makes it possible to determine **who performed an action, what changed, and when it happened**.

---

# 🏗️ System Architecture

```text
                         ┌──────────────────┐
                         │      Users       │
                         │ Labor / Tech /   │
                         │ Supervisor /     │
                         │ Manager          │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │  React Frontend  │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │   FastAPI API    │
                         └────────┬─────────┘
                                  │
                ┌─────────────────┼─────────────────┐
                │                 │                 │
                ▼                 ▼                 ▼
        ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
        │ PostgreSQL   │  │  RAG Engine  │  │ WebSockets   │
        │              │  │              │  │              │
        │ Users        │  │ Retriever    │  │ Embeddings   │
        │ Equipment    │  │ Vector DB    │  │ Real-time    │
        │ Incidents    │  │ LLM          │  │ notifications│
        │ Work Orders  │  │ Citations    │  │              │
        │ Parts        │  └──────┬───────┘  │              │
        └──────────────┘         │          └──────────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │ Knowledge Base   │
                        │                  │
                        │ Manuals          │
                        │ SOPs             │
                        │ Safety Docs      │
                        │ Maintenance Logs │
                        │ Approved Records │
                        └──────────────────┘
```

---

# 🗄️ Database Design

Core entities include:

```text
users
roles
machines
machine_status
incidents
work_orders
work_logs
maintenance_records
maintenance_schedules
parts
part_usage
documents
document_versions
safety_procedures
notifications
ai_queries
ai_sources
audit_logs
```

### Example relationships

```text
User
 │
 ├── reports → Incident
 │
 ├── assigned → Work Order
 │
 └── creates → Work Log

Machine
 │
 ├── has → Incidents
 ├── has → Maintenance Records
 ├── has → Work Orders
 └── has → Maintenance Schedule

Work Order
 │
 ├── assigned to → Technician
 ├── uses → Parts
 └── produces → Maintenance Record

Maintenance Record
 │
 └── can become → RAG Knowledge
```

---

# 🧠 RAG Pipeline

The document ingestion pipeline follows:

```text
Documents
    ↓
Document Loading
    ↓
Text Extraction
    ↓
Cleaning
    ↓
Chunking
    ↓
Metadata Creation
    ↓
Embedding Generation
    ↓
Vector Database
```

Query pipeline:

```text
User Question
      ↓
Query Embedding
      ↓
Similarity Search
      ↓
Relevant Chunks
      ↓
Metadata Filtering
      ↓
Context Construction
      ↓
LLM
      ↓
Answer + Sources
```

Metadata can include:

```text
document_id
machine_id
document_type
page_number
version
department
approval_status
created_at
```

This allows the system to retrieve information specific to a particular machine or document type.

---

# 🛡️ Safety-First AI

EquipFixAI prioritizes safety when generating maintenance guidance.

The AI should:

* Retrieve relevant safety procedures
* Display safety warnings
* Recommend appropriate PPE where documented
* Identify procedures requiring authorized personnel
* Avoid presenting uncertain diagnoses as facts
* Reference the source of safety instructions
* Escalate high-risk situations to authorized personnel

Example:

```text
⚠️ HIGH-RISK PROCEDURE

Electrical panel access may be required.

Only authorized personnel should perform this operation.

Follow the approved Lockout/Tagout procedure
before beginning maintenance.
```

---

# 🛠️ Proposed Technology Stack

## Frontend

* React.js
* HTML5
* CSS3
* JavaScript
* React Router
* Charting library

## Backend

* Python
* FastAPI
* Pydantic
* SQLAlchemy

## Database

* PostgreSQL

## AI / RAG

* Python
* LangChain or LlamaIndex
* Embedding Model
* Large Language Model
* ChromaDB / FAISS / Pinecone

## Authentication

* JWT
* Role-Based Access Control

## Real-Time

* FastAPI WebSockets

## Testing

* Pytest
* FastAPI TestClient

## Deployment

* Docker
* Docker Compose
* CI/CD

---

# 📁 Proposed Project Structure

```text
EquipFixAI/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── services/
│   │   ├── hooks/
│   │   └── utils/
│   └── package.json
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── rag/
│   │   ├── auth/
│   │   ├── database/
│   │   └── main.py
│   │
│   ├── tests/
│   └── requirements.txt
│
├── data/
│   ├── manuals/
│   ├── safety/
│   ├── sops/
│   └── maintenance_logs/
│
├── docs/
│   ├── architecture/
│   ├── api/
│   └── database/
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

# ✨ Main Features

| Feature                   | Description                                                         |
| ------------------------- | ------------------------------------------------------------------- |
| 🔐 Role-Based Login       | Different permissions for Labor, Technician, Supervisor and Manager |
| 🤖 RAG Assistant          | AI answers using company knowledge                                  |
| 📚 Source Citations       | Shows supporting manuals and documents                              |
| 🔧 Work Orders            | Assign and track maintenance tasks                                  |
| 📝 Work Logs              | Record technician activities                                        |
| 🏭 Equipment History      | Complete maintenance history per machine                            |
| 📦 Spare Parts            | Track parts used during maintenance                                 |
| ⚠️ Safety Guidance        | Retrieve and display relevant safety procedures                     |
| 📅 Preventive Maintenance | Schedule recurring maintenance                                      |
| 📊 Analytics              | Monitor plant maintenance performance                               |
| 🔔 Notifications          | Real-time status and assignment updates                             |
| 📄 Document Management    | Upload and manage manuals/SOPs                                      |
| 🔄 Version Control        | Track document versions                                             |
| 🔍 Global Search          | Search equipment, incidents, people and records                     |
| 🧾 Audit Logs             | Track important system actions                                      |
| 🧠 Historical Knowledge   | Use approved previous repairs as RAG context                        |

---

# 🌟 Future Enhancements

Possible future improvements include:

* 🎤 Voice-based maintenance assistant
* 📷 Computer vision for equipment inspection
* 📱 Mobile application for technicians
* 📈 Predictive maintenance
* 🔮 Failure prediction using historical sensor data
* 📡 IoT sensor integration
* 🌡️ Real-time equipment telemetry
* 📧 Automated email notifications
* 📦 Automatic spare-part procurement requests
* 🌐 Multi-plant support
* 🌍 Multi-language technician assistance

---

# 🎯 Project Goals

EquipFixAI aims to:

1. Reduce equipment downtime.
2. Reduce the time required to find troubleshooting information.
3. Provide source-grounded AI assistance.
4. Improve maintenance record keeping.
5. Create a centralized equipment knowledge base.
6. Improve communication between operators, technicians and supervisors.
7. Give managers complete visibility into maintenance activities.
8. Track spare-part usage.
9. Improve safety compliance.
10. Preserve organizational maintenance knowledge.

---

# 🔐 Security Considerations

The system should implement:

* JWT authentication
* Role-based authorization
* Password hashing
* API authentication
* Input validation
* File-upload validation
* Access control for maintenance records
* Document access permissions
* Audit logging
* Secure environment variables
* Protection against unauthorized document modification

---

# 🧪 Testing

The project should include tests for:

### Authentication

```text
✓ Valid login
✓ Invalid login
✓ Role permissions
✓ Unauthorized access
```

### Maintenance

```text
✓ Create incident
✓ Assign technician
✓ Update work order
✓ Complete work order
✓ Record maintenance
```

### Inventory

```text
✓ Add part
✓ Use part
✓ Update quantity
✓ Low-stock detection
```

### RAG

```text
✓ Document ingestion
✓ Chunk creation
✓ Retrieval
✓ Source metadata
✓ Relevant context
✓ AI response
```

### Real-Time

```text
✓ Incident notification
✓ Work-order notification
✓ Status update
```

---

# 🚀 Getting Started

## 1. Clone the repository

```bash
git clone https://github.com/<your-username>/EquipFixAI.git

cd EquipFixAI
```

## 2. Backend setup

```bash
cd backend

python -m venv venv

source venv/bin/activate
```

For Windows:

```bash
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

---

## 3. Configure environment variables

Create a `.env` file:

```env
DATABASE_URL=your_database_url

JWT_SECRET_KEY=your_secret_key

LLM_API_KEY=your_llm_api_key

VECTOR_DB_URL=your_vector_database_url
```

Never commit the `.env` file to GitHub.

---

## 4. Start the backend

```bash
uvicorn app.main:app --reload
```

---

## 5. Start the frontend

```bash
cd frontend

npm install

npm run dev
```

---

# 📖 Example User Journey

### Scenario: CNC Machine Failure

```text
1. Operator notices abnormal machine noise.

2. Operator logs into EquipFixAI.

3. Operator reports:
   "CNC-04 is making unusual noise."

4. Supervisor receives notification.

5. Supervisor assigns the incident to a technician.

6. Technician receives the work order.

7. Technician asks:
   "What could cause this noise on CNC-04?"

8. RAG retrieves:
   - CNC-04 manual
   - Safety SOP
   - Previous maintenance record

9. AI provides source-referenced guidance.

10. Technician identifies a damaged spindle bearing.

11. Technician records:
    - Root cause
    - Repair action
    - Part used
    - Downtime

12. Inventory automatically updates.

13. Supervisor reviews the work.

14. Supervisor approves the maintenance record.

15. Equipment history is updated.

16. Manager can now see:
    - Who fixed the machine
    - What was wrong
    - What was repaired
    - What part was used
    - How long the repair took

17. The approved maintenance record becomes
    available as organizational knowledge for future RAG queries.
```

---

# 📌 Why EquipFixAI Is Different

EquipFixAI is not designed as a simple:

```text
Question → Chatbot → Answer
```

Instead, it connects:

```text
AI
+
Company Knowledge
+
Equipment
+
Incidents
+
Work Orders
+
Technicians
+
Spare Parts
+
Safety
+
Maintenance History
+
Real-Time Updates
+
Management Analytics
```

This creates a complete **AI-powered industrial maintenance ecosystem**.

---

# 👨💻 Project Status

🚧 **Currently in Development**

The project is being developed as an AI-powered industrial maintenance management platform with RAG capabilities.

### Planned development stages

```text
[ ] Authentication & RBAC
[ ] Database design
[ ] Equipment management
[ ] Incident management
[ ] Work-order system
[ ] Technician work logs
[ ] Document management
[ ] RAG document ingestion
[ ] Vector database
[ ] AI troubleshooting
[ ] Source citations
[ ] Safety-aware responses
[ ] Spare-parts management
[ ] Preventive maintenance
[ ] Real-time notifications
[ ] Manager analytics
[ ] Audit logging
[ ] Testing
[ ] Deployment
```

---

# 📄 License

This project is developed for educational and demonstration purposes.

Add your preferred license here when the project is published.

---

# 👥 Team

**Project:** EquipFixAI

**Domain:** AI Application Development / RAG / Industrial Maintenance

**Core Technologies:**

```text
React
Python
FastAPI
PostgreSQL
RAG
Vector Database
LLM
REST APIs
WebSockets
```

---

## 💡 One-Line Project Description

> **EquipFixAI is a RAG-powered industrial maintenance management platform that provides source-referenced AI troubleshooting while connecting equipment failures, work orders, technicians, maintenance records, spare parts, safety procedures, and real-time operational analytics in one system.**
