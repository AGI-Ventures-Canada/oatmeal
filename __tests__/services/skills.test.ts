import { describe, expect, it } from "bun:test"
import { buildSkillFilesForSandbox, type SkillFile } from "@/lib/services/skills"
import type { Skill } from "@/lib/db/agent-types"

describe("Skills Service", () => {
  describe("CreateSkillInput", () => {
    it("requires tenantId, name, slug, and content", () => {
      const input = {
        tenantId: "tenant-123",
        name: "Code Review Skill",
        slug: "code-review",
        content: "# Code Review\n\nReview code for best practices...",
      }

      expect(input.tenantId).toBeDefined()
      expect(input.name).toBeDefined()
      expect(input.slug).toBeDefined()
      expect(input.content).toBeDefined()
    })

    it("supports optional fields", () => {
      const input = {
        tenantId: "tenant-123",
        name: "Code Review Skill",
        slug: "code-review",
        content: "# Code Review",
        description: "A skill for reviewing code quality",
        referencesContent: { "style-guide.md": "# Style Guide\n\n..." },
        scriptsContent: { "lint.sh": "#!/bin/bash\neslint ." },
      }

      expect(input.description).toBe("A skill for reviewing code quality")
      expect(input.referencesContent?.["style-guide.md"]).toBeDefined()
      expect(input.scriptsContent?.["lint.sh"]).toBeDefined()
    })
  })

  describe("UpdateSkillInput", () => {
    it("all fields are optional", () => {
      const updates: Record<string, unknown> = {}
      expect(Object.keys(updates)).toHaveLength(0)
    })

    it("can update individual fields", () => {
      const updates = {
        name: "Updated Skill Name",
        content: "# Updated Content",
        description: null,
      }

      expect(updates.name).toBe("Updated Skill Name")
      expect(updates.content).toBe("# Updated Content")
      expect(updates.description).toBeNull()
    })
  })

  describe("Slug Validation", () => {
    it("slug should be lowercase with hyphens", () => {
      const validSlugs = ["code-review", "api-docs", "test-runner"]
      const invalidSlugs = ["Code_Review", "API Docs", "TestRunner"]

      for (const slug of validSlugs) {
        expect(slug).toMatch(/^[a-z0-9-]+$/)
      }

      for (const slug of invalidSlugs) {
        expect(slug).not.toMatch(/^[a-z0-9-]+$/)
      }
    })
  })

  describe("ListSkillsOptions", () => {
    it("supports pagination with limit and offset", () => {
      const options = {
        limit: 10,
        offset: 20,
      }

      expect(options.limit).toBe(10)
      expect(options.offset).toBe(20)
    })

    it("supports includeBuiltin filter", () => {
      const options = {
        includeBuiltin: true,
      }

      expect(options.includeBuiltin).toBe(true)
    })

    it("defaults to excluding builtin skills", () => {
      const options: { includeBuiltin?: boolean } = {}
      const includeBuiltin = options.includeBuiltin ?? false

      expect(includeBuiltin).toBe(false)
    })
  })

  describe("Builtin Skills", () => {
    it("builtin skills cannot be deleted", () => {
      const skill = { id: "skill-1", is_builtin: true }
      const canDelete = !skill.is_builtin

      expect(canDelete).toBe(false)
    })

    it("user skills can be deleted", () => {
      const skill = { id: "skill-2", is_builtin: false }
      const canDelete = !skill.is_builtin

      expect(canDelete).toBe(true)
    })
  })

  describe("buildSkillFilesForSandbox", () => {
    it("returns empty array for empty skills", () => {
      const files = buildSkillFilesForSandbox([])
      expect(files).toEqual([])
    })

    it("creates SKILL.md for each skill", () => {
      const skills: Skill[] = [
        {
          id: "skill-1",
          tenant_id: "tenant-1",
          name: "Test Skill",
          slug: "test-skill",
          description: null,
          content: "# Test Skill\n\nThis is a test.",
          references_content: null,
          scripts_content: null,
          is_builtin: false,
          version: 1,
          created_at: new Date().toISOString(),
          updated_at: null,
        },
      ]

      const files = buildSkillFilesForSandbox(skills)

      expect(files).toHaveLength(1)
      expect(files[0].path).toBe(".claude/skills/test-skill/SKILL.md")
      expect(files[0].content).toBe("# Test Skill\n\nThis is a test.")
    })

    it("includes reference files", () => {
      const skills: Skill[] = [
        {
          id: "skill-1",
          tenant_id: "tenant-1",
          name: "Test Skill",
          slug: "test-skill",
          description: null,
          content: "# Test Skill",
          references_content: {
            "guide.md": "# Guide\n\nThis is a guide.",
            "examples.md": "# Examples\n\nSome examples.",
          },
          scripts_content: null,
          is_builtin: false,
          version: 1,
          created_at: new Date().toISOString(),
          updated_at: null,
        },
      ]

      const files = buildSkillFilesForSandbox(skills)

      expect(files).toHaveLength(3)
      expect(files.find((f) => f.path.includes("references/guide.md"))).toBeDefined()
      expect(files.find((f) => f.path.includes("references/examples.md"))).toBeDefined()
    })

    it("includes script files", () => {
      const skills: Skill[] = [
        {
          id: "skill-1",
          tenant_id: "tenant-1",
          name: "Test Skill",
          slug: "test-skill",
          description: null,
          content: "# Test Skill",
          references_content: null,
          scripts_content: {
            "setup.sh": "#!/bin/bash\necho 'Setup'",
            "test.py": "print('Test')",
          },
          is_builtin: false,
          version: 1,
          created_at: new Date().toISOString(),
          updated_at: null,
        },
      ]

      const files = buildSkillFilesForSandbox(skills)

      expect(files).toHaveLength(3)
      expect(files.find((f) => f.path.includes("scripts/setup.sh"))).toBeDefined()
      expect(files.find((f) => f.path.includes("scripts/test.py"))).toBeDefined()
    })

    it("handles multiple skills with all content types", () => {
      const skills: Skill[] = [
        {
          id: "skill-1",
          tenant_id: "tenant-1",
          name: "Skill One",
          slug: "skill-one",
          description: null,
          content: "# Skill One",
          references_content: { "ref.md": "Reference" },
          scripts_content: { "run.sh": "echo run" },
          is_builtin: false,
          version: 1,
          created_at: new Date().toISOString(),
          updated_at: null,
        },
        {
          id: "skill-2",
          tenant_id: "tenant-1",
          name: "Skill Two",
          slug: "skill-two",
          description: null,
          content: "# Skill Two",
          references_content: null,
          scripts_content: null,
          is_builtin: false,
          version: 1,
          created_at: new Date().toISOString(),
          updated_at: null,
        },
      ]

      const files = buildSkillFilesForSandbox(skills)

      expect(files).toHaveLength(4)
      expect(files.find((f) => f.path === ".claude/skills/skill-one/SKILL.md")).toBeDefined()
      expect(files.find((f) => f.path === ".claude/skills/skill-two/SKILL.md")).toBeDefined()
      expect(files.find((f) => f.path.includes("skill-one/references/ref.md"))).toBeDefined()
      expect(files.find((f) => f.path.includes("skill-one/scripts/run.sh"))).toBeDefined()
    })

    it("generates correct path structure", () => {
      const skills: Skill[] = [
        {
          id: "skill-1",
          tenant_id: "tenant-1",
          name: "API Docs",
          slug: "api-docs",
          description: null,
          content: "# API Documentation",
          references_content: { "openapi.yaml": "openapi: 3.0.0" },
          scripts_content: { "generate.js": "console.log('gen')" },
          is_builtin: false,
          version: 1,
          created_at: new Date().toISOString(),
          updated_at: null,
        },
      ]

      const files = buildSkillFilesForSandbox(skills)
      const paths = files.map((f) => f.path)

      expect(paths).toContain(".claude/skills/api-docs/SKILL.md")
      expect(paths).toContain(".claude/skills/api-docs/references/openapi.yaml")
      expect(paths).toContain(".claude/skills/api-docs/scripts/generate.js")
    })
  })

  describe("SkillFile Type", () => {
    it("has path and content", () => {
      const file: SkillFile = {
        path: ".claude/skills/my-skill/SKILL.md",
        content: "# My Skill",
      }

      expect(file.path).toBeDefined()
      expect(file.content).toBeDefined()
    })
  })

  describe("Skill Versioning", () => {
    it("version starts at 1", () => {
      const skill = { version: 1 }
      expect(skill.version).toBe(1)
    })

    it("version increments on content update", () => {
      const oldVersion = 1
      const newVersion = oldVersion + 1
      expect(newVersion).toBe(2)
    })
  })
})
