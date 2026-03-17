# Hackathon Skills

AI agent skills for hackathon management on the [Oatmeal](https://github.com/AGI-Ventures-Canada/oatmeal) platform.

## Install

```bash
npx skills add AGI-Ventures-Canada/oatmeal
```

## Skills

| Skill | Description |
|-------|-------------|
| **hackathon-cli** | Manage hackathons from the terminal using the `hackathon` CLI |
| **hackathon-api** | Interact with the Oatmeal platform via its REST API using curl |
| **hackathon-organizer** | Tips, tricks, and best practices for organizing hackathons |
| **hackathon-attendee** | Tips, tricks, and best practices for hackathon participants |

## Usage

After installing, your AI agent will automatically activate the relevant skill based on your request:

- **"Create a hackathon via CLI"** → hackathon-cli
- **"Call the hackathon API"** → hackathon-api
- **"How do I organize a hackathon?"** → hackathon-organizer
- **"Tips for my first hackathon"** → hackathon-attendee

## Structure

Each skill follows the standard skills.sh format:

```
skill-name/
├── SKILL.md              # Main skill file (YAML frontmatter + content)
└── references/           # Supporting documentation
    └── *.md
```

## License

MIT
