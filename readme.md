# Bravodesk - AI-Powered Discord Support Ticket System

## Introduction

Bravodesk is an advanced, AI-powered Discord bot designed to streamline customer support and information retrieval through a sophisticated ticket system. It leverages OpenAI's capabilities to understand and respond to user queries within Discord tickets. Alongside the bot, a comprehensive web interface allows for easy management of bot settings, knowledge base customization, user permissions, and ticket categories. This system is built to provide intelligent, automated support while offering robust configuration options for server administrators.

## Features

Bravodesk offers a rich set of features to enhance your Discord support system:

*   **AI-Powered Ticket Responses:** Utilizes OpenAI (e.g., GPT models) to provide intelligent and contextual answers within support tickets.
*   **Vector Database Integration:** Employs Qdrant as a vector database to store and retrieve information, allowing the AI to access a dedicated knowledge base for accurate and relevant responses.
*   **Customizable Ticket Categories:** Define multiple ticket categories, each with its own specific AI prompt, user permissions, and behavior settings.
*   **Slash Commands:** A comprehensive set of Discord slash commands for users to create tickets and for administrators to manage the system (e.g., setup, blacklist users, manage knowledge base entries).
*   **Web Management Interface:** A user-friendly web dashboard for:
    *   Server-specific bot configuration.
    *   Managing the Qdrant knowledge base (adding, editing, deleting entries).
    *   User blacklist management.
    *   Creating and configuring ticket categories, including AI prompts and permissions.
    *   Customizing embed designs for bot messages (e.g., welcome messages, ticket creation messages).
*   **Activation Key System:** The bot can be configured to require an activation key for use on a Discord server, managed through the MySQL database.
*   **DM Commands:** Restricted Direct Message commands for high-level bot administration (e.g., generating activation keys, uploading global information to Qdrant).
*   **Secure Authentication:** Uses Discord OAuth2 for secure access to the web dashboard.
*   **Role-Based Permissions:** Control access to bot features and ticket categories based on Discord roles.
*   **Automated Ticket Handling:** Manages ticket creation, AI interaction, and provides options for escalating to human support if the AI cannot resolve an issue.
*   **Logging:** Comprehensive logging for bot operations, errors, and important events.

## Technologies Used

Bravodesk is built with a modern stack of technologies to provide its wide range of features:

### Bot (Backend)

*   **Node.js:** Runtime environment for the bot.
*   **Discord.js:** Core library for interacting with the Discord API.
*   **OpenAI API Client:** To communicate with OpenAI models (e.g., GPT-3.5-turbo).
*   **@qdrant/js-client-rest:** Client library for Qdrant vector database.
*   **mysql2:** MySQL database driver for Node.js.
*   **Express.js:** Web framework used for the bot's internal API (called by the web interface).
*   **@huggingface/inference:** (Potentially used for embeddings or other NLP tasks, as suggested by dependencies. Primary embedding/search via Qdrant).
*   **dotenv:** For managing environment variables.
*   **chalk:** For styling console output.

### Web Interface (Frontend & Backend)

