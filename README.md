# vxAssistBot

vxAssistBot is a Telegram bot codebase for AI-assisted customer interaction workflows. In its current portfolio form, the repository is intentionally scoped to the bot runtime and supporting AI integrations only.

The bot provides:

- licensed access control for private users and groups
- per-chat and per-thread conversational memory
- OpenAI-backed chat completions
- on-demand image generation
- operator/admin commands for support and maintenance

Previous experimental content-generation and media-production workflows have been removed from this portfolio version because they are not aligned with the business-facing presentation of the project.

## Scope

This repository now contains the Telegram bot runtime plus the shared AI/provider utilities that the bot depends on.

Key files:

- [vxAssistBot.js](/Users/stb/src/vxAssistBot/vxAssistBot.js): bot entry point and command handlers
- [AIInterface.js](/Users/stb/src/vxAssistBot/AIInterface.js): chat, image, and speech abstraction over OpenAI, Hugging Face, and local TTS backends
- [AIOpenAI.js](/Users/stb/src/vxAssistBot/AIOpenAI.js): OpenAI image backend
- [AIHuggingFace.js](/Users/stb/src/vxAssistBot/AIHuggingFace.js): Hugging Face image and TTS backend
- [AILocalSystem.js](/Users/stb/src/vxAssistBot/AILocalSystem.js): macOS `say`-based TTS backend
- [vxAssistCommon.js](/Users/stb/src/vxAssistBot/vxAssistCommon.js): shared file, logging, parsing, and markup utilities
- [strings.en_US.json](/Users/stb/src/vxAssistBot/strings.en_US.json): command names and descriptions
- `db/`: runtime bot state and caches

## Business-Facing Capabilities

The retained bot functionality is relevant to customer support, internal automation, and guided AI interaction:

- `/help`, `/about`, `/start`
- `/intro`
- `/genimg`
- `/setrole`, `/getrole`, `/resetrole`
- `/setparam`, `/getparam`
- `/wipecontext`, `/wipememory`, `/downloadmemory`
- `/userinfo`
- owner/admin operations such as `/exec`, `/update`, `/issuelicense`, `/revokelicense`, `/addadmin`, `/removeadmin`

The bot stores separate AI state per chat and, for Telegram forums, per thread. That enables scoped behavior for different customers, teams, or work topics.

## Architecture

### Telegram Layer

[vxAssistBot.js](/Users/stb/src/vxAssistBot/vxAssistBot.js) extends a local base implementation from `ent42/telegramBot.js`. It registers commands, performs access checks, handles context management, and delegates AI work to [AIInterface.js](/Users/stb/src/vxAssistBot/AIInterface.js).

### AI Layer

[AIInterface.js](/Users/stb/src/vxAssistBot/AIInterface.js) is responsible for:

- loading the OpenAI API key from `apikey.txt`
- maintaining message history
- assigning and persisting chat role/context
- calling OpenAI chat completions
- generating images through OpenAI or Hugging Face
- generating speech through Hugging Face or local macOS TTS

### Persistence

The bot persists runtime state directly in the repository working tree:

- `db/botStorage.json`
- `db/botCaches.json`

These files hold the Telegram bot token, admin users, per-chat parameters, and cached user/group metadata.

## Setup

### Requirements

- Node.js
- npm
- a Telegram bot token
- an OpenAI API key in `apikey.txt`
- optionally a Hugging Face API key in `apikeyHuggingFace.txt`
- macOS only if Caesar wants to use `Text2SpeechAPI=localSystem`

### Install

```bash
npm install
```

### Minimal runtime files

`db/botStorage.json` must exist with at least:

```json
{
  "botToken": "123456789:telegram-bot-token",
  "adminUsers": [],
  "aiParams": {},
  "aiContext": {}
}
```

`apikey.txt` must contain a valid OpenAI API key.

## Running The Bot

```bash
npm start
```

Equivalent command:

```bash
node ./vxAssistBot.js
```

## Runtime Configuration

The bot exposes per-chat configuration through `/setparam`. Relevant parameters retained in this portfolio version include:

- `aiEnabled`
- `aiAlwaysReply`
- `aiUsesReplies`
- `aiForceReplies`
- `aiDisableNotification`
- `aiDisableNotificationForReplies`
- `aiModel`
- `aiMaxToken`
- `aiTemperature`
- `Text2ImageAPI`
- `Text2ImageModel`

The default model remains `gpt-3.5-turbo` in the current implementation.

## Security Notes

This is not a hardened SaaS service. Caesar should treat it as privileged operator-managed software.

Important constraints:

- secrets are read from local files, not environment variables
- `/exec` runs arbitrary system commands for the bot owner
- `/update` performs `git pull` and then stops the process
- the owner ID is hardcoded in [node_modules/ent42/abstractCubeAiBot.js](/Users/stb/src/vxAssistBot/node_modules/ent42/abstractCubeAiBot.js)
- bot state is written directly into tracked project directories

For production hardening, the next steps would be replacing file-based secrets, removing dangerous owner commands, externalizing configuration, and isolating persistent state from the source tree.

## Repository Positioning

This repository should now be read as a focused example of:

- Telegram bot integration
- AI-assisted support/chat workflows
- per-chat stateful prompt management
- business-oriented operator controls

It should no longer be presented as a creative or media-generation toolkit.

## License

See [LICENSE](/Users/stb/src/vxAssistBot/LICENSE).
