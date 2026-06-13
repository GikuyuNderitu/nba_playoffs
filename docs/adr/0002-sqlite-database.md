# 2. SQLite Database for Shared Tournaments and Sessions

For storing tournament configurations, matchups, games, and user watch sessions, we decided to use SQLite as our primary database. SQLite is lightweight, serverless, and file-based.

This choice makes the application extremely easy to deploy (as a single Node.js process or container on any hosting provider) and share, without requiring the setup or expense of external database hosting. If the write volume or concurrency demands grow beyond SQLite's single-writer design, the relational database schema can be migrated to a server-based system like PostgreSQL with minimal changes to the database queries.
