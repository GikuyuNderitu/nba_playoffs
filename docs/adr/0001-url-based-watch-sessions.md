# 1. URL-Based Watch Sessions Instead of User Authentication

For tracking progress, synchronization, and sharing, we decided to use URL-based Watch Sessions instead of traditional user accounts. Visiting the application automatically generates a unique session record in the SQLite database, and this session ID is appended as a URL query parameter (e.g., `?s=abc123xyz`).

This allows users to easily bookmark their session, sync their progress across devices, and share their progress with others without the friction of registering an email and password. Recipients of a shared URL can view the session or click "Clone Session" to create their own independent progress starting from that exact state. This decision trades off strict access security in favor of zero-friction user sharing and simplified server deployment.