*   **Node.js & Express.js:** For the web server backend.
*   **HTML, CSS, JavaScript:** For the frontend structure, styling, and interactivity.
*   **Discord OAuth2:** For user authentication via Discord.
*   **node-fetch:** For making HTTP requests from the web backend (e.g., to the bot's API or Discord API).
*   **express-session:** For managing user sessions.
*   **helmet:** For securing Express apps by setting various HTTP headers.
*   **express-rate-limit:** For limiting request rates to prevent abuse.
*   **multer:** Middleware for handling file uploads (e.g., for knowledge base documents).
*   **pdf-parse:** For extracting text from PDF files (likely for knowledge base ingestion).
*   **googleapis:** Google APIs client, potentially for Google Drive integration or other Google services.

### Databases

*   **MySQL:** Used for storing structured data such as:
    *   Server configurations (channel IDs, role IDs, etc.).
    *   Activation keys and their statuses.
    *   Ticket categories and their settings.
    *   User blacklists.
*   **Qdrant:** A vector database used for storing and searching text embeddings. This forms the knowledge base that the AI uses to find relevant information for answering user queries. Collections are typically named `guild_<server_id>` for server-specific data and `GeneralInformation` for global data.

## Setup Instructions

Follow these instructions to set up Bravodesk on your own infrastructure.

### Prerequisites

Before you begin, ensure you have the following installed and configured:

*   **Node.js:** Version 16.x or higher is recommended. You can download it from [nodejs.org](https://nodejs.org/).
*   **MySQL Server:** A running MySQL server instance (version 5.7 or higher, or MariaDB equivalent). You'll need to be able to create a database and a user for the bot.
*   **Qdrant Instance:** A running Qdrant vector database instance. You can use a cloud-hosted solution or self-host it. Refer to the [Qdrant documentation](https://qdrant.tech/documentation/) for setup.
*   **Git:** For cloning the repository.
*   **Discord Bot Application:** You'll need to create one on the [Discord Developer Portal](https://discord.com/developers/applications).
*   **OpenAI Account:** An active OpenAI account with API access.

### 1. Bot Setup

#### a. Clone the Repository

```bash
git clone <repository_url> # Replace <repository_url> with the actual URL
cd <repository_name>/Bot
```

#### b. Install Dependencies

Install the necessary Node.js packages:

```bash
npm install
```

#### c. Configure Environment Variables

The bot requires several environment variables to function correctly. Create a `.env` file in the `Bot/` directory by copying or renaming the provided `.env.example` (if available) or by creating a new one.

Fill in the following variables:

```env
# Qdrant Configuration
QDRANT_URL="your_qdrant_instance_url" # e.g., http://localhost:6333 or cloud URL
QDRANT_API_KEY="your_qdrant_api_key" # Optional, if your Qdrant instance requires it

# Hugging Face API Key (if using specific HuggingFace models for embeddings not covered by Qdrant/OpenAI)
HUGGINGFACE_API_KEY="your_huggingface_api_key"

# OpenAI Configuration
OPENAI_API_KEY="your_openai_api_key" # sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MODELL="gpt-3.5-turbo" # Or any other model you prefer and have access to
OPENAI_URL="https://api.openai.com/v1/chat/completions" # Default OpenAI API URL

# Discord Bot Configuration
DISCORD_BOT_TOKEN="your_discord_bot_token"
CLIENT_ID="your_discord_bot_client_id"
GUILD_ID="your_test_discord_server_id" # Required for initial command deployment, can be removed/ignored for global deployment later

# MySQL Database Configuration
DB_USERNAME="your_mysql_username"
DB_PASSWORD="your_mysql_password"
DB_HOST="your_mysql_host" # e.g., localhost or IP address
DB_NAME_SERVER_INFORMATION="customer_server_information_production" # Or _development

# API Token for Web Dashboard to Bot communication
DASHBOARD_API_TOKEN="a_strong_secure_random_string" # Ensure this matches the token in the Web Interface .env

# Webserver URL (URL of your Web Interface)
WEBSERVER_URL="http://localhost:53134" # Adjust port if changed in Web Interface setup
```

**Note on `GUILD_ID`:** This is primarily used by the `deploy_commands_testserver.js` script to register slash commands to a specific server for testing. For global deployment, `deploy_commands_global.js` is used.

#### d. Database Setup (MySQL)

1.  Connect to your MySQL server.
2.  Create a new database (e.g., `customer_server_information_production` or the name you specified in `DB_NAME_SERVER_INFORMATION`).
3.  Create a user with permissions to access and modify this database.
4.  Import the database schema. The SQL dump files (`customer_server_information_production.sql` or `customer_server_information_development.sql`) are located in the `Bot/` directory. You can import it using a tool like phpMyAdmin, DBeaver, or the MySQL command line:
    ```bash
    mysql -u your_mysql_username -p your_database_name < customer_server_information_production.sql
    ```
    Replace `your_mysql_username` and `your_database_name` accordingly.

#### e. Deploy Slash Commands

Discord bots use slash commands for interactions. You need to register these commands with Discord.

*   **For a Test Server (recommended for development):**
    Ensure `GUILD_ID` is set in your `Bot/.env` file to your test server's ID.
    Run the test server deployment script:
    ```bash
    node Bot/Scripts/deploy_commands_testserver.js
    ```
*   **For Global Deployment (all servers the bot is in):**
    Run the global deployment script:
    ```bash
    node Bot/Scripts/deploy_commands_global.js
    ```
    *Note: Global commands can take up to an hour to propagate across all servers.*

#### f. Run the Bot

Once configured, you can start the bot:

```bash
node Bot/bot.js
```
You should see log messages in the console, including a confirmation that the bot has logged in as your Discord bot user.

### 2. Web Interface Setup

The web interface provides a dashboard for managing the bot and its settings.

#### a. Navigate to Web Directory

From the root of the repository:

```bash
cd ../Web # Assuming you are in the Bot/ directory, otherwise navigate accordingly
```

#### b. Install Dependencies

Install the necessary Node.js packages:

```bash
npm install
```

#### c. Configure Environment Variables

Create a `.env` file in the `Web/` directory. Fill in the following variables:

```env
# Discord OAuth Configuration (for web dashboard login)
DISCORD_CLIENT_ID="your_discord_bot_client_id" # Same as in Bot/.env
DISCORD_SECRET="your_discord_bot_client_secret" # From your Discord Developer Portal
DISCORD_BOT_TOKEN="your_discord_bot_token" # Same as in Bot/.env, used for certain API calls

# Bot API Configuration (URL of your Bot's internal API)
BOT_API_URL="http://localhost:3000" # Adjust if your Bot runs on a different port (see PORT in Bot/.env)
BOT_API_TOKEN="the_same_strong_secure_random_string" # MUST MATCH DASHBOARD_API_TOKEN in Bot/.env

# Web Server Configuration
PORT="53134" # Port for the web interface to run on
REDERICT_URI="http://localhost:53134/auth/discord/callback" # OAuth2 Redirect URI. Ensure this is whitelisted in your Discord App settings.

# Session Management
SESSION_SECRET="another_strong_random_secret_string_for_sessions"

# MySQL Database Configuration (same as Bot/.env)
DB_USERNAME="your_mysql_username"
DB_PASSWORD="your_mysql_password"
DB_HOST="your_mysql_host"
DB_NAME_SERVER_INFORMATION="customer_server_information_production" # Or _development

# Qdrant Configuration (same as Bot/.env)
QDRANT_URL="your_qdrant_instance_url"
QDRANT_API_KEY="your_qdrant_api_key" # Optional

# Google Cloud Service Account (Optional - for features like Google Drive document import)
# These are typically found in the JSON key file for your Google Cloud service account.
GOOGLE_CLIENT_EMAIL="your_google_service_account_email" # e.g., something@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
your_google_private_key_here
-----END PRIVATE KEY-----
" # Ensure newlines are correctly formatted if copy-pasting

# Webserver URL (URL of this Web Interface itself) - Used by Bot or for constructing URLs
WEBSERVER_URL="http://localhost:53134" # Should match the REDERICT_URI base
```

**Important:**
*   The `DISCORD_CLIENT_ID` and `DISCORD_BOT_TOKEN` should be the same as in the Bot's `.env` file.
*   `BOT_API_TOKEN` **must** match `DASHBOARD_API_TOKEN` from the Bot's `.env` file for secure communication between the web interface and the bot.
*   The `REDERICT_URI` must be added to the "OAuth2 Redirect URIs" list in your Discord Bot Application settings on the Discord Developer Portal.

#### d. Run the Web Interface

Start the web server:

```bash
node Web/index.js
```
The web interface should now be accessible at the `WEBSERVER_URL` (e.g., `http://localhost:53134`).

### 3. Third-Party Services Configuration

Detailed steps for setting up the required third-party services.

#### a. Discord Application

1.  **Create an Application:**
    *   Go to the [Discord Developer Portal](https://discord.com/developers/applications).
    *   Click "New Application" and give it a name (e.g., "Bravodesk Bot").
2.  **Bot User:**
    *   Navigate to the "Bot" tab.
    *   Click "Add Bot" and confirm.
    *   **Token:** Click "Reset Token" (or "View Token") to get your `DISCORD_BOT_TOKEN`. Store this securely.
    *   **Privileged Gateway Intents:** Enable "Presence Intent", "Server Members Intent", and "Message Content Intent". These are crucial for the bot to function correctly.
3.  **Client ID & Secret:**
    *   Navigate to the "OAuth2" -> "General" tab.
    *   Your `CLIENT_ID` is displayed here.
    *   You can find your `CLIENT_SECRET` here. Click "Reset Secret" if needed.
4.  **OAuth2 Redirect URI:**
    *   Still under "OAuth2" -> "General", add your `REDERICT_URI` (from `Web/.env`, e.g., `http://localhost:53134/auth/discord/callback`) to the "Redirects" list.
5.  **Invite Bot to Server:**
    *   Go to "OAuth2" -> "URL Generator".
    *   Select the `bot` and `applications.commands` scopes.
    *   In "Bot Permissions", select necessary permissions (e.g., Administrator, or a more restricted set including Manage Channels, Send Messages, Read Message History, Embed Links, etc. - Administrator is simplest for setup).
    *   Copy the generated URL and open it in your browser to invite the bot to your Discord server(s).

#### b. OpenAI

1.  Go to [OpenAI Platform](https://platform.openai.com/).
2.  Sign up or log in.
3.  Navigate to the API keys section (usually under your account settings or "API").
4.  Create a new secret key. This will be your `OPENAI_API_KEY`.
5.  Ensure your account has sufficient credits or a payment method set up for API usage.

#### c. Qdrant

1.  **Choose Hosting Option:**
    *   **Qdrant Cloud:** Sign up at [Qdrant Cloud](https://cloud.qdrant.io/) and create a free cluster.
    *   **Self-Hosted:** Follow the [Qdrant installation guide](https://qdrant.tech/documentation/guides/installation/) to run it locally or on your server (e.g., using Docker).
2.  **Get Connection Details:**
    *   **URL:** This is the address of your Qdrant instance (e.g., `http://localhost:6333` for local Docker, or your cloud cluster URL like `https://xyz-abc.qdrant.cloud:6333`). This is your `QDRANT_URL`.
    *   **API Key (Optional):** If you've configured an API key for your Qdrant instance, this is your `QDRANT_API_KEY`. Qdrant Cloud provides one by default.
3.  **Collections:** The bot will automatically attempt to interact with collections (e.g., `guild_<server_id>`, `GeneralInformation`). You generally don't need to create these manually beforehand unless you have a specific setup reason. The vector size and distance metric are typically handled by the bot's Qdrant client configuration based on the embedding model used.

#### d. MySQL

1.  **Install MySQL:** If not already installed, download and install MySQL Community Server from the [official website](https://dev.mysql.com/downloads/mysql/) or use a package manager. Alternatively, use a managed MySQL service.
2.  **Secure Installation (Recommended for new setups):** Run `mysql_secure_installation` if available.
3.  **Create Database and User:**
    *   Connect to your MySQL server (e.g., using `mysql -u root -p`).
    *   Create the database:
        ```sql
        CREATE DATABASE customer_server_information_production CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
        -- Or use the name you chose for DB_NAME_SERVER_INFORMATION
        ```
    *   Create a user and grant privileges (replace `your_user` and `your_password`):
        ```sql
        CREATE USER 'your_user'@'localhost' IDENTIFIED BY 'your_password';
        GRANT ALL PRIVILEGES ON customer_server_information_production.* TO 'your_user'@'localhost';
        -- If your bot/web runs on a different host than MySQL, replace 'localhost' with '%' or the specific IP.
        FLUSH PRIVILEGES;
        ```
    *   These credentials (`your_user`, `your_password`, database name, host) will be used in your `.env` files.

#### e. Google Cloud (Optional)

This is only needed if you plan to use features that integrate with Google services, such as importing documents from Google Drive for the knowledge base.

1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Create a new project or select an existing one.
3.  Enable the relevant APIs (e.g., Google Drive API).
4.  Create a Service Account:
    *   Navigate to "IAM & Admin" -> "Service Accounts".
    *   Click "Create Service Account".
    *   Give it a name and description.
    *   Grant necessary roles (e.g., "Google Drive API Viewer" if only reading files).
    *   Click "Done".
5.  Create Service Account Key:
    *   Find your newly created service account, click on it.
    *   Go to the "Keys" tab.
    *   Click "Add Key" -> "Create new key".
    *   Choose "JSON" as the key type and click "Create".
    *   A JSON file will be downloaded.
        *   The `client_email` from this JSON file is your `GOOGLE_CLIENT_EMAIL`.
        *   The `private_key` from this JSON file is your `GOOGLE_PRIVATE_KEY`. Ensure you format it correctly in the `.env` file (maintain newlines `\n`).
6.  If using Google Drive, ensure the service account email has been granted access to the specific files or folders in Google Drive that you want the bot to access.

#### f. Pinecone (Auxiliary)

The main bot functionality appears to use Qdrant. However, a script `Bot/Scripts/upload_informations.js` is included for Pinecone. If you intend to use this script for specific data ingestion pipelines:

1.  Sign up at [Pinecone](https://www.pinecone.io/).
2.  Create an API key. This would be the `PINECONE_API_KEY` used in that script's context (it might need its own `.env` or direct modification in the script if not reading from the main `Bot/.env`).
3.  Create an index in Pinecone with the appropriate vector dimension for your chosen embedding model.
4.  The script also refers to `INDEX_NAME` and an embedding `model` which would need to be configured if you use it.
    *Note: This is likely for advanced/developer use and not part of the core bot setup for standard operation.*

## Bot Commands

Bravodesk uses slash commands for most interactions. Some restricted commands are available via Direct Messages (DMs) to the bot.

### Slash Commands

These commands can be used within a Discord server where the bot is present. Access may be restricted based on user roles for some commands.

#### General User Commands

*   **/help:** Displays a help message with available commands and their descriptions.
*   **/search `query`:** Searches the knowledge base for relevant information related to the query.
*   *(Ticket creation is typically handled via a button/dropdown interaction initiated by a setup message, not a direct slash command by users to create tickets.)*

#### Admin & Management Commands

These commands are typically restricted to server administrators or users with specific management roles (e.g., "KI Admin" role).

*   **/setup:** Initiates the bot's setup process on the server. This usually involves configuring channels (ticket system, archive), roles (Support, KI Admin), and the initial ticket creation message with categories.
*   **/add `id` `text`:** Adds or updates an entry in the Qdrant knowledge base for the current server. `id` is a unique identifier for the entry, and `text` is the content. (Requires KI Admin role).
*   **/remove `id`:** Removes an entry from the Qdrant knowledge base for the current server using its `id`. (Requires KI Admin role).
*   **/list:** Lists existing entries in the Qdrant knowledge base for the current server. (Requires KI Admin role).
*   **/upload `daten`:** Allows a KI Admin to upload a short piece of information (a simple sentence, max 10 words, max 20 characters per word) to the server's knowledge base.
    *   `daten`: The string of text to upload.
*   **/addblacklist `user_id` `reason`:** Adds a user to the ticket blacklist for the server, preventing them from creating new tickets. (Requires KI Admin role).
    *   `user_id`: The Discord User ID of the person to blacklist.
    *   `reason`: The reason for blacklisting.
*   **/removeblacklist `user_id`:** Removes a user from the ticket blacklist. (Requires KI Admin role).
    *   `user_id`: The Discord User ID of the person to unblacklist.
*   **/addticketcategory `label` `description` `value` `emoji` `ai_prompt` `ai_enabled` `permission_role_id`:** Adds a new ticket category with specified parameters. (Requires KI Admin role).
    *   `label`: The display name of the category.
    *   `description`: A short description for the category.
    *   `value`: A unique internal value/ID for the category.
    *   `emoji`: An emoji to associate with the category (e.g., `:smile:`).
    *   `ai_prompt`: The specific system prompt for the AI when handling tickets of this category.
    *   `ai_enabled`: (true/false) Whether AI support is active for this category.
    *   `permission_role_id`: The ID of the Discord role required to select this category (can be server's @everyone role ID for public access).
*   **/removeticketcategory `label`:** Removes a ticket category by its label. (Requires KI Admin role).
    *   `label`: The display name (label) of the category to remove.
*   **/reset:** **Server Owner Only.** Completely resets Bravodesk for the server. This involves:
    *   Deleting all server-specific knowledge base entries from Qdrant.
    *   Deleting created roles (Support, KI Admin).
    *   Deleting created channels (ticket system channel, ticket category, archive category).
    *   Deleting all server configuration (including ticket categories and embed designs) from the MySQL database.
    *   This command has a confirmation prompt due to its destructive nature.

### DM Commands (Restricted)

These commands are typically available only to the bot owner(s) specified in the bot's configuration, via Direct Message with the bot.

*   **!generate `amount`:** Generates a specified `amount` of new activation keys for the bot. These are stored in the MySQL database.
*   **!upload `text_content`:** Uploads the provided `text_content` to the global `GeneralInformation` collection in Qdrant. This is for information not specific to any single Discord server.

## Web Interface

Bravodesk features a web-based dashboard for managing various aspects of the bot and server configurations. Access to the dashboard is secured via Discord OAuth2, requiring users to log in with their Discord account.

### Accessing the Dashboard

1.  Navigate to the web server's URL (e.g., `http://localhost:53134` or your configured domain).
2.  You will be prompted to log in with Discord.
3.  Upon successful authentication, you will be redirected to the main dashboard page.

### Key Features and Sections

The web dashboard typically includes the following sections (actual names and layout may vary slightly):

*   **Server Selector:** If the authenticated user is part of multiple Discord servers where the bot is also present and they have administrative access (or a configured admin role), they might be able to select which server's settings they want to manage.
*   **Knowledge Base Management (Memory/Qdrant):**
    *   View, add, edit, and delete entries in the Qdrant vector database for the selected server's specific knowledge base (`guild_<server_id>`).
    *   Interface for uploading text content or potentially documents (e.g., PDFs, if `pdf-parse` and `multer` functionalities are fully integrated for this via the UI) to populate the knowledge base.
    *   Manage entries in the `GeneralInformation` collection (global knowledge).
*   **Ticket Categories:**
    *   Create new ticket categories with labels, descriptions, emojis, and permissions (Discord role required to select the category).
    *   Configure AI behavior for each category: enable/disable AI, and set custom AI system prompts.
    *   Edit or delete existing ticket categories.
*   **User Blacklist:**
    *   View the list of users blacklisted from creating tickets on the selected server.
    *   Add users to the blacklist by their Discord User ID and specify a reason.
    *   Remove users from the blacklist.
*   **Embed Customization (Design):**
    *   Modify the appearance and content of important bot messages, such as:
        *   Welcome messages.
        *   Ticket creation messages (the initial message with the dropdown/button to open a new ticket).
    *   This might involve editing JSON structures that define the embeds.
*   **Server Settings:**
    *   Configure core bot settings for the selected server, such as:
        *   Channel for the ticket system message.
        *   Category where new tickets are created.
        *   Support staff roles.
        *   AI administrator roles.
        *   Ticket archive category.
        *   Default embed color.
*   **Bot Notifications/Logs (Potentially):** A section to view bot activity logs or important notifications, though primary logging is usually to the console or log files.

The web interface acts as the central control panel for administrators to tailor the bot's behavior and manage its knowledge resources without needing to directly edit configuration files or use commands for everything.

## Troubleshooting

Here are some common issues and how to resolve them:

*   **Bot Not Starting/Logging In:**
    *   **Check `.env` files:** Ensure all required environment variables in `Bot/.env` (and `Web/.env` for the web part) are correctly filled out. Pay close attention to API keys, tokens, database credentials, and URLs.
    *   **Discord Token:** Double-check that your `DISCORD_BOT_TOKEN` is correct and that your bot application has not been reset, invalidating the token.
    *   **Dependencies:** Make sure you've run `npm install` in both the `Bot/` and `Web/` directories.
    *   **Node.js Version:** Ensure you are using a compatible version of Node.js (e.g., v16+).
    *   **Database Connection:** Verify that your MySQL server is running and accessible with the credentials provided in `.env`. Check if the Qdrant instance is reachable.
    *   **Console Logs:** Examine the console output when starting the bot (`node Bot/bot.js`) or web server (`node Web/index.js`) for specific error messages.

*   **Slash Commands Not Appearing/Working:**
    *   **Deployment:** Ensure you have run the slash command deployment script (`Bot/Scripts/deploy_commands_global.js` or `Bot/Scripts/deploy_commands_testserver.js`). Global commands can take up to an hour to propagate.
    *   **`GUILD_ID`:** If using the test server script, make sure `GUILD_ID` in `Bot/.env` is correct for your test server.
    *   **Permissions:** Check that the bot has the `applications.commands` scope when invited to the server. Also, ensure the bot has necessary channel permissions to respond.
    *   **Discord Outages:** Occasionally, Discord API issues can affect command registration or execution.

*   **Web Interface Not Loading or Errors:**
    *   **Web Server Running:** Make sure the web server is running (`node Web/index.js`).
    *   **`BOT_API_URL` & `BOT_API_TOKEN`:** Verify that `BOT_API_URL` in `Web/.env` correctly points to your bot's API (e.g., `http://localhost:3000`) and that `BOT_API_TOKEN` matches `DASHBOARD_API_TOKEN` in `Bot/.env`.
    *   **OAuth2 Redirect URI:** Ensure the `REDERICT_URI` in `Web/.env` is correctly whitelisted in your Discord application settings.
    *   **Session Secret:** A valid `SESSION_SECRET` in `Web/.env` is needed.
    *   **Browser Console:** Check your web browser's developer console (usually F12) for JavaScript errors or failed network requests.

*   **AI Responses Are Generic or Incorrect:**
    *   **OpenAI API Key:** Confirm your `OPENAI_API_KEY` is valid and your OpenAI account has active billing/credits.
    *   **Qdrant Data:** Ensure your Qdrant knowledge base has relevant information for the queries being made. Use the web interface or bot commands to add/check data.
    *   **AI Prompts:** Review the system prompts for ticket categories. A poorly worded prompt can lead to undesirable AI behavior.
    *   **`MODELL` & `OPENAI_URL`:** Check these are correctly set in `Bot/.env`.

*   **"Privileged Intents" Error on Bot Startup:**
    *   Go to your bot's application page on the Discord Developer Portal.
    *   Under the "Bot" tab, ensure you have enabled "Presence Intent", "Server Members Intent", and "Message Content Intent".

*   **MySQL Errors (e.g., `ER_BAD_DB_ERROR`):**
    *   Verify that the database name specified in `DB_NAME_SERVER_INFORMATION` exists on your MySQL server and that the user has privileges for it.
    *   Ensure the schema was imported correctly from the `.sql` file.

*   **Qdrant Errors:**
    *   Verify `QDRANT_URL` and `QDRANT_API_KEY` (if applicable) are correct.
    *   Ensure your Qdrant instance is running and accessible. Check Qdrant's own logs if self-hosting.

If you encounter issues not listed here, checking the detailed console logs for both the bot and web applications is the first step to diagnosing the problem.
